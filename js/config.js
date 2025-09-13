// Global configuration for GAS backend integration
window.AppConfig = {
  // TODO: 填入你部署完成的 Google Apps Script Web App URL（結尾不要有斜線）
  GAS_BASE_URL: '',
  // 以單一 Web App 端點 + action 路由
  endpoints: {
    login: '?action=login',
    data: '?action=data',
    update: '?action=update',
    version: '?action=version'
  },
  // 前端統一的資料集鍵
  datasets: {
    about: 'aboutContent',
    providers: 'providers',
    site: 'siteContent'
  },
  versionCacheKey: 'app_data_version'
};
