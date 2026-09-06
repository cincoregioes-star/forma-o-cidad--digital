import { withSupabase } from 'npm:@supabase/server@1.5.3';
import { QUESTION_BANK } from '../_shared/question-bank.ts';
import { userIdFromContext } from '../_shared/utils.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    try {
      const userId = userIdFromContext(ctx);
      if (Boolean((ctx.jwtClaims as any)?.is_anonymous)) {
        return Response.json({ message: 'Acesso administrativo exige usuário permanente.' }, { status: 403 });
      }

      const { data: admin, error: adminError } = await ctx.supabaseAdmin
        .from('admin_users')
        .select('user_id, active')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();
      if (adminError) throw adminError;
      if (!admin) return Response.json({ message: 'Usuário sem permissão administrativa.' }, { status: 403 });

      const schoolsData = await fetchAll(ctx.supabaseAdmin, 'schools', 'id, name, reference_code, district, municipality, network, latitude, longitude, active', q => q.eq('active', true).order('name'));
      const students = await fetchAll(ctx.supabaseAdmin, 'students', 'id, school_id, full_name, registration_code, level_label, level_key, grade, class_name, active, created_at', q => q.eq('active', true));
      const studentIds = students.map((s:any) => s.id);

      const attempts = studentIds.length
        ? await fetchAll(ctx.supabaseAdmin, 'diagnostic_attempts', 'id, student_id, submitted_at, score, total, percent, started_at', q => q.in('student_id', studentIds).order('started_at', { ascending: false }))
        : [];

      const attemptIds = attempts.filter((a:any) => a.submitted_at).map((a:any) => a.id);
      const answers = attemptIds.length
        ? await fetchAll(ctx.supabaseAdmin, 'answers', 'attempt_id, question_id, is_correct', q => q.in('attempt_id', attemptIds))
        : [];

      const bank = new Map(QUESTION_BANK.map(q => [q.id, q]));
      const schoolMap = new Map(schoolsData.map((s:any) => [s.id, s]));
      const latestAttempt = new Map<string, any>();
      for (const attempt of attempts) if (!latestAttempt.has(attempt.student_id)) latestAttempt.set(attempt.student_id, attempt);

      const answersByAttempt = new Map<string, any[]>();
      for (const ans of answers) {
        const current = answersByAttempt.get(ans.attempt_id) || [];
        current.push(ans);
        answersByAttempt.set(ans.attempt_id, current);
      }

      const rows = students.map((student:any) => {
        const school:any = schoolMap.get(student.school_id);
        const attempt = latestAttempt.get(student.id);
        const attemptAnswers = attempt ? (answersByAttempt.get(attempt.id) || []) : [];
        const themeBuckets = new Map<string, {ok:number,total:number}>();
        const questionErrors:Record<string, number> = {};

        for (const ans of attemptAnswers) {
          const qb:any = bank.get(ans.question_id);
          if (!qb) continue;
          const theme = normalizeTheme(qb.topic);
          const bucket = themeBuckets.get(theme) || { ok: 0, total: 0 };
          bucket.total += 1;
          if (ans.is_correct) bucket.ok += 1;
          themeBuckets.set(theme, bucket);
          questionErrors[qb.topic] = ans.is_correct ? 0 : 100;
        }

        const themeScores:Record<string, number> = {};
        for (const [theme, bucket] of themeBuckets.entries()) themeScores[theme] = Math.round((bucket.ok / bucket.total) * 100);

        return {
          id: attempt?.id || `pending-${student.id}`,
          studentId: student.id,
          registrationCode: student.registration_code || null,
          name: student.full_name || '—',
          school: school?.name || '—',
          schoolId: school?.id || student.school_id,
          level: student.level_label || '—',
          levelKey: student.level_key || '—',
          grade: student.grade || '—',
          className: student.class_name || '—',
          score: attempt?.score ?? 0,
          total: attempt?.total ?? 15,
          percent: attempt?.percent ?? 0,
          completed: Boolean(attempt?.submitted_at),
          date: attempt?.submitted_at ? String(attempt.submitted_at).slice(0, 10) : null,
          themeScores,
          questionErrors
        };
      });

      const schools = schoolsData.map((s:any) => ({
        id: s.id,
        name: s.name,
        referenceCode: s.reference_code || null,
        district: s.district || null,
        municipality: s.municipality || null,
        network: s.network || null,
        latitude: s.latitude === null ? null : Number(s.latitude),
        longitude: s.longitude === null ? null : Number(s.longitude),
        active: s.active
      }));

      return Response.json({ rows, schools });
    } catch (err) {
      console.error(err);
      return Response.json({ message: 'Não foi possível carregar o dashboard.' }, { status: 500 });
    }
  })
};

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

function normalizeTheme(topic:string):string {
  const t = topic.toLowerCase();
  if (t.includes('digital') || t.includes('cyber') || t.includes('reputação')) return 'Vida digital';
  if (t.includes('evidência') || t.includes('viés') || t.includes('pensamento') || t.includes('discernimento')) return 'Pensamento crítico';
  if (t.includes('projeto') || t.includes('aptidão') || t.includes('resiliência') || t.includes('autodeterminação')) return 'Projeto de vida';
  if (t.includes('conviv') || t.includes('alteridade') || t.includes('empatia') || t.includes('bullying') || t.includes('conform')) return 'Convivência';
  return 'Cidadania';
}
