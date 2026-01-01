# 遷移指南：GAS 到 Wix

本指南說明如何將您的後端從 Google Apps Script (GAS) 完全遷移到 Wix。

## 1. 準備 Wix 資料集 (資料庫)
前往您的 Wix 編輯器 -> **CMS (內容管理員)** -> **您的資料集 (Collections)** 並建立以下資料集。
*詳細欄位請參考 `wix-schema.md`。*

1.  **SocialUsers** (欄位: `username`, `email`, `passHash`, `role`, `createdAt`, `resetCode`, `resetCodeExp`)
2.  **Profiles** (欄位: `username`, `json`, `updatedAt`)
3.  **Datasets** (欄位: `key`, `json`, `version`, `updatedAt`)
4.  **UploadedImages** (欄位: `imageId`, `filename`, `mimetype`, `base64`)

> **權限設定**：請設定這些資料集的權限。通常設定為 **"自訂使用 (Custom Use)"** 並允許 **後端程式碼讀寫 (Read/Write for Backend Code)**。
> 或者簡單設定為 "僅限管理員 (Admin)"，因為我們的 `wix-data-helpers.js` 是在後端執行，預設擁有管理員權限 (若使用 `suppressAuth`)。建議確保 `http-functions.js` 能順利存取。

## 2. 設定 Email 自動發送 (Triggered Emails)
為了讓「忘記密碼」功能正常運作，您需要在 Wix 設定觸發式郵件：

1.  前往 **Wix 控制台 (Dashboard)** -> **行銷與 SEO (Marketing & SEO)** -> **觸發式郵件 (Triggered Emails)**。
2.  點擊 **+ 新增電子郵件 (New Email)**。
3.  設計您的郵件內容 (例如：「您的密碼重設代碼是...」)。
4.  在內容中加入變數 (Add Variable)：
    *   名稱: `username` (顯示使用者名稱)
    *   名稱: `resetCode` (顯示驗證碼)
    *   名稱: `resetLink` (顯示重設連結 - 選用)
5.  儲存並發佈郵件。
6.  點擊郵件列表中的 **查看程式碼 (Copy Code)** 按鈕，取得 **Email ID** (例如 `ForgotPassword` 或 `email_1`)。
7.  記下這個 ID，下一步會用到。

## 3. 安裝後端程式碼
在 Wix 編輯器中，開啟 **開發模式 (Dev Mode)**。

1.  **建立 Helper 檔案**：
    *   在左側檔案列表中，前往 **Backend (後端)**。
    *   點擊 `+` > **New .js file (新增 .js 檔案)**。
    *   命名為 `wix-data-helpers.js`。
    *   將 `wix/wix-data-helpers.js` 的內容複製貼上到此檔案。

2.  **建立 HTTP Functions**：
    *   在 **Backend** 中，建立一個固定名稱為 `http-functions.js` (若已存在則直接編輯)。
    *   **重要**：檔名必須完全相符，API 才會生效。
    *   將 `wix/http-functions.js` 的內容複製貼上到此檔案。

## 4. 設定 (Configuration)
在 Wix 中打開 `http-functions.js` 並更新上方的常數：
```javascript
const TOKEN_SECRET = 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING'; // 請修改為一組亂數密鑰
const EMAIL_TEMPLATE_ID = 'ForgotPassword'; // 請修改為步驟 2 取得的 Email ID
```

## 5. 前端更新 (Frontend Updates)
您需要更新網頁前端的 JavaScript (HTML 檔案中的 script)，將原本指向 GAS 的 URL 改為 Wix API URL。

**舊 URL 格式 (GAS):**
`https://script.google.com/macros/s/.../exec?action=memberLogin`

**新 URL 格式 (Wix):**
`https://<your-wix-site-url>/_functions/memberLogin`

### 範例修改 (`js/auth.js` 或 `js/config.js`):
若您有統一的設定檔：
```javascript
// const API_BASE = "https://script.google.com/.../exec"; // 舊的
const API_BASE = "https://your-site.wixsite.com/mysite/_functions"; // 新的 (請換成您的網址)

async function callApi(action, data) {
    // Note: Wix functions are separate paths, e.g. /memberLogin
    // 您可能需要微調 fetch 的邏輯：
    const url = `${API_BASE}/${action}`; 
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}
```

## 6. 部署 (Deployment)
1.  **發佈 (Publish)** 您的 Wix 網站。
2.  HTTP functions 將會在 `https://<your-username>.wixsite.com/<site-name>/_functions/<functionName>` (或您的自訂網域) 上線。
