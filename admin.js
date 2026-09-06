(() => {
  'use strict';

  const cfg = window.APP_CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const state = {
    supabase: null,
    rows: [],
    schools: [],
    codes: [],
    generatedBatch: [],
    importRows: [],
    importFile: null,
    importFileName: '',
    importHistory: [],
    importGenerated: [],
    charts: {},
    map: null,
    mapLayer: null,
    section: 'overview',
    confirmAction: null
  };

  const sections = {
    overview: ['VISÃO MUNICIPAL', 'Painel executivo'],
    coverage: ['COBERTURA', 'Mapa das escolas'],
    comparison: ['COMPARAÇÃO', 'Escola por escola'],
    data: ['DADOS DA REDE', 'Importar escolas e alunos'],
    codes: ['CÓDIGOS DOS ALUNOS', 'Gerar e administrar acessos'],
    diagnostics: ['DIAGNÓSTICOS', 'Análise de aprendizagem'],
    results: ['RESULTADOS', 'Consulta administrativa'],
    reports: ['RELATÓRIOS', 'Consolidação para gestão']
  };

  const themeNames = ['Cidadania', 'Convivência', 'Vida digital', 'Pensamento crítico', 'Projeto de vida'];

  function configuredForSupabase() {
    return !cfg.demoMode && cfg.supabase.url.startsWith('https://') && cfg.supabase.publishableKey.length > 20;
  }

  function initSupabase() {
    if (!configuredForSupabase()) {
      $('#backendStatus').textContent = 'Modo demonstração';
      return;
    }
    if (!window.supabase?.createClient) {
      $('#backendStatus').textContent = 'Supabase indisponível';
      return;
    }
    state.supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    $('#backendStatus').textContent = 'Supabase conectado';
  }

  function escapeHtml(v = '') {
    return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }
  function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
  function round(v) { return Number.isFinite(v) ? Math.round(v) : 0; }
  function formatDate(v) {
    if (!v) return '—';
    const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('pt-BR');
  }
  function formatDateTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  function schoolIdFromName(name) {
    return state.schools.find(s => s.name === name)?.id || name;
  }
  function showToast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function setMessage(el, message, kind = '') {
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${kind}`.trim();
  }

  function openConfirm(title, text, action) {
    state.confirmAction = action;
    $('#confirmModalTitle').textContent = title;
    $('#confirmModalText').textContent = text;
    $('#confirmModal').classList.remove('hidden');
  }
  function closeConfirm() {
    state.confirmAction = null;
    $('#confirmModal').classList.add('hidden');
  }

  function switchSection(section) {
    state.section = section;
    $$('.admin-section').forEach(el => el.classList.remove('active'));
    $(`#section-${section}`)?.classList.add('active');
    $$('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.section === section));
    const [eyebrow, title] = sections[section] || sections.overview;
    $('#sectionEyebrow').textContent = eyebrow;
    $('#sectionTitle').textContent = title;
    $('#sidebar').classList.remove('open');

    if (section === 'coverage') setTimeout(renderCoverage, 50);
    if (section === 'comparison') renderComparison();
    if (section === 'data') renderImportHistory();
    if (section === 'codes') renderCodes();
    if (section === 'diagnostics') renderDiagnostics();
    if (section === 'results') renderResultsTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function adminLogin() {
    const email = $('#adminEmail').value.trim();
    const password = $('#adminPassword').value;
    const msg = $('#adminMessage');
    $('#adminLoginBtn').disabled = true;
    setMessage(msg, 'Validando acesso...');
    try {
      if (cfg.demoMode) {
        if (email !== 'admin@formacaocidada.local' || password !== 'Demo@2026') throw new Error('Credenciais de demonstração inválidas.');
        state.schools = [...(window.DEMO_SCHOOLS || [])];
        state.rows = window.generateDemoResults().map((r, i) => ({
          ...r,
          studentId: r.studentId || `demo-stu-${i + 1}`,
          schoolId: state.schools.find(s => s.name === r.school)?.id || null,
          levelKey: r.levelKey || (r.level.includes('Médio') ? 'medio' : 'fundamental2')
        }));
        state.codes = buildDemoCodes(state.rows);
      } else {
        const { data: current } = await state.supabase.auth.getSession();
        if (current?.session?.user?.is_anonymous) await state.supabase.auth.signOut();
        const { error } = await state.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadAllRealData();
      }

      $('#loginScreen').classList.add('hidden');
      $('#adminApp').classList.remove('hidden');
      populateAllFilters();
      populateCodeSchools();
      renderAll();
      setMessage(msg, '');
    } catch (err) {
      setMessage(msg, err?.message || 'Acesso negado.', 'error');
    } finally {
      $('#adminLoginBtn').disabled = false;
    }
  }

  async function loadAllRealData() {
    const { data, error } = await state.supabase.functions.invoke(cfg.functions.adminDashboard, { body: {} });
    if (error) throw error;
    state.rows = data?.rows || [];
    state.schools = data?.schools || [];
    await loadCodesReal();
    await loadImportHistoryReal();
  }

  async function loadCodesReal() {
    const { data, error } = await state.supabase.functions.invoke(cfg.functions.adminCodes, { body: { action: 'list' } });
    if (error) throw error;
    state.codes = data?.codes || [];
  }

  async function loadImportHistoryReal() {
    const { data, error } = await state.supabase.functions.invoke(cfg.functions.adminImport, { body: { action: 'history' } });
    if (error) throw error;
    state.importHistory = data?.history || [];
  }

  function buildDemoCodes(rows) {
    return rows.map((r, i) => {
      const statusCycle = i % 13 === 0 ? 'expired' : i % 11 === 0 ? 'revoked' : r.completed ? 'used' : (i % 3 === 0 ? 'redeemed' : 'available');
      return {
        id: `code-${i + 1}`,
        studentId: `demo-stu-${i + 1}`,
        name: r.name,
        school: r.school,
        schoolId: schoolIdFromName(r.school),
        level: r.level,
        levelKey: r.level.includes('Médio') ? 'medio' : 'fundamental2',
        grade: r.grade,
        className: r.className,
        codeHint: String(1000 + ((i * 97) % 8999)),
        status: statusCycle,
        active: !['expired', 'revoked', 'used'].includes(statusCycle),
        expiresAt: statusCycle === 'expired' ? '2026-08-31' : '2026-10-31',
        redeemedAt: ['redeemed', 'used'].includes(statusCycle) ? `2026-09-${String(1 + (i % 5)).padStart(2, '0')}T09:00:00` : null,
        usedAt: statusCycle === 'used' ? `2026-09-${String(1 + (i % 5)).padStart(2, '0')}T10:00:00` : null
      };
    });
  }

  function populateSelect(el, values) {
    if (!el) return;
    const current = el.value;
    const first = el.options[0]?.outerHTML || '<option value="">Todos</option>';
    el.innerHTML = first + [...new Set(values)].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR')).map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if ([...el.options].some(o => o.value === current)) el.value = current;
  }

  function populateAllFilters() {
    const rows = state.rows;
    [['filterSchool', 'school'], ['filterLevel', 'level'], ['filterGrade', 'grade'], ['filterClass', 'className'], ['resultFilterSchool', 'school'], ['resultFilterLevel', 'level'], ['resultFilterGrade', 'grade'], ['resultFilterClass', 'className']]
      .forEach(([id, key]) => populateSelect($(`#${id}`), rows.map(r => r[key])));
  }

  function populateCodeSchools() {
    const el = $('#codeSchool');
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Selecione</option>' + state.schools.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
    if ([...el.options].some(o => o.value === current)) el.value = current;
  }

  function filteredRows(prefix = 'filter') {
    const ids = prefix === 'result'
      ? { school: 'resultFilterSchool', level: 'resultFilterLevel', grade: 'resultFilterGrade', className: 'resultFilterClass' }
      : { school: 'filterSchool', level: 'filterLevel', grade: 'filterGrade', className: 'filterClass' };
    const f = Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, $(`#${id}`)?.value || '']));
    return state.rows.filter(r => Object.entries(f).every(([k, v]) => !v || r[k] === v));
  }

  function computeMetrics(rows) {
    const completed = rows.filter(r => r.completed !== false);
    const themeValues = themeNames.map(t => round(avg(completed.map(r => Number(r.themeScores?.[t])).filter(Number.isFinite))));
    const qMap = {};
    completed.forEach(r => Object.entries(r.questionErrors || {}).forEach(([k, v]) => (qMap[k] ??= []).push(Number(v) || 0)));
    const hardest = Object.entries(qMap).map(([k, v]) => [k, round(avg(v))]).sort((a, b) => b[1] - a[1]);
    return { completed, themeValues, hardest };
  }

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }

  function commonChartOptions(horizontal = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#07101d', titleColor: '#fff', bodyColor: '#c7d3df', borderColor: 'rgba(154,178,207,.2)', borderWidth: 1, padding: 12 }
      },
      scales: horizontal ? {
        x: { beginAtZero: true, max: 100, ticks: { color: '#71869c' }, grid: { color: 'rgba(154,178,207,.07)' } },
        y: { ticks: { color: '#9eb0c2', autoSkip: false }, grid: { display: false } }
      } : {
        x: { ticks: { color: '#8196aa' }, grid: { display: false } },
        y: { beginAtZero: true, max: 100, ticks: { color: '#71869c' }, grid: { color: 'rgba(154,178,207,.07)' } }
      }
    };
  }

  function renderDashboard() {
    const rows = filteredRows('filter');
    const { completed, themeValues, hardest } = computeMetrics(rows);
    const average = round(avg(completed.map(r => Number(r.percent) || 0)));
    const classes = new Set(rows.map(r => `${r.school}|${r.grade}|${r.className}`));
    $('#kpiSchools').textContent = new Set(rows.map(r => r.school)).size;
    $('#kpiClasses').textContent = classes.size;
    $('#kpiParticipants').textContent = rows.length;
    $('#kpiCompleted').textContent = completed.length;
    $('#kpiParticipation').textContent = rows.length ? `${round(completed.length / rows.length * 100)}%` : '0%';
    $('#kpiAverage').textContent = `${average}%`;

    destroyChart('themes');
    state.charts.themes = new Chart($('#chartThemes'), {
      type: 'bar',
      data: { labels: themeNames, datasets: [{ data: themeValues, backgroundColor: ['#7dd3fc', '#34d399', '#fbbf24', '#a78bfa', '#60a5fa'], borderRadius: 9, borderSkipped: false, maxBarThickness: 54 }] },
      options: commonChartOptions(false)
    });

    const bands = [0, 0, 0, 0];
    completed.forEach(r => { const p = Number(r.percent) || 0; if (p < 50) bands[0]++; else if (p < 70) bands[1]++; else if (p < 85) bands[2]++; else bands[3]++; });
    destroyChart('distribution');
    state.charts.distribution = new Chart($('#chartDistribution'), {
      type: 'doughnut',
      data: { labels: ['Abaixo de 50%', '50–69%', '70–84%', '85–100%'], datasets: [{ data: bands, backgroundColor: ['#fb7185', '#fbbf24', '#60a5fa', '#34d399'], borderWidth: 0, hoverOffset: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { color: '#8196aa', boxWidth: 10, boxHeight: 10, padding: 16, font: { size: 11 } } } } }
    });

    const gradeMap = {};
    completed.forEach(r => (gradeMap[r.grade] ??= []).push(Number(r.percent) || 0));
    destroyChart('grades');
    state.charts.grades = new Chart($('#chartGrades'), {
      type: 'bar',
      data: { labels: Object.keys(gradeMap), datasets: [{ data: Object.values(gradeMap).map(v => round(avg(v))), backgroundColor: '#7dd3fc', borderRadius: 8, borderSkipped: false, maxBarThickness: 42 }] },
      options: commonChartOptions(false)
    });

    const timelineMap = {};
    completed.forEach(r => { const d = r.date || 'Sem data'; timelineMap[d] = (timelineMap[d] || 0) + 1; });
    const timelineLabels = Object.keys(timelineMap).sort();
    destroyChart('timeline');
    state.charts.timeline = new Chart($('#chartTimeline'), {
      type: 'line',
      data: { labels: timelineLabels.map(formatDate), datasets: [{ data: timelineLabels.map(k => timelineMap[k]), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,.12)', fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: '#34d399' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8196aa' }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: '#71869c', precision: 0 }, grid: { color: 'rgba(154,178,207,.07)' } } } }
    });

    const bestIndex = themeValues.indexOf(Math.max(...themeValues, 0));
    $('#insightHardest').textContent = hardest[0]?.[0] || 'Sem dados';
    $('#insightHardestText').textContent = hardest[0] ? `${hardest[0][1]}% de erro médio no recorte.` : 'Aguardando dados.';
    $('#insightBestTheme').textContent = themeNames[bestIndex] || 'Sem dados';
    $('#insightBestThemeText').textContent = themeNames[bestIndex] ? `${themeValues[bestIndex]}% de média de acertos.` : 'Aguardando dados.';
    $('#insightCoverage').textContent = `${new Set(rows.map(r => r.school)).size} escola(s) • ${classes.size} turma(s)`;
    $('#lastUpdated').textContent = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function groupedSchools() {
    const grouped = {};
    state.rows.forEach(r => {
      grouped[r.school] ??= { rows: [], classes: new Set(), levels: new Set() };
      grouped[r.school].rows.push(r);
      grouped[r.school].classes.add(`${r.grade} ${r.className}`);
      grouped[r.school].levels.add(r.level);
    });
    return Object.entries(grouped).map(([name, g]) => {
      const completed = g.rows.filter(r => r.completed !== false);
      const meta = state.schools.find(s => s.name === name) || {};
      const { hardest } = computeMetrics(g.rows);
      return {
        id: meta.id || name,
        name,
        district: meta.district || '—',
        municipality: meta.municipality || '—',
        network: meta.network || '—',
        latitude: Number(meta.latitude),
        longitude: Number(meta.longitude),
        students: g.rows.length,
        completed: completed.length,
        participation: g.rows.length ? round(completed.length / g.rows.length * 100) : 0,
        average: round(avg(completed.map(r => Number(r.percent) || 0))),
        classes: g.classes.size,
        levels: [...g.levels],
        hardest: hardest[0]?.[0] || 'Sem dados'
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  function renderCoverage() {
    const schools = groupedSchools();
    const totalStudents = schools.reduce((s, x) => s + x.students, 0);
    const totalCompleted = schools.reduce((s, x) => s + x.completed, 0);
    const districts = new Set(schools.map(s => s.district).filter(x => x && x !== '—')).size;
    $('#coverageSummary').innerHTML = [
      ['Escolas no painel', schools.length, 'unidades com alunos cadastrados'],
      ['Distritos representados', districts, 'com localização cadastrada'],
      ['Alunos cadastrados', totalStudents, 'em todas as unidades'],
      ['Diagnósticos concluídos', totalCompleted, `${totalStudents ? round(totalCompleted / totalStudents * 100) : 0}% de participação geral`]
    ].map(([label, value, note]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');
    $('#mapCoverageLabel').textContent = `${schools.length} unidade(s)`;

    $('#schoolsGrid').innerHTML = schools.map(s => `<article class="school-card">
      <div class="school-card-head"><div><h4>${escapeHtml(s.name)}</h4><small>${escapeHtml(s.district)} • ${escapeHtml(s.network)}</small></div><span class="school-score">${s.average}%</span></div>
      <div class="school-statline"><div><span>Alunos</span><strong>${s.students}</strong></div><div><span>Turmas</span><strong>${s.classes}</strong></div><div><span>Participação</span><strong>${s.participation}%</strong></div></div>
      <div class="school-progress"><i style="width:${Math.max(0, Math.min(100, s.participation))}%"></i></div>
    </article>`).join('') || '<p>Nenhuma escola cadastrada.</p>';

    const mapped = schools.filter(s => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    if (!mapped.length || !window.L) {
      $('#schoolsMap').classList.add('hidden');
      $('#mapEmpty').classList.remove('hidden');
      return;
    }
    $('#schoolsMap').classList.remove('hidden');
    $('#mapEmpty').classList.add('hidden');

    if (!state.map) {
      state.map = L.map('schoolsMap', { zoomControl: true, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(state.map);
      state.mapLayer = L.layerGroup().addTo(state.map);
    }
    state.mapLayer.clearLayers();
    const bounds = [];
    mapped.forEach(s => {
      const marker = L.circleMarker([s.latitude, s.longitude], { radius: 10, color: '#7dd3fc', weight: 2, fillColor: '#34d399', fillOpacity: .82 });
      marker.bindPopup(`<strong>${escapeHtml(s.name)}</strong><br>${escapeHtml(s.district)}<br><br>${s.students} alunos • ${s.participation}% participação • ${s.average}% média`);
      marker.addTo(state.mapLayer);
      bounds.push([s.latitude, s.longitude]);
    });
    if (bounds.length === 1) state.map.setView(bounds[0], 13);
    else state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    setTimeout(() => state.map.invalidateSize(), 100);
  }

  function renderComparison() {
    const schools = groupedSchools();
    destroyChart('schoolAverage');
    state.charts.schoolAverage = new Chart($('#chartSchoolAverage'), {
      type: 'bar',
      data: { labels: schools.map(s => s.name), datasets: [{ data: schools.map(s => s.average), backgroundColor: '#7dd3fc', borderRadius: 8, borderSkipped: false, maxBarThickness: 34 }] },
      options: commonChartOptions(true)
    });
    destroyChart('schoolParticipation');
    state.charts.schoolParticipation = new Chart($('#chartSchoolParticipation'), {
      type: 'bar',
      data: { labels: schools.map(s => s.name), datasets: [{ data: schools.map(s => s.participation), backgroundColor: '#34d399', borderRadius: 8, borderSkipped: false, maxBarThickness: 34 }] },
      options: commonChartOptions(true)
    });
    $('#comparisonTableBody').innerHTML = schools.map(s => `<tr><td><strong>${escapeHtml(s.name)}</strong></td><td>${s.students}</td><td>${s.completed}</td><td><span class="score-pill">${s.participation}%</span></td><td><span class="score-pill">${s.average}%</span></td><td>${s.classes}</td><td>${escapeHtml(s.hardest)}</td></tr>`).join('') || '<tr><td colspan="7">Sem dados.</td></tr>';
  }

  function renderDiagnostics() {
    const { themeValues, hardest } = computeMetrics(filteredRows('filter'));
    destroyChart('questionsDiagnostics');
    state.charts.questionsDiagnostics = new Chart($('#chartQuestionsDiagnostics'), {
      type: 'bar',
      data: { labels: hardest.slice(0, 8).map(x => x[0]), datasets: [{ data: hardest.slice(0, 8).map(x => x[1]), backgroundColor: '#fb7185', borderRadius: 8, borderSkipped: false, maxBarThickness: 28 }] },
      options: commonChartOptions(true)
    });
    destroyChart('themeRadar');
    state.charts.themeRadar = new Chart($('#chartThemeRadar'), {
      type: 'radar',
      data: { labels: themeNames, datasets: [{ data: themeValues, borderColor: '#7dd3fc', backgroundColor: 'rgba(125,211,252,.14)', pointBackgroundColor: '#34d399', pointRadius: 4, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { display: false }, angleLines: { color: 'rgba(154,178,207,.12)' }, grid: { color: 'rgba(154,178,207,.12)' }, pointLabels: { color: '#9fb1c2', font: { size: 11 } } } } }
    });
    const cards = hardest.slice(0, 3).map((h, i) => `<article><span>PONTO DE ATENÇÃO ${i + 1}</span><strong>${escapeHtml(h[0])}</strong><p>${h[1]}% de erro médio. Considere reforçar este conceito em aplicações futuras.</p></article>`);
    $('#diagnosticInsights').innerHTML = cards.join('') || '<article><strong>Sem dados</strong><p>Aguardando diagnósticos concluídos.</p></article>';
  }

  function renderResultsTable() {
    const rows = filteredRows('result').filter(r => r.completed !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    $('#resultsTableBody').innerHTML = rows.map(r => `<tr><td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.school)}</td><td>${escapeHtml(r.level)}</td><td>${escapeHtml(r.grade)}</td><td>${escapeHtml(r.className)}</td><td>${r.score}/${r.total}</td><td><span class="score-pill">${r.percent}%</span></td><td>${formatDate(r.date)}</td></tr>`).join('') || '<tr><td colspan="8">Nenhum resultado para os filtros selecionados.</td></tr>';
  }


  function updateImportGuide() {
    const type = $('#importType')?.value || 'students';
    const studentMode = type === 'students';
    $('#importGuideTitle').textContent = studentMode ? 'Planilha de alunos' : 'Planilha de escolas';
    $('#importGuideColumns').innerHTML = (studentMode
      ? ['matricula (opcional)', 'aluno', 'escola', 'nivel', 'serie', 'turma', 'validade_codigo (opcional)']
      : ['codigo_escola (opcional)', 'escola', 'distrito', 'municipio', 'rede', 'latitude', 'longitude'])
      .map(c => `<span>${escapeHtml(c)}</span>`).join('');
    $('#importDefaultExpiryField').classList.toggle('hidden', !studentMode);
    $('#importGenerateCodesField').classList.toggle('hidden', !studentMode);
    clearImportPreview(false);
  }

  function setImportFile(file) {
    state.importFile = file || null;
    state.importFileName = file?.name || '';
    $('#importFileBadge').textContent = file ? `${file.name} • ${Math.max(1, Math.round(file.size / 1024))} KB` : 'Nenhum arquivo';
    clearImportPreview(false);
  }

  function clearImportPreview(resetFile = false) {
    state.importRows = [];
    state.importGenerated = [];
    $('#importPreviewPanel')?.classList.add('hidden');
    $('#importGeneratedPanel')?.classList.add('hidden');
    $('#commitImportBtn').disabled = true;
    setMessage($('#importMessage'), '');
    if (resetFile) {
      state.importFile = null;
      state.importFileName = '';
      if ($('#importFile')) $('#importFile').value = '';
      if ($('#importFileBadge')) $('#importFileBadge').textContent = 'Nenhum arquivo';
    }
  }

  function clearImport() {
    clearImportPreview(true);
  }

  async function validateImport() {
    const msg = $('#importMessage');
    const tools = window.FCDImportTools;
    if (!tools) return setMessage(msg, 'Módulo de importação indisponível.', 'error');
    const file = state.importFile || $('#importFile')?.files?.[0];
    if (!file) return setMessage(msg, 'Selecione uma planilha XLSX, XLS ou CSV.', 'error');
    $('#validateImportBtn').disabled = true;
    setMessage(msg, 'Lendo e validando a planilha...');
    try {
      const raw = await tools.parseFile(file);
      if (raw.length > 600) throw new Error('A planilha possui mais de 600 linhas. Divida a importação em lotes menores.');
      const type = $('#importType').value;
      state.importRows = type === 'schools' ? tools.validateSchools(raw, state.schools) : tools.validateStudents(raw, state.schools);
      state.importFileName = file.name;
      renderImportPreview();
      const summary = tools.summarize(state.importRows);
      if (summary.errors) setMessage(msg, `${summary.errors} linha(s) precisam ser corrigidas antes da importação.`, 'error');
      else if (summary.warnings) setMessage(msg, `Planilha válida com ${summary.warnings} aviso(s). Revise a pré-visualização e confirme.`, 'success');
      else setMessage(msg, 'Planilha validada. Todos os registros estão prontos para importação.', 'success');
    } catch (err) {
      clearImportPreview(false);
      setMessage(msg, err?.message || 'Não foi possível ler a planilha.', 'error');
    } finally {
      $('#validateImportBtn').disabled = false;
    }
  }

  function renderImportPreview() {
    const tools = window.FCDImportTools;
    const rows = state.importRows;
    const summary = tools?.summarize(rows) || { total: 0, valid: 0, warnings: 0, errors: 0 };
    $('#importTotal').textContent = summary.total;
    $('#importValid').textContent = summary.valid;
    $('#importWarnings').textContent = summary.warnings;
    $('#importErrors').textContent = summary.errors;
    const type = $('#importType').value;
    const schoolMode = type === 'schools';

    $('#importPreviewHead').innerHTML = schoolMode
      ? '<tr><th>Linha</th><th>Status</th><th>Escola</th><th>Código</th><th>Distrito</th><th>Município</th><th>Rede</th><th>Mapa</th><th>Observações</th></tr>'
      : '<tr><th>Linha</th><th>Status</th><th>Aluno</th><th>Matrícula</th><th>Escola</th><th>Nível</th><th>Série</th><th>Turma</th><th>Observações</th></tr>';

    $('#importPreviewBody').innerHTML = rows.map(r => {
      const statusClass = r.errors?.length ? 'error' : r.warnings?.length ? 'warning' : 'valid';
      const statusLabel = statusClass === 'error' ? 'Corrigir' : statusClass === 'warning' ? 'Revisar' : 'Válida';
      const notes = `<td class="cell-note">${(r.errors || []).map(x => `<strong>${escapeHtml(x)}</strong>`).join('')}${(r.warnings || []).map(x => `<span>${escapeHtml(x)}</span>`).join('') || (!r.errors?.length ? '<span>Sem observações.</span>' : '')}</td>`;
      if (schoolMode) {
        const mapText = r.latitude !== null && r.longitude !== null ? `${r.latitude}, ${r.longitude}` : 'Sem coordenadas';
        return `<tr><td>${r.rowNumber}</td><td><span class="row-status row-${statusClass}">${statusLabel}</span></td><td><strong>${escapeHtml(r.school)}</strong></td><td>${escapeHtml(r.schoolCode || '—')}</td><td>${escapeHtml(r.district || '—')}</td><td>${escapeHtml(r.municipality || '—')}</td><td>${escapeHtml(r.network || '—')}</td><td>${escapeHtml(mapText)}</td>${notes}</tr>`;
      }
      return `<tr><td>${r.rowNumber}</td><td><span class="row-status row-${statusClass}">${statusLabel}</span></td><td><strong>${escapeHtml(r.student)}</strong></td><td>${escapeHtml(r.registration || '—')}</td><td>${escapeHtml(r.school || '—')}</td><td>${escapeHtml(r.levelLabel || '—')}</td><td>${escapeHtml(r.grade || '—')}</td><td>${escapeHtml(r.className || '—')}</td>${notes}</tr>`;
    }).join('');

    $('#importPreviewPanel').classList.remove('hidden');
    const ready = summary.total > 0 && summary.errors === 0;
    $('#commitImportBtn').disabled = !ready;
    $('#importReadyTitle').textContent = ready ? `${summary.total} registro(s) prontos` : 'Importação bloqueada';
    $('#importReadyText').textContent = ready
      ? (summary.warnings ? 'Há avisos, mas nenhuma linha impeditiva. Você pode importar.' : 'A planilha passou por todas as validações.')
      : 'Corrija os erros indicados na planilha e valide novamente.';
  }

  async function commitImport() {
    const msg = $('#importMessage');
    const rows = state.importRows;
    if (!rows.length || rows.some(r => r.errors?.length)) return setMessage(msg, 'Valide uma planilha sem erros antes de importar.', 'error');
    const type = $('#importType').value;
    const generateCodes = type === 'students' && $('#importGenerateCodes').checked;
    const defaultExpiresAt = $('#importDefaultExpiry').value || null;
    $('#commitImportBtn').disabled = true;
    setMessage(msg, 'Importando registros...');
    try {
      let result;
      if (cfg.demoMode) result = demoCommitImport(type, rows, generateCodes, defaultExpiresAt);
      else {
        const action = type === 'schools' ? 'import_schools' : 'import_students';
        const payloadRows = type === 'schools'
          ? rows.map(r => ({ school: r.school, schoolCode: r.schoolCode, district: r.district, municipality: r.municipality, network: r.network, latitude: r.latitude, longitude: r.longitude }))
          : rows.map(r => ({ student: r.student, registration: r.registration, schoolId: r.schoolId, levelKey: r.levelKey, grade: r.grade, className: r.className, expiresAt: r.expiresAt }));
        const { data, error } = await state.supabase.functions.invoke(cfg.functions.adminImport, { body: { action, rows: payloadRows, fileName: state.importFileName, generateCodes, defaultExpiresAt } });
        if (error) throw error;
        result = data;
        await loadAllRealData();
      }

      if (result?.history) state.importHistory = [result.history, ...state.importHistory.filter(h => h.id !== result.history.id)];
      state.importGenerated = result?.generated || [];
      if (state.importGenerated.length) state.generatedBatch = [...state.importGenerated];
      renderImportGenerated();
      renderImportHistory();
      populateAllFilters();
      populateCodeSchools();
      renderAll();
      const sum = result?.summary || {};
      setMessage(msg, `Importação concluída: ${sum.inserted || 0} incluído(s), ${sum.updated || 0} atualizado(s), ${sum.skipped || 0} ignorado(s)${sum.codesGenerated ? ` e ${sum.codesGenerated} código(s) gerado(s)` : ''}.`, 'success');
      showToast('Importação concluída com sucesso.');
    } catch (err) {
      setMessage(msg, err?.message || 'Não foi possível concluir a importação.', 'error');
    } finally {
      $('#commitImportBtn').disabled = state.importRows.some(r => r.errors?.length) || !state.importRows.length;
    }
  }

  function demoCommitImport(type, rows, generateCodes, defaultExpiresAt) {
    let inserted = 0, updated = 0, skipped = 0;
    const generated = [];
    if (type === 'schools') {
      rows.forEach((r, i) => {
        const existing = state.schools.find(s => (r.schoolCode && s.referenceCode === r.schoolCode) || window.FCDImportTools.normalizeText(s.name) === window.FCDImportTools.normalizeText(r.school));
        if (existing) {
          Object.assign(existing, { name: r.school, referenceCode: r.schoolCode || existing.referenceCode || null, district: r.district || null, municipality: r.municipality || null, network: r.network || null, latitude: r.latitude, longitude: r.longitude, active: true });
          updated++;
        } else {
          state.schools.push({ id: `demo-school-import-${Date.now()}-${i}`, name: r.school, referenceCode: r.schoolCode || null, district: r.district || null, municipality: r.municipality || null, network: r.network || null, latitude: r.latitude, longitude: r.longitude, active: true });
          inserted++;
        }
      });
    } else {
      rows.forEach((r, i) => {
        const duplicate = state.rows.find(x => x.schoolId === r.schoolId && window.FCDImportTools.normalizeText(x.name) === window.FCDImportTools.normalizeText(r.student) && x.levelKey === r.levelKey && x.grade === r.grade && x.className === r.className);
        let studentId;
        if (duplicate) {
          studentId = duplicate.studentId || `demo-existing-${i}`;
          skipped++;
        } else {
          studentId = `demo-import-student-${Date.now()}-${i}`;
          state.rows.push({ id: `pending-${studentId}`, studentId, registrationCode: r.registration || null, name: r.student, school: r.school, schoolId: r.schoolId, level: r.levelLabel, levelKey: r.levelKey, grade: r.grade, className: r.className, score: 0, total: 15, percent: 0, completed: false, date: null, themeScores: {}, questionErrors: {} });
          inserted++;
        }
        if (generateCodes && !state.codes.some(c => c.studentId === studentId && ['available','redeemed'].includes(codeStatus(c)))) {
          const plainCode = `FCD-${gradePrefix(r.grade, r.className)}-${randomToken(6)}`;
          const expiresAt = r.expiresAt || defaultExpiresAt || new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
          const code = { id: `demo-import-code-${Date.now()}-${i}`, studentId, name: r.student, school: r.school, schoolId: r.schoolId, level: r.levelLabel, levelKey: r.levelKey, grade: r.grade, className: r.className, codeHint: plainCode.slice(-4), status: 'available', active: true, expiresAt, redeemedAt: null, usedAt: null };
          state.codes.unshift(code);
          generated.push({ ...code, code: plainCode });
        }
      });
    }
    const history = { id: `demo-import-${Date.now()}`, import_type: type, file_name: state.importFileName, total_rows: rows.length, inserted_rows: inserted, updated_rows: updated, skipped_rows: skipped, codes_generated: generated.length, created_at: new Date().toISOString() };
    state.importHistory.unshift(history);
    return { summary: { total: rows.length, inserted, updated, skipped, codesGenerated: generated.length }, generated, history };
  }

  function renderImportGenerated() {
    const panel = $('#importGeneratedPanel');
    if (!panel) return;
    if (!state.importGenerated.length) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    $('#importGeneratedBody').innerHTML = state.importGenerated.map(c => `<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.school)}</td><td>${escapeHtml(c.grade)}</td><td>${escapeHtml(c.className)}</td><td><code>${escapeHtml(c.code)}</code></td><td>${formatDate(c.expiresAt)}</td></tr>`).join('');
  }

  function renderImportHistory() {
    const body = $('#importHistoryBody');
    if (!body) return;
    body.innerHTML = (state.importHistory || []).slice(0, 40).map(h => {
      const type = h.import_type || h.importType;
      return `<tr><td>${formatDateTime(h.created_at || h.createdAt)}</td><td><span class="status-pill ${type === 'students' ? 'status-redeemed' : 'status-available'}">${type === 'students' ? 'Alunos' : 'Escolas'}</span></td><td>${escapeHtml(h.file_name || h.fileName || '—')}</td><td>${h.total_rows ?? h.totalRows ?? 0}</td><td>${h.inserted_rows ?? h.insertedRows ?? 0}</td><td>${h.updated_rows ?? h.updatedRows ?? 0}</td><td>${h.skipped_rows ?? h.skippedRows ?? 0}</td><td>${h.codes_generated ?? h.codesGenerated ?? 0}</td></tr>`;
    }).join('') || '<tr><td colspan="8">Nenhuma importação registrada.</td></tr>';
  }

  function downloadImportCodes() {
    if (!state.importGenerated.length) return showToast('Nenhum código foi gerado nesta importação.');
    const headers = ['Aluno', 'Escola', 'Nível', 'Série', 'Turma', 'Código', 'Validade'];
    const body = state.importGenerated.map(c => [c.name, c.school, c.level, c.grade, c.className, c.code, c.expiresAt || '']);
    const csv = [headers, ...body].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    downloadBlob('formacao-cidada-codigos-importacao.csv', csv);
  }

  function codeStatus(code) {
    if (code.status) return code.status;
    if (!code.active) return 'revoked';
    if (code.usedAt) return 'used';
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return 'expired';
    if (code.redeemedAt) return 'redeemed';
    return 'available';
  }
  function codeStatusLabel(status) {
    return ({ available: 'Disponível', redeemed: 'Ativado', used: 'Utilizado', expired: 'Expirado', revoked: 'Revogado' }[status] || status);
  }
  function maskedCode(code) {
    return `FCD-••••-${escapeHtml(code.codeHint || '----')}`;
  }

  function renderCodes() {
    const search = ($('#codeSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const statusFilter = $('#codeStatusFilter')?.value || '';
    const rows = state.codes.filter(c => {
      const status = codeStatus(c);
      const text = `${c.name} ${c.school} ${c.grade} ${c.className}`.toLocaleLowerCase('pt-BR');
      return (!search || text.includes(search)) && (!statusFilter || status === statusFilter);
    });
    $('#codesTableBody').innerHTML = rows.map(c => {
      const status = codeStatus(c);
      let actions = '';
      if (status === 'used') actions = '<span class="panel-note">Diagnóstico concluído</span>';
      else if (['revoked', 'expired'].includes(status)) actions = `<button class="table-action" data-code-action="regenerate" data-student-id="${escapeHtml(c.studentId)}">Gerar novo</button>`;
      else actions = `<button class="table-action" data-code-action="regenerate" data-student-id="${escapeHtml(c.studentId)}">Regenerar</button><button class="table-action danger" data-code-action="revoke" data-code-id="${escapeHtml(c.id)}">Revogar</button>`;
      return `<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.school)}</td><td>${escapeHtml(c.grade)} • ${escapeHtml(c.className)}</td><td><code>${maskedCode(c)}</code></td><td><span class="status-pill status-${status}">${codeStatusLabel(status)}</span></td><td>${formatDate(c.expiresAt)}</td><td>${actions}</td></tr>`;
    }).join('') || '<tr><td colspan="7">Nenhum código encontrado.</td></tr>';
  }

  function randomToken(len = 6) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint32Array(len);
    crypto.getRandomValues(bytes);
    return [...bytes].map(n => alphabet[n % alphabet.length]).join('');
  }
  function gradePrefix(grade, className) {
    const compact = String(grade).replace(/[^0-9]/g, '').slice(0, 2) || 'X';
    return `${compact}${String(className || 'A').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'A'}`;
  }

  async function generateCodes() {
    const msg = $('#codeGeneratorMessage');
    const schoolId = $('#codeSchool').value;
    const levelKey = $('#codeLevel').value;
    const grade = $('#codeGrade').value.trim();
    const className = $('#codeClass').value.trim().toUpperCase();
    const expiresAt = $('#codeExpires').value || null;
    const names = $('#codeStudentNames').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const school = state.schools.find(s => String(s.id) === String(schoolId));

    if (!schoolId || !levelKey || !grade || !className || !names.length) {
      setMessage(msg, 'Preencha escola, nível, série, turma e ao menos um nome.', 'error');
      return;
    }
    if (names.length > 120) {
      setMessage(msg, 'Para segurança operacional, gere no máximo 120 códigos por lote.', 'error');
      return;
    }

    $('#generateCodesBtn').disabled = true;
    setMessage(msg, 'Gerando códigos...');
    try {
      let batch;
      if (cfg.demoMode) {
        batch = names.map((name, i) => {
          const plainCode = `FCD-${gradePrefix(grade, className)}-${randomToken(6)}`;
          const studentId = `demo-new-${Date.now()}-${i}`;
          const code = {
            id: `demo-code-${Date.now()}-${i}`,
            studentId,
            name,
            school: school.name,
            schoolId: school.id,
            level: levelKey === 'medio' ? 'Ensino Médio' : 'Fundamental II',
            levelKey,
            grade,
            className,
            codeHint: plainCode.slice(-4),
            status: 'available',
            active: true,
            expiresAt,
            redeemedAt: null,
            usedAt: null
          };
          state.codes.unshift(code);
          state.rows.push({ id: `pending-${studentId}`, name, school: school.name, level: code.level, grade, className, score: 0, total: 15, percent: 0, completed: false, date: null, themeScores: {}, questionErrors: {} });
          return { ...code, code: plainCode };
        });
      } else {
        const { data, error } = await state.supabase.functions.invoke(cfg.functions.adminCodes, {
          body: { action: 'generate_batch', schoolId, levelKey, grade, className, expiresAt, students: names.map(fullName => ({ fullName })) }
        });
        if (error) throw error;
        batch = data?.generated || [];
        await loadAllRealData();
      }
      state.generatedBatch = batch;
      renderGeneratedBatch();
      populateAllFilters();
      renderCodes();
      renderDashboard();
      setMessage(msg, `${batch.length} código(s) gerado(s) com sucesso. Baixe a lista agora.`, 'success');
    } catch (err) {
      setMessage(msg, err?.message || 'Não foi possível gerar os códigos.', 'error');
    } finally {
      $('#generateCodesBtn').disabled = false;
    }
  }

  function renderGeneratedBatch() {
    const panel = $('#generatedBatchPanel');
    if (!state.generatedBatch.length) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    $('#generatedCodesBody').innerHTML = state.generatedBatch.map(c => `<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.school)}</td><td>${escapeHtml(c.grade)}</td><td>${escapeHtml(c.className)}</td><td><code>${escapeHtml(c.code)}</code></td><td>${formatDate(c.expiresAt)}</td></tr>`).join('');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function generatedCsv() {
    const headers = ['Aluno', 'Escola', 'Nível', 'Série', 'Turma', 'Código', 'Validade'];
    const body = state.generatedBatch.map(c => [c.name, c.school, c.level, c.grade, c.className, c.code, c.expiresAt || '']);
    return [headers, ...body].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  }
  function downloadBlob(name, content, type = 'text/csv;charset=utf-8') {
    const blob = new Blob(['\ufeff' + content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }
  function downloadGeneratedCodes() {
    if (!state.generatedBatch.length) return showToast('Nenhum lote gerado.');
    downloadBlob('formacao-cidada-codigos-alunos.csv', generatedCsv());
  }
  async function copyGeneratedCodes() {
    if (!state.generatedBatch.length) return showToast('Nenhum lote gerado.');
    const text = state.generatedBatch.map(c => `${c.name} — ${c.code}`).join('\n');
    await navigator.clipboard.writeText(text);
    showToast('Lista copiada.');
  }

  async function revokeCode(codeId) {
    if (cfg.demoMode) {
      const c = state.codes.find(x => x.id === codeId);
      if (c) { c.status = 'revoked'; c.active = false; }
    } else {
      const { error } = await state.supabase.functions.invoke(cfg.functions.adminCodes, { body: { action: 'revoke', codeId } });
      if (error) throw error;
      await loadCodesReal();
    }
    renderCodes();
    showToast('Código revogado.');
  }

  async function regenerateCode(studentId) {
    let generated;
    if (cfg.demoMode) {
      const old = state.codes.find(x => x.studentId === studentId);
      if (!old) throw new Error('Estudante não encontrado.');
      state.codes.filter(x => x.studentId === studentId).forEach(x => { x.status = 'revoked'; x.active = false; });
      const plainCode = `FCD-${gradePrefix(old.grade, old.className)}-${randomToken(6)}`;
      generated = { ...old, id: `demo-reg-${Date.now()}`, code: plainCode, codeHint: plainCode.slice(-4), status: 'available', active: true, redeemedAt: null, usedAt: null };
      state.codes.unshift({ ...generated });
    } else {
      const { data, error } = await state.supabase.functions.invoke(cfg.functions.adminCodes, { body: { action: 'regenerate', studentId } });
      if (error) throw error;
      generated = data?.generated;
      await loadCodesReal();
    }
    state.generatedBatch = [generated];
    renderGeneratedBatch();
    renderCodes();
    showToast('Novo código gerado. Salve a nova credencial.');
  }

  function clearCodeForm() {
    ['codeSchool', 'codeLevel', 'codeGrade', 'codeClass', 'codeExpires', 'codeStudentNames'].forEach(id => { const el = $(`#${id}`); if (el) el.value = ''; });
    setMessage($('#codeGeneratorMessage'), '');
  }

  function clearFilters() {
    ['filterSchool', 'filterLevel', 'filterGrade', 'filterClass'].forEach(id => { if ($(`#${id}`)) $(`#${id}`).value = ''; });
    renderDashboard();
  }

  function exportCsv() {
    const rows = (state.section === 'results' ? filteredRows('result') : filteredRows('filter')).filter(r => r.completed !== false);
    const headers = ['Aluno', 'Escola', 'Nível', 'Série', 'Turma', 'Acertos', 'Total', 'Percentual', 'Data'];
    const body = rows.map(r => [r.name, r.school, r.level, r.grade, r.className, r.score, r.total, r.percent, r.date]);
    const csv = [headers, ...body].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    downloadBlob('formacao-cidada-resultados.csv', csv);
  }

  async function refresh() {
    try {
      if (!cfg.demoMode) await loadAllRealData();
      populateAllFilters();
      populateCodeSchools();
      renderAll();
      showToast('Dados atualizados.');
    } catch (err) {
      showToast(err?.message || 'Não foi possível atualizar.');
    }
  }

  async function logout() {
    if (!cfg.demoMode && state.supabase) await state.supabase.auth.signOut();
    state.rows = []; state.schools = []; state.codes = []; state.generatedBatch = []; state.importRows = []; state.importGenerated = []; state.importHistory = []; state.importFile = null; state.importFileName = '';
    $('#adminApp').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#adminPassword').value = '';
  }

  function renderAll() {
    renderDashboard();
    renderResultsTable();
    renderCodes();
    renderImportHistory();
    if (state.section === 'coverage') renderCoverage();
    if (state.section === 'comparison') renderComparison();
    if (state.section === 'diagnostics') renderDiagnostics();
  }

  function bind() {
    $('#adminLoginBtn').addEventListener('click', adminLogin);
    $('#adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
    $('#adminLogoutBtn').addEventListener('click', logout);
    $('#refreshDashboardBtn').addEventListener('click', refresh);
    $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#clearFiltersBtn').addEventListener('click', clearFilters);
    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#reportCsvBtn').addEventListener('click', exportCsv);
    $('#generateCodesBtn').addEventListener('click', generateCodes);
    $('#clearCodeFormBtn').addEventListener('click', clearCodeForm);
    $('#downloadGeneratedCodesBtn').addEventListener('click', downloadGeneratedCodes);
    $('#copyGeneratedCodesBtn').addEventListener('click', () => copyGeneratedCodes().catch(() => showToast('Não foi possível copiar.')));
    $('#codeSearch').addEventListener('input', renderCodes);
    $('#codeStatusFilter').addEventListener('change', renderCodes);
    $('#importType').addEventListener('change', updateImportGuide);
    $('#importFile').addEventListener('change', e => setImportFile(e.target.files?.[0] || null));
    $('#validateImportBtn').addEventListener('click', validateImport);
    $('#clearImportBtn').addEventListener('click', clearImport);
    $('#commitImportBtn').addEventListener('click', commitImport);
    $('#downloadImportTemplateXlsx').addEventListener('click', () => { try { window.FCDImportTools.downloadTemplate($('#importType').value, 'xlsx'); } catch (e) { showToast(e?.message || 'Não foi possível gerar o modelo.'); } });
    $('#downloadImportTemplateCsv').addEventListener('click', () => { try { window.FCDImportTools.downloadTemplate($('#importType').value, 'csv'); } catch (e) { showToast(e?.message || 'Não foi possível gerar o modelo.'); } });
    $('#downloadImportCodesBtn').addEventListener('click', downloadImportCodes);
    $('#goToCodesBtn').addEventListener('click', () => switchSection('codes'));
    const dropzone = $('#importDropzone');
    dropzone.addEventListener('click', () => $('#importFile').click());
    dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#importFile').click(); } });
    ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
    dropzone.addEventListener('drop', e => { const file = e.dataTransfer?.files?.[0]; if (file) setImportFile(file); });
    $('#confirmModalCancel').addEventListener('click', closeConfirm);
    $('#confirmModalOk').addEventListener('click', async () => {
      const action = state.confirmAction;
      closeConfirm();
      if (!action) return;
      try { await action(); } catch (err) { showToast(err?.message || 'Não foi possível concluir a ação.'); }
    });
    $('#confirmModal').addEventListener('click', e => { if (e.target.id === 'confirmModal') closeConfirm(); });

    $$('.nav-link').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));
    $$('[data-section-link]').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.sectionLink)));
    ['filterSchool', 'filterLevel', 'filterGrade', 'filterClass'].forEach(id => $(`#${id}`).addEventListener('change', renderDashboard));
    ['resultFilterSchool', 'resultFilterLevel', 'resultFilterGrade', 'resultFilterClass'].forEach(id => $(`#${id}`).addEventListener('change', renderResultsTable));

    $('#codesTableBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-code-action]');
      if (!btn) return;
      if (btn.dataset.codeAction === 'revoke') openConfirm('Revogar código', 'Este código deixará de funcionar imediatamente. O estudante precisará receber outro código.', () => revokeCode(btn.dataset.codeId));
      if (btn.dataset.codeAction === 'regenerate') openConfirm('Gerar novo código', 'O código atual será substituído. O novo código aparecerá uma única vez para download ou cópia.', () => regenerateCode(btn.dataset.studentId));
    });
  }

  function setDefaultExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    $('#codeExpires').value = d.toISOString().slice(0, 10);
    if ($('#importDefaultExpiry')) $('#importDefaultExpiry').value = d.toISOString().slice(0, 10);
  }

  function init() {
    initSupabase();
    bind();
    setDefaultExpiry();
    updateImportGuide();
    switchSection('overview');
  }

  window.addEventListener('load', init);
})();
