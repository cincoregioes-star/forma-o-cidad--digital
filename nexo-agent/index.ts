import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' }
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401);

  const body = await req.json().catch(() => ({}));
  const question = String(body?.question || '').trim();
  if (!question) return json({ error: 'Pergunta obrigatória' }, 400);

  const provider = Deno.env.get('NEXO_AI_PROVIDER') || '';
  const apiKey = Deno.env.get('NEXO_AI_API_KEY') || '';
  const endpoint = Deno.env.get('NEXO_AI_ENDPOINT') || '';
  const model = Deno.env.get('NEXO_AI_MODEL') || '';

  if (!provider || !apiKey || !endpoint) {
    return json({
      configured: false,
      answer: 'A ponte de IA está preparada, mas nenhum provedor foi configurado no servidor. Continue usando o motor local.'
    });
  }

  const safeContext = {
    question,
    source_count: Number(body?.source_count || 0),
    visible_kpis: body?.visible_kpis || {}
  };

  const system = `Você é o Agente de Inteligência do NEXO Público. Apoie gestores públicos com análise prudente, objetiva e auditável. Nunca trate indicadores agregados como diagnóstico individual. Diferencie claramente fato, sinal, hipótese e recomendação. Sempre devolva: 1) leitura, 2) evidências usadas, 3) limitações, 4) até três prioridades sugeridas, 5) próximo passo que exige validação humana.`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(safeContext) }
    ],
    temperature: 0.2
  };

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: 'Falha no provedor de IA', detail: detail.slice(0, 500) }, 502);
  }

  const data = await upstream.json();
  const answer = data?.choices?.[0]?.message?.content || data?.output_text || data?.answer || '';
  return json({ configured: true, provider, model, answer: String(answer || 'Resposta vazia do provedor.') });
});