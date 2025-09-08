# 核心生涯探索平台 - 操作與維護說明

本專案是一個使用 Tailwind CSS 與原生 JavaScript 建置的前端網站，提供深淺色主題、字級調整、探索/業者頁面、地圖檢視與可維護的內容資料檔。

---

## 功能一覽（操作指南）

- 深/淺色主題切換（右上角太陽/月亮按鈕）
  - 點擊即可切換主題；瀏覽器重新整理後會記住上次設定。
  - 若某些元素未加上 Tailwind 的 `dark:` 樣式，系統仍提供 CSS fallback 確保可讀性。

- 字級調整（右上角「旋鈕式」控制）
  - 以旋鈕（role=slider）切換「小/中/大」三段。
  - 支援滑鼠點擊循環、拖曳旋轉（會吸附到最近刻度）、鍵盤方向鍵/Home/End 操作。
  - 全站字級會被保存到 `localStorage`。

- 首頁資源地圖（Index）
  - 捲動至地圖區才載入（提升效能）。
  - 會嘗試以使用者當前位置置中；若不在台灣或取得失敗，則聚焦台灣範圍。
  - 地圖上的標記可點擊進入對應的業者介紹頁。

- 業者介紹頁（Provider）
  - 顯示：活動照片、地點地圖、課程時間軸、精選案例。
  - 地圖鎖定控制（縣市／場域／自由）。預設依 `location` 文字中的縣/市鎖定。

- 探索資源平台（Explore）
  - 搜尋輸入即時篩選（150ms debounce）。
  - 自訂的下拉選單（漂亮的展開/收合動畫），點選選項即可套用分類篩選。
  - 卡片 hover 有抬升/陰影動畫，易讀性佳。

---

## 專案結構（重點檔案）

- `index.html`：首頁（含 Hero、平台導覽、台灣地圖、精選案例）
- `explore.html`：探索頁（搜尋、分類、卡片列表）
- `provider.html`：業者介紹頁（照片、地圖、時間軸、案例）
- `member.html`：會員頁（目前為登入表單樣板）
- `css/style.css`：全域樣式（含深色 fallback、旋鈕樣式、互動過度、工具類）
- `js/navFooter.js`：統一的導覽/頁尾注入（含主題鍵、字級旋鈕、當前頁高亮）
- `js/main.js`：主題切換、字級旋鈕（點擊/拖曳/鍵盤）、偏好保存
- `js/explore.js`：探索頁的動態渲染、即時搜尋、分類下拉動畫
- `js/provider-detail.js`：業者詳情頁的內容渲染（根據 URL `?id=...`）
- `js/map-index.js`：首頁地圖（懶載入、台灣範圍、嘗試以使用者位置置中）
- `js/map-provider.js`：業者頁地圖（縣市/場域/自由 三段鎖定）
- `js/data/providers.js`：業者/課程資料（本地 JSON 物件）
- `js/data/siteContent.js`：網站文字內容（目前涵蓋首頁 Hero/導覽/精選案例）
- `js/content-render.js`：將 `siteContent.js` 的文字注入頁面
- `tailwind.config.js`：Tailwind 設定（含 `darkMode: 'class'`）

---

## 編輯內容（最重要）

1) 編輯首頁文字：`js/data/siteContent.js`

```js
window.siteContent = {
  index: {
    heroTitle: '探索你的未來',
    heroSubtitle: '在核心生涯探索平台，找到屬於你的道路。',
    platformIntro: [
      { title: '資源整合', text: '...' },
      { title: '四階段引導', text: '...' },
      { title: '成效追蹤', text: '...' }
    ],
    featured: [
      { title: '...', text: '...', link: './provider.html?id=...' },
      { title: '...', text: '...', link: './provider.html?id=...' }
    ]
  }
}
```
- 修改上述欄位就能更新首頁 Hero 文字、導覽三卡、精選案例。
- 要擴充到其他頁面，可在 `window.siteContent` 下新增 `about`, `explore`, `member` 等節點，並在 `js/content-render.js` 中新增相對應的渲染程式碼。

2) 編輯業者/課程：`js/data/providers.js`

```js
window.providersData = {
  'dongshi-fisher': {
    id: 'dongshi-fisher',
    name: '東石漁囡仔',
    category: '養殖/食農加工',
    schedule: '每週六 09:00–12:00',
    location: '嘉義縣 東石鄉', // 這裡第一個詞用於縣/市鎖定
    address: '...',
    coords: { lat: 23.455, lng: 120.152 },
    description: '...',
    images: [ 'https://...' ],
    timeline: [ { time: '09:00', title: '...', detail: '...' } ],
    cases: [ { id: 'case-1', title: '...', summary: '...' } ]
  }
}
```
- 新增一個 provider 物件即可在探索頁出現卡片；點擊可前往 `provider.html?id=<id>`。
- `location` 第一個詞（如「嘉義縣」「嘉義市」）會用於業者頁地圖「縣市」鎖定。
- `coords` 是地圖標記位置（請填寫經緯度）。

3) 樣式集中在 `css/style.css`
- 已移除所有 inline style（可再度搜尋 `style="` 確認）。
- 若要新增全域互動/過度/暗色 fallback，請在本檔案擴充。

---

## 開發與維護要點

- 載入順序
  - 每頁 `<head>` 需先載入 `./tailwind.config.js`，再載入 Tailwind CDN，才能確保 `darkMode: 'class'` 生效。
  - 導覽/頁尾注入檔 `js/navFooter.js` 應先於 `js/main.js` 之前載入，確保元素存在後再綁定事件。

- 深色模式
  - 若某些區塊漏掉 `dark:` 類別，`css/style.css` 內已提供 fallback，避免文字或卡片顏色消失。

- 地圖效能
  - 首頁地圖採用 IntersectionObserver 懶載入，並限制在台灣範圍以提升效能。
  - 業者頁地圖提供鎖定模式（縣市 / 場域 / 自由）。

- 無障礙（a11y）
  - 旋鈕用 `role="slider"` 並設定 `aria-valuemin/max/now`。
  - 導覽列加上 landmark/label 與 `aria-current`。
  - 下拉選單有鍵盤與外部點擊關閉處理。

---

## 常見問題（FAQ）

- 深色模式下某些文字看不到？
  - 先硬重新整理（Ctrl+F5）。
  - 確認該元素是否有 `dark:` 類別；若沒有，也有 CSS fallback 保護。仍有問題請回報哪個頁面/區塊。

- 首頁地圖載入很慢？
  - 已加入懶載入 + 台灣範圍 + OSM 預連線優化。若仍慢，考慮切換字型載入、或使用第三方地圖快取服務。

- 想新增更多頁面的內容集中化？
  - 在 `siteContent.js` 新增對應節點，然後修改 `content-render.js` 加入對應的渲染邏輯即可。

---

## 版本紀錄（重點）

- 新增：台灣範圍的首頁地圖（懶載入、使用者定位）
- 新增：業者頁地圖三段鎖定（縣市/場域/自由）
- 改善：深色模式 fallback，避免文字/卡片顏色消失
- 改善：字級旋鈕（點擊、拖曳吸附、鍵盤可操作）
- 改善：探索頁自訂下拉、即時搜尋
- 新增：`siteContent.js` + `content-render.js` 以集中首頁文字內容

---

## 授權

見 `LICENSE`（若無可自行新增）。
