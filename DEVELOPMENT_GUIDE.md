# 專案開發指南

本專案為靜態公開網站，搭配 Google Apps Script 作為後台資料讀寫來源。公開頁只讀取本地 `js/data/*.js` 靜態資料；後台登入後才透過 `js/data-loader.js` 與遠端同步。

## 核心檔案

- `css/base.css`、`css/components.css`、`css/utilities.css`：全站樣式與互動效果。
- `js/navFooter.js`：公開導覽與 footer。公開導覽不顯示後台、會員或問卷入口。
- `js/render-index.js`：首頁 Hero、服務、SDGs、關於模型、成就、最新消息與地圖。
- `js/explore.js`：左側篩選、右側資源網格。
- `js/provider-detail.js`：業者詳情、流程式課程安排、人物專訪連到 `blog.html?id=...`。
- `js/blog.js`：文章分類、modal、榮耀時刻倒序時間軸。
- `js/lightbox.js`：全站圖片檢視器。
- `js/admin.js`：後台資料管理。

## 資料流

- 公開頁：直接載入 `js/data/siteContent.js`、`aboutContent.js`、`servicesContent.js`、`providers.js`、`blogContent.js`。
- 後台：透過 `js/config.js` 與 `js/data-loader.js` 讀寫 GAS 或本地資料。

## 新增或修改內容

1. 修改對應 `js/data/*.js` 欄位。
2. 若有新增欄位，再更新對應渲染檔與 `admin.js` 編輯表單。
3. 執行：

```powershell
python test_refactor.py
python test_index_redesign.py
Get-ChildItem -LiteralPath 'js' -Recurse -Filter '*.js' | ForEach-Object { node --check $_.FullName }
```

## 注意

- 不使用深色模式。
- 不維護會員與問卷頁。
- 保留後台與 404。
- 未使用的舊 CSS/JS 應刪除，避免再次被引用。
