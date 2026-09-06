import { withSupabase } from 'npm:@supabase/server@1.5.3';
import { QUESTION_BANK } from '../_shared/question-bank.ts';
import { userIdFromContext } from '../_shared/utils.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const userId = userIdFromContext(ctx);
      const body = await req.json().catch(() => ({}));
      const attemptId = String(body?.attemptId || '');
      const incoming = Array.isArray(body?.answers) ? body.answers : [];
      if (!attemptId || !incoming.length) return Response.json({ message: 'Respostas ausentes.' }, { status: 400 });

      const { data: attempt, error: attemptError } = await ctx.supabaseAdmin
        .from('diagnostic_attempts')
        .select('id, student_id, auth_user_id, submitted_at')
        .eq('id', attemptId)
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!attempt) return Response.json({ message: 'Tentativa inválida.' }, { status: 404 });
      if (attempt.submitted_at) return Response.json({ message: 'Diagnóstico já concluído.' }, { status: 409 });

      const { data: assigned, error: assignedError } = await ctx.supabaseAdmin
        .from('attempt_questions')
        .select('question_id, position')
        .eq('attempt_id', attemptId)
        .order('position');
      if (assignedError) throw assignedError;

      const assignedIds = new Set((assigned || []).map(r => r.question_id));
      if (incoming.length !== assignedIds.size) return Response.json({ message: 'Responda todas as questões.' }, { status: 400 });

      const answerMap = new Map(incoming.map((a:any) => [String(a.questionId), Number(a.answerIndex)]));
      for (const id of assignedIds) if (!answerMap.has(id)) return Response.json({ message: 'Conjunto de respostas incompleto.' }, { status: 400 });

      const bank = new Map(QUESTION_BANK.map(q => [q.id, q]));
      let score = 0;
      const rows = [] as any[];
      for (const qid of assignedIds) {
        const q:any = bank.get(qid);
        const idx = answerMap.get(qid);
        if (!q || !Number.isInteger(idx) || idx < 0 || idx >= q.options.length) return Response.json({ message: 'Resposta inválida.' }, { status: 400 });
        const isCorrect = idx === q.correct;
        if (isCorrect) score++;
        rows.push({ attempt_id: attemptId, question_id: qid, answer_index: idx, is_correct: isCorrect });
      }

      const total = rows.length;
      const percent = Math.round((score / total) * 100);
      const { error: answersError } = await ctx.supabaseAdmin.from('answers').insert(rows);
      if (answersError) throw answersError;

      const now = new Date().toISOString();
      const { error: finishError } = await ctx.supabaseAdmin
        .from('diagnostic_attempts')
        .update({ submitted_at: now, score, total, percent })
        .eq('id', attemptId)
        .is('submitted_at', null);
      if (finishError) throw finishError;

      const { error: codeError } = await ctx.supabaseAdmin
        .from('access_codes')
        .update({ used_at: now })
        .eq('auth_user_id', userId)
        .eq('student_id', attempt.student_id)
        .is('used_at', null);
      if (codeError) throw codeError;

      return Response.json({ score, total, percent });
    } catch (err) {
      console.error(err);
      return Response.json({ message: 'Não foi possível registrar o diagnóstico.' }, { status: 500 });
    }
  })
};
