import { withSupabase } from 'npm:@supabase/server@1.5.3';
import { QUESTION_BANK } from '../_shared/question-bank.ts';
import { publicQuestion, shuffle, userIdFromContext } from '../_shared/utils.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    try {
      const userId = userIdFromContext(ctx);
      const { data: codeRow, error: codeError } = await ctx.supabaseAdmin
        .from('access_codes')
        .select('id, student_id, used_at, students(id, level_key, active)')
        .eq('auth_user_id', userId)
        .eq('active', true)
        .maybeSingle();
      if (codeError) throw codeError;
      if (!codeRow) return Response.json({ message: 'Código do estudante não validado.' }, { status: 403 });
      if (codeRow.used_at) return Response.json({ message: 'Este diagnóstico já foi concluído.' }, { status: 409 });

      const student: any = Array.isArray(codeRow.students) ? codeRow.students[0] : codeRow.students;
      if (!student?.active) return Response.json({ message: 'Cadastro do estudante inativo.' }, { status: 403 });

      const { data: openAttempt, error: openError } = await ctx.supabaseAdmin
        .from('diagnostic_attempts')
        .select('id')
        .eq('auth_user_id', userId)
        .is('submitted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (openError) throw openError;

      if (openAttempt) {
        const { data: savedQs, error: savedError } = await ctx.supabaseAdmin
          .from('attempt_questions')
          .select('question_id, position')
          .eq('attempt_id', openAttempt.id)
          .order('position');
        if (savedError) throw savedError;
        const byId = new Map(QUESTION_BANK.map(q => [q.id, q]));
        const questions = (savedQs || []).map(r => byId.get(r.question_id)).filter(Boolean).map(publicQuestion);
        return Response.json({ attemptId: openAttempt.id, questions });
      }

      const pool = QUESTION_BANK.filter(q => q.level === student.level_key);
      const concept = shuffle(pool.filter(q => q.type === 'Conceito')).slice(0, 5);
      const application = shuffle(pool.filter(q => q.type === 'Aplicação')).slice(0, 5);
      const scenario = shuffle(pool.filter(q => q.type === 'Situação-problema')).slice(0, 5);
      const selected = shuffle([...concept, ...application, ...scenario]);

      const { data: attempt, error: attemptError } = await ctx.supabaseAdmin
        .from('diagnostic_attempts')
        .insert({ student_id: student.id, auth_user_id: userId, level_key: student.level_key })
        .select('id')
        .single();
      if (attemptError) throw attemptError;

      const { error: questionsError } = await ctx.supabaseAdmin
        .from('attempt_questions')
        .insert(selected.map((q, i) => ({ attempt_id: attempt.id, question_id: q.id, position: i + 1 })));
      if (questionsError) throw questionsError;

      return Response.json({ attemptId: attempt.id, questions: selected.map(publicQuestion) });
    } catch (err) {
      console.error(err);
      return Response.json({ message: 'Não foi possível iniciar o diagnóstico.' }, { status: 500 });
    }
  })
};
