(() => {
  'use strict';
  const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
  const SOURCE_KEY='nexo.sources.v17';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaultSources=[
    {id:'src-edu',name:'App Formação Cidadã',area:'Educação',type:'App',status:'live',note:'Aula, participação, escola, série, turma e diagnóstico pós-aula.'},
    {id:'src-social',name:'App Proteção Social',area:'Assistência Social',type:'App',status:'planned',note:'Demandas, vínculos, acesso a serviços e encaminhamentos.'},
    {id:'src-territory',name:'App Território Vivo',area:'Território',type:'App',status:'planned',note:'Infraestrutura, mobilidade, riscos e acesso a equipamentos.'},
    {id:'src-youth',name:'App Juventude',area:'Juventude',type:'App',status:'planned',note:'Estudo, trabalho, participação e projeto de vida.'}
  ];
  function getSources(){try{const v=JSON.parse(localStorage.getItem(SOURCE_KEY)||'null');return Array.isArray(v)&&v.length?v:defaultSources}catch(_){return defaultSources}}
  function saveSources(v){localStorage.setItem(SOURCE_KEY,JSON.stringify(v));renderSourcesHub();updateSourceKpi()}
  function injectBrand(){
    document.title='NEXO Público | Plataforma de Gestão';
    document.querySelector('meta[name="description"]')?.setAttribute('content','NEXO Público — Inteligência Integrada para Tomada de Decisão.');
    const brand=$('.sidebar-brand'); if(brand){const strong=brand.querySelector('strong'),small=brand.querySelector('small');if(strong)strong.textContent='NEXO Público';if(small)small.textContent='Plataforma de Gestão'}
    $$('.brand-lockup span:last-child').forEach(el=>el.textContent='NEXO Público');
    const hero=$('.login-copy'); if(hero){const h=hero.querySelector('h1'),p=hero.querySelector('p'); if(h)h.textContent='Inteligência integrada para decidir melhor.'; if(p)p.textContent='Conecte dados, territórios, políticas públicas, agentes analíticos e ações em uma única plataforma de gestão.'}
    $$('.login-visual small').forEach(el=>el.textContent='NEXO Público • Inteligência Integrada para Tomada de Decisão');
    $$('.sidebar-footer small').forEach(el=>el.textContent='v1.7 • NEXO Público');
    const top=$('.topbar-left'); if(top&&!$('#nexoBrandBadge')) top.insertAdjacentHTML('beforeend','<span id="nexoBrandBadge" class="nexo-brand-badge"><i></i>NEXO Público</span>');
  }
  function injectHub(){
    const sec=$('#section-diagnostics'); if(!sec||$('#nexoSourceHubBlock'))return false;
    const b=document.createElement('details'); b.id='nexoSourceHubBlock'; b.className='decision-block'; b.open=true;
    b.innerHTML=`<summary><span><b>08</b><span><strong>Central de Fontes e Apps</strong><small>Cadastre as origens que alimentarão o NEXO Público.</small></span></span><i>⌄</i></summary><div class="decision-block-body"><div class="nexo-source-hub"><div class="nexo-source-form"><span class="eyebrow">NOVA FONTE</span><h4>Registrar app ou instrumento</h4><div class="form-grid"><label class="field full"><span>Nome</span><input id="nexoSourceName" placeholder="Ex.: App Segurança Alimentar"></label><label class="field"><span>Área</span><input id="nexoSourceArea" placeholder="Ex.: Segurança Alimentar"></label><label class="field"><span>Tipo</span><select id="nexoSourceType"><option>App</option><option>Planilha</option><option>Formulário</option><option>Sistema externo</option><option>Pesquisa</option></select></label><label class="field"><span>Status</span><select id="nexoSourceStatus"><option value="planned">Preparado</option><option value="live">Conectado</option><option value="paused">Pausado</option></select></label><label class="field full"><span>Descrição</span><textarea id="nexoSourceNote" placeholder="Que informações esta fonte fornecerá ao NEXO?"></textarea></label></div><div class="form-actions"><button id="nexoSaveSource" class="btn btn-primary">Adicionar fonte</button><button id="nexoResetSources" class="btn btn-secondary">Restaurar padrão</button></div><div class="nexo-hub-note">Na V1.7 este cadastro fica no navegador. A migração para persistência administrativa no Supabase está prevista no backend.</div></div><div class="nexo-source-list"><div class="panel-head"><div><span class="eyebrow">ECOSSISTEMA</span><h4>Fontes registradas</h4></div><span id="nexoSourcesCount" class="panel-note">0 fontes</span></div><div id="nexoSourceCards" class="nexo-source-cards"></div></div></div></div>`;
    sec.appendChild(b);
    return true;
  }
  function renderSourcesHub(){
    const root=$('#nexoSourceCards'); if(!root)return; const v=getSources(); $('#nexoSourcesCount').textContent=`${v.length} fonte(s)`;
    root.innerHTML=v.map(s=>`<article class="nexo-source-item"><div class="nexo-source-icon">${esc((s.area||'ND').slice(0,2).toUpperCase())}</div><div><strong>${esc(s.name)}</strong><small>${esc(s.area)} • ${esc(s.type)}</small><p>${esc(s.note||'')}</p></div><div class="nexo-source-actions"><span class="nexo-source-status ${s.status}">${s.status==='live'?'Conectado':s.status==='paused'?'Pausado':'Preparado'}</span><button class="nexo-mini-toggle" data-src-toggle="${s.id}">Alternar</button>${s.id!=='src-edu'?`<button class="nexo-mini-delete" data-src-del="${s.id}">Excluir</button>`:''}</div></article>`).join('');
  }
  function updateSourceKpi(){const live=getSources().filter(s=>s.status==='live').length; const k=$('#decisionKpiSources'); if(k)k.textContent=live}
  function bindHub(){
    $('#nexoSaveSource')?.addEventListener('click',()=>{const name=$('#nexoSourceName').value.trim(),area=$('#nexoSourceArea').value.trim();if(!name||!area)return;const v=getSources();v.push({id:'src-'+Date.now(),name,area,type:$('#nexoSourceType').value,status:$('#nexoSourceStatus').value,note:$('#nexoSourceNote').value.trim()});saveSources(v);['nexoSourceName','nexoSourceArea','nexoSourceNote'].forEach(id=>$('#'+id).value='')});
    $('#nexoResetSources')?.addEventListener('click',()=>{localStorage.removeItem(SOURCE_KEY);renderSourcesHub();updateSourceKpi()});
    $('#nexoSourceCards')?.addEventListener('click',e=>{const t=e.target.closest('[data-src-toggle],[data-src-del]');if(!t)return;let v=getSources();if(t.dataset.srcToggle){v=v.map(s=>s.id===t.dataset.srcToggle?{...s,status:s.status==='live'?'paused':'live'}:s)}if(t.dataset.srcDel){v=v.filter(s=>s.id!==t.dataset.srcDel)}saveSources(v)});
  }
  function injectAiBridge(){
    const sec=$('#section-diagnostics');if(!sec||$('#nexoAiBridgeBlock'))return false;
    const b=document.createElement('details');b.id='nexoAiBridgeBlock';b.className='decision-block';b.open=false;b.innerHTML=`<summary><span><b>09</b><span><strong>Ponte de IA Conectável</strong><small>Backend preparado para um modelo real, sem expor chave no navegador.</small></span></span><i>⌄</i></summary><div class="decision-block-body"><div class="nexo-ai-bridge"><div class="nexo-ai-main"><span class="eyebrow">AGENTE IA CONECTADO</span><h4>Pergunte ao NEXO com IA externa</h4><p>Quando a Edge Function <code>nexo-agent</code> estiver implantada e o provedor configurado no servidor, esta área poderá usar um modelo de IA real. Até lá, a Central de Agentes local continua funcionando.</p><div class="nexo-ai-query"><textarea id="nexoAiQuestion" placeholder="Ex.: Cruze os sinais disponíveis e proponha três prioridades de gestão para os próximos 30 dias."></textarea><div class="nexo-ai-actions"><button id="nexoAiAsk" class="btn btn-primary">Consultar IA conectada</button><button id="nexoAiUseLocal" class="btn btn-secondary">Usar motor local</button></div></div><div id="nexoAiResponse" class="nexo-ai-response">IA externa não consultada.</div><div class="nexo-governance-strip"><article><span>Acesso</span><strong>Somente administrador</strong></article><article><span>Chave</span><strong>Nunca no navegador</strong></article><article><span>Dados</span><strong>Contexto mínimo necessário</strong></article><article><span>Decisão</span><strong>Aprovação humana</strong></article></div></div><aside class="nexo-ai-status"><span class="eyebrow">STATUS DA PONTE</span><h4>Infraestrutura</h4><div id="nexoAiState" class="nexo-ai-state"><i></i><span>Não verificado</span></div><div class="nexo-ai-capabilities"><article><strong>Motor local</strong><p>Disponível sem IA externa.</p></article><article><strong>Edge Function</strong><p id="nexoAiFunctionText">nexo-agent preparada no código.</p></article><article><strong>Provedor</strong><p>Configurável por segredo de servidor.</p></article><article><strong>Auditoria</strong><p>Resposta deve retornar evidências e limitações.</p></article></div><div class="nexo-ai-meta"><span>V1.7</span><span>fallback local</span><span>human-in-the-loop</span></div></aside></div></div>`;sec.appendChild(b);return true;
  }
  function bindAi(){
    $('#nexoAiUseLocal')?.addEventListener('click',()=>{const q=$('#nexoAiQuestion').value.trim();const local=$('#agentQuestion');if(local){local.value=q||'Quais são os principais pontos de atenção?';$('#agentAskBtn')?.click();$('#agentAnswer')?.scrollIntoView({behavior:'smooth',block:'center'})}});
    $('#nexoAiAsk')?.addEventListener('click',askRemote);
  }
  async function askRemote(){
    const out=$('#nexoAiResponse'),state=$('#nexoAiState'),q=$('#nexoAiQuestion').value.trim(); if(!q){out.textContent='Digite uma pergunta.';return}
    if(window.APP_CONFIG?.demoMode){state.className='nexo-ai-state';state.querySelector('span').textContent='Modo demonstração';out.textContent='A IA externa ainda não está ativada. Use “Usar motor local”. A Edge Function foi preparada para uma futura conexão segura.';return}
    try{
      const sb=window.supabase?.createClient?.(window.APP_CONFIG.supabase.url,window.APP_CONFIG.supabase.publishableKey);if(!sb)throw new Error('Cliente Supabase indisponível');state.className='nexo-ai-state';state.querySelector('span').textContent='Consultando backend...';out.textContent='Analisando...';
      const context={question:q,source_count:getSources().filter(s=>s.status==='live').length,visible_kpis:{schools:$('#kpiSchools')?.textContent,people:$('#kpiParticipants')?.textContent,completed:$('#kpiCompleted')?.textContent,participation:$('#kpiParticipation')?.textContent,average:$('#kpiAverage')?.textContent}};
      const {data,error}=await sb.functions.invoke('nexo-agent',{body:context});if(error)throw error;state.className='nexo-ai-state online';state.querySelector('span').textContent='IA conectada';out.textContent=data?.answer||'Resposta recebida sem conteúdo.';
    }catch(err){state.className='nexo-ai-state error';state.querySelector('span').textContent='Ponte indisponível';out.textContent=`Não foi possível consultar a IA conectada. ${err?.message||''}\n\nUse o motor local enquanto o backend/provedor não estiver configurado.`}
  }
  function init(){injectBrand();let n=0;const t=setInterval(()=>{n++;const a=injectHub(),b=injectAiBridge();if((a||$('#nexoSourceHubBlock'))&&(b||$('#nexoAiBridgeBlock'))){clearInterval(t);renderSourcesHub();updateSourceKpi();bindHub();bindAi()}else if(n>50)clearInterval(t)},100)}
  window.addEventListener('load',init);
})();