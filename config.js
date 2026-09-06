window.APP_CONFIG = {
  appName: 'Projeto Formação Cidadã Digital',
  version: '1.3.0',
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
