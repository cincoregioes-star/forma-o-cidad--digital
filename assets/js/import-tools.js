(() => {
  'use strict';

  const HEADER_ALIASES = {
    school: ['escola','nome_da_escola','nome escola','school','unidade','unidade_escolar'],
    schoolCode: ['codigo_escola','codigo da escola','codigo_inep','inep','school_code','reference_code'],
    district: ['distrito','bairro_distrito','localidade','district'],
    municipality: ['municipio','município','cidade','municipality'],
    network: ['rede','rede_ensino','dependencia','network'],
    latitude: ['latitude','lat'],
    longitude: ['longitude','lng','lon','long'],
    student: ['aluno','nome_do_aluno','nome aluno','estudante','student','full_name'],
    registration: ['matricula','matrícula','codigo_aluno','registro','registration','registration_code'],
    level: ['nivel','nível','etapa','segmento','level'],
    grade: ['serie','série','ano','grade'],
    className: ['turma','classe','class','class_name'],
    expiresAt: ['validade_codigo','validade','expira_em','expires_at']
  };

  function normalizeText(value = '') {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR')
      .replace(/\s+/g, ' ');
  }

  function normalizeHeader(value = '') {
    return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  const aliasMap = (() => {
    const map = new Map();
    Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
      aliases.concat(canonical).forEach(alias => map.set(normalizeHeader(alias), canonical));
    });
    return map;
  })();

  function canonicalizeRow(row) {
    const out = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const canonical = aliasMap.get(normalizeHeader(key));
      if (canonical && (out[canonical] === undefined || out[canonical] === '')) out[canonical] = value;
    });
    return out;
  }

  function normalizeLevel(value = '') {
    const n = normalizeText(value);
    if (!n) return null;
    if (['fundamental2','fundamental ii','fundamental 2','fund ii','f2','anos finais','fundamental anos finais'].some(v => n === normalizeText(v))) {
      return { key: 'fundamental2', label: 'Fundamental II' };
    }
    if (['medio','médio','ensino medio','ensino médio','em','ensino médio regular'].some(v => n === normalizeText(v))) {
      return { key: 'medio', label: 'Ensino Médio' };
    }
    return null;
  }

  function normalizeGrade(value = '') {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const n = normalizeText(raw);
    const digits = n.match(/\d{1,2}/)?.[0];
    if (!digits) return raw;
    if (n.includes('medio') || n.includes('médio') || n.includes('serie')) return `${digits}ª série`;
    if (Number(digits) >= 6 && Number(digits) <= 9) return `${digits}º ano`;
    return raw;
  }

  function normalizeClass(value = '') {
    return String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 20);
  }

  function parseCoordinate(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function validIsoDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  async function parseFile(file) {
    if (!file) throw new Error('Selecione um arquivo para importar.');
    if (!window.XLSX) throw new Error('Leitor de planilhas indisponível. Recarregue a página e tente novamente.');
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) throw new Error('Formato não suportado. Use XLSX, XLS ou CSV.');
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('A planilha não possui abas legíveis.');
    const rawRows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: true });
    if (!rawRows.length) throw new Error('A primeira aba da planilha está vazia.');
    return rawRows.map(canonicalizeRow);
  }

  function schoolFingerprint(name, municipality = '') {
    return `${normalizeText(name)}|${normalizeText(municipality)}`;
  }

  function studentFingerprint(row) {
    if (row.registration) return `reg|${normalizeText(row.school)}|${normalizeText(row.registration)}`;
    return `name|${normalizeText(row.school)}|${normalizeText(row.student)}|${row.levelKey}|${normalizeText(row.grade)}|${normalizeText(row.className)}`;
  }

  function validateSchools(rawRows, existingSchools = []) {
    const existingByCode = new Map(existingSchools.filter(s => s.referenceCode).map(s => [normalizeText(s.referenceCode), s]));
    const existingByName = new Map(existingSchools.map(s => [schoolFingerprint(s.name, s.municipality), s]));
    const seen = new Set();
    return rawRows.map((raw, index) => {
      const school = String(raw.school || '').trim();
      const municipality = String(raw.municipality || '').trim();
      const schoolCode = String(raw.schoolCode || '').trim();
      const latitude = parseCoordinate(raw.latitude);
      const longitude = parseCoordinate(raw.longitude);
      const errors = [];
      const warnings = [];
      if (!school) errors.push('Nome da escola ausente.');
      if (Number.isNaN(latitude)) errors.push('Latitude inválida.');
      if (Number.isNaN(longitude)) errors.push('Longitude inválida.');
      if (latitude !== null && (latitude < -90 || latitude > 90)) errors.push('Latitude fora do intervalo válido.');
      if (longitude !== null && (longitude < -180 || longitude > 180)) errors.push('Longitude fora do intervalo válido.');
      if (latitude === null || longitude === null) warnings.push('Sem coordenadas: não aparecerá no mapa até completar latitude/longitude.');
      const key = schoolCode ? `code|${normalizeText(schoolCode)}` : `name|${schoolFingerprint(school, municipality)}`;
      if (seen.has(key)) errors.push('Registro duplicado dentro da planilha.');
      seen.add(key);
      const existing = schoolCode ? existingByCode.get(normalizeText(schoolCode)) : existingByName.get(schoolFingerprint(school, municipality));
      if (existing) warnings.push('Escola já cadastrada: os dados informados serão atualizados.');
      return {
        rowNumber: index + 2,
        type: 'school',
        school,
        schoolCode,
        district: String(raw.district || '').trim(),
        municipality,
        network: String(raw.network || '').trim(),
        latitude,
        longitude,
        existingId: existing?.id || null,
        errors,
        warnings,
        status: errors.length ? 'error' : warnings.length ? 'warning' : 'valid'
      };
    });
  }

  function validateStudents(rawRows, existingSchools = []) {
    const schoolByName = new Map(existingSchools.map(s => [normalizeText(s.name), s]));
    const schoolByCode = new Map(existingSchools.filter(s => s.referenceCode).map(s => [normalizeText(s.referenceCode), s]));
    const seen = new Set();
    return rawRows.map((raw, index) => {
      const student = String(raw.student || '').trim();
      const school = String(raw.school || '').trim();
      const schoolCode = String(raw.schoolCode || '').trim();
      const level = normalizeLevel(raw.level);
      const grade = normalizeGrade(raw.grade);
      const className = normalizeClass(raw.className);
      const registration = String(raw.registration || '').trim();
      const expiresAt = validIsoDate(raw.expiresAt);
      const errors = [];
      const warnings = [];
      const schoolMatch = schoolCode ? schoolByCode.get(normalizeText(schoolCode)) : schoolByName.get(normalizeText(school));
      if (!student) errors.push('Nome do aluno ausente.');
      if (!school && !schoolCode) errors.push('Escola ausente.');
      if (!schoolMatch) errors.push('Escola não encontrada no cadastro. Importe/cadastre a escola primeiro.');
      if (!level) errors.push('Nível inválido. Use Fundamental II ou Ensino Médio.');
      if (!grade) errors.push('Série/ano ausente.');
      if (!className) errors.push('Turma ausente.');
      if (raw.expiresAt && !expiresAt) errors.push('Validade do código inválida.');
      const row = {
        rowNumber: index + 2,
        type: 'student',
        student,
        registration,
        school: schoolMatch?.name || school,
        schoolId: schoolMatch?.id || null,
        schoolCode: schoolMatch?.referenceCode || schoolCode,
        levelKey: level?.key || '',
        levelLabel: level?.label || String(raw.level || '').trim(),
        grade,
        className,
        expiresAt,
        errors,
        warnings,
        status: 'valid'
      };
      const key = studentFingerprint(row);
      if (seen.has(key)) errors.push('Aluno duplicado dentro da planilha.');
      seen.add(key);
      if (!registration) warnings.push('Sem matrícula/código externo: duplicidade será conferida pelo nome e turma.');
      row.status = errors.length ? 'error' : warnings.length ? 'warning' : 'valid';
      return row;
    });
  }

  function summarize(rows) {
    const total = rows.length;
    const errors = rows.filter(r => r.errors?.length).length;
    const warnings = rows.filter(r => !r.errors?.length && r.warnings?.length).length;
    const valid = total - errors;
    return { total, valid, warnings, errors };
  }

  function templateRows(type) {
    if (type === 'schools') {
      return [{
        codigo_escola: 'INEP-EXEMPLO-001',
        escola: 'E.M.E.F. Escola Exemplo',
        distrito: 'Sede',
        municipio: 'Beberibe',
        rede: 'Municipal',
        latitude: '-4.179000',
        longitude: '-38.129000'
      }];
    }
    return [{
      matricula: '20260001',
      aluno: 'Aluno Exemplo',
      escola: 'E.M.E.F. Escola Exemplo',
      nivel: 'Fundamental II',
      serie: '8º ano',
      turma: 'A',
      validade_codigo: '2026-12-31'
    }];
  }

  function downloadTemplate(type, format = 'xlsx') {
    if (!window.XLSX) throw new Error('Leitor de planilhas indisponível.');
    const rows = templateRows(type);
    const sheet = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, sheet, type === 'schools' ? 'Escolas' : 'Alunos');
    const name = type === 'schools' ? 'modelo-importacao-escolas' : 'modelo-importacao-alunos';
    if (format === 'csv') {
      const csv = window.XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
      return;
    }
    window.XLSX.writeFile(wb, `${name}.xlsx`, { compression: true });
  }

  window.FCDImportTools = {
    normalizeText,
    parseFile,
    validateSchools,
    validateStudents,
    summarize,
    downloadTemplate
  };
})();
