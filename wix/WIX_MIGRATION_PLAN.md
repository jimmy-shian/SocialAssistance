# 實作計劃：從 GAS 後端遷移到 Wix 純後端儲存

## [Overview]

本文件旨在規劃將 SocialAssistance 網站從 Google Apps Script (GAS) 後端遷移到 Wix 純後端儲存的詳細實作方案。

**重要變更**：不同於原本 GAS + GitHub 的架構，新架構將完全捨棄 GitHub 發佈流程，所有資料（包含圖片）都直接儲存在 Wix 平台內部。

### 架構差異說明

| 項目 | GAS 舊架構 | Wix 新架構 |
|------|-----------|-----------|
| 資料儲存 | Google Sheets | Wix Collections |
| 圖片儲存 | GAS 暫存 → GitHub img/ | Wix Media (CDN) |
| 圖片 URL | `gas://image/{id}/{filename}` → GitHub URL | Wix Media 直接 URL |
| 發佈流程 | 需手動發佈到 GitHub | 即時儲存，無需發佈 |
| 前端讀取 | 讀取 `js/data/*.js` 靜態檔 | 直接讀取 Collections 或 API |

### 新架構流程

```
前端請求 → Wix HTTP Functions → Wix Collections → 回傳 JSON
                                      ↓
圖片上傳 → Wix Media Manager → 取得 CDN URL → 直接使用
```

## [Types]

### 認證相關類型

```typescript
// 管理員登入
interface AdminLoginRequest {
  username: string;
  password: string;
}

interface AdminLoginResponse {
  ok: boolean;
  token?: string;
  exp?: number;
  message?: string;
}

// 會員登入
interface MemberLoginRequest {
  username: string;
  password: string;
}

interface MemberLoginResponse {
  ok: boolean;
  token?: string;
  exp?: number;
  role?: 'member' | 'admin';
  message?: string;
}

// Token 驗證
interface TokenPayload {
  ok: boolean;
  user?: string;
  message?: string;
}
```

### 資料管理類型

```typescript
// 資料讀取
interface DataReadRequest {
  token: string;
  key: 'aboutContent' | 'providers' | 'siteContent' | 'blogContent';
  nonce?: string; // Wix 內部已無需 nonce，但保留相容性
}

interface DataReadResponse {
  ok: boolean;
  key: string;
  version: number;
  updatedAt: string;
  data: object;
  message?: string;
}

// 資料更新（直接儲存，無需發佈）
interface DataUpdateRequest {
  token: string;
  key: string;
  data: object;
  nonce?: string;
}

interface DataUpdateResponse {
  ok: boolean;
  key: string;
  version: number;
  message?: string;
}
```

### 會員資料類型

```typescript
// 會員資料結構
interface MemberProfile {
  username: string;
  basic: {
    name: string;
    email: string;
    phone: string;
    birthday: string;
    address: string;
  };
  selfEvaluation: {
    interests: string;
    strengths: string;
    goals: string;
  };
  activities: Array<any>;
  learningRecords: Array<any>;
}
```

### 圖片上傳類型

```typescript
// 圖片上傳（Wix Media）
interface ImageUploadRequest {
  token: string;
  dataUrl: string; // base64 data URL
  filename: string;
}

interface ImageUploadResponse {
  ok: boolean;
  id?: string;
  filename?: string;
  // ⚠️ 重要：直接回傳 Wix Media URL，不再使用 gas:// 佔位符
  url?: string;
  message?: string;
}
```

## [Files]

### 新建檔案

1. **wix/http-functions.js** - Wix HTTP Functions 實作
   - 所有 REST API 端點
   - 路由處理與請求驗證
   - ⚠️ **圖片直接上傳到 Wix Media，回傳 CDN URL**

2. **wix/collections-scheme.js** - Wix Collections 結構定義
   - datasets collection schema
   - members collection schema
   - profiles collection schema

3. **wix/auth.js** - Wix 後端認證模組
   - Token 產生與驗證
   - 密碼雜湊處理

4. **wix/README_WIX.md** - Wix 後端部署說明文件

### 需修改檔案

1. **js/config.js**
   - 新增 `WIX_BASE_URL` 設定
   - 新增 `WIX_ENDPOINTS` 端點映射
   - 移除或註解 GAS 相關設定

2. **js/data-loader.js**
   - 新增 `WixAPI` 物件
   - 修改 `DataAPI` 使用 Wix 端點
   - ⚠️ **移除 `publish` / `savePublish` 功能**
   - ⚠️ **圖片 URL 處理：直接使用 Wix URL**

3. **js/admin.js**
   - 圖片上傳改用 Wix API
   - ⚠️ **移除 GitHub 發佈相關 UI**
   - ⚠️ **圖片預覽直接使用 Wix URL**

4. **js/auth.js**
   - 認證端點改為 Wix API
   - 維持 localStorage fallback

5. **js/member-data.js**
   - 會員資料讀寫改用 Wix API

6. **所有前端頁面** (需審視)
   - ⚠️ **圖片顯示：移除 `gas://image/` 佔位符處理**
   - ⚠️ **直接使用 Wix Media URL 或 API 回傳的 URL**

## [Functions]

### 新建函數

#### Wix HTTP Functions (wix/http-functions.js)

```javascript
// 管理員登入
export function post_login(request) { ... }
// 會員登入
export function post_memberLogin(request) { ... }
// 會員註冊
export function post_memberRegister(request) { ... }
// 忘記密碼
export function post_memberForgot(request) { ... }
// 讀取資料
export function post_read(request) { ... }
// 更新資料（直接儲存，無需發佈）
export function post_update(request) { ... }
// 讀取會員資料
export function post_profileRead(request) { ... }
// 更新會員資料
export function post_profileUpdate(request) { ... }
// 修改密碼
export function post_memberChangePassword(request) { ... }
// 會員列表
export function post_membersList(request) { ... }
// 上傳圖片到 Wix Media
export function post_uploadImage(request) { ... }
// 重設密碼確認
export function get_confirmReset(request) { ... }
```

#### 認證模組 (wix/auth.js)

```javascript
// 產生 HMAC token
export function signToken(username, timestamp) { ... }
// 驗證 token
export function verifyToken(token) { ... }
// 密碼雜湊
export function hashPassword(password) { ... }
// 速率限制檢查
export function checkRateLimit(key, limit, windowSec) { ... }
```

#### Wix Media 上傳模組 (wix/media-upload.js)

```javascript
// 上傳圖片到 Wix Media
export async function uploadToWixMedia(base64Data, filename) {
  // 1. 解碼 base64
  // 2. 使用 Wix Media Manager API 上傳
  // 3. 取得 Wix CDN URL
  // 4. 回傳可直接使用的 URL
}

// 刪除 Wix Media
export async function deleteFromWixMedia(mediaId) { ... }
```

## [Classes]

### Wix Collections 結構

#### Datasets Collection
```
Collection Name: datasets
Fields:
  - key (text, unique, required) - aboutContent, providers, siteContent, blogContent
  - jsonData (text, long text) - JSON 格式的資料內容
  - version (number) - 版本號
  - updatedAt (datetime) - 最後更新時間
```

#### Members Collection
```
Collection Name: members
Fields:
  - username (text, unique, required)
  - email (text, required)
  - passHash (text, required)
  - createdAt (datetime)
  - role (text, default: 'member') - member 或 admin
```

#### Profiles Collection
```
Collection Name: profiles
Fields:
  - username (text, indexed, required)
  - jsonData (text, long text) - 會員資料的 JSON
  - updatedAt (datetime)
```

## [Dependencies]

### Wix 必要設定

1. **Wix 網站後端啟用**
   - 需要 Wix Studio 或 Corvid enabled site
   - 啟用 Backend Web Modules
   - 啟用 HTTP Functions

2. **HTTP Functions 設定**
   - 發布為 Public 或指定角色可訪問
   - 設定允許的 HTTP 方法

3. **Collections 權限設定**
   - datasets: 僅管理員可寫入，所有人可讀取
   - members: 僅管理員可寫入
   - profiles: 會員可寫入自己的資料

4. **Wix Media 設定**
   - 啟用 Media Manager
   - 設定上傳權限（僅管理員）
   - 設定儲存空間限額

5. **環境變數設定**
   - TOKEN_SECRET: Token 簽署密鑰
   - ADMIN_USER: 管理員帳號
   - ADMIN_PASS: 管理員密碼
   - ADMIN_VERIFY_CODE: 管理員驗證碼

## [Important: 圖片處理重大變更]

### ⚠️ 核心變更：圖片不再使用 gas:// 佔位符

#### 舊架構（GAS + GitHub）

```
上傳流程：
1. 前端上傳圖片 → GAS 暫存（base64）
2. GAS 回傳 gas://image/{id}/{filename} 佔位符
3. 儲存時替換佔位符
4. 發佈時處理佔位符 → 上傳到 GitHub img/
5. 最終 URL: https://raw.githubusercontent.com/.../img/xxx.jpg

顯示流程：
1. 讀取 js/data/*.js 靜態檔
2. 解析 gas://image/ 佔位符
3. 替換為 GitHub URL 顯示
```

#### 新架構（Wix 純內部儲存）

```
上傳流程：
1. 前端上傳圖片 → Wix HTTP Function
2. 立即上傳到 Wix Media Manager
3. 取得 Wix CDN URL
4. 直接儲存 Wix URL 到資料中

顯示流程：
1. 從 API 讀取資料
2. ⚠️ 圖片欄位直接就是 Wix URL
3. 直接顯示，無需任何轉換
```

### 前端需要修改的圖片處理邏輯

#### 1. admin.js 圖片上傳

```javascript
// 舊：上傳到 GAS，回傳 gas:// 佔位符
async function uploadFileAndGetPlaceholder(file) {
  // ... 上傳邏輯
  return `gas://image/${data.id}/${data.filename}`; // ❌ 移除
}

// 新：上傳到 Wix，回傳直接 URL
async function uploadFileAndGetPlaceholder(file) {
  // ... 上傳到 Wix Media
  return data.url; // ✅ 直接回傳 Wix URL
}
```

#### 2. 圖片預覽快取邏輯

```javascript
// 舊：使用 previewCache 暫存 base64
const previewCache = {};
if (/^gas:\/\/image\//.test(url)) {
  url = previewCache[url]; // 從暫存取得 base64
}

// 新：直接使用 Wix URL
if (url.startsWith('https://media.wixapps.net/')) {
  // Wix URL 可直接使用，無需處理
}
```

#### 3. 圖片解析邏輯（所有前端頁面）

```javascript
// 舊：解析 gas://image/ 佔位符
function getImageUrl(imagePath) {
  if (/^gas:\/\/image\//.test(imagePath)) {
    return previewCache[imagePath] || imagePath;
  }
  return imagePath;
}

