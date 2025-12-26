(function () {
    // ==========================================================
    // ▼▼▼ 技能項目定義 ▼▼▼
    // 用途：定義所有可解鎖技能及其效果
    // 影響範圍：window.SKILL_ITEMS 物件，供 jouguan（酒館）UI 與技能學習流程使用
    // ==========================================================

    // 防呆：避免重複載入造成頂層 const 重複宣告
    if (window.SKILL_ITEMS) return;

    // MVP 先不做技能（避免引入舊 GPS / farm 系統依賴）
    const SKILL_ITEMS = {};

// ----------------------------------------------------------
// 全域匯出（Export to window）
// 用途：讓其他腳本可以用 window.SKILL_ITEMS 取得技能資料表
// 影響範圍：jouguan（酒館）技能面板渲染、學習 API（learnSkill）會讀取它
//
// 教學：
// - 頂層 const 不一定會變成 window 屬性，所以這裡明確掛上去
    window.SKILL_ITEMS = SKILL_ITEMS;
})();