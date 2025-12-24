(function () {
    // ==========================================================
    // ▼▼▼ 技能項目定義 ▼▼▼
    // 用途：定義所有可解鎖技能及其效果
    // 影響範圍：window.SKILL_ITEMS 物件，供 UI 與技能學習流程使用
    // ==========================================================

    // 防呆：避免重複載入造成頂層 const 重複宣告
    if (window.SKILL_ITEMS) return;

    const SKILL_ITEMS = {
    'farmA': { // 這個技能ID可以保持不變
        name: '老練農夫',
        info: '耕田設施產量提升10%。',
        cost: 100, // 這裡是學習成本
        tiougian: (playerData) => playerData.upgrades.includes('farm2'), // 學習條件：擁有 farm2
        // effect: 學習技能後套用效果，提升 GPS 或標記技能狀態
        effect: (playerData) => {
            // 重新計算所有已購買 farm 的總 GPS
            // 新邏輯：每個 farm 等級都提供 +1 GPS，因此總和為購買的 farm 項目數量
            const totalFarmGps = playerData.upgrades.filter(id => id.startsWith('farm')).length;

            // 計算加成並更新玩家的總 GPS
            const bonusGps = Math.round(totalFarmGps * 0.1);
            playerData.gps = (playerData.gps || 0) + bonusGps;
        }
    }
};

// ----------------------------------------------------------
// 全域匯出（Export to window）
// 用途：讓其他腳本可以用 window.SKILL_ITEMS 取得技能資料表
// 影響範圍：Town（城鎮）技能面板渲染、學習 API（learnSkill）會讀取它
//
// 教學：
// - 頂層 const 不一定會變成 window 屬性，所以這裡明確掛上去
    window.SKILL_ITEMS = SKILL_ITEMS;
})();