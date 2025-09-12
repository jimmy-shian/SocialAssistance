// 關於頁資料結構（About Page）
// 全域命名空間：window.aboutContent
// 說明：此物件用於渲染 about.html 的文字與區塊，僅需修改此檔即可更新頁面內容。
// 欄位說明：
// - heroTitle: string            首屏主標題。
// - lead: string                 首屏導語文字（可較長）。
// - modelTitle: string           「模型」區塊標題。
// - model: Array<ModelItem>      四階段（或任意多階段）卡片清單。
//   • ModelItem: {
//       title: string,           卡片標題（如「1. 基礎探索 (我做你看)」）。
//       desc: string,            卡片描述說明。
//       href?: string,           （可選）卡片內連結網址（點擊只在連結上開新頁）。
//       linkText?: string        （可選）連結文字，預設為「前往連結」。
//     }
// - achievementsTitle: string    「成就經歷」區塊標題。
// - achievements: Array<string | AchievementItem>
//   • 若為 string，直接顯示文字，數字會自動跑數字動畫（第一次進入畫面時）。
//   • AchievementItem: {
//       text: string,            顯示文字（可含數字以觸發跑數字動畫）。
//       href: string             點擊開新頁的連結。
//     }
// 範例（僅供參考，不會渲染）：
// window.aboutContent = {
//   heroTitle: "關於我們",
//   lead: "平台介紹...",
//   modelTitle: "四階段引導模型",
//   model: [ { title: "1. ...", desc: "...", href: "https://...", linkText: "了解更多" } ],
//   achievementsTitle: "成就經歷",
//   achievements: [ "服務超過 300 人次...", { text: "教材 20+ 小時", href: "https://..." } ]
// }
window.aboutContent = {
  heroTitle: "關於我們",
  lead: "我們的團隊由一群充滿熱情的教育工作者、社工師與產業專家組成，致力於為青少年打造最專業、最貼近需求的生涯探索體驗。我們相信，每個孩子都擁有無限的潛能，只需要一個被看見、被引導的機會。",
  modelTitle: "四階段引導模型",
  model: [
    { title: "1. 基礎探索 (我做你看)", desc: "透過專業引導，初步認識不同產業的樣貌與可能性。", href: "https://example.com/explore", linkText: "了解更多" },
    { title: "2. 內在探索 (我聽你說)", desc: "藉由深度對話與反思，連結個人興趣、價值觀與生涯方向。", href: "https://example.com/inner", linkText: "延伸閱讀" },
    { title: "3. 冒險挑戰 (你說我幫)", desc: "在安全的支持系統下，實際動手操作，將想法付諸實踐。" },
    { title: "4. 創生實踐 (你做我看)", desc: "獨立完成專案，展現學習成果，建立自信與成就感。" }
  ],
  achievementsTitle: "成就經歷",
  achievements: [
    "服務超過 300 人次的青少年",
    "與嘉義地區 10+ 家在地業者建立合作關係",
    { text: "開發 20+ 小時的體驗式課程教材", href: "https://example.com/courses" },
    { text: "榮獲 2023 年 XX 青年發展獎", href: "https://example.com/award" }
  ]
};



