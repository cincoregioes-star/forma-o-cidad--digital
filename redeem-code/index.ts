import { withSupabase } from 'npm:@supabase/server@1.5.3';
import { sha256Hex, userIdFromContext } from '../_shared/utils.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const userId = userIdFromContext(ctx);
      const body = await req.json().catch(() => ({}));
      const code = String(body?.code || '').trim().toUpperCase();
      if (!code || code.length < 6 || code.length > 32) {
        return Response.json({ message: 'Código inválido.' }, { status: 400 });
      }

      const codeHash = await sha256Hex(code);
      const { data: row, error } = await ctx.supabaseAdmin
        .from('access_codes')
        .select('id, student_id, auth_user_id, active, redeemed_at, used_at, expires_at, students(id, full_name, level_key, level_label, grade, class_name, active, schools(name, active))')
        .eq('code_hash', codeHash)
        .maybeSingle();

      if (error) throw error;
      if (!row || !row.active) return Response.json({ message: 'Código não localizado ou inativo.' }, { status: 404 });
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return Response.json({ message: 'Código expirado.' }, { status: 410 });
      if (row.used_at && row.auth_user_id !== userId) return Response.json({ message: 'Código já utilizado.' }, { status: 409 });
      if (row.auth_user_id && row.auth_user_id !== userId) return Response.json({ message: 'Código já vinculado a outro acesso.' }, { status: 409 });

      const student: any = Array.isArray(row.students) ? row.students[0] : row.students;
      if (!student?.active) return Response.json({ message: 'Cadastro do estudante inativo.' }, { status: 403 });
      const school: any = Array.isArray(student.schools) ? student.schools[0] : student.schools;
      if (!school?.active) return Response.json({ message: 'Escola inativa para esta ação.' }, { status: 403 });

      if (!row.auth_user_id) {
        const { error: updateError } = await ctx.supabaseAdmin
          .from('access_codes')
          .update({ auth_user_id: userId, redeemed_at: new Date().toISOString() })
          .eq('id', row.id)
          .is('auth_user_id', null);
        if (updateError) throw updateError;
      }

      return Response.json({
        student: {
          id: student.id,
          name: student.full_name,
          school: school.name,
          level: student.level_label,
          levelKey: student.level_key,
          grade: student.grade,
          className: student.class_name,
        }
      });
    } catch (err) {
      console.error(err);
      return Response.json({ message: 'Não foi possível validar o código.' }, { status: 500 });
    }
  })
};
