window.APP_CONFIG = {
  appName: 'NEXO Público',
  version: '1.6.0',
  demoMode: true,
  supabase: {
    url: 'COLE_AQUI_SUA_SUPABASE_URL',
    publishableKey: 'COLE_AQUI_SUA_PUBLISHABLE_KEY'
  },
  functions: {
    redeemCode: 'redeem-code',
    startDiagnostic: 'start-diagnostic',
    submitDiagnostic: 'submit-diagnostic',
    adminDashboard: 'admin-dashboard',
    adminCodes: 'admin-codes',
    adminImport: 'admin-import'
  },
  quiz: {
    questionsPerAttempt: 15,
    conceptCount: 5,
    applicationCount: 5,
    scenarioCount: 5
  }
};

(() => {
  'use strict';
  if (!document.getElementById('loginScreen')) return;

  const addCss = href => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const addScript = src => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  };

  addCss('assets/css/decision.css');
  addCss('assets/css/decision-v15.css');
  addCss('assets/css/agents.css');

  const email = document.getElementById('adminEmail');
  const password = document.getElementById('adminPassword');
  if (email) {
    email.name = 'username';
    email.autocomplete = 'username';
  }
  if (password) {
    password.name = 'password';
    password.autocomplete = 'current-password';
    const passwordLabel = password.closest('.field');
    if (passwordLabel && !document.getElementById('rememberAdminAccess')) {
      passwordLabel.insertAdjacentHTML('afterend', `
        <label class="remember-access">
          <input id="rememberAdminAccess" type="checkbox">
          <span>
            <strong>Salvar acesso neste navegador</strong>
            <small>O e-mail fica lembrado pelo sistema. A senha pode ser salva pelo gerenciador seguro do próprio navegador.</small>
          </span>
        </label>`);
    }
  }

  const nav = document.querySelector('[data-section="diagnostics"]');
  if (nav) {
    const glyph = nav.querySelector('.nav-glyph');
    const label = nav.querySelector('span:nth-child(2)');
    if (glyph) glyph.textContent = '◆';
    if (label) label.textContent = 'Tomada de Decisão';
  }

  document.querySelectorAll('.sidebar-brand strong').forEach(el => el.textContent = 'NEXO Público');
  document.querySelectorAll('.sidebar-brand small').forEach(el => el.textContent = 'Plataforma de Gestão');
  document.querySelectorAll('.brand-lockup span:last-child').forEach(el => el.textContent = 'NEXO Público');
  document.title = 'NEXO Público | Plataforma de Gestão';
  document.querySelectorAll('.sidebar-footer small').forEach(el => {
    if (el.textContent.includes('Plataforma')) el.textContent = 'v1.6 • Plataforma de Gestão';
  });

  const diagnosticSection = document.getElementById('section-diagnostics');
  if (diagnosticSection) {
    diagnosticSection.classList.add('decision-section');
    diagnosticSection.innerHTML = `
      <div class="decision-hero">
        <div>
          <span class="eyebrow">BI SOCIAL E TERRITORIAL • GESTÃO INTERSETORIAL</span>
          <h3>Tomada de Decisão</h3>
          <p>Transforme dados de diferentes aplicativos, serviços e territórios em prioridades, perguntas de gestão e decisões monitoráveis. O App Formação Cidadã é a primeira fonte — Educação — e a estrutura já está preparada para outras áreas.</p>
        </div>
        <div class="decision-hero-actions">
          <button id="decisionExpandAll" class="btn btn-primary">Expandir tudo</button>
          <button id="decisionCollapseAll" class="btn btn-secondary">Recolher tudo</button>
        </div>
      </div>

      <div class="decision-kpis">
        <article><span>Fontes conectadas</span><strong id="decisionKpiSources">1</strong><small>App Formação Cidadã</small></article>
        <article><span>Unidades com dados</span><strong id="decisionKpiUnits">0</strong><small>atualizado pelo módulo escolar</small></article>
        <article><span>Pessoas no recorte</span><strong id="decisionKpiPeople">0</strong><small>registros disponíveis</small></article>
        <article><span>Respostas concluídas</span><strong id="decisionKpiCompleted">0</strong><small>base para análise</small></article>
        <article class="decision-kpi-accent"><span>Eixos estratégicos</span><strong>15</strong><small>agenda de pesquisa intersetorial</small></article>
      </div>

      <details class="decision-block" open>
        <summary><span><b>01</b><span><strong>Fontes de dados do sistema</strong><small>O painel recebe informações de apps e instrumentos diferentes.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body">
          <div id="decisionSources" class="decision-sources"></div>
          <div class="decision-note"><strong>Arquitetura multifonte</strong><p>Escola é apenas uma origem. Cada futuro app identifica área, instrumento, território, público, data da coleta e indicadores, permitindo cruzamentos sem misturar dados pessoais desnecessariamente.</p></div>
        </div>
      </details>

      <details class="decision-block" open>
        <summary><span><b>02</b><span><strong>Leitura atual — Educação</strong><small>Indicadores já alimentados pelo App Formação Cidadã.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body">
          <div class="dashboard-grid">
            <article class="panel panel-span-7"><div class="panel-head"><div><span class="eyebrow">SINAIS EDUCACIONAIS</span><h4>Questões com maior dificuldade</h4></div><span class="panel-note">fonte: App Formação Cidadã</span></div><div class="chart-box chart-xxl"><canvas id="chartQuestionsDiagnostics"></canvas></div></article>
            <article class="panel panel-span-5"><div class="panel-head"><div><span class="eyebrow">EIXOS ATUAIS</span><h4>Perfil de compreensão</h4></div><span class="panel-note">fonte conectada</span></div><div class="chart-box chart-xxl"><canvas id="chartThemeRadar"></canvas></div></article>
          </div>
          <div id="diagnosticInsights" class="diagnostic-cards"></div>
        </div>
      </details>

      <details class="decision-block" open>
        <summary><span><b>03</b><span><strong>Perguntas estratégicas de gestão</strong><small>Banco amplo para orientar pesquisas, apps e levantamentos futuros.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body">
          <div class="decision-toolbar">
            <label><span>Filtrar área</span><select id="decisionAxisFilter"><option value="">Todos os eixos</option></select></label>
            <label><span>Fonte sugerida</span><select id="decisionSourceFilter"><option value="">Todas as fontes</option></select></label>
            <label class="decision-search"><span>Buscar pergunta</span><input id="decisionQuestionSearch" placeholder="Ex.: transporte, renda, alimentação..."></label>
          </div>
          <div id="decisionQuestionCatalog" class="decision-question-catalog"></div>
        </div>
      </details>

      <details class="decision-block">
        <summary><span><b>06</b><span><strong>Matriz para decisão</strong><small>Da informação à prioridade, ação, responsável e prazo.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body">
          <div class="decision-flow">
            <article><span>1</span><strong>Sinal</strong><p>O dado mostra uma diferença, risco, demanda ou oportunidade.</p></article>
            <article><span>2</span><strong>Prioridade</strong><p>Classifique alcance, gravidade, urgência e possibilidade de intervenção.</p></article>
            <article><span>3</span><strong>Decisão</strong><p>Defina ação concreta, público, território, responsável e recurso.</p></article>
            <article><span>4</span><strong>Monitoramento</strong><p>Escolha indicador, meta, prazo e critério para revisar a decisão.</p></article>
          </div>
          <div class="decision-priority-table">
            <div><span>Pergunta do gestor</span><strong>Onde agir primeiro?</strong><p>Compare concentração do problema, tamanho do público, tendência e cobertura atual do serviço.</p></div>
            <div><span>Controle de qualidade</span><strong>O dado é suficiente?</strong><p>Confira fonte, período, representatividade, duplicidade e possíveis vieses antes de decidir.</p></div>
            <div><span>Governança</span><strong>Quem responde pela ação?</strong><p>Toda decisão precisa de responsável, prazo e mecanismo de retorno ao território.</p></div>
          </div>
        </div>
      </details>

      <details class="decision-block">
        <summary><span><b>07</b><span><strong>Governança e proteção dos dados</strong><small>Dados úteis sem transformar o BI em cadastro invasivo.</small></span></span><i>⌄</i></summary>
        <div class="decision-block-body decision-governance">
          <article><strong>Menores de idade</strong><p>Priorizar perguntas educacionais e de percepção adequadas ao contexto escolar. Temas sensíveis devem usar protocolos próprios e profissionais responsáveis.</p></article>
          <article><strong>Dados pessoais mínimos</strong><p>O painel deve preferir indicadores agregados. Dados sensíveis só entram quando houver finalidade, base adequada e proteção correspondente.</p></article>
          <article><strong>Intersetorialidade com limites</strong><p>Cruzar indicadores territoriais não significa abrir prontuários entre áreas. Cada fonte mantém regras de acesso e o BI recebe somente o necessário.</p></article>
          <article><strong>Decisão auditável</strong><p>Registrar fonte, data, filtros, responsável e justificativa da decisão para permitir revisão posterior.</p></article>
        </div>
      </details>`;
  }

  addScript('assets/js/decision.js');
  addScript('assets/js/agents.js');
  addScript('assets/js/decision-v15.js');
})();
