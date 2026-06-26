# 探索專區（Explore）資料新增與更新流程指南

當您在 `img/explore` 中新增了新的探索對象（例如：「寶哥有酵農場」）後，請遵循以下標準流程來更新資料與網頁內容。

---

## 步驟一：準備圖片與資料夾結構

在 `img/explore/` 下建立與探索對象「完全同名」的資料夾，內部結構應包含以下三個子資料夾：

```
img/explore/【探索對象名稱】/
├── 封面圖1/ (或 封面照1/)
│   └── 封面照.jpg (或其他 JPG/PNG 格式)
├── 課程安排2/
│   ├── 職人介紹/
│   ├── 職人工作說明/
│   ├── 職業體驗內容說明/ (選填，視活動設計而定)
│   ├── 職業體驗/ (選填，視活動設計而定)
│   ├── Q＆A時間/ (選填，有專訪文章時使用)
│   └── 大合照/ (選填，視活動設計而定)
└── 精選案例3/ (或 精選案例/)
    ├── 可負擔蒙特梭利/
    ├── 第二屆有事青年/
    ├── 第三屆有事青年/
    └── 親子活動/ (或 其他專案，視具體專案案件而定)
```

> [!IMPORTANT]
> 請特別注意資料夾名稱的數字後綴（如 `封面圖1`、`課程安排2`、`精選案例3`），此為系統約定的目錄格式。
> 根據歷史資料，部分現有對象的資料夾可能使用 `封面照1` 或 `精選案例`（不帶數字後綴），系統及腳本均已支援相容。

---

## 步驟二：執行圖片檔名修正與 WebP 批次轉換

為優化載入效能與保持檔案命名一致性，請使用專案內建的 Python 工具進行檔名修正並批次轉換為 WebP 格式，自動刪除原始 JPG/PNG 檔案：

```powershell
# 請在專案根目錄下使用 PowerShell 執行：
# 加上 --rename 參數會將圖片檔名依其所在目錄自動重新命名（如 封面照.jpg、職人介紹1.jpg、精選案例_1.jpg 等）
& "C:\Users\user\venv\Scripts\python.exe" .\tools\convert_images_to_webp.py --dir "img\explore\【探索對象名稱】" --rename --delete
```

執行後，所有子資料夾底下的圖片會自動修正檔名、轉換為 `.webp` 並清除原檔。

---

## 步驟三：更新 Explore 資料庫內容 (`js/data/providers.js`)

在 `js/data/providers.js` 的 `window.providersData` 物件中新增一筆對應屬性。格式範例如下：

```javascript
  "探索對象名稱": {
    "id": "探索對象名稱",
    "name": "探索對象名稱",
    "category": "行業分類（如：農業、汽車美容業、花藝類等）",
    "schedule": "體驗時間說明（如：每週六 09:00–12:00）",
    "location": "嘉義縣市區域（如：嘉義縣 中埔鄉）",
    "address": "詳細地址",
    "coords": {
      "lat": 緯度座標,
      "lng": 經度座標
    },
    "gmapUrl": "https://www.google.com/maps?q=緯度座標,經度座標",
    "featuredOnIndex": true,
    "description": "首頁及探索頁呈現之簡介",
    "know": [
      "體驗能認識的知識點 1",
      "體驗能認識的知識點 2"
    ],
    "learn": [
      "實際操作學到的技能 1",
      "實際操作學到的技能 2"
    ],
    "gain": [
      "收穫與效益 1",
      "收穫與效益 2"
    ],
    "images": [
      "./img/explore/探索對象名稱/封面圖1/封面照.webp"
    ],
    "timeline": [
      {
        "time": "09:00",
        "title": "職人介紹",
        "detail": "細節說明...",
        "images": [
          "./img/explore/探索對象名稱/課程安排2/職人介紹/職人介紹1.webp"
        ]
      },
      // ... 依序新增 職人工作說明、職業體驗內容說明、職業體驗、Q＆A時間、大合照
    ],
    "cases": [
      {
        "id": "案例名稱（如：第三屆有事青年）",
        "title": "案例名稱",
        "summary": "案例摘要說明",
        "images": [
          "./img/explore/探索對象名稱/精選案例3/第三屆有事青年/LINE_ALBUM_精選案例-第三屆有事青年_260616_1.webp"
          // ... 填入該案例底下所有 webp 圖片路徑
        ]
      }
    ]
  }
```

---

## 步驟四：更新專訪部落格文章 (`js/data/blogContent.js`)

如果在步驟三的 `Q＆A時間` 欄位中關聯了部落格專訪文章（如 `"relatedBlogPostId": "interview-baoge"`），必須在 `js/data/blogContent.js` 的 `window.blogContent.posts` 陣列中追加該專訪文章資料：

```javascript
  {
    "id": "interview-baoge", // 需與 providers.js 中的 relatedBlogPostId 一致
    "title": "【探索對象名稱】專訪",
    "date": "發布日期（YYYY/MM/DD）",
    "category": "interview",
    "excerpt": "簡短前言（如：專訪職人寶哥...）",
    "content": "問：問句內容...\n答：回答內容...",
    "image": "./img/explore/探索對象名稱/課程安排2/Q＆A時間/Q＆A時間1.webp",
    "images": [
      "./img/explore/探索對象名稱/課程安排2/Q＆A時間/Q＆A時間1.webp",
      "./img/explore/探索對象名稱/課程安排2/Q＆A時間/Q＆A時間2.webp"
    ]
  }
```

---

## 步驟五：手動網頁驗證

資料更新完成後，請於瀏覽器重新整理網頁，並驗證以下畫面：
1. **首頁 (`index.html`)**：檢查是否出現新夥伴的卡片。
2. **探索頁面 (`explore.html`)**：檢查地圖標記、篩選功能、詳情 Modal 中的課程 Timeline 與精選案例照片是否載入正常。
3. **部落格 (`blog.html`)**：檢查專訪文章是否能正常開啟與顯示問答內容。
