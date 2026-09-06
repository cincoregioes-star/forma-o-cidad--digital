import { withSupabase } from 'npm:@supabase/server@1.5.3';
import { sha256Hex, userIdFromContext } from '../_shared/utils.ts';

const MAX_BATCH = 120;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const userId = userIdFromContext(ctx);
      const anonymous = Boolean((ctx.jwtClaims as any)?.is_anonymous);
      if (anonymous) return Response.json({ message: 'Acesso administrativo exige usuário permanente.' }, { status: 403 });
      const isAdmin = await assertAdmin(ctx, userId);
      if (!isAdmin) return Response.json({ message: 'Usuário sem permissão administrativa.' }, { status: 403 });

      const body = await req.json().catch(() => ({}));
      const action = String(body?.action || 'list');

      if (action === 'list') return listCodes(ctx);
      if (action === 'generate_batch') return generateBatch(ctx, userId, body);
      if (action === 'revoke') return revokeCode(ctx, body);
      if (action === 'regenerate') return regenerateCode(ctx, userId, body);

      return Response.json({ message: 'Ação administrativa inválida.' }, { status: 400 });
    } catch (err) {
      console.error(err);
      return Response.json({ message: err instanceof Error ? err.message : 'Não foi possível administrar os códigos.' }, { status: 500 });
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

async function listCodes(ctx:any) {
  const rows:any[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await ctx.supabaseAdmin
      .from('access_codes')
      .select('id, student_id, code_hint, active, redeemed_at, used_at, expires_at, revoked_at, created_at, students(id, full_name, level_key, level_label, grade, class_name, schools(id, name))')
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const codes = rows.map((row:any) => {
    const student:any = Array.isArray(row.students) ? row.students[0] : row.students;
    const school:any = Array.isArray(student?.schools) ? student.schools[0] : student?.schools;
    return {
      id: row.id,
      studentId: row.student_id,
      name: student?.full_name || '—',
      school: school?.name || '—',
      schoolId: school?.id || null,
      level: student?.level_label || '—',
      levelKey: student?.level_key || '—',
      grade: student?.grade || '—',
      className: student?.class_name || '—',
      codeHint: row.code_hint || '----',
      active: row.active,
      redeemedAt: row.redeemed_at,
      usedAt: row.used_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      status: resolveStatus(row)
    };
  });

  return Response.json({ codes });
}

async function generateBatch(ctx:any, userId:string, body:any) {
  const schoolId = String(body?.schoolId || '').trim();
  const levelKey = String(body?.levelKey || '').trim();
  const grade = String(body?.grade || '').trim();
  const className = String(body?.className || '').trim().toUpperCase();
  const expiresAt = body?.expiresAt ? String(body.expiresAt) : null;
  const incoming = Array.isArray(body?.students) ? body.students : [];
  const names:string[] = [...new Set<string>(incoming.map((s:any) => String(s?.fullName || '').trim()).filter((v:string) => Boolean(v)))];

  if (!schoolId || !['fundamental2','medio'].includes(levelKey) || !grade || !className || !names.length) {
    return Response.json({ message: 'Escola, nível, série, turma e estudantes são obrigatórios.' }, { status: 400 });
  }
  if (names.length > MAX_BATCH) return Response.json({ message: `O lote pode conter no máximo ${MAX_BATCH} estudantes.` }, { status: 400 });

  const { data: school, error: schoolError } = await ctx.supabaseAdmin.from('schools').select('id, name, active').eq('id', schoolId).maybeSingle();
  if (schoolError) throw schoolError;
  if (!school?.active) return Response.json({ message: 'Escola não localizada ou inativa.' }, { status: 404 });

  const levelLabel = levelKey === 'medio' ? 'Ensino Médio' : 'Fundamental II';
  const { data: existingStudents, error: existingError } = await ctx.supabaseAdmin
    .from('students')
    .select('id, full_name')
    .eq('school_id', schoolId)
    .eq('level_key', levelKey)
    .eq('grade', grade)
    .eq('class_name', className)
    .eq('active', true);
  if (existingError) throw existingError;

  const existingByName = new Map<string, any>((existingStudents || []).map((s:any) => [normalizeName(s.full_name), s]));
  const missing = names.filter(name => !existingByName.has(normalizeName(name)));
  if (missing.length) {
    const { data: inserted, error: insertError } = await ctx.supabaseAdmin.from('students').insert(missing.map(fullName => ({
      school_id: schoolId,
      full_name: fullName,
      level_key: levelKey,
      level_label: levelLabel,
      grade,
      class_name: className
    }))).select('id, full_name');
    if (insertError) throw insertError;
    for (const s of inserted || []) existingByName.set(normalizeName(s.full_name), s);
  }

  const studentIds:string[] = names.map(name => existingByName.get(normalizeName(name))?.id).filter((v:any): v is string => Boolean(v));
  const { data: existingCodes, error: codesError } = await ctx.supabaseAdmin
    .from('access_codes')
    .select('id, student_id, active, used_at, expires_at, revoked_at')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });
  if (codesError) throw codesError;

  const activeByStudent = new Map<string, any>();
  for (const c of existingCodes || []) {
    if (!activeByStudent.has(c.student_id) && c.active && !c.revoked_at && !c.used_at && !(c.expires_at && new Date(c.expires_at).getTime() < Date.now())) activeByStudent.set(c.student_id, c);
  }

  const generated:any[] = [];
  const skipped:string[] = [];
  for (const name of names) {
    const student = existingByName.get(normalizeName(name));
    if (!student) continue;
    if (activeByStudent.has(student.id)) {
      skipped.push(name);
      continue;
    }
    const plainCode = makeCode(grade, className);
    const codeHash = await sha256Hex(plainCode);
    const hint = plainCode.slice(-4);
    const { data: codeRow, error: codeError } = await ctx.supabaseAdmin.from('access_codes').insert({
      student_id: student.id,
      code_hash: codeHash,
      code_hint: hint,
      active: true,
      expires_at: expiresAt || null,
      created_by: userId
    }).select('id').single();
    if (codeError) throw codeError;
    generated.push({
      id: codeRow.id,
      studentId: student.id,
      name,
      school: school.name,
      schoolId: school.id,
      level: levelLabel,
      levelKey,
      grade,
      className,
      code: plainCode,
      codeHint: hint,
      expiresAt: expiresAt || null,
      status: 'available',
      active: true
    });
  }

  return Response.json({ generated, skipped });
}

