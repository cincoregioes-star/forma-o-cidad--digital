import { withSupabase } from 'npm:@supabase/server@1.5.3';
import { sha256Hex, userIdFromContext } from '../_shared/utils.ts';

const MAX_ROWS = 600;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const userId = userIdFromContext(ctx);
      if (Boolean((ctx.jwtClaims as any)?.is_anonymous)) {
        return Response.json({ message: 'Acesso administrativo exige usuário permanente.' }, { status: 403 });
      }
      if (!(await assertAdmin(ctx, userId))) {
        return Response.json({ message: 'Usuário sem permissão administrativa.' }, { status: 403 });
      }

      const body = await req.json().catch(() => ({}));
      const action = String(body?.action || 'history');

      if (action === 'history') return listHistory(ctx);
      if (action === 'import_schools') return importSchools(ctx, userId, body);
      if (action === 'import_students') return importStudents(ctx, userId, body);
      return Response.json({ message: 'Ação de importação inválida.' }, { status: 400 });
    } catch (err) {
      console.error(err);
      return Response.json({ message: err instanceof Error ? err.message : 'Falha na importação.' }, { status: 500 });
    }
  })
};

async function assertAdmin(ctx:any, userId:string): Promise<boolean> {
  const { data, error } = await ctx.supabaseAdmin
    .from('admin_users')
    .select('user_id, active')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function listHistory(ctx:any) {
  const { data, error } = await ctx.supabaseAdmin
    .from('import_batches')
    .select('id, import_type, file_name, total_rows, inserted_rows, updated_rows, skipped_rows, codes_generated, created_at')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return Response.json({ history: data || [] });
}

async function importSchools(ctx:any, userId:string, body:any) {
  const incoming = Array.isArray(body?.rows) ? body.rows : [];
  const fileName = safeFileName(body?.fileName);
  if (!incoming.length) return Response.json({ message: 'Nenhuma escola válida foi enviada.' }, { status: 400 });
  if (incoming.length > MAX_ROWS) return Response.json({ message: `Importe no máximo ${MAX_ROWS} linhas por lote.` }, { status: 400 });

  const { data: existing, error: existingError } = await ctx.supabaseAdmin
    .from('schools')
    .select('id, name, municipality, reference_code');
  if (existingError) throw existingError;

  const byCode = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const s of existing || []) {
    if (s.reference_code) byCode.set(norm(s.reference_code), s);
    byName.set(schoolKey(s.name, s.municipality), s);
  }

  let inserted = 0, updated = 0, skipped = 0;
  const seen = new Set<string>();
  for (const raw of incoming) {
    const row = normalizeSchool(raw);
    if (!row.name) { skipped++; continue; }
    const dedupeKey = row.referenceCode ? `code|${norm(row.referenceCode)}` : `name|${schoolKey(row.name, row.municipality)}`;
    if (seen.has(dedupeKey)) { skipped++; continue; }
    seen.add(dedupeKey);

    const found = row.referenceCode ? byCode.get(norm(row.referenceCode)) : byName.get(schoolKey(row.name, row.municipality));
    if (found) {
      const { error } = await ctx.supabaseAdmin.from('schools').update({
        name: row.name,
        reference_code: row.referenceCode || found.reference_code || null,
        district: row.district || null,
        municipality: row.municipality || null,
        network: row.network || null,
        latitude: row.latitude,
        longitude: row.longitude,
        active: true
      }).eq('id', found.id);
      if (error) throw error;
      updated++;
    } else {
      const { data: created, error } = await ctx.supabaseAdmin.from('schools').insert({
        name: row.name,
        reference_code: row.referenceCode || null,
        district: row.district || null,
        municipality: row.municipality || null,
        network: row.network || null,
        latitude: row.latitude,
        longitude: row.longitude,
        active: true
      }).select('id, name, municipality, reference_code').single();
      if (error) throw error;
      inserted++;
      if (created.reference_code) byCode.set(norm(created.reference_code), created);
      byName.set(schoolKey(created.name, created.municipality), created);
    }
  }

  const history = await saveHistory(ctx, userId, 'schools', fileName, incoming.length, inserted, updated, skipped, 0);
  return Response.json({ summary: { total: incoming.length, inserted, updated, skipped, codesGenerated: 0 }, history });
}

