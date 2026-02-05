/**
 * config.js
 * 
 * [功能說明]
 * 此檔案負責全域的環境配置，最核心的是 `GAS_BASE_URL`。
 * 所有與後端 Google Apps Script 溝通的 URL 都是由此處定義。
 * 
 * [關聯檔案]
 * - 被 `js/data-loader.js` 引用 (AppConfig.GAS_BASE_URL)
 * - 被 `js/admin.js` 引用 (圖片上傳 API)
 * 
 * [修改時機]
 * - 當重新部署 GAS Web App 取得新網址時，必須更新 `GAS_BASE_URL`。
 */
// Global configuration for GAS backend integration
window.AppConfig = {
  // TODO: 填入你部署完成的 Google Apps Script Web App URL（結尾不要有斜線）
  GAS_BASE_URL: 'https://script.google.com/macros/s/AKfycbx7UaV3kQ8zmplaDjh3vkTUW2ZRy3Nn5OY5nIGNhwR560WyJuYNmn7C49MNxe8p3KUfiw/exec',
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
    site: 'siteContent',
    blog: 'blogContent'
  },
  versionCacheKey: '1.0.0',
  // 預設不在公開頁自動向 GAS 取資料
  autoFetchPublic: false
};