async function revokeCode(ctx:any, body:any) {
  const codeId = String(body?.codeId || '').trim();
  if (!codeId) return Response.json({ message: 'Código ausente.' }, { status: 400 });
  const { error } = await ctx.supabaseAdmin.from('access_codes').update({ active: false, revoked_at: new Date().toISOString() }).eq('id', codeId).is('used_at', null);
  if (error) throw error;
  return Response.json({ ok: true });
}

async function regenerateCode(ctx:any, userId:string, body:any) {
  const studentId = String(body?.studentId || '').trim();
  if (!studentId) return Response.json({ message: 'Estudante ausente.' }, { status: 400 });

  const { data: student, error: studentError } = await ctx.supabaseAdmin
    .from('students')
    .select('id, full_name, level_key, level_label, grade, class_name, school_id, schools(id, name)')
    .eq('id', studentId)
    .eq('active', true)
    .maybeSingle();
  if (studentError) throw studentError;
  if (!student) return Response.json({ message: 'Estudante não encontrado.' }, { status: 404 });

  const { data: completed, error: attemptError } = await ctx.supabaseAdmin
    .from('diagnostic_attempts')
    .select('id')
    .eq('student_id', studentId)
    .not('submitted_at', 'is', null)
    .limit(1);
  if (attemptError) throw attemptError;
  if ((completed || []).length) return Response.json({ message: 'O estudante já concluiu o diagnóstico. O código não pode ser regenerado nesta aplicação.' }, { status: 409 });

  const { error: revokeError } = await ctx.supabaseAdmin.from('access_codes').update({ active: false, revoked_at: new Date().toISOString() }).eq('student_id', studentId).eq('active', true).is('used_at', null);
  if (revokeError) throw revokeError;

  const plainCode = makeCode(student.grade, student.class_name);
  const codeHash = await sha256Hex(plainCode);
  const hint = plainCode.slice(-4);
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  const { data: inserted, error: insertError } = await ctx.supabaseAdmin.from('access_codes').insert({
    student_id: studentId,
    code_hash: codeHash,
    code_hint: hint,
    active: true,
    expires_at: expires,
    created_by: userId
  }).select('id').single();
  if (insertError) throw insertError;

  const school:any = Array.isArray((student as any).schools) ? (student as any).schools[0] : (student as any).schools;
  return Response.json({ generated: {
    id: inserted.id,
    studentId,
    name: student.full_name,
    school: school?.name || '—',
    schoolId: school?.id || student.school_id,
    level: student.level_label,
    levelKey: student.level_key,
    grade: student.grade,
    className: student.class_name,
    code: plainCode,
    codeHint: hint,
    expiresAt: expires,
    status: 'available',
    active: true
  }});
}

function resolveStatus(row:any) {
  if (row.revoked_at || !row.active) return 'revoked';
  if (row.used_at) return 'used';
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return 'expired';
  if (row.redeemed_at) return 'redeemed';
  return 'available';
}

function normalizeName(value:string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

function makeCode(grade:string, className:string) {
  const digits = grade.replace(/\D/g, '').slice(0, 2) || 'X';
  const cls = className.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'A';
  let token = '';
  const bytes = crypto.getRandomValues(new Uint32Array(6));
  for (const n of bytes) token += CODE_ALPHABET[n % CODE_ALPHABET.length];
  return `FCD-${digits}${cls}-${token}`;
}
