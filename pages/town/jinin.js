(function () {
    // ==========================================================
    // ▼▼▼ 經營項目定義（包含可升級的農場 1..100 級） ▼▼▼
    // 用途：定義所有可購買經營項目（如農場、煤礦等）及其升級規則
    // 影響範圍：window.JININ_ITEMS 物件，供 UI 與購買流程使用
    // ==========================================================

    // 防呆：main.js 會快取頁面容器，但若未來改成重載頁面，重複載入腳本會造成頂層 const 重複宣告。
    // 這裡用 guard 避免二次初始化。
    if (window.JININ_ITEMS) return;

    const JININ_ITEMS = {};

// ==========================================================
// 用途：城鎮功能啟動器
// ==========================================================
    JININ_ITEMS['start'] = {
        name: '地契',
        info: '承接這座城鎮',
        cost: 0,
        // 一開始就可購買（會由商業層 syncUnlockedItems 記錄為 unlocked）
        tiougian: () => true,
        // effect：一次性取得 10 cost 資源（本專案目前以 gold 作為通用資源）
        effect: (playerData) => {
            playerData.gold = (playerData.gold || 0) + 10;
            playerData.maxGold = Math.max(playerData.maxGold || 0, playerData.gold);
        }
    };
// 農場設定：定義農場名稱、最大等級、費用里程碑
const FARM_BASE_NAME = '農場';
const FARM_MAX_LEVEL = 100;

// ----------------------------------------------------------
// 成本曲線（Cost Curve）壓縮：用「少量斷點 + 分段指數插值」取代長里程碑表
//
// 需求背景：
// - 原本用很多里程碑點做指數插值，能貼近想要的曲線，但資料表偏長。
// - 你希望「不要里程碑表」，並且盡可能用最少分段、仍接近原曲線。
//
// 做法：
// - 將 1..100 的原曲線壓縮成少量 breakpoints（斷點），每段用指數插值補齊。
// - 這裡的斷點是離線用 DP 找到的「少分段 + 誤差小」方案：
//   - farm：9 段（10 個斷點），對原曲線的最大相對誤差約 <= 5%
//   - core：8 段（9 個斷點），對原曲線的最大相對誤差約 <= 4.7%
//
// 教學：
// - 這仍然是「分段模型」，但比起每 5 等級一個點的表，資料量小很多。
// - 若你願意接受更大誤差（例如 <=10%），可以再減少分段數。

/**
 * 分段指數插值：在斷點之間，用指數插值估算 cost
 * @param {number} level - 目標等級（整數）
 * @param {{level:number, cost:number}[]} breakpoints - 由小到大排序的斷點
 * @returns {number} cost
 */
function getPiecewiseExponentialCost(level, breakpoints) {
    if (!Number.isFinite(level)) return 0;
    const target = Math.max(breakpoints[0].level, Math.min(level, breakpoints[breakpoints.length - 1].level));

    for (let i = 0; i < breakpoints.length - 1; i++) {
        const left = breakpoints[i];
        const right = breakpoints[i + 1];
        if (target < left.level || target > right.level) continue;
        if (target === left.level) return left.cost;
        if (target === right.level) return right.cost;

        const ratio = (target - left.level) / (right.level - left.level);
        return Math.round(left.cost * Math.pow(right.cost / left.cost, ratio));
    }

    // 理論上不會走到這裡；做個保底
    return breakpoints[breakpoints.length - 1].cost;
}

// farm 壓縮斷點（9 段）
const FARM_COST_BREAKPOINTS = [
    { level: 1, cost: 10 },
    { level: 2, cost: 15 },
    { level: 5, cost: 30 },
    { level: 10, cost: 130 },
    { level: 12, cost: 182 },
    { level: 20, cost: 600 },
    { level: 29, cost: 1631 },
    { level: 47, cost: 7197 },
    { level: 74, cost: 45062 },
    { level: 100, cost: 180000 }
];

/**
 * 取得指定等級農場的購買費用
 * @param {number} level - 農場等級
 * @returns {number} 費用
 * 用途：供 UI 與購買流程查詢
 */
function getFarmCostForLevel(level) {
    return getPiecewiseExponentialCost(level, FARM_COST_BREAKPOINTS);
}

// 產生 farm 等級項目（每級為一個可購買項目）
// 用途：自動生成 1~100 級農場，每級皆可單獨購買
for (let lv = 1; lv <= FARM_MAX_LEVEL; lv++) {
    const id = `farm${lv}`;
    JININ_ITEMS[id] = {
        name: `${FARM_BASE_NAME}LV.${lv}`,
        // info 改為函式，回傳「每秒產生(X)金幣」，其中 X 為玩家目前已購買的 farm 等級總和（即 farm GPS）
        // info: 顯示購買後每秒產出，依據目前已購買數量動態計算
        info: (playerData) => {
            const upgrades = playerData.upgrades || [];
            const farmGps = upgrades.filter(id => id.startsWith('farm')).length;
            const owned = upgrades.includes(id);
            const projected = owned ? farmGps : farmGps + 1;
            return `每秒產生${projected}金幣`;
        },
        cost: getFarmCostForLevel(lv),
        // tiougian: 顯示條件，需前一級已購買
        tiougian: (playerData) => {
            // LV.1 永遠可見，其它等級需要前一級已購買
            if (lv === 1) return true;
            return playerData.upgrades.includes(`farm${lv-1}`);
        },
        // effect: 購買後套用效果，提升 GPS 或觸發技能
        effect: (playerData) => {
            // 每購買一級農場，直接增加 1 GPS
            playerData.gps = (playerData.gps || 0) + 1;
        }
    };
}

// ==========================================================
// ▼▼▼ 煤礦 (core) 項目定義（可升級 1..100 級，每級 +5 GPS） ▼▼▼
// 用途：定義另一類可升級經營項目，與農場邏輯一致
// ==========================================================
const CORE_BASE_NAME = '煤礦';
const CORE_MAX_LEVEL = 100;

// core 壓縮斷點（8 段）
const CORE_COST_BREAKPOINTS = [
    { level: 1, cost: 2000 },
    { level: 3, cost: 5000 },
    { level: 7, cost: 23000 },
    { level: 10, cost: 60000 },
    { level: 20, cost: 300000 },
    { level: 28, cost: 739079 },
    { level: 49, cost: 4628836 },
    { level: 75, cost: 26000000 },
    { level: 100, cost: 105000000 }
];

/**
 * 取得指定等級煤礦的購買費用
 * @param {number} level - 煤礦等級
 * @returns {number} 費用
 * 用途：供 UI 與購買流程查詢
 */
function getCoreCostForLevel(level) {
    return getPiecewiseExponentialCost(level, CORE_COST_BREAKPOINTS);
}

// 產生 core 等級項目（每級為一個可購買項目）
// 用途：自動生成 1~100 級煤礦，每級皆可單獨購買
for (let lv = 1; lv <= CORE_MAX_LEVEL; lv++) {
    const id = `core${lv}`;
    JININ_ITEMS[id] = {
        name: `${CORE_BASE_NAME}LV.${lv}`,
        // info 顯示購買該等級後的 core 每秒產量（每級 +5 GPS）
        info: (playerData) => {
            const upgrades = playerData.upgrades || [];
            const coreCount = upgrades.filter(x => x.startsWith('core')).length;
            const owned = upgrades.includes(id);
            const projected = owned ? coreCount * 5 : (coreCount + 1) * 5;
            return `每秒產生${projected}金幣`;
        },
        cost: getCoreCostForLevel(lv),
        tiougian: (playerData) => {
            // core LV1 需曾經達到 2000 金幣才會顯示；其他等級需前一級已購買
            if (lv === 1) return (playerData.maxGold || 0) >= 2000;
            return playerData.upgrades.includes(`core${lv-1}`);
        },
        effect: (playerData) => {
            playerData.gps = (playerData.gps || 0) + 5;
            playerData.coreLevel = lv;
        }
    };
}

// ----------------------------------------------------------
// 全域匯出（Export to window）
// 用途：讓其他腳本可以用 window.JININ_ITEMS 取得經營項目資料表
// 影響範圍：Town（城鎮）面板渲染、購買 API（purchaseItem）會讀取它
//
// 教學：
// - 在瀏覽器中，頂層宣告的 const（例如 const JININ_ITEMS）不一定會變成 window 的屬性
// - 為了讓「跨檔案」讀取更直覺，這裡明確掛到 window
    window.JININ_ITEMS = JININ_ITEMS;
})();