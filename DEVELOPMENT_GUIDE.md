# 專案開發指南 (Development Guide)

本文件說明專案的檔案結構、資料流向以及修改功能時的標準流程。

## 核心架構 (Core Architecture)

本專案為靜態網站 (Static Site)，搭配 **Google Apps Script (GAS)** 作為後端資料庫與 API。

-   **前端 (Frontend)**: HTML, Vanilla JS, TailwindCSS (CDN or utility classes).
-   **後端 (Backend)**: Google Apps Script (Code.gs) + Google Sheets (資料儲存).
-   **資料流 (Data Flow)**:
    -   **讀取**: 網頁載入時，`js/data-loader.js` 會嘗試從 GAS 抓取最新 JSON 資料。若失敗或離線，則使用 `js/data/*.js` 內的本地靜態資料。
    -   **寫入 (Admin)**: `js/admin.js` 透過 `js/data-loader.js` (DataAPI) 將修改後的 JSON 送回 GAS 儲存並發佈。

## 主要檔案說明 (Key Files)

### 系統配置與核心
-   **`js/config.js`**: 全域設定檔。包含 GAS Web App URL (`GAS_BASE_URL`)。**部署新後端時必改此處。**
-   **`js/data-loader.js`**: 資料載入核心。負責處理 API 請求 (GET/POST)、快取 (Cache) 以及派發資料到全域變數 (`window.siteContent` 等)。
-   **`js/auth.js`**: 會員登入/註冊相關邏輯。

### 管理後台 (Admin Panel)
-   **`admin.html`**: 後台入口頁面。
-   **`js/admin.js`**: 後台主要邏輯。包含各個資料集 (Site, About, Providers, Blog) 的視覺化編輯器 (Visual Editors)、圖片上傳預覽、以及資料收集 (`collectData`)。

### 前端渲染 (Frontend Rendering)
-   **`js/main.js`**: 通用邏輯 (如手機版選單、捲動特效)。
-   **`js/navFooter.js`**: 動態產生導覽列 (Navbar) 與頁尾 (Footer)。
-   **`js/render-index.js`**: 首頁內容渲染邏輯 (Hero, Services, Video)。
-   **`js/explore.js` / `js/map-*.js`**: 「探索資源」頁面的地圖與列表邏輯。

### 靜態資料 (Static Data)
-   `js/data/`: 存放預設的靜態資料 (如 `siteContent.js`, `blogContent.js`)。當無法連線到後端時會使用這裡的資料。

---

## 開發流程範例 (Workflows)

### 1. 新增一個資料集 (例如：新增 "最新消息" News)

如果要新增一組全新的資料管理功能：

1.  **後端 (`gas/Code.gs`)**:
    -   在 `ALLOWED_KEYS` 新增 `'newsContent': true`。
    -   確保 `_handleUpdate` 能處理此 Key (通常通用邏輯即可，無需大改)。

2.  **資料核心 (`js/data-loader.js`)**:
    -   在 `DS` (Datasets) 對應表新增 `news: 'newsContent'`。
    -   在 `applyData` 函式中加入處理 `newsContent` 的邏輯，將其掛載到 `window.newsContent`。
    -   在 `fetchAll` 中加入 `fetchData(DS.news)`。

3.  **後台 (`admin.html` & `js/admin.js`)**:
    -   **HTML**: 在 `admin.html` 的下拉選單加入 `<option value="news">最新消息</option>`。
    -   **JS**:
        -   在 `js/admin.js` 實作 `renderNewsEditor(data)` (類似 `renderBlogEditor`)。
        -   實作 `collectNewsFromUI()` 用於收集表單資料。
        -   在 `loadDatasetAndRender` 中加入 Dispatch 邏輯：若選到 news 則呼叫 `renderNewsEditor`。

4.  **前端顯示**:
    -   建立 `news.html`。
    -   撰寫 `js/render-news.js`，讀取 `window.newsContent` 並生成 HTML。

### 2. 修改現有欄位 (例如：Blog 增加 "Author" 欄位)

1.  **後台 (`js/admin.js`)**:
    -   `buildPostItem`: 新增 `<input class="bl-author">`。
    -   `collectBlogFromUI`: 讀取該 input 並存入 JSON 物件 `author: ...`。
2.  **前端顯示 (`blog.html` / rendering script)**:
    -   更新顯示邏輯，將 `post.author` 顯示在畫面上。

---
**提示**: 修改 `js` 檔案時，建議在檔案開頭保留註解說明該檔案用途，方便後續維護。
