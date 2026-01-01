// Global configuration for Wix Backend integration
window.AppConfig = {
  // TODO: 填入您的 Wix 網站網址，結尾加上 /_functions
  // 例如: https://your-site.wixsite.com/mysite/_functions
  API_BASE: 'https://www.soundcore3co.com/_functions',

  // Wix HTTP Functions 端點名稱
  endpoints: {
    // Admin login (DataAPI uses this)
    login: 'login',
    // Member auth & profile
    memberLogin: 'memberLogin',
    memberRegister: 'memberRegister',
    memberForgot: 'memberForgot',
    profileRead: 'profileRead',
    profileUpdate: 'profileUpdate',
    membersList: 'membersList',
    uploadImage: 'uploadImage',
    memberChangePassword: 'memberChangePassword',
    // Data operations
    read: 'read',
    publish: 'publish',
    data: 'data',
    update: 'update',
    version: 'version',
    savePublish: 'savePublish'
  },
  // 前端統一的資料集鍵 (維持不變)
  datasets: {
    about: 'aboutContent',
    providers: 'providers',
    site: 'siteContent',
    blog: 'blogContent'
  },
  versionCacheKey: '1.0.0',
  // 預設不在公開頁自動向後端取資料
  autoFetchPublic: false
};
