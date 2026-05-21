# Wix 後端部署說明

## 📋 部署前準備

### 1. 啟用 Wix 後端功能

在 Wix 後台完成以下設定：

1. **開啟 Wix Studio 或 Corvid**
   - 進入網站編輯器
   - 點擊「開發者工具」或「後端」

2. **啟用 Backend Web Modules**
   - 在後台建立 `backend` 資料夾
   - 這裡將放置所有後端程式碼

3. **啟用 HTTP Functions**
   - 前往「網站設定」>「進階」>「HTTP Functions」
   - 設定允許的 HTTP 方法（POST, GET）

### 2. 建立 Collections

在 Wix 後台手動建立以下 Collections：

#### datasets（資料集）
| 欄位名稱 | 類型 | 設定 |
|---------|------|------|
| key | Text | Title, Required, Unique |
| jsonData | Long Text | - |
| version | Number | - |
| updatedAt | Date & Time | - |

**權限設定：**
- Insert: Admin
- Update: Admin
- Remove: Admin
- Read: Anyone

#### members（會員）
| 欄位名稱 | 類型 | 設定 |
|---------|------|------|
| username | Text | Title, Required, Unique |
| email | Text | Required |
| passHash | Text | Required |
| createdAt | Date & Time | - |
| role | Text | Default: 'member' |
| resetToken | Text | - |
| resetTokenExp | Date & Time | - |

**權限設定：**
- Insert: Admin
- Update: Admin
- Remove: Admin
- Read: Admin

#### profiles（會員資料）
| 欄位名稱 | 類型 | 設定 |
|---------|------|------|
| username | Text | Title, Required, Indexed |
| jsonData | Long Text | - |
| updatedAt | Date & Time | - |

**權限設定：**
- Insert: Member
- Update: Member
- Remove: Member
- Read: Member, Admin

---

## 🚀 部署步驟

### 方式一：手動複製貼上（推薦）

1. **在 Wix 後台開啟後端編輯器**
   - 進入 Wix Studio
   - 點擊「Backend」或「後端模組」

2. **建立模組檔案**
   - 在 `backend` 資料夾下建立以下檔案：
     - `auth.js`
     - `media-upload.js`
     - `http-functions.js`

3. **複製貼上程式碼**
   - 將本專案的 `wix/` 資料夾中的程式碼複製到對應檔案
   - Wix 會自動編譯

4. **發布網站**
   - 點擊「發布」按鈕
   - HTTP Functions 即可使用

### 方式二：使用 Wix CLI（進階）

```bash
# 安裝 Wix CLI
npm install -g @wix/cli

# 登入 Wix
wix login

# 初始化專案
wix init

# 部署後端模組
wix deploy backend/
```

---

## 🔧 環境變數設定

在 `wix/auth.js` 中設定敏感資訊：

```javascript
const TOKEN_SECRET = 'your-secret-key-change-in-production';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'your-secure-password';
```

**⚠️ 重要：上傳到 Wix 後，請修改預設密碼！**

---

## 📡 API 端點

部署成功後，HTTP Functions 會有以下端點：

| 端點 | 方法 | 說明 |
|------|------|------|
| `/_functions/login` | POST | 管理員登入 |
| `/_functions/memberLogin` | POST | 會員登入 |
| `/_functions/memberRegister` | POST | 會員註冊 |
| `/_functions/memberForgot` | POST | 忘記密碼 |
| `/_functions/confirmReset` | GET | 重設密碼確認 |
| `/_functions/read` | POST | 讀取資料 |
| `/_functions/update` | POST | 更新資料 |
| `/_functions/profileRead` | POST | 讀取會員資料 |
| `/_functions/profileUpdate` | POST | 更新會員資料 |
| `/_functions/membersList` | POST | 會員列表 |
| `/_functions/memberChangePassword` | POST | 修改密碼 |
| `/_functions/uploadImage` | POST | 上傳圖片 |

---

## 🔗 前端設定

在 `js/config.js` 中設定 Wix 網址：

```javascript
window.AppConfig = {
  // Wix 網站網址（替換為你的 Wix 網址）
  WIX_BASE_URL: 'https://your-site.wixsite.com',
  
  endpoints: {
    login: '/_functions/login',
    memberLogin: '/_functions/memberLogin',
    // ... 其他端點
  }
};
```

---

## 🧪 測試 API

使用 curl 測試：

```bash
# 測試管理員登入
curl -X POST "https://your-site.wixsite.com/_functions/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 測試資料讀取
curl -X POST "https://your-site.wixsite.com/_functions/read" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","key":"providers"}'

# 測試圖片上傳
curl -X POST "https://your-site.wixsite.com/_functions/uploadImage" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","dataUrl":"data:image/png;base64,...","filename":"test.png"}'
```

---

## ⚠️ 注意事項

1. **CORS 設定**
   - Wix HTTP Functions 預設允許來自同網域的請求
   - 如需跨域存取，需要在 Wix 後台設定

2. **速率限制**
   - Wix 有內建的請求限制
   - `auth.js` 中有額外的速率限制保護

3. **圖片大小限制**
   - Wix Media 單檔限制為 25MB
   - 建議前端壓縮後再上傳

4. **發布後生效**
   - HTTP Functions 需要發布網站後才會生效
   - 修改後端程式碼需要重新發布

---

## 📞 參考資源

- [Wix HTTP Functions 文檔](https://www.wix.com/velo/reference/wix-http-functions)
- [Wix Data API 文檔](https://www.wix.com/velo/reference/wix-data)
- [Wix Media Manager 文檔](https://www.wix.com/velo/reference/wix-media-manager)
- [Wix Backend Web Modules](https://www.wix.com/velo/reference/backend-modules)