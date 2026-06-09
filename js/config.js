/** 
 * config.js 
 * 
 * [功能說明] 
 * 此檔案負責全域的環境配置。 
 * 支援兩種後端模式：GAS（舊）和 Wix（新） 
 * 
 * [關聯檔案] 
 * - 被 `js/data-loader.js` 引用 
 * - 被 `js/admin.js` 引用 
 * - 被 `js/surveys.js` 引用 
 * 
 * [修改時機] 
 * - 遷移到 Wix 後，請將 USE_WIX_BACKEND 設為 true 
 * - 並填入你的 Wix 網站網址 
 */

// ==================== 後端模式切換 ==================== 
// true = 使用 Wix 後端, false = 使用 GAS 後端 
const USE_WIX_BACKEND = false;

// Global configuration 
window.AppConfig = {
  // ==================== Wix 設定 ==================== 
  // TODO: 填入你的 Wix 網站網址（部署 HTTP Functions 後替換） 
  WIX_BASE_URL: 'https://www.soundcore3co.com/',

  // Wix API 端點（直接是路徑，會拼接到 WIX_BASE_URL） 
  wixEndpoints: {
    login: '/_functions/login',
    memberLogin: '/_functions/memberLogin',
    memberRegister: '/_functions/memberRegister',
    memberForgot: '/_functions/memberForgot',
    confirmReset: '/_functions/confirmReset',
    read: '/_functions/read',
    update: '/_functions/update',
    profileRead: '/_functions/profileRead',
    profileUpdate: '/_functions/profileUpdate',
    membersList: '/_functions/membersList',
    memberChangePassword: '/_functions/memberChangePassword',
    uploadImage: '/_functions/uploadImage'
  },

  // ==================== 問卷 API 端點 ==================== 
  surveyEndpoints: {
    createSurvey: '/_functions/createSurvey',
    surveyList: '/_functions/surveyList',
    surveyDetail: '/_functions/surveyDetail',
    submitResponse: '/_functions/submitResponse',
    surveyResponses: '/_functions/surveyResponses'
  },

  // ==================== 問卷題型常數 ==================== 
  questionTypes: {
    radio: { 
      id: 1, 
      label: '單選題', 
      description: '從多個選項中選擇一個' 
    },
    checkbox: { 
      id: 2, 
      label: '多選題', 
      description: '從多個選項中選擇多個' 
    },
    text: { 
      id: 3, 
      label: '單行文字輸入', 
      description: '簡短文字回答' 
    },
    textarea: { 
      id: 4, 
      label: '多行文字輸入', 
      description: '長文字回答' 
    },
    number: { 
      id: 5, 
      label: '數字輸入', 
      description: '數值型回答' 
    },
    dropdown: { 
      id: 6, 
      label: '下拉式選擇', 
      description: '下拉選單選擇一個選項' 
    },
    scale: { 
      id: 7, 
      label: '評分題', 
      description: '1~10 分表示的等級選擇題' 
    },
    rating: { 
      id: 8, 
      label: '星星評分', 
      description: '1~5 星評分' 
    }
  },

  // ==================== 問卷狀態 ==================== 
  surveyStatuses: {
    draft: { 
      code: '0', 
      label: '草稿' 
    },
    active: { 
      code: '1', 
      label: '活動中' 
    },
    completed: { 
      code: '2', 
      label: '已完成' 
    }
  },

  // ==================== 預設問卷設定 ==================== 
  defaultSurveySettings: {
    title: '新問卷',
    description: '',
    status: 'draft',
    questions: []
  },

  // ==================== GAS 設定（保留作為備用）==================== 
  // TODO: 填入你部署完成的 Google Apps Script Web App URL（結尾不要有斜線） 
  GAS_BASE_URL: 'https://script.google.com/macros/s/AKfycbx7UaV3kQ8zmplaDjh3vkTUW2ZRy3Nn5OY5nIGNhwR560WyJuYNmn7C49MNxe8p3KUfiw/exec',

  // 以單一 Web App 端點 + action 路由 
  endpoints: {
    login: '?action=login',
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

  // ==================== 共用設定 ==================== 
  // 前端統一的資料集鍵 
  datasets: {
    about: 'aboutContent',
    providers: 'providers',
    site: 'siteContent',
    blog: 'blogContent',
    services: 'servicesContent'
  },
  versionCacheKey: '1.0.0',
  // 預設不在公開頁自動向後端取資料 
  autoFetchPublic: false,

  // ==================== 便利方法 ==================== 
  // 取得當前使用的 API Base URL 
  getBaseUrl: function() {
    return USE_WIX_BACKEND ? this.WIX_BASE_URL : this.GAS_BASE_URL;
  },

  // 取得端點 URL 
  getEndpoint: function(key) {
    if (USE_WIX_BACKEND) {
      return this.WIX_BASE_URL + (this.wixEndpoints[key] || '');
    }
    return this.GAS_BASE_URL + (this.endpoints[key] || '');
  },

  // 取得問卷端點 URL 
  getSurveyEndpoint: function(key) {
    if (USE_WIX_BACKEND) {
      return this.WIX_BASE_URL + (this.surveyEndpoints[key] || '');
    }
    return this.GAS_BASE_URL + (this.surveyEndpoints[key] || '');
  },

  // 檢查是否使用 Wix 
  isWixMode: function() {
    return USE_WIX_BACKEND;
  }
};
