(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const sources = [
    {name:'App Formação Cidadã', area:'Educação', status:'live', note:'Aula, participação, escola, série, turma e diagnóstico pós-aula.'},
    {name:'App Proteção Social', area:'Assistência Social', status:'planned', note:'Demandas, encaminhamentos, acesso a serviços, benefícios e vínculos.'},
    {name:'App Território Vivo', area:'Território', status:'planned', note:'Infraestrutura, mobilidade, riscos, acesso a equipamentos e cobertura.'},
    {name:'App Juventude', area:'Juventude', status:'planned', note:'Estudo, trabalho, participação, projeto de vida e oportunidades.'},
    {name:'App Segurança Alimentar', area:'Segurança Alimentar', status:'planned', note:'Acesso a alimentos, produção local, cozinhas, hortas e insegurança alimentar.'},
    {name:'Integração Saúde', area:'Saúde', status:'planned', note:'Somente indicadores autorizados e necessários para análise intersetorial.'},
    {name:'App Inclusão e Acessibilidade', area:'PCD e Idosos', status:'planned', note:'Barreiras de acesso, autonomia, acessibilidade e participação.'},
    {name:'App Trabalho e Renda', area:'Desenvolvimento', status:'planned', note:'Qualificação, ocupação, empreendedorismo e autonomia econômica.'},
    {name:'Painel de Serviços', area:'Gestão', status:'planned', note:'Capacidade, cobertura, tempo de resposta e efetividade das políticas.'}
  ];

  const axes = [
    {id:'renda', title:'Renda, pobreza e vulnerabilidade econômica', questions:[
      ['Quais territórios concentram maior número de famílias com dificuldade recorrente para cobrir despesas básicas?','CRAS/Assistência Social'],
      ['Quais grupos apresentam maior dependência de renda instável, informal ou sazonal?','Assistência Social/Trabalho'],
      ['Em quais territórios a procura por benefícios eventuais cresce mais rápido que a capacidade de resposta?','Gestão/Assistência Social'],
      ['Quantas famílias identificadas como vulneráveis ainda não acessam serviços ou benefícios aos quais podem ter direito?','CRAS/Cadastro'],
      ['Quais fatores mais aparecem associados à perda de renda: desemprego, doença, cuidado familiar, transporte ou sazonalidade?','Assistência Social/Trabalho']
    ]},
    {id:'alimentacao', title:'Segurança alimentar e nutrição', questions:[
      ['Quais territórios apresentam mais sinais de insegurança alimentar ou dificuldade de acesso regular a alimentos?','Assistência Social/Segurança Alimentar'],
      ['Quantas famílias dependem frequentemente de doações emergenciais de alimentos?','Assistência Social'],
      ['Há escolas ou comunidades onde estudantes relatam dificuldade de concentração associada à alimentação inadequada?','Escola'],
      ['Onde programas de produção local, hortas, cozinhas ou compras públicas poderiam gerar maior impacto?','Agricultura/Segurança Alimentar'],
      ['Quais barreiras impedem famílias de acessar equipamentos ou programas de segurança alimentar?','Território/Assistência Social']
    ]},
    {id:'beneficios', title:'Benefícios, documentação e acesso a direitos', questions:[
      ['Quais direitos e serviços são menos conhecidos pela população em cada território?','Assistência Social/Escola'],
      ['Quais documentos ausentes mais bloqueiam acesso a benefícios, matrícula, saúde ou trabalho?','Atendimento/Cidadania'],
      ['Qual é o tempo médio entre identificação de uma necessidade e acesso efetivo ao serviço indicado?','Gestão'],
      ['Quais encaminhamentos têm maior taxa de não conclusão e por quê?','Rede Intersetorial'],
      ['Há grupos que abandonam o processo por dificuldade digital, transporte, horário ou informação?','Gestão/Território']
    ]},
    {id:'educacao', title:'Educação, permanência e aprendizagem', questions:[
      ['Quais escolas, séries ou turmas concentram menor participação nas ações do projeto?','App Formação Cidadã'],
      ['Quais conceitos de cidadania, convivência, vida digital e projeto de vida apresentam maior dificuldade?','App Formação Cidadã'],
      ['Quais fatores relatados pela comunidade escolar mais interferem em frequência, permanência ou aprendizagem?','Escola'],
      ['Em quais unidades há maior necessidade de ações sobre bullying, cyberbullying, convivência ou uso responsável da internet?','Escola'],
      ['Quais estudantes demonstram menor conhecimento sobre onde buscar apoio quando enfrentam um problema?','Escola']
    ]},
    {id:'protecao', title:'Proteção de crianças e adolescentes e fortalecimento de vínculos', questions:[
      ['Quais territórios apresentam maior volume de situações que exigem articulação entre escola, assistência, saúde e proteção?','Rede Intersetorial'],
      ['Quais tipos de fragilização de vínculos aparecem com maior frequência nos atendimentos agregados?','CRAS/SCFV'],
      ['Existem grupos com baixa participação em atividades de convivência e fortalecimento de vínculos?','SCFV'],
      ['Quais barreiras dificultam que famílias procurem ajuda antes de uma situação se agravar?','Assistência Social'],
      ['Quais fluxos intersetoriais precisam ser mais rápidos ou melhor definidos para proteger crianças e adolescentes?','Gestão/Rede']
    ]},
    {id:'trabalho', title:'Trabalho, qualificação e autonomia econômica', questions:[
      ['Quais perfis têm maior dificuldade de inserção no mercado de trabalho local?','Trabalho/Assistência Social'],
      ['Quais cursos e competências têm demanda real no território e baixa oferta de formação?','Desenvolvimento/Empregadores'],
      ['Quantas pessoas deixam oportunidades por falta de transporte, internet, documentos ou cuidado de dependentes?','Trabalho/Território'],
      ['Quais atividades produtivas locais têm potencial para gerar renda com apoio público de baixo custo?','Desenvolvimento/Agricultura'],
      ['Quais jovens estão fora da escola e do trabalho e quais fatores explicam essa situação?','Juventude/Assistência Social']
    ]},
    {id:'saude', title:'Saúde, bem-estar e articulação com a proteção social', questions:[
      ['Quais demandas de saúde aparecem com maior frequência como barreira para trabalho, estudo ou autonomia?','Saúde/Assistência Social'],
      ['Quais territórios têm maior dificuldade de acesso a serviços de saúde por distância, transporte ou horário?','Saúde/Território'],
      ['Quais sinais agregados de sofrimento emocional estão impactando participação escolar ou comunitária?','Escola/Saúde'],
      ['Os encaminhamentos entre assistência e saúde têm retorno para o serviço que originou a demanda?','Rede Intersetorial'],
      ['Quais ações preventivas teriam maior alcance antes que a demanda chegue em situação crítica?','Saúde/Gestão']
    ]},
    {id:'habitacao', title:'Habitação, saneamento e infraestrutura básica', questions:[
      ['Quais territórios concentram moradias com maior precariedade estrutural ou risco ambiental?','Território/Habitação'],
      ['Onde falta de água, saneamento ou energia afeta diretamente saúde, estudo ou segurança alimentar?','Território/Saúde'],
      ['Quais famílias têm maior dificuldade de acessar equipamentos públicos por localização da moradia?','Assistência Social/Território'],
      ['Quais problemas de infraestrutura são recorrentes e poderiam ser resolvidos por ação intersetorial simples?','Gestão/Território'],
      ['Há áreas sujeitas a eventos climáticos que exigem cadastro preventivo de capacidade de resposta?','Defesa Civil/Território']
    ]},
    {id:'mobilidade', title:'Mobilidade e acesso territorial', questions:[
      ['Quantas pessoas deixam de acessar serviços, escola ou oportunidades por falta de transporte?','Território/Usuários'],
      ['Quais rotas e horários concentram maior dificuldade de deslocamento para equipamentos públicos?','Território'],
      ['O custo de transporte é uma barreira relevante para continuidade de atendimentos?','Assistência Social'],
      ['Quais comunidades estão mais distantes da rede de serviços essenciais?','Mapa/Gestão'],
      ['Onde atendimento itinerante reduziria mais desigualdades de acesso?','Gestão/Território']
    ]},
    {id:'digital', title:'Inclusão digital, informação e cidadania digital', questions:[
      ['Quais públicos não possuem dispositivo ou conexão adequada para acessar serviços digitais?','Escola/Assistência Social'],
      ['Quais serviços públicos digitais geram mais dificuldade de uso pela população?','Atendimento/Cidadania'],
      ['Quais grupos precisam de formação para uso seguro da internet e proteção de dados pessoais?','Escola/Comunidade'],
      ['Em quais territórios pontos públicos de acesso digital teriam maior impacto?','Território/Inclusão Digital'],
      ['Qual é a incidência de dificuldades relacionadas a desinformação, golpes, cyberbullying ou exposição indevida?','Escola/Comunidade']
    ]},
    {id:'pcd_idosos', title:'PCD, idosos, acessibilidade e autonomia', questions:[
      ['Quais equipamentos e serviços apresentam barreiras físicas, comunicacionais ou digitais?','Acessibilidade/Gestão'],
      ['Quais pessoas deixam de participar de atividades por falta de transporte ou apoio de acessibilidade?','Assistência Social/Território'],
      ['Onde há maior risco de isolamento social entre pessoas idosas?','CRAS/SCFV'],
      ['Quais tecnologias assistivas ou adaptações simples aumentariam autonomia no território?','PCD/Saúde/Gestão'],
      ['Os serviços conseguem identificar e encaminhar adequadamente demandas de cuidadores familiares?','Assistência Social/Saúde']
    ]},
    {id:'juventude', title:'Juventude, participação e projeto de vida', questions:[
      ['Quais jovens relatam menor perspectiva de continuidade dos estudos ou inserção profissional?','Escola/Juventude'],
      ['Quais oportunidades culturais, esportivas, tecnológicas e profissionais são mais demandadas?','Juventude'],
      ['Quais barreiras impedem jovens de participar das oportunidades já existentes?','Juventude/Território'],
      ['Quanto os jovens conhecem a rede pública de apoio, formação e proteção disponível?','Escola/Juventude'],
      ['Quais competências e interesses aparecem com maior potencial para projetos de protagonismo juvenil?','Escola/Juventude']
    ]},
    {id:'violencias', title:'Prevenção de violências e proteção comunitária', questions:[
      ['Quais tipos de situações de violência aparecem com maior frequência nos registros agregados da rede?','Rede de Proteção'],
      ['Quais territórios apresentam crescimento de encaminhamentos por situações de risco?','Gestão/Rede'],
      ['Quais serviços precisam de protocolo mais claro para resposta e encaminhamento?','Gestão/Rede'],
      ['Quais ações preventivas podem ser realizadas em escolas, grupos e comunidades sem expor vítimas?','Escola/SCFV/Rede'],
      ['O tempo de resposta entre identificação, encaminhamento e atendimento está adequado à gravidade?','Gestão/Rede']
    ]},
    {id:'rede', title:'Capacidade da rede socioassistencial e intersetorial', questions:[
      ['Quais serviços estão operando mais próximos de sua capacidade e onde existem filas ou espera?','Gestão'],
      ['Quais demandas chegam repetidamente ao serviço sem solução definitiva?','CRAS/Gestão'],
      ['Quais territórios têm baixa cobertura de ações preventivas e alta procura por respostas emergenciais?','Gestão/Território'],
      ['Quais encaminhamentos entre políticas públicas funcionam bem e quais se perdem no caminho?','Rede Intersetorial'],
      ['Onde equipes, horários, transporte ou infraestrutura precisam ser redistribuídos para melhorar cobertura?','Gestão']
    ]},
    {id:'gestao', title:'Efetividade, custo, qualidade e governança', questions:[
      ['Quais ações produzem maior alcance e melhor resultado com os recursos disponíveis?','Gestão'],
      ['Quais indicadores realmente mudam depois de uma intervenção e quais permanecem iguais?','Gestão/Avaliação'],
      ['Quais programas atendem o mesmo público sem integração e podem gerar duplicidade de esforço?','Gestão Intersetorial'],
      ['Quais decisões anteriores cumpriram prazo, meta e resultado esperado?','Gestão/Auditoria'],
      ['Quais dados estão faltando para uma decisão importante e qual instrumento deve coletá-los?','Gestão/BI']
    ]}
  ];

  function renderSources(){ const root=$('#decisionSources'); if(!root) return; root.innerHTML=sources.map(s=>`<article class="decision-source-card"><div class="decision-source-top"><div><strong>${s.name}</strong><small>${s.area}</small></div><span class="source-status ${s.status==='live'?'source-live':'source-planned'}">${s.status==='live'?'Conectado':'Preparado'}</span></div><p>${s.note}</p></article>`).join(''); }
  function populateFilters(){ const axis=$('#decisionAxisFilter'), source=$('#decisionSourceFilter'); if(!axis||!source) return; axis.innerHTML='<option value="">Todos os eixos</option>'+axes.map(a=>`<option value="${a.id}">${a.title}</option>`).join(''); const src=[...new Set(axes.flatMap(a=>a.questions.map(q=>q[1])))].sort((a,b)=>a.localeCompare(b,'pt-BR')); source.innerHTML='<option value="">Todas as fontes</option>'+src.map(s=>`<option value="${s}">${s}</option>`).join(''); }
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderQuestions(){ const root=$('#decisionQuestionCatalog'); if(!root) return; const axis=$('#decisionAxisFilter')?.value||''; const src=$('#decisionSourceFilter')?.value||''; const term=($('#decisionQuestionSearch')?.value||'').trim().toLocaleLowerCase('pt-BR'); const list=axes.map((a,idx)=>({a,idx,qs:a.questions.filter(q=>(!src||q[1]===src)&&(!term||`${q[0]} ${q[1]} ${a.title}`.toLocaleLowerCase('pt-BR').includes(term))) })).filter(x=>(!axis||x.a.id===axis)&&x.qs.length); root.innerHTML=list.map(({a,idx,qs})=>`<details class="decision-axis" ${axis||term||src?'open':''}><summary><div class="decision-axis-title"><span>${String(idx+1).padStart(2,'0')}</span><strong>${esc(a.title)}</strong></div><small>${qs.length} pergunta(s)</small></summary><div class="decision-question-list">${qs.map(q=>`<div class="decision-question"><p>${esc(q[0])}</p><div class="decision-tags"><span class="decision-tag">${esc(q[1])}</span></div></div>`).join('')}</div></details>`).join('')||'<div class="decision-empty">Nenhuma pergunta encontrada para este filtro.</div>'; }
  function updateDecisionKpis(){ [['#decisionKpiUnits','#kpiSchools'],['#decisionKpiPeople','#kpiParticipants'],['#decisionKpiCompleted','#kpiCompleted']].forEach(([dst,src])=>{const d=$(dst),s=$(src);if(d&&s)d.textContent=s.textContent||'0'}); }
  function updateDecisionHeader(){ const section=$('#section-diagnostics'); if(!section?.classList.contains('active')) return; if($('#sectionEyebrow')) $('#sectionEyebrow').textContent='TOMADA DE DECISÃO'; if($('#sectionTitle')) $('#sectionTitle').textContent='BI social e territorial'; updateDecisionKpis(); }
  function initLoginMemory(){ const email=$('#adminEmail'), pass=$('#adminPassword'), remember=$('#rememberAdminAccess'), login=$('#loginScreen'); if(!email||!pass||!remember) return; email.setAttribute('name','username'); pass.setAttribute('name','password'); email.setAttribute('autocomplete','username'); pass.setAttribute('autocomplete','current-password'); const saved=localStorage.getItem('fcd.admin.email'); if(saved){ email.value=saved; remember.checked=true; } const obs=new MutationObserver(()=>{ if(login?.classList.contains('hidden')){ if(remember.checked) localStorage.setItem('fcd.admin.email',email.value.trim()); else localStorage.removeItem('fcd.admin.email'); } }); if(login) obs.observe(login,{attributes:true,attributeFilter:['class']}); }
  function bindDecision(){ $('#decisionExpandAll')?.addEventListener('click',()=>$$('.decision-block').forEach(d=>d.open=true)); $('#decisionCollapseAll')?.addEventListener('click',()=>$$('.decision-block').forEach(d=>d.open=false)); ['decisionAxisFilter','decisionSourceFilter'].forEach(id=>$('#'+id)?.addEventListener('change',renderQuestions)); $('#decisionQuestionSearch')?.addEventListener('input',renderQuestions); const nav=$('[data-section="diagnostics"]'); nav?.addEventListener('click',()=>setTimeout(updateDecisionHeader,0)); const app=$('#adminApp'); if(app) new MutationObserver(()=>{ if(!app.classList.contains('hidden')) setTimeout(updateDecisionKpis,80); }).observe(app,{attributes:true,attributeFilter:['class']}); ['kpiSchools','kpiParticipants','kpiCompleted'].forEach(id=>{const el=$('#'+id);if(el)new MutationObserver(updateDecisionKpis).observe(el,{childList:true,characterData:true,subtree:true})}); }
  function init(){ renderSources(); populateFilters(); renderQuestions(); initLoginMemory(); bindDecision(); const label=$('[data-section="diagnostics"] span:nth-child(2)'); if(label) label.textContent='Tomada de Decisão'; }
  window.addEventListener('load',init);
})();