async function importStudents(ctx:any, userId:string, body:any) {
  const incoming = Array.isArray(body?.rows) ? body.rows : [];
  const fileName = safeFileName(body?.fileName);
  const generateCodes = body?.generateCodes !== false;
  const defaultExpiresAt = normalizeDate(body?.defaultExpiresAt);
  if (!incoming.length) return Response.json({ message: 'Nenhum aluno válido foi enviado.' }, { status: 400 });
  if (incoming.length > MAX_ROWS) return Response.json({ message: `Importe no máximo ${MAX_ROWS} linhas por lote.` }, { status: 400 });

  const schoolIds = [...new Set(incoming.map((r:any) => String(r?.schoolId || '')).filter(Boolean))];
  if (!schoolIds.length) return Response.json({ message: 'As escolas dos alunos não foram identificadas.' }, { status: 400 });
  const { data: schools, error: schoolError } = await ctx.supabaseAdmin.from('schools').select('id, name, active').in('id', schoolIds);
  if (schoolError) throw schoolError;
  const schoolMap = new Map((schools || []).filter((s:any) => s.active).map((s:any) => [s.id, s]));

  const existingStudents = await fetchAll(ctx.supabaseAdmin, 'students', 'id, school_id, full_name, registration_code, level_key, level_label, grade, class_name, active', q => q.in('school_id', schoolIds));
  const byRegistration = new Map<string, any>();
  const byFingerprint = new Map<string, any>();
  for (const s of existingStudents) {
    if (s.registration_code) byRegistration.set(`${s.school_id}|${norm(s.registration_code)}`, s);
    byFingerprint.set(studentKey(s.school_id, s.full_name, s.level_key, s.grade, s.class_name), s);
  }

  const prepared:any[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const raw of incoming) {
    const row = normalizeStudent(raw);
    if (!row.fullName || !row.schoolId || !schoolMap.has(row.schoolId) || !['fundamental2','medio'].includes(row.levelKey) || !row.grade || !row.className) {
      skipped++;
      continue;
    }
    const dedupeKey = row.registrationCode ? `reg|${row.schoolId}|${norm(row.registrationCode)}` : `fp|${studentKey(row.schoolId,row.fullName,row.levelKey,row.grade,row.className)}`;
    if (seen.has(dedupeKey)) { skipped++; continue; }
    seen.add(dedupeKey);
    prepared.push(row);
  }

  let inserted = 0, updated = 0;
  const studentRecords:any[] = [];
  for (const row of prepared) {
    const existing = row.registrationCode
      ? byRegistration.get(`${row.schoolId}|${norm(row.registrationCode)}`)
      : byFingerprint.get(studentKey(row.schoolId, row.fullName, row.levelKey, row.grade, row.className));

    if (existing) {
      const changed = existing.full_name !== row.fullName || existing.level_key !== row.levelKey || existing.grade !== row.grade || existing.class_name !== row.className || !existing.active;
      if (changed || (row.registrationCode && existing.registration_code !== row.registrationCode)) {
        const { data: updatedRow, error } = await ctx.supabaseAdmin.from('students').update({
          full_name: row.fullName,
          registration_code: row.registrationCode || existing.registration_code || null,
          level_key: row.levelKey,
          level_label: row.levelLabel,
          grade: row.grade,
          class_name: row.className,
          active: true
        }).eq('id', existing.id).select('id, school_id, full_name, level_key, level_label, grade, class_name').single();
        if (error) throw error;
        studentRecords.push({ ...updatedRow, expiresAt: row.expiresAt });
        updated++;
      } else {
        studentRecords.push({ ...existing, expiresAt: row.expiresAt });
        skipped++;
      }
      continue;
    }

    const { data: created, error } = await ctx.supabaseAdmin.from('students').insert({
      school_id: row.schoolId,
      full_name: row.fullName,
      registration_code: row.registrationCode || null,
      level_key: row.levelKey,
      level_label: row.levelLabel,
      grade: row.grade,
      class_name: row.className,
      active: true
    }).select('id, school_id, full_name, level_key, level_label, grade, class_name').single();
    if (error) throw error;
    studentRecords.push({ ...created, expiresAt: row.expiresAt });
    inserted++;
  }

  let generated:any[] = [];
  if (generateCodes && studentRecords.length) {
    generated = await generateCodesForStudents(ctx, userId, studentRecords, schoolMap, defaultExpiresAt);
  }

  const history = await saveHistory(ctx, userId, 'students', fileName, incoming.length, inserted, updated, skipped, generated.length);
  return Response.json({
    summary: { total: incoming.length, inserted, updated, skipped, codesGenerated: generated.length },
    generated,
    history
  });
}

