(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const KEY='fcd.decision.actions.v15';
  let charts={};
  let map=null, mapLayer=null;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const today=()=>new Date().toISOString().slice(0,10);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d)?v:d.toLocaleDateString('pt-BR')};

  function getRows(){
    try{
      const demo=window.generateDemoResults?.()||[];
      return demo;
    }catch(_){ return []; }
  }
  function getSchools(){ return window.DEMO_SCHOOLS||[]; }

  function schoolMetrics(){
    const rows=getRows(), schools=getSchools();
    const g={};
    rows.forEach(r=>{g[r.school]??={rows:[],classes:new Set()};g[r.school].rows.push(r);g[r.school].classes.add(`${r.grade}|${r.className}`)});
    return Object.entries(g).map(([name,x])=>{
      const done=x.rows.filter(r=>r.completed!==false);
      const meta=schools.find(s=>s.name===name)||{};
      const participation=x.rows.length?done.length/x.rows.length*100:0;
      const mean=avg(done.map(r=>Number(r.percent)||0));
      const digital=avg(done.map(r=>Number(r.themeScores?.['Vida digital'])).filter(Number.isFinite));
      const critical=avg(done.map(r=>Number(r.themeScores?.['Pensamento crítico'])).filter(Number.isFinite));
      const project=avg(done.map(r=>Number(r.themeScores?.['Projeto de vida'])).filter(Number.isFinite));
      const priority=pct((100-participation)*.30+(100-mean)*.35+(100-digital)*.15+(100-critical)*.10+(100-project)*.10);
      return {name,rows:x.rows.length,completed:done.length,participation:pct(participation),mean:pct(mean),priority,latitude:Number(meta.latitude),longitude:Number(meta.longitude),district:meta.district||'—'};
    }).sort((a,b)=>b.priority-a.priority);
  }

  function inject(){
    const target=$('#section-diagnostics .decision-block:nth-of-type(3)');
    const section=$('#section-diagnostics');
    if(!section||$('#decisionSituationRoom'))return;
    const wrap=document.createElement('div');
    wrap.id='decisionSituationRoom';
    wrap.innerHTML=`
      <details class="decision-block" open>
        <summary><span><b>04</b><span><strong>Sala de Situação</strong><small>Prioridade territorial, urgência × impacto e leitura executiva.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body">
          <div class="decision-v15-note"><strong>Índice demonstrativo de prioridade</strong>Enquanto apenas Educação estiver conectada, este índice usa participação e desempenho educacional. Ele <b>não representa vulnerabilidade social</b>. Quando novas fontes entrarem, a composição poderá incluir renda, acesso a serviços, mobilidade, alimentação e outros indicadores adequados.</div>
          <div class="decision-summary-strip">
            <article><span>Maior prioridade</span><strong id="decisionTopPriority">—</strong></article>
            <article><span>Unidades analisadas</span><strong id="decisionUnitsCount">0</strong></article>
            <article><span>Ações abertas</span><strong id="decisionOpenActions">0</strong></article>
            <article><span>Ações vencidas</span><strong id="decisionLateActions">0</strong></article>
          </div>
          <div class="decision-executive-grid">
            <article class="decision-exec-card"><div class="panel-head"><div><span class="eyebrow">PRIORIDADE TERRITORIAL</span><h4>Mapa de atenção</h4></div><span class="decision-demo-badge">Demonstrativo</span></div><div id="decisionMap" class="decision-map"></div></article>
            <article class="decision-exec-card"><div class="panel-head"><div><span class="eyebrow">RANKING</span><h4>Unidades por prioridade</h4></div><span class="panel-note">maior índice primeiro</span></div><div id="decisionRanking" class="decision-ranking"></div></article>
            <article class="decision-exec-card"><div class="panel-head"><div><span class="eyebrow">URGÊNCIA × IMPACTO</span><h4>Matriz de priorização</h4></div><span class="panel-note">ações cadastradas</span></div><div class="decision-matrix-wrap"><canvas id="decisionMatrixChart"></canvas></div><div class="decision-legend"><span><i></i>Quanto mais à direita e acima, maior prioridade.</span></div></article>
            <article class="decision-exec-card"><div class="panel-head"><div><span class="eyebrow">CARTEIRA</span><h4>Prioridades em acompanhamento</h4></div><span class="panel-note">resultado e prazo</span></div><div id="decisionPriorityTable"></div></article>
          </div>
        </div>
      </details>
      <details class="decision-block" open>
        <summary><span><b>05</b><span><strong>Central de Ações</strong><small>Registre decisão, responsável, prazo, meta e resultado.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body">
          <div class="decision-actions-layout">
            <div class="decision-action-form">
              <span class="eyebrow">NOVA DECISÃO</span><h4>Registrar ação</h4>
              <div class="form-grid">
                <label class="field full"><span>Título da ação</span><input id="actTitle" placeholder="Ex.: Oficina de cidadania digital no 9º ano"></label>
                <label class="field"><span>Área</span><select id="actArea"><option>Educação</option><option>Assistência Social</option><option>Juventude</option><option>Saúde</option><option>Segurança Alimentar</option><option>Território</option><option>Gestão Intersetorial</option></select></label>
                <label class="field"><span>Território / unidade</span><input id="actTerritory" placeholder="Escola, distrito ou comunidade"></label>
                <label class="field"><span>Responsável</span><input id="actOwner" placeholder="Setor ou pessoa responsável"></label>
                <label class="field"><span>Prazo</span><input id="actDeadline" type="date"></label>
                <label class="field full"><span>Meta</span><textarea id="actGoal" placeholder="Resultado esperado, público e indicador de acompanhamento"></textarea></label>
                <label class="field full"><span>Justificativa / evidência</span><textarea id="actEvidence" placeholder="Qual dado, demanda ou sinal motivou a decisão?"></textarea></label>
                <label class="decision-range field"><span>Urgência</span><div class="decision-range-row"><input id="actUrgency" type="range" min="1" max="5" value="3"><output id="actUrgencyOut">3</output></div></label>
                <label class="decision-range field"><span>Impacto esperado</span><div class="decision-range-row"><input id="actImpact" type="range" min="1" max="5" value="3"><output id="actImpactOut">3</output></div></label>
              </div>
              <div class="form-actions"><button id="saveDecisionAction" class="btn btn-primary">Salvar ação</button><button id="clearDecisionAction" class="btn btn-secondary">Limpar</button></div>
              <p id="decisionActionMsg" class="form-message"></p>
            </div>
            <div class="decision-actions-table">
              <div class="decision-actions-toolbar"><strong>Ações registradas</strong><div class="panel-actions"><select id="actionStatusFilter" class="compact-input"><option value="">Todos os status</option><option value="planned">Planejada</option><option value="progress">Em andamento</option><option value="done">Concluída</option><option value="paused">Pausada</option></select><button id="exportActionsCsv" class="btn btn-secondary">Exportar CSV</button></div></div>
              <div class="table-wrap"><table><thead><tr><th>Ação</th><th>Área</th><th>Responsável</th><th>Prazo</th><th>U×I</th><th>Status</th><th>Ações</th></tr></thead><tbody id="decisionActionsBody"></tbody></table></div>
            </div>
          </div>
          <div class="decision-action-alert" style="margin-top:14px">Na versão atual, as ações são salvas neste navegador para demonstração. A estrutura SQL da plataforma pode ser ampliada para persistência central e auditoria multiusuário no Supabase.</div>
        </div>
      </details>`;
    const blocks=section.querySelectorAll('.decision-block');
    if(blocks.length>=3) blocks[2].after(wrap); else section.appendChild(wrap);
  }

  function getActions(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return[]} }
  function setActions(v){localStorage.setItem(KEY,JSON.stringify(v));renderAllV15()}
  function seed(){if(getActions().length)return;setActions([
    {id:'a1',title:'Reforço sobre cidadania digital',area:'Educação',territory:'E.M.E.F. Escola Modelo',owner:'Equipe pedagógica',deadline:new Date(Date.now()+7*864e5).toISOString().slice(0,10),goal:'Elevar compreensão em vida digital nas próximas aplicações.',evidence:'Indicador demonstrativo de desempenho.',urgency:4,impact:4,status:'progress',result:''},
    {id:'a2',title:'Reunião intersetorial para definir novas fontes',area:'Gestão Intersetorial',territory:'Município',owner:'Coordenação do projeto',deadline:new Date(Date.now()+14*864e5).toISOString().slice(0,10),goal:'Definir 2 novas fontes de dados e responsáveis.',evidence:'BI ainda alimentado apenas por Educação.',urgency:3,impact:5,status:'planned',result:''}
  ])}

  function renderRanking(){const data=schoolMetrics();$('#decisionUnitsCount').textContent=data.length;$('#decisionTopPriority').textContent=data[0]?.name||'—';$('#decisionRanking').innerHTML=data.slice(0,8).map((s,i)=>{const cls=s.priority>=70?'priority-critical':s.priority>=50?'priority-high':s.priority>=30?'priority-medium':'priority-low';return`<div class="decision-rank-row"><span class="decision-rank-index">${String(i+1).padStart(2,'0')}</span><div class="decision-rank-main"><strong>${esc(s.name)}</strong><small>${esc(s.district)} • ${s.participation}% participação • ${s.mean}% média</small><div class="priority-bar"><i style="width:${s.priority}%"></i></div></div><div class="decision-rank-score ${cls}"><strong>${s.priority}</strong><small>índice</small></div></div>`}).join('')||'<div class="decision-empty-state">Sem unidades para analisar.</div>'}

  function renderMap(){const data=schoolMetrics().filter(s=>Number.isFinite(s.latitude)&&Number.isFinite(s.longitude));const el=$('#decisionMap');if(!el)return;if(!window.L||!data.length){el.innerHTML='<div class="decision-empty-state">Cadastre latitude/longitude das unidades para exibir o mapa.</div>';return}if(!map){map=L.map('decisionMap',{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);mapLayer=L.layerGroup().addTo(map)}mapLayer.clearLayers();const bounds=[];data.forEach(s=>{const radius=8+s.priority/18;const m=L.circleMarker([s.latitude,s.longitude],{radius,color:'#7dd3fc',weight:2,fillColor:s.priority>=60?'#fb7185':s.priority>=35?'#fbbf24':'#34d399',fillOpacity:.8});m.bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.district)}<br><br>Índice demonstrativo: ${s.priority}<br>Participação: ${s.participation}%<br>Média: ${s.mean}%`);m.addTo(mapLayer);bounds.push([s.latitude,s.longitude])});bounds.length===1?map.setView(bounds[0],13):map.fitBounds(bounds,{padding:[25,25],maxZoom:12});setTimeout(()=>map.invalidateSize(),100)}

  function renderMatrix(){if(!window.Chart||!$('#decisionMatrixChart'))return;if(charts.matrix)charts.matrix.destroy();const acts=getActions();charts.matrix=new Chart($('#decisionMatrixChart'),{type:'scatter',data:{datasets:[{data:acts.map(a=>({x:Number(a.urgency),y:Number(a.impact),title:a.title})),backgroundColor:'#7dd3fc',pointRadius:8,pointHoverRadius:10}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.title}: urgência ${c.raw.x}, impacto ${c.raw.y}`}}},scales:{x:{min:.5,max:5.5,ticks:{stepSize:1,color:'#71869b'},title:{display:true,text:'Urgência',color:'#8298ad'},grid:{color:'rgba(154,178,207,.07)'}},y:{min:.5,max:5.5,ticks:{stepSize:1,color:'#71869b'},title:{display:true,text:'Impacto',color:'#8298ad'},grid:{color:'rgba(154,178,207,.07)'}}}}})}

  function statusLabel(s){return({planned:'Planejada',progress:'Em andamento',done:'Concluída',paused:'Pausada'})[s]||s}
  function renderActions(){const filter=$('#actionStatusFilter')?.value||'';const acts=getActions();const now=today();$('#decisionOpenActions').textContent=acts.filter(a=>a.status!=='done').length;$('#decisionLateActions').textContent=acts.filter(a=>a.status!=='done'&&a.deadline&&a.deadline<now).length;const body=$('#decisionActionsBody');if(!body)return;body.innerHTML=acts.filter(a=>!filter||a.status===filter).map(a=>`<tr><td><strong>${esc(a.title)}</strong><p>${esc(a.territory||'')}</p></td><td>${esc(a.area)}</td><td>${esc(a.owner||'—')}</td><td>${fmtDate(a.deadline)}</td><td><strong>${a.urgency}×${a.impact}</strong></td><td><span class="action-status ${a.status}">${statusLabel(a.status)}</span></td><td><button class="decision-mini-btn" data-next="${a.id}">Avançar status</button> <button class="decision-mini-btn danger" data-del="${a.id}">Excluir</button></td></tr>`).join('')||'<tr><td colspan="7">Nenhuma ação neste filtro.</td></tr>';renderPriorityTable(acts)}
  function renderPriorityTable(acts){const root=$('#decisionPriorityTable');if(!root)return;const sorted=[...acts].sort((a,b)=>(b.urgency*b.impact)-(a.urgency*a.impact));root.innerHTML=`<table class="decision-priority-table-v15"><thead><tr><th>Ação</th><th>Área</th><th>Pontuação</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${sorted.slice(0,7).map(a=>`<tr><td><strong>${esc(a.title)}</strong></td><td>${esc(a.area)}</td><td>${a.urgency*a.impact}/25</td><td>${fmtDate(a.deadline)}</td><td>${statusLabel(a.status)}</td></tr>`).join('')}</tbody></table>`}

  function saveAction(){const title=$('#actTitle').value.trim();if(!title){$('#decisionActionMsg').textContent='Informe o título da ação.';$('#decisionActionMsg').className='form-message error';return}const a={id:'a'+Date.now(),title,area:$('#actArea').value,territory:$('#actTerritory').value.trim(),owner:$('#actOwner').value.trim(),deadline:$('#actDeadline').value,goal:$('#actGoal').value.trim(),evidence:$('#actEvidence').value.trim(),urgency:Number($('#actUrgency').value),impact:Number($('#actImpact').value),status:'planned',result:''};setActions([a,...getActions()]);clearForm();$('#decisionActionMsg').textContent='Ação registrada.';$('#decisionActionMsg').className='form-message success'}
  function clearForm(){['actTitle','actTerritory','actOwner','actDeadline','actGoal','actEvidence'].forEach(id=>{const e=$('#'+id);if(e)e.value=''});$('#actUrgency').value=3;$('#actImpact').value=3;$('#actUrgencyOut').textContent='3';$('#actImpactOut').textContent='3'}
  function advance(id){const order=['planned','progress','done','paused'];const acts=getActions();const a=acts.find(x=>x.id===id);if(!a)return;a.status=order[(order.indexOf(a.status)+1)%order.length];setActions(acts)}
  function del(id){setActions(getActions().filter(a=>a.id!==id))}
  function exportCsv(){const rows=[['Ação','Área','Território','Responsável','Prazo','Meta','Evidência','Urgência','Impacto','Status'],...getActions().map(a=>[a.title,a.area,a.territory,a.owner,a.deadline,a.goal,a.evidence,a.urgency,a.impact,statusLabel(a.status)])];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='formacao-cidada-central-acoes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}

  function bind(){
    $('#actUrgency')?.addEventListener('input',e=>$('#actUrgencyOut').textContent=e.target.value);$('#actImpact')?.addEventListener('input',e=>$('#actImpactOut').textContent=e.target.value);$('#saveDecisionAction')?.addEventListener('click',saveAction);$('#clearDecisionAction')?.addEventListener('click',clearForm);$('#actionStatusFilter')?.addEventListener('change',renderActions);$('#exportActionsCsv')?.addEventListener('click',exportCsv);$('#decisionActionsBody')?.addEventListener('click',e=>{const n=e.target.closest('[data-next]'),d=e.target.closest('[data-del]');if(n)advance(n.dataset.next);if(d&&confirm('Excluir esta ação?'))del(d.dataset.del)});
    const nav=document.querySelector('[data-section="diagnostics"]');nav?.addEventListener('click',()=>setTimeout(renderAllV15,120));
  }
  function renderAllV15(){renderRanking();renderMap();renderMatrix();renderActions()}
  function loadCss(){if(document.querySelector('link[href="assets/css/decision-v15.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='assets/css/decision-v15.css';document.head.appendChild(l)}
  function init(){loadCss();inject();seed();bind();renderAllV15()}
  window.addEventListener('load',()=>setTimeout(init,120));
})();