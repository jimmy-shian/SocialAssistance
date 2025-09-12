// 全站文案集中設定（Site Content）
// 全域命名空間：window.siteContent
// 說明：集中管理首頁等頁面的文案。可依需求擴充其他頁面區塊，不需動 HTML/JS 主流程。
// 結構：
// window.siteContent = {
//   index: {
//     heroTitle: string          首屏主標題。
//     heroSubtitle: string       首屏副標題。
//     platformIntro: Array<{     平台導覽卡片（3 欄，可彈性增減）
//       title: string,
//       text: string,
//       details?: string         （可選）展開或補充內容。
//     }>
//     featured: Array<{          首頁精選案例（卡片區）
//       title: string,
//       text: string,
//       link: string             連結到對應的 provider.html?id=...
//     }>
//   }
// }

window.siteContent = {
  index: {
    heroTitle: '探索你的未來',
    heroSubtitle: '在核心生涯探索平台，找到屬於你的道路。',
    platformIntro: [
      { title: '資源整合', text: '一站式彙整嘉義地區的多元職業與課程資訊。', details: '彙整在地的養殖、工藝、餐飲、環境永續等資源，提供可查詢的師資、課程時段、地點與費用，協助你快速找到合適的入門場域。' },
      { title: '四階段引導', text: '透過系統化的引導模型，協助你進行深度自我探索。', details: '從自我覺察、探索嘗試、技能精進到成果呈現，平台提供步驟化工具與任務清單，讓你能有節奏地累積經驗與作品。' },
      { title: '成效追蹤', text: '記錄你的學習歷程，看見自己的成長與轉變。', details: '以時間軸紀錄學習紀錄、活動認證與照片，並彙整自立評估與回饋，幫助你持續調整方向、看見改變。' }
    ],
    featured: [
      {
        title: '從漁村到餐桌：東石漁囡仔的海洋實踐',
        text: '學員小明透過課程，不僅學會了牡蠣養殖，更親手策劃了一場海鮮市集活動...',
        link: './provider.html?id=dongshi-fisher'
      },
      {
        title: '木作中的專注與創造：打造自己的手作椅',
        text: '學員小華從害怕電動工具到完成一張精美的木椅，在過程中找到了自信與耐心...',
        link: './provider.html?id=woodwork-day'
      }
    ]
  }
};
