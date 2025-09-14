# GAS 後端部署說明（SocialAssistance）

本文件說明如何部署 Google Apps Script（GAS）Web App，提供前端（僅限管理者頁）透過 REST 方式安全讀寫三個資料集：
- aboutContent（對應 `js/data/aboutContent.js`）
- providers（對應 `js/data/providers.js`）
- siteContent（對應 `js/data/siteContent.js`）

搭配前端的 `js/config.js` 與 `js/data-loader.js` 可實現：
- 管理員登入（POST `?action=login`）
- 管理員讀取（POST `?action=read`，需 token + nonce）
- 管理員更新（POST `?action=update`，需 token + nonce）
- 管理員發佈到 GitHub（POST `?action=publish`，需 token + nonce）

注意：出於安全考量，GET `?action=data` 與 `?action=version` 已停用。

---

## 一、建立 Apps Script 專案

1. 開啟 [script.google.com](https://script.google.com) -> 建立新專案。
2. 在專案內建立檔案 `Code.gs`，貼上本專案 `gas/Code.gs` 的全部內容。
3. 儲存。

> 首次執行任何端點時，程式會自動建立一份 Google 試算表（名稱：`SocialAssistance_Data`），並建立 `datasets` 工作表，欄位為：`[key, json, version, updatedAt]`。

---

## 二、設定管理員帳密與 Token 秘鑰

於 Apps Script 專案 -> 左側 `Project Settings`（齒輪）-> `Script properties` -> 新增以下屬性：

- `ADMIN_USER`：管理員帳號（必填，未設定將拒絕登入）
- `ADMIN_PASS`：管理員密碼（必填，未設定將拒絕登入）
- `TOKEN_SECRET`：高強度隨機字串（必填，未設定將拒絕所有需要 token 的操作）

Token TTL 已縮短為 2 小時，並加入 nonce 防重放與基本限流。

---

## 三、部署為 Web App

1. 選單 `Deploy` -> `New deployment`。
2. `Select type` 選擇 `Web app`。
3. `Who has access` 請選 `Anyone`（或 `Anyone with the link`）。
4. 部署完成後，複製 `Web app URL`。

將此 URL 貼到前端 `js/config.js` 的 `GAS_BASE_URL`（結尾不要加斜線 `/`）。

---

## 四、API 規格（僅 POST）

> GET 端點（data/version）已停用，請改用下列 POST。

- 登入（管理員）
  - POST `${BASE}?action=login`
  - Header：`Content-Type: text/plain`（避免 preflight）
  - Body（JSON 字串）：`{ "username": "...", "password": "..." }`
  - 回傳：`{ ok: true, token, exp }`

- 讀取資料（管理員）
  - POST `${BASE}?action=read`
  - Header：`Content-Type: text/plain`
  - Body：`{ "token":"<login-token>", "key":"aboutContent|providers|siteContent", "nonce":"<random>" }`
  - 回傳：`{ ok:true, key, version, data }`

- 更新資料（管理員）
  - POST `${BASE}?action=update`
  - Header：`Content-Type: text/plain`
  - Body：`{ "token":"<login-token>", "key":"aboutContent|providers|siteContent", "data": <任意 JSON>, "nonce":"<random>" }`
  - 回傳：`{ ok: true, key, version }`

- 發佈到 GitHub（管理員）
  - POST `${BASE}?action=publish`
  - Header：`Content-Type: text/plain`
  - Body：`{ "token":"<login-token>", "keys":["aboutContent","providers","siteContent"], "nonce":"<random>" }`（如未指定 keys，預設三者皆發佈）
  - 回傳：`{ ok: boolean, results: [ { ok, key, path, sha, message? } ] }`

> Token 驗證：採 HMAC（`TOKEN_SECRET`），有效 2 小時；同時有 nonce 防重放與基本限流（login/read/update/publish）。

---

## 五、前端資料來源（公開頁面不打 GAS）

公開頁面改為使用 `js/data/*.js` 靜態檔；管理頁登入後才可透過 `DataAPI.secureRead()` / `DataAPI.update()` 讀寫遠端。`js/config.js` 預設 `autoFetchPublic: false`，不會在公開頁自動打 GAS。

> 我們也在以下前端檔加入事件監聽：
> - `js/about.js`：收到 `aboutContent` 更新時重新渲染 `about.html`
> - `js/content-render.js`：`siteContent` 或 `providers` 更新時重新渲染首頁
> - `js/provider-detail.js`：`providers` 更新時重新渲染當前業者頁

---

## 六、管理員 UI（admin.html）

前端已新增 `admin.html` 與 `js/admin.js`：
- 先登入（`?action=login`）
- 選擇資料集（About / Providers / Site Content）
- 載入遠端最新（`?action=read`）或載入目前頁面資料
- 儲存至 GAS（`?action=update`）
- 同步到 GitHub（手動按鈕或勾選「儲存後同步 GitHub」以自動觸發 `?action=publish`）

---

## 七、發佈到 GitHub（設定與權限）

於 Apps Script 專案 `Script properties` 新增：

- `GITHUB_TOKEN`：GitHub Personal Access Token（建議 Fine-grained Token，授權目標 repo 的「Contents: Read and write」權限；若用 Classic，需 `repo` scope）。
- `GITHUB_OWNER`：GitHub 使用者或組織名稱，例如 `your-org`。
- `GITHUB_REPO`：Repo 名稱，例如 `SocialAssistance`。
- `GITHUB_BRANCH`：分支名稱，預設 `main`。
- `GITHUB_PATH_PREFIX`：檔案放置路徑前綴，預設 `js/data/`。

發佈時會直接呼叫 GitHub Contents API 以 Base64 上傳內容；若檔案已存在則覆寫（需提供檔案 SHA，程式會自動讀取）。Commit 訊息格式：`chore(data): update <key> v<version> via GAS`。

注意事項：
- 若 repo 設有 Branch protection（禁止直接推送），請改為允許直接推送或改成由 PR 流程（需另行開發）。
- 初次呼叫外部 API 時，Apps Script 可能要求授權，請按指示允許。

## 八、常見問題

- 看到「請先設定 GAS_BASE_URL」：
  - 代表你尚未將 Web App URL 貼到 `js/config.js` 的 `GAS_BASE_URL`。

- CORS 問題：
  - 我們統一使用 `POST` 並設定 `Content-Type: text/plain` 以避免 preflight，通常可直接跨網域存取。

- 欄位 Schema：
  - 三個資料集為自由 JSON；`providers` 建議維持以 provider id 為 key 的物件結構以對應現有前端。

---

## 九、手動測試（以 curl 為例）

```
## 版本與 GET 端點已停用

# 登入（取得 token）
curl -s -X POST -H "Content-Type: text/plain" \
  -d '{"username":"admin","password":"admin123"}' \
  "${BASE}?action=login"

# 讀取（假設 token=T，僅示例）
curl -s -X POST -H "Content-Type: text/plain" \
  -d '{"token":"T","key":"siteContent","nonce":"N"}' \
  "${BASE}?action=read"

# 更新（假設 token=T，僅示例）
curl -s -X POST -H "Content-Type: text/plain" \
  -d '{"token":"T","key":"siteContent","data":{"index":{"heroTitle":"Hello"}}, "nonce":"N"}' \
  "${BASE}?action=update"

# 發佈到 GitHub（全部資料集或指定 keys）
curl -s -X POST -H "Content-Type: text/plain" \
  -d '{"token":"T","keys":["siteContent"], "nonce":"N"}' \
  "${BASE}?action=publish"
```