// 新：直接使用 URL
function getImageUrl(imagePath) {
  // Wix URL 或外部 URL 直接使用
  return imagePath;
}
```

### 需要檢視的檔案清單

| 檔案 | 圖片處理說明 |
|------|-------------|
| js/admin.js | 圖片上傳、預覽、佔位符處理 |
| js/about.js | 團隊照片顯示 |
| js/explore.js | 業者列表圖片 |
| js/provider-detail.js | 業者詳情圖片 |
| js/render-index.js | 首頁圖片渲染 |
| js/map-provider.js | 地圖標記圖片 |
| js/member-profile.js | 會員頭像 |
| about.html | 圖片顯示區塊 |
| provider.html | 業者圖片顯示 |
| index.html | 首頁圖片顯示 |
| 其他 HTML | 各頁面圖片顯示 |

## [Important: 資料顯示架構變更]

### ⚠️ 核心變更：不再需要發佈到 GitHub

#### 舊架構流程

```
1. 管理員編輯資料
2. 儲存到 GAS（Google Sheets）
3. 手動點擊「發佈」按鈕
4. GAS 將資料發佈到 GitHub js/data/
5. 前端載入 js/data/*.js 靜態檔
```

#### 新架構流程

```
1. 管理員編輯資料
2. 直接儲存到 Wix Collections（透過 HTTP Function）
3. ⚠️ 無需發佈，資料立即可用
4. 前端直接呼叫 API 讀取最新資料
   或前端快取 + 定期刷新
```

### 前端資料讀取策略

```javascript
// 選項 A：直接 API 讀取（推薦）
async function loadData() {
  const response = await fetch('https://site.wix.com/_functions/read', {
    method: 'POST',
    body: JSON.stringify({ token, key: 'providers' })
  });
  return response.json();
}

// 選項 B：前端快取 + 刷新
async function loadDataWithCache(key) {
  // 1. 先顯示快取資料
  const cached = localStorage.getItem(`data_${key}`);
  if (cached) render(JSON.parse(cached));
  
  // 2. 背景刷新
  const fresh = await api.read(key);
  if (fresh.ok) {
    localStorage.setItem(`data_${key}`, JSON.stringify(fresh.data));
    render(fresh.data);
  }
}
```

### 需要移除的功能

| 功能 | 說明 |
|------|------|
| publish API | 移除 GitHub 發佈功能 |
| savePublish API | 移除儲存+發佈合一功能 |
| GitHub 設定 | 移除 GITHUB_TOKEN 等設定 |
| 版本號顯示 | 可選：仍顯示最後更新時間 |
| 「發佈」按鈕 | admin.html 移除發佈相關 UI |

## [Testing]

### 測試策略

1. **單元測試**
   - 後端各函數邏輯測試
   - 認證流程測試
   - 資料驗證測試

2. **整合測試**
   - API 端點測試
   - 圖片上傳/顯示測試
   - 前端串接測試

3. **遷移測試**
   - 資料從 GAS 匯出
   - 匯入 Wix Collections
   - 驗證資料完整性
   - ⚠️ 圖片 URL 轉換驗證

### 測試案例

```bash
# 測試管理員登入
curl -X POST "https://site.wix.com/_functions/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 測試資料讀取
curl -X POST "https://site.wix.com/_functions/read" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","key":"providers"}'

# 測試資料更新（直接儲存）
curl -X POST "https://site.wix.com/_functions/update" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","key":"providers","data":{}}'

# 測試圖片上傳
curl -X POST "https://site.wix.com/_functions/uploadImage" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","dataUrl":"data:image/png;base64,...","filename":"test.png"}'
```

## [Implementation Order]

實作順序規劃：

1. **第一階段：Wix 後端基礎建設**
   - 建立 Wix Collections 結構
   - 實作認證模組（wix/auth.js）
   - 實作管理員登入 API
   - 設定 Collections 權限

2. **第二階段：資料管理 API**
   - 實作資料讀取 API
   - 實作資料更新 API
   - ⚠️ **不實作 GitHub 發佈功能**

3. **第三階段：圖片系統**
   - 實作 Wix Media 上傳 API
   - 確認 Wix CDN URL 回傳

4. **第四階段：會員系統遷移**
   - 實作會員註冊/登入 API
   - 實作會員資料 CRUD
   - 實作忘記密碼功能
   - 實作修改密碼功能

5. **第五階段：前端整合**
   - 修改 js/config.js 新增 Wix 設定
   - 修改 js/data-loader.js 串接 Wix API
   - ⚠️ **移除 publish/savePublish 功能**
   - 修改 js/auth.js 串接 Wix API
   - 修改 js/admin.js：
     - 圖片上傳改用 Wix
     - ⚠️ 移除 GitHub 發佈 UI
     - ⚠️ 移除 gas:// 佔位符處理
   - 修改 js/member-data.js

6. **第六階段：圖片處理重構**
   - ⚠️ **搜尋並移除所有 gas://image/ 處理邏輯**
   - ⚠️ **修改圖片 URL 解析為直接使用 Wix URL**
   - ⚠️ **更新所有前端頁面的圖片顯示邏輯**

7. **第七階段：資料遷移**
   - 從 GAS Google Sheet 匯出資料
   - 匯入資料到 Wix Collections
   - ⚠️ **圖片需重新上傳到 Wix Media**
   - ⚠️ **更新資料中的圖片 URL**

8. **第八階段：測試與部署**
   - 完整功能測試
   - 圖片顯示測試
   - 切換正式流量
   - 監控與除錯

---

## 附錄：GAS 與 Wix API 對照表

| GAS Action | Wix Endpoint | 說明 |
|------------|--------------|------|
| login | POST /login | 管理員登入 |
| memberLogin | POST /memberLogin | 會員登入 |
| memberRegister | POST /memberRegister | 會員註冊 |
| memberForgot | POST /memberForgot | 忘記密碼 |
| read | POST /read | 讀取資料集 |
| update | POST /update | 更新資料集 |
| ~~publish~~ | ❌ 移除 | 不再需要 |
| ~~savePublish~~ | ❌ 移除 | 不再需要 |
| profileRead | POST /profileRead | 讀取會員資料 |
| profileUpdate | POST /profileUpdate | 更新會員資料 |
| membersList | POST /membersList | 會員列表 |
| uploadImage | POST /uploadImage | 上傳圖片 |
| memberChangePassword | POST /memberChangePassword | 修改密碼 |
| confirmReset | GET /confirmReset | 重設密碼確認 |

## 附錄：遷移風險評估

| 風險項目 | 影響程度 | 緩解措施 |
|---------|---------|---------|
| Wix HTTP Functions 限制 | 中 | 採用非同步處理大量資料 |
| 速率限制 | 低 | 實作請求節流 |
| 資料遷移完整性 | 高 | 多次驗證與備份 |
| 圖片 URL 轉換 | ⚠️ **高** | 需全面檢視前端圖片處理 |
| 前端 gas:// 佔位符殘留 | ⚠️ **高** | 需全面搜尋並移除 |
| Wix Media 儲存空間 | 中 | 預估容量並設定限額 |

## 附錄：圖片遷移檢查清單

### 需要搜尋的關鍵字

```
gas://image/
previewCache
getImageUrl
parseImagesFrom
```

### 需要檢視的邏輯

- [ ] admin.js 的圖片上傳函數
- [ ] admin.js 的圖片預覽函數
- [ ] admin.js 的 gas:// 佔位符解析
- [ ] 所有 HTML 頁面的圖片 src 綁定
- [ ] js/data/*.js 的圖片 URL 格式
- [ ] localStorage 中的圖片快取

### 圖片 URL 驗證

遷移完成後，需驗證：
- [ ] 所有圖片可正常顯示
- [ ] 圖片 URL 為 Wix CDN 格式
- [ ] 無任何 gas:// 殘留
- [ ] 上傳新圖片可正常顯示
- [ ] 刪除圖片可正常處理