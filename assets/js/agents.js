(() => {
  'use strict';
  const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0; const pct=v=>Math.round(Number(v)||0);
  const themeNames=['Cidadania','Convivência','Vida digital','Pensamento crítico','Projeto de vida'];
  let lastRecommendation=null;

  function rows(){
    if(window.APP_CONFIG?.demoMode){ try{return window.generateDemoResults?.()||[]}catch(_){return[]} }
    return [];
  }
  function dashboardSnapshot(){
    return {schools:Number($('#kpiSchools')?.textContent||0),people:Number($('#kpiParticipants')?.textContent||0),completed:Number($('#kpiCompleted')?.textContent||0),average:$('#kpiAverage')?.textContent||'—',participation:$('#kpiParticipation')?.textContent||'—'};
  }
  function schoolStats(data){
    const g={}; data.forEach(r=>{g[r.school]??=[];g[r.school].push(r)});
    return Object.entries(g).map(([name,rs])=>{const done=rs.filter(r=>r.completed!==false);return{name,total:rs.length,completed:done.length,participation:rs.length?pct(done.length/rs.length*100):0,mean:pct(avg(done.map(r=>Number(r.percent)||0)))}}).sort((a,b)=>a.participation-b.participation||a.mean-b.mean);
  }
  function themeStats(data){
    const done=data.filter(r=>r.completed!==false); return themeNames.map(t=>({theme:t,value:pct(avg(done.map(r=>Number(r.themeScores?.[t])).filter(Number.isFinite)))})).sort((a,b)=>a.value-b.value);
  }
  function qualityStats(data){
    const key=r=>`${String(r.name||'').trim().toLowerCase()}|${r.school||''}|${r.grade||''}|${r.className||''}`;
    const seen=new Set(); let duplicates=0,missing=0,incomplete=0;
    data.forEach(r=>{const k=key(r);if(seen.has(k))duplicates++;seen.add(k);if(!r.name||!r.school)missing++;if(r.completed===false)incomplete++});
    const schools=window.DEMO_SCHOOLS||[]; const noCoords=schools.filter(s=>!Number.isFinite(Number(s.latitude))||!Number.isFinite(Number(s.longitude))).length;
    return {records:data.length,duplicates,missing,incomplete,noCoords};
  }
  function analysis(){
    const data=rows(), snap=dashboardSnapshot(), schools=schoolStats(data), themes=themeStats(data), quality=qualityStats(data);
    return {data,snap,schools,themes,quality,worstSchool:schools[0]||null,worstTheme:themes[0]||null};
  }
  function card(label,title,text){return`<article><span>${esc(label)}</span><strong>${esc(title)}</strong><p>${esc(text)}</p></article>`}
  function setOutput(title,html,actions=''){
    const root=$('#agentResult'); if(!root)return; $('#agentOutputTitle').textContent=title; root.innerHTML=html+(actions?`<div class="agent-actions-row">${actions}</div>`:'');
  }
  function runQuality(){
    const a=analysis(),q=a.quality;
    setOutput('Agente de Qualidade dos Dados',`<div class="agent-data-quality"><div><span>Registros</span><strong>${q.records||a.snap.people}</strong></div><div><span>Duplicidades</span><strong>${q.duplicates}</strong></div><div><span>Cadastros essenciais ausentes</span><strong>${q.missing}</strong></div><div><span>Sem conclusão</span><strong>${q.incomplete||Math.max(0,a.snap.people-a.snap.completed)}</strong></div></div>${card('Leitura','Consistência da base',q.duplicates||q.missing?'Há ocorrências que precisam ser revisadas antes de análises mais sensíveis.':'Não foram encontrados problemas básicos de identidade na base demonstrativa.')}${card('Cobertura territorial',`${q.noCoords} unidade(s) sem coordenadas`,'Coordenadas completas melhoram mapas e análises territoriais.')}<div class="agent-note">Este agente verifica consistência e completude; ele não altera registros automaticamente.</div>`);
  }
  function runIntelligence(){
    const a=analysis();
    if(!a.data.length){setOutput('Agente de Inteligência',card('Base atual','Dados reais ainda não expostos ao agente','O painel possui indicadores, mas o agente local ainda não recebeu uma ponte segura para a base real. A arquitetura está preparada para isso no backend.'));return}
    const ws=a.worstSchool,wt=a.worstTheme;
    setOutput('Agente de Inteligência',card('Sinal prioritário',wt?.theme||'Sem dados',`Menor média entre os eixos analisados: ${wt?.value??0}%.`)+card('Unidade para observar',ws?.name||'Sem dados',`Participação ${ws?.participation??0}% e média ${ws?.mean??0}% na base demonstrativa.`)+card('Interpretação','Necessita confirmação no território','O indicador aponta onde investigar primeiro; não prova sozinho a causa do problema.'));
  }
  function runDecision(){
    const a=analysis(),ws=a.worstSchool,wt=a.worstTheme;
    if(!ws||!wt){setOutput('Agente de Tomada de Decisão',card('Recomendação','Aguardando dados suficientes','Conecte uma base disponível ao agente para gerar uma recomendação auditável.'));return}
    lastRecommendation={title:`Ação focal sobre ${wt.theme}`,territory:ws.name,goal:`Realizar ação focal, reaplicar o instrumento e buscar melhora mensurável no eixo ${wt.theme}.`,evidence:`${wt.theme}: ${wt.value}% de média. ${ws.name}: ${ws.participation}% de participação e ${ws.mean}% de média.`,urgency:ws.participation<60?4:3,impact:4};
    setOutput('Agente de Tomada de Decisão',card('Prioridade sugerida',ws.name,`Investigar o baixo desempenho relativo em ${wt.theme} e verificar se o padrão se repete por turma.`)+card('Ação sugerida',lastRecommendation.title,'Aplicar intervenção curta, documentar responsável e prazo, e comparar o indicador na próxima aplicação.')+card('Critério de revisão','Decisão humana obrigatória','A recomendação deve ser validada pelo gestor e pela equipe responsável antes de virar ação.'),'<button id="agentSendAction" class="btn btn-primary">Enviar à Central de Ações</button>');
    $('#agentSendAction')?.addEventListener('click',sendRecommendation);
  }
  function executiveText(){
    const a=analysis(),ws=a.worstSchool,wt=a.worstTheme,q=a.quality;
    return `NEXO PÚBLICO — RESUMO EXECUTIVO\nData: ${new Date().toLocaleString('pt-BR')}\n\nCobertura: ${a.snap.schools} unidade(s) / ${a.snap.people} registro(s) / ${a.snap.completed} resposta(s) concluída(s).\nParticipação: ${a.snap.participation}. Média geral: ${a.snap.average}.\n\nPonto de atenção temático: ${wt?`${wt.theme} (${wt.value}%)`:'dados insuficientes'}.\nUnidade para observação: ${ws?`${ws.name} — participação ${ws.participation}% / média ${ws.mean}%`:'dados insuficientes'}.\nQualidade: ${q.duplicates} duplicidade(s), ${q.missing} cadastro(s) essencial(is) incompleto(s).\n\nRecomendação: validar os sinais com a equipe responsável, registrar uma ação na Central de Ações e acompanhar indicador, prazo e resultado.\n\nNota: análises atuais são demonstrativas e predominantemente educacionais; não representam diagnóstico social individual.`;
  }
  function runReport(){
    const text=executiveText(); setOutput('Agente de Relatórios',card('Resumo executivo','Relatório gerado','Consolidado com cobertura, participação, principal sinal, qualidade dos dados e recomendação de acompanhamento.'),'<button id="agentDownloadReport" class="btn btn-primary">Baixar resumo TXT</button>'); $('#agentDownloadReport')?.addEventListener('click',()=>download('nexo-publico-resumo-executivo.txt',text));
  }
  function download(name,text){const b=new Blob([text],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function sendRecommendation(){
    if(!lastRecommendation)return; const m=lastRecommendation;
    if($('#actTitle'))$('#actTitle').value=m.title;if($('#actArea'))$('#actArea').value='Educação';if($('#actTerritory'))$('#actTerritory').value=m.territory;if($('#actOwner'))$('#actOwner').value='Equipe responsável';if($('#actGoal'))$('#actGoal').value=m.goal;if($('#actEvidence'))$('#actEvidence').value=m.evidence;if($('#actUrgency')){$('#actUrgency').value=m.urgency;$('#actUrgencyOut').value=m.urgency}if($('#actImpact')){$('#actImpact').value=m.impact;$('#actImpactOut').value=m.impact}
    $('#actTitle')?.scrollIntoView({behavior:'smooth',block:'center'}); setOutput('Agente de Tomada de Decisão',card('Enviado','Central de Ações preenchida','Revise os campos, escolha responsável e prazo e só então salve a ação.'));
  }
  function ask(){
    const q=($('#agentQuestion')?.value||'').trim().toLocaleLowerCase('pt-BR'),a=analysis(); if(!q)return;
    let ans='Nesta versão, a consulta usa regras analíticas auditáveis. Pergunte sobre pontos de atenção, participação, desempenho, qualidade dos dados, prioridade ou resumo executivo.';
    if(/ponto|atenção|prioridade|primeiro/.test(q)){ans=`O primeiro sinal a investigar é ${a.worstTheme?.theme||'indisponível'} (${a.worstTheme?.value??0}%). A unidade com menor combinação de participação e desempenho na base demonstrativa é ${a.worstSchool?.name||'indisponível'}. Isso é um sinal para investigação, não uma conclusão causal.`}
    else if(/escola|unidade|participa/.test(q)){ans=a.worstSchool?`${a.worstSchool.name} apresenta ${a.worstSchool.participation}% de participação e ${a.worstSchool.mean}% de média na base demonstrativa. Compare turmas e período antes de agir.`:'Não há dados de unidade disponíveis ao agente.'}
    else if(/tema|eixo|desempenho/.test(q)){ans=a.worstTheme?`O eixo com menor média é ${a.worstTheme.theme}, com ${a.worstTheme.value}%. Recomendo verificar quais questões puxam esse resultado para baixo e se o padrão se repete entre turmas.`:'Não há dados temáticos disponíveis.'}
    else if(/qualidade|erro|duplic/.test(q)){ans=`Qualidade atual: ${a.quality.duplicates} duplicidade(s), ${a.quality.missing} cadastro(s) essencial(is) incompleto(s) e ${a.quality.incomplete} registro(s) sem conclusão na base demonstrativa.`}
    else if(/resumo|executivo|relatório/.test(q)){ans=executiveText().replace(/\n/g,' ')}
    $('#agentAnswer').textContent=ans;
  }
  async function runAll(){
    const log=$('#agentLog'); if(log)log.innerHTML=''; const steps=[['Qualidade dos Dados',runQuality],['Inteligência',runIntelligence],['Tomada de Decisão',runDecision],['Relatórios',runReport]];
    for(const [name,fn] of steps){if(log)log.insertAdjacentHTML('beforeend',`<div><i class="pending"></i>${esc(name)} — analisando</div>`);await new Promise(r=>setTimeout(r,220));fn();if(log?.lastElementChild){log.lastElementChild.innerHTML=`<i></i>${esc(name)} — concluído`}}
  }
  function inject(){
    const section=$('#section-diagnostics'); if(!section||$('#agentCenterBlock'))return false;
    const block=document.createElement('details');block.className='decision-block';block.open=true;block.id='agentCenterBlock';block.innerHTML=`<summary><span><b>IA</b><span><strong>Central de Agentes</strong><small>Agentes especializados transformam dados em leitura, recomendação e acompanhamento.</small></span></span><i>⌄</i></summary><div class="decision-block-body"><div class="agent-center"><div class="agent-banner"><div><strong>Agentes analíticos do NEXO Público</strong><p>Esta V1.6 usa regras auditáveis sobre os dados disponíveis. A camada de IA generativa ainda não está conectada, evitando apresentar uma simulação como se fosse um modelo de IA real.</p></div><span class="agent-mode">MOTOR LOCAL • V1.6</span></div><div class="agent-grid"><article class="agent-card"><div class="agent-card-head"><span class="agent-icon">DQ</span><span class="agent-state">ativo</span></div><h4>Qualidade dos Dados</h4><p>Procura duplicidades, ausência de campos e lacunas que podem distorcer análises.</p><button class="btn btn-secondary" data-agent="quality">Executar agente</button></article><article class="agent-card"><div class="agent-card-head"><span class="agent-icon">IN</span><span class="agent-state">ativo</span></div><h4>Inteligência</h4><p>Identifica sinais, diferenças entre unidades e temas que merecem investigação.</p><button class="btn btn-secondary" data-agent="intelligence">Executar agente</button></article><article class="agent-card"><div class="agent-card-head"><span class="agent-icon">TD</span><span class="agent-state">ativo</span></div><h4>Tomada de Decisão</h4><p>Converte o principal sinal em recomendação estruturada para aprovação humana.</p><button class="btn btn-secondary" data-agent="decision">Executar agente</button></article><article class="agent-card"><div class="agent-card-head"><span class="agent-icon">RE</span><span class="agent-state">ativo</span></div><h4>Relatórios</h4><p>Produz síntese executiva com evidências, limitações e próximos passos.</p><button class="btn btn-secondary" data-agent="report">Executar agente</button></article></div><div class="agent-orchestrator"><div><strong>Agente Orquestrador</strong><p>Executa os quatro agentes em sequência e mantém a análise dividida por responsabilidade.</p></div><button id="agentRunAll" class="btn btn-primary">Executar análise completa</button></div><div id="agentLog" class="agent-log"></div><div class="agent-workspace"><div class="agent-output"><div class="agent-output-head"><strong id="agentOutputTitle">Saída dos agentes</strong><small>auditável • apoio à decisão</small></div><div id="agentResult" class="agent-result">${card('Pronto','Selecione um agente','Os resultados aparecerão aqui sem alterar dados automaticamente.')}</div></div><div class="agent-query"><span class="eyebrow">PERGUNTE AO NEXO</span><h4>Consulta rápida aos indicadores</h4><p>Use linguagem natural. Nesta etapa, perguntas suportadas são respondidas por regras transparentes.</p><textarea id="agentQuestion" placeholder="Ex.: Quais são os principais pontos de atenção agora?"></textarea><div class="agent-suggestions"><button data-q="Quais são os principais pontos de atenção?">Pontos de atenção</button><button data-q="Qual unidade tem menor participação?">Menor participação</button><button data-q="Qual eixo tem pior desempenho?">Pior eixo</button><button data-q="Como está a qualidade dos dados?">Qualidade dos dados</button></div><button id="agentAskBtn" class="btn btn-primary">Perguntar ao NEXO</button><div id="agentAnswer" class="agent-answer">Aguardando pergunta.</div></div></div></div></div>`;
    const blocks=section.querySelectorAll('.decision-block'); if(blocks.length>=2)blocks[1].after(block);else section.appendChild(block);
    return true;
  }
  function bind(){
    $$('[data-agent]').forEach(b=>b.addEventListener('click',()=>({quality:runQuality,intelligence:runIntelligence,decision:runDecision,report:runReport}[b.dataset.agent]?.())));$('#agentRunAll')?.addEventListener('click',runAll);$('#agentAskBtn')?.addEventListener('click',ask);$('#agentQuestion')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});$$('[data-q]').forEach(b=>b.addEventListener('click',()=>{$('#agentQuestion').value=b.dataset.q;ask()}));
  }
  function init(){
    let n=0;const t=setInterval(()=>{n++;if(inject()){clearInterval(t);bind()}else if(n>40)clearInterval(t)},100);
  }
  window.addEventListener('load',init);
})();