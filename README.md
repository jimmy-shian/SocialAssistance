# 聽見核心工作室公開網站

本專案是靜態前端網站，公開頁採單一亮色暖色系設計，資料來源集中在 `js/data/*.js`，後台保留資料管理功能。

## 保留頁面

- `index.html`：首頁
- `about.html`：關於我們
- `services.html`：服務項目
- `explore.html`：探索資源
- `provider.html`：業者詳情
- `blog.html`：最新消息
- `admin.html`：資料管理後台
- `404.html`：找不到頁面

會員與問卷頁已移除，不再維護。

## 樣式與互動

樣式集中在三支檔案：

- `css/base.css`：設計變數、基本排版與表單
- `css/components.css`：共用元件、頁面版面、hover/0.5s 過渡、SVG 動畫與 lightbox
- `css/utilities.css`：工具類

網站不提供深色模式。操作回饋以 hover、變色、外框繪製、smooth scroll 與 0.5s transition 為主。

## 主要 JS

- `js/navFooter.js`：公開導覽與頁尾
- `js/render-index.js`：首頁渲染
- `js/explore.js`：探索頁搜尋/篩選與資源網格
- `js/provider-detail.js`：業者詳情、課程流程、人物專訪連動
- `js/blog.js`：文章列表、分類篩選、文章 modal
- `js/lightbox.js`：圖片檢視器
- `js/map-index.js`、`js/map-provider.js`：Leaflet 地圖
- `js/admin.js`：後台資料管理

## 資料檔

- `js/data/siteContent.js`：首頁 Hero、SDGs、地圖等內容
- `js/data/aboutContent.js`：關於、模型、成就、團隊
- `js/data/servicesContent.js`：服務項目
- `js/data/providers.js`：探索場域與業者詳情
- `js/data/blogContent.js`：最新消息、人物專訪、榮耀時刻

## 驗證

```powershell
python test_refactor.py
python test_index_redesign.py
Get-ChildItem -LiteralPath 'js' -Recurse -Filter '*.js' | ForEach-Object { node --check $_.FullName }
```