async function generateCodesForStudents(ctx:any, userId:string, students:any[], schoolMap:Map<string, any>, defaultExpiresAt:string|null) {
  const studentIds = students.map(s => s.id);
  const existingCodes = studentIds.length
    ? await fetchAll(ctx.supabaseAdmin, 'access_codes', 'id, student_id, active, used_at, revoked_at, expires_at, created_at', q => q.in('student_id', studentIds))
    : [];
  const activeByStudent = new Map<string, any>();
  for (const c of existingCodes.sort((a:any,b:any) => String(b.created_at).localeCompare(String(a.created_at)))) {
    if (!activeByStudent.has(c.student_id) && isUsableCode(c)) activeByStudent.set(c.student_id, c);
  }

  const generated:any[] = [];
  for (const s of students) {
    if (activeByStudent.has(s.id)) continue;
    const plainCode = makeCode(s.grade, s.class_name);
    const codeHash = await sha256Hex(plainCode);
    const expiresAt = s.expiresAt || defaultExpiresAt || new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
    const { data: inserted, error } = await ctx.supabaseAdmin.from('access_codes').insert({
      student_id: s.id,
      code_hash: codeHash,
      code_hint: plainCode.slice(-4),
      active: true,
      expires_at: expiresAt,
      created_by: userId
    }).select('id').single();
    if (error) throw error;
    const school = schoolMap.get(s.school_id);
    generated.push({
      id: inserted.id,
      studentId: s.id,
      name: s.full_name,
      school: school?.name || '—',
      schoolId: s.school_id,
      level: s.level_label,
      levelKey: s.level_key,
      grade: s.grade,
      className: s.class_name,
      code: plainCode,
      codeHint: plainCode.slice(-4),
      expiresAt,
      status: 'available',
      active: true
    });
  }
  return generated;
}

async function saveHistory(ctx:any, userId:string, importType:string, fileName:string|null, total:number, inserted:number, updated:number, skipped:number, codes:number) {
  const { data, error } = await ctx.supabaseAdmin.from('import_batches').insert({
    imported_by: userId,
    import_type: importType,
    file_name: fileName,
    total_rows: total,
    inserted_rows: inserted,
    updated_rows: updated,
    skipped_rows: skipped,
    codes_generated: codes
  }).select('id, import_type, file_name, total_rows, inserted_rows, updated_rows, skipped_rows, codes_generated, created_at').single();
  if (error) throw error;
  return data;
}

async function fetchAll(client:any, table:string, columns:string, decorate:(q:any)=>any) {
  const out:any[] = [];
  const size = 1000;
  for (let start = 0; ; start += size) {
    let q = client.from(table).select(columns);
    q = decorate(q);
    const { data, error } = await q.range(start, start + size - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < size) break;
  }
  return out;
}

function normalizeSchool(raw:any) {
  return {
    name: String(raw?.school || raw?.name || '').trim(),
    referenceCode: String(raw?.schoolCode || raw?.referenceCode || '').trim(),
    district: String(raw?.district || '').trim(),
    municipality: String(raw?.municipality || '').trim(),
    network: String(raw?.network || '').trim(),
    latitude: finiteOrNull(raw?.latitude),
    longitude: finiteOrNull(raw?.longitude)
  };
}

function normalizeStudent(raw:any) {
  const levelKey = String(raw?.levelKey || '').trim();
  return {
    fullName: String(raw?.student || raw?.fullName || '').trim(),
    registrationCode: String(raw?.registration || raw?.registrationCode || '').trim(),
    schoolId: String(raw?.schoolId || '').trim(),
    levelKey,
    levelLabel: levelKey === 'medio' ? 'Ensino Médio' : 'Fundamental II',
    grade: String(raw?.grade || '').trim(),
    className: String(raw?.className || '').trim().toUpperCase(),
    expiresAt: normalizeDate(raw?.expiresAt)
  };
}

function finiteOrNull(value:any) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(value:any):string|null {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
}

function isUsableCode(c:any) {
  return Boolean(c.active && !c.used_at && !c.revoked_at && !(c.expires_at && new Date(c.expires_at).getTime() < Date.now()));
}

function schoolKey(name:string, municipality:any) {
  return `${norm(name)}|${norm(municipality || '')}`;
}

function studentKey(schoolId:string, name:string, levelKey:string, grade:string, className:string) {
  return `${schoolId}|${norm(name)}|${norm(levelKey)}|${norm(grade)}|${norm(className)}`;
}

function norm(value:any) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

function safeFileName(value:any) {
  const v = String(value || '').trim();
  return v ? v.slice(0, 180) : null;
}

function makeCode(grade:string, className:string) {
  const digits = grade.replace(/\D/g, '').slice(0, 2) || 'X';
  const cls = className.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'A';
  let token = '';
  const bytes = crypto.getRandomValues(new Uint32Array(6));
  for (const n of bytes) token += CODE_ALPHABET[n % CODE_ALPHABET.length];
  return `FCD-${digits}${cls}-${token}`;
}
