# GAS 後端部署說明（SocialAssistance）

本文件說明如何部署 Google Apps Script（GAS）Web App，提供前端透過 REST 方式存取與更新三個資料集：
- aboutContent（對應 `js/data/aboutContent.js`）
- providers（對應 `js/data/providers.js`）
- siteContent（對應 `js/data/siteContent.js`）

搭配前端的 `js/config.js` 與 `js/data-loader.js` 可實現：
- 讀取最新版本（GET `?action=version`）
- 取得指定資料（GET `?action=data&key=...&v=版本號`）
- 管理員登入（POST `?action=login`）
- 更新資料（POST `?action=update`）

---

## 一、建立 Apps Script 專案

1. 開啟 [script.google.com](https://script.google.com) -> 建立新專案。
2. 在專案內建立檔案 `Code.gs`，貼上本專案 `gas/Code.gs` 的全部內容。
3. 儲存。

> 首次執行任何端點時，程式會自動建立一份 Google 試算表（名稱：`SocialAssistance_Data`），並建立 `datasets` 工作表，欄位為：`[key, json, version, updatedAt]`。

---

## 二、設定管理員帳密與 Token 秘鑰

於 Apps Script 專案 -> 左側 `Project Settings`（齒輪）-> `Script properties` -> 新增以下屬性：

- `ADMIN_USER`：管理員帳號（預設 `admin`）
- `ADMIN_PASS`：管理員密碼（預設 `admin123`）
- `TOKEN_SECRET`：任意隨機字串，請務必自行設定，例如：`r@nd0m-very-long-secret`。

> 不設定也可運作，但建議務必修改為你自己的安全字串與帳密。

---

## 三、部署為 Web App

1. 選單 `Deploy` -> `New deployment`。
2. `Select type` 選擇 `Web app`。
3. `Who has access` 請選 `Anyone`（或 `Anyone with the link`）。
4. 部署完成後，複製 `Web app URL`。

將此 URL 貼到前端 `js/config.js` 的 `GAS_BASE_URL`（結尾不要加斜線 `/`）。

---

## 四、API 規格

- 版本查詢
  - GET `${BASE}?action=version`
  - 回傳：`{ ok: true, versions: { aboutContent: number, providers: number, siteContent: number, ... } }`

- 取得資料
  - GET `${BASE}?action=data&key=<datasetKey>&v=<version>`
  - 範例：
    - 取得 aboutContent：`?action=data&key=aboutContent&v=0`
    - 取得 providers：`?action=data&key=providers&v=12`
    - 取得 siteContent：`?action=data&key=siteContent&v=2`
  - 回傳：`{ ok: true, key, version, data }`

- 登入（管理員）
  - POST `${BASE}?action=login`
  - Header：`Content-Type: text/plain`（避免 preflight）
  - Body（JSON 字串）：`{ "username": "...", "password": "..." }`
  - 回傳：`{ ok: true, token, exp }`

- 更新資料（管理員）
  - POST `${BASE}?action=update`
  - Header：`Content-Type: text/plain`
  - Body（JSON 字串）：`{ "token": "<login-token>", "key": "aboutContent|providers|siteContent", "data": <任意 JSON> }`
  - 回傳：`{ ok: true, key, version }`

> Token 驗證：採 HMAC（`TOKEN_SECRET`），Token 預設有效 24 小時。

---

## 五、前端如何拿到最新資料與版本（?v 機制）

前端 `js/data-loader.js` 會在載入時自動：

1) 呼叫 `${BASE}?action=version`，把 `{versions}` 儲存到 `localStorage['app_data_version']`。

2) 依序載入三個資料集：
- `${BASE}?action=data&key=aboutContent&v=<localVersion>`
- `${BASE}?action=data&key=providers&v=<localVersion>`
- `${BASE}?action=data&key=siteContent&v=<localVersion>`

3) 取得後會把資料覆寫到全域物件：
- `window.aboutContent`
- `window.providersData`
- `window.siteContent`

4) 並且以 `document.dispatchEvent(new CustomEvent('data:updated', { detail: { keys: [...] } }))` 推播事件，讓頁面自動重新渲染。

> 我們也在以下前端檔加入事件監聽：
> - `js/about.js`：收到 `aboutContent` 更新時重新渲染 `about.html`
> - `js/content-render.js`：`siteContent` 或 `providers` 更新時重新渲染首頁
> - `js/provider-detail.js`：`providers` 更新時重新渲染當前業者頁

---

## 六、管理員 UI（admin.html）

前端已新增 `admin.html` 與 `js/admin.js`：
- 先登入（呼叫 `?action=login`）
- 選擇資料集（About / Providers / Site Content）
- 可一鍵載入遠端最新或載入目前頁面資料至編輯器
- 儲存即呼叫 `?action=update`，成功後版本會自動 +1，前端快取版本也會更新

---

## 七、常見問題

- 看到「請先設定 GAS_BASE_URL」：
  - 代表你尚未將 Web App URL 貼到 `js/config.js` 的 `GAS_BASE_URL`。

- CORS 問題：
  - `GET` 預設不會觸發 preflight；`POST` 我們使用 `Content-Type: text/plain` 可避免預檢。
  - Apps Script Web App 通常允許跨網域存取 JSON，如仍有問題，建議先用同源靜態主機測試（例如 GitHub Pages）。

- 欄位 Schema：
  - 三個資料集為自由 JSON；`providers` 建議維持以 provider id 為 key 的物件結構以對應現有前端。

---

## 八、手動測試（以 curl 為例）

```
# 版本
curl -s "${BASE}?action=version"

# 取得 providers
curl -s "${BASE}?action=data&key=providers&v=0"

# 登入（取得 token）
curl -s -X POST -H "Content-Type: text/plain" \
  -d '{"username":"admin","password":"admin123"}' \
  "${BASE}?action=login"

# 更新（假設 token=T，僅示例）
curl -s -X POST -H "Content-Type: text/plain" \
  -d '{"token":"T","key":"siteContent","data":{"index":{"heroTitle":"Hello"}}}' \
  "${BASE}?action=update"
```
