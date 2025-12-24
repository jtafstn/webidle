/**
 * town.js
 * 用途：提供 Town（城鎮）頁面的共用資料操作 API（購買經營項目/學習技能）
 * 影響範圍：
 * - 會改動 window.playerData（金幣、已購買 upgrades、已學習 learnedSkills）
 * - 會提供 window.purchaseItem / window.learnSkill 讓其他腳本呼叫
 *
 * 注意：
 * - 此檔案「不負責渲染 DOM」，只處理資料；避免與 town.html 的面板渲染互相覆蓋。
 * - 讀取資料表時，會同時嘗試 window.JININ_ITEMS 與全域常數 JININ_ITEMS。
 *   原因：瀏覽器中「頂層 const」不一定會變成 window 的屬性（不像 var）。
 */

(function () {
  // IIFE（立即執行函式）：
  // 用途：把函式包在一個作用域內，避免不小心新增太多全域變數
  // 影響範圍：只有我們刻意掛到 window 的 API 才能被外部使用
  // -------------------------------
  // 經營項目購買 API
  // -------------------------------
  /**
   * 購買經營項目
   * @param {string} itemId - 經營項目 ID（例如 farm1/core1）
   * @returns {{success: boolean, message: string}}
   * 用途：統一處理扣款、套用效果、寫入 upgrades
   * 影響範圍：window.playerData.gold / window.playerData.upgrades / window.playerData.gps 等
   */
  function purchaseItem(itemId) {
    if (!window.playerData) return { success: false, message: '找不到玩家資料' };

    // 取得經營項目資料表：
    // 1) 優先使用 window.JININ_ITEMS（明確掛在全域）
    // 2) 若沒有，再嘗試讀取同檔案作用域中的全域常數 JININ_ITEMS
    const jininItems = window.JININ_ITEMS || (typeof JININ_ITEMS !== 'undefined' ? JININ_ITEMS : null);
    if (!jininItems) return { success: false, message: '找不到經營項目資料' };

    const item = jininItems[itemId];
    if (!item) return { success: false, message: '項目不存在' };

    // upgrades：已購買清單
    // 用途：避免 undefined 造成 includes/push 出錯
    window.playerData.upgrades = window.playerData.upgrades || [];

    if (window.playerData.upgrades.includes(itemId)) return { success: false, message: '已擁有' };
    if (typeof item.tiougian === 'function' && !item.tiougian(window.playerData)) {
      return { success: false, message: '尚未解鎖' };
    }
    if ((window.playerData.gold || 0) < item.cost) return { success: false, message: '金幣不足' };

    // 1) 扣款
    window.playerData.gold -= item.cost;

    // 2) 套用效果（例如增加 gps）
    if (typeof item.effect === 'function') item.effect(window.playerData);

    // 3) 記錄為已購買
    window.playerData.upgrades.push(itemId);

    if (typeof window.updateUI === 'function') window.updateUI();
    return { success: true, message: '購買成功' };
  }

  // -------------------------------
  // 技能學習 API
  // -------------------------------
  /**
   * 學習技能
   * @param {string} skillId - 技能 ID（例如 farmA）
   * @returns {{success: boolean, message: string}}
   * 用途：統一處理扣款、寫入 learnedSkills、套用技能效果
   * 影響範圍：window.playerData.gold / window.playerData.learnedSkills / window.playerData.gps 等
   */
  function learnSkill(skillId) {
    if (!window.playerData) return { success: false, message: '找不到玩家資料' };

    // 取得技能資料表：邏輯同經營項目
    const skillItems = window.SKILL_ITEMS || (typeof SKILL_ITEMS !== 'undefined' ? SKILL_ITEMS : null);
    if (!skillItems) return { success: false, message: '找不到技能資料' };

    const skill = skillItems[skillId];
    if (!skill) return { success: false, message: '技能不存在' };

    // learnedSkills：已學習技能清單
    // 用途：避免 undefined 造成 includes/push 出錯
    window.playerData.learnedSkills = window.playerData.learnedSkills || [];

    if (window.playerData.learnedSkills.includes(skillId)) return { success: false, message: '已學習' };
    if (typeof skill.tiougian === 'function' && !skill.tiougian(window.playerData)) {
      return { success: false, message: '尚未解鎖' };
    }
    if ((window.playerData.gold || 0) < skill.cost) return { success: false, message: '金幣不足' };

    // 1) 扣款
    window.playerData.gold -= skill.cost;

    // 2) 先記錄為已學習（避免 effect 內需要檢查狀態時找不到）
    window.playerData.learnedSkills.push(skillId);

    // 3) 套用技能效果（例如增加 gps）
    if (typeof skill.effect === 'function') skill.effect(window.playerData);

    if (typeof window.updateUI === 'function') window.updateUI();
    return { success: true, message: '學習成功' };
  }

  // 將 API 掛到全域（window）
  // 用途：讓 town.html（面板 UI）或其他頁面可以直接呼叫
  // 影響範圍：外部可以透過 window.purchaseItem / window.learnSkill 觸發購買/學習
  window.purchaseItem = purchaseItem;
  window.learnSkill = learnSkill;

  // -------------------------------
  // 解鎖同步（UI 反映狀態，不決定結果）
  // -------------------------------
  /**
   * 同步 unlockedItems：把「曾經滿足解鎖條件」的經營項目記錄下來。
   *
   * 設計理由（對應 town_contect.md）：
   * - UI 只負責顯示；解鎖規則屬於遊戲狀態/規則，應由商業層負責。
   * - unlockedItems 是狀態的一部分（會進存檔），不要由 UI 任意改動。
   */
  function syncUnlockedItems() {
    if (!window.playerData) return;

    const jininItems = window.JININ_ITEMS || (typeof JININ_ITEMS !== 'undefined' ? JININ_ITEMS : null);
    if (!jininItems) return;

    window.playerData.upgrades = window.playerData.upgrades || [];
    window.playerData.unlockedItems = window.playerData.unlockedItems || [];

    for (const itemId in jininItems) {
      if (window.playerData.upgrades.includes(itemId)) continue;

      const item = jininItems[itemId];
      if (typeof item?.tiougian !== 'function') continue;

      if (item.tiougian(window.playerData) && !window.playerData.unlockedItems.includes(itemId)) {
        window.playerData.unlockedItems.push(itemId);
      }
    }
  }

  window.syncUnlockedItems = syncUnlockedItems;
})();