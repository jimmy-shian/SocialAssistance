// Global configuration for GAS backend integration
window.AppConfig = {
  // TODO: 填入你部署完成的 Google Apps Script Web App URL（結尾不要有斜線）
  GAS_BASE_URL: 'https://script.google.com/macros/s/AKfycbxgeOpIS4Xn_JFC4Q22lXhziUdbnvG5ymXuY7EMLPNAMxTaS5BFK9JDJj6FWOQ04AV1nA/exec',
  // 以單一 Web App 端點 + action 路由
  endpoints: {
    // Admin login (DataAPI uses this)
    login: '?action=login',
    // Member auth & profile
    memberLogin: '?action=memberLogin',
    memberRegister: '?action=memberRegister',
    memberForgot: '?action=memberForgot',
    profileRead: '?action=profileRead',
    profileUpdate: '?action=profileUpdate',
    membersList: '?action=membersList',
    uploadImage: '?action=uploadImage',
    memberChangePassword: '?action=memberChangePassword',
    read: '?action=read',
    publish: '?action=publish',
    data: '?action=data',
    update: '?action=update',
    version: '?action=version',
    savePublish: '?action=savePublish'
  },
  // 前端統一的資料集鍵
  datasets: {
    about: 'aboutContent',
    providers: 'providers',
    site: 'siteContent'
  },
  versionCacheKey: 'app_data_version',
  // 預設不在公開頁自動向 GAS 取資料
  autoFetchPublic: false
};
