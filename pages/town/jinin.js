// ==========================================================
// ▼▼▼ 經營項目定義（包含可升級的農場 1..100 級） ▼▼▼
// 用途：定義所有可購買經營項目（如農場、煤礦等）及其升級規則
// 影響範圍：JININ_ITEMS 物件，供 UI 與購買流程使用
// ==========================================================
const JININ_ITEMS = {};

// 農場設定：定義農場名稱、最大等級、費用里程碑
const FARM_BASE_NAME = '農場';
const FARM_MAX_LEVEL = 100;

// 指定的關鍵等級與對應費用（購買該等級時的費用）
const FARM_COST_MILESTONES = {
    1: 10,
    2: 15,
    3: 20,
    4: 25,
    5: 30,
    6: 40,
    7: 55,
    8: 75,
    9: 100,
    10: 130,
    15: 300,
    20: 600,
    25: 1100,
    30: 1800,
    35: 2800,
    40: 4200,
    45: 6200,
    50: 9000,
    55: 13000,
    60: 18000,
    65: 25000,
    70: 35000,
    75: 48000,
    80: 65000, 
    85: 85000,
    90: 110000,
    95: 140000,
    100: 180000
};

// 將里程碑排序成陣列以便插值
const FARM_MILESTONE_LEVELS = Object.keys(FARM_COST_MILESTONES).map(l => parseInt(l, 10)).sort((a,b) => a-b);

/**
 * 取得指定等級農場的購買費用
 * @param {number} level - 農場等級
 * @returns {number} 費用
 * 用途：供 UI 與購買流程查詢
 */
function getFarmCostForLevel(level) {
    // 返回購買「達到該等級」所需的費用（也就是升級到該等級時的價格）
    if (FARM_COST_MILESTONES[level]) return FARM_COST_MILESTONES[level];

    // 目標為單一等級（1..100）
    const target = level;

    // 找到左右鄰近的里程碑
    let lower = FARM_MILESTONE_LEVELS[0];
    let upper = FARM_MILESTONE_LEVELS[FARM_MILESTONE_LEVELS.length - 1];

    for (let i = 0; i < FARM_MILESTONE_LEVELS.length; i++) {
        const lv = FARM_MILESTONE_LEVELS[i];
        if (lv <= target) lower = lv;
        if (lv >= target) { upper = lv; break; }
    }

    if (lower === upper) return FARM_COST_MILESTONES[lower];

    const lowerCost = FARM_COST_MILESTONES[lower];
    const upperCost = FARM_COST_MILESTONES[upper];
    const ratio = (target - lower) / (upper - lower);
    // 指數插值（exponential interpolation）以推估中間等級費用
    const interpolated = Math.round(lowerCost * Math.pow(upperCost / lowerCost, ratio));
    return interpolated;
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

// 保留其他非農場項目
// 用途：可擴充其他經營項目（如特殊道具、點擊強化等）
JININ_ITEMS['sharpStone'] = {
    name: '尖銳的石頭',
    info: '增加手動點擊的金幣量 (+1)',
    cost: 50,
    tiougian: (playerData) => playerData.gold >= 25,
    effect: (playerData) => {
        playerData.gpc = (playerData.gpc || 1) + 10000000;
    }
};

// ==========================================================
// ▼▼▼ 煤礦 (core) 項目定義（可升級 1..100 級，每級 +5 GPS） ▼▼▼
// 用途：定義另一類可升級經營項目，與農場邏輯一致
// ==========================================================
const CORE_BASE_NAME = '煤礦';
const CORE_MAX_LEVEL = 100;

const CORE_COST_MILESTONES = {
    1: 2000,
    2: 3200,
    3: 5000,
    4: 7500,
    5: 11000,
    6: 16000,
    7: 23000,
    8: 32000,
    9: 44000,
    10: 60000,
    15: 140000,
    20: 300000,
    25: 550000,
    30: 900000,
    35: 1400000,
    40: 2200000,
    45: 3400000,
    50: 5000000,
    55: 7200000,
    60: 10000000,
    65: 14000000,
    70: 19000000,
    75: 26000000,
    80: 35000000,
    85: 47000000,
    90: 63000000,
    100: 105000000
};

const CORE_MILESTONE_LEVELS = Object.keys(CORE_COST_MILESTONES).map(l => parseInt(l, 10)).sort((a,b) => a-b);

/**
 * 取得指定等級煤礦的購買費用
 * @param {number} level - 煤礦等級
 * @returns {number} 費用
 * 用途：供 UI 與購買流程查詢
 */
function getCoreCostForLevel(level) {
    if (CORE_COST_MILESTONES[level]) return CORE_COST_MILESTONES[level];

    const target = level;
    let lower = CORE_MILESTONE_LEVELS[0];
    let upper = CORE_MILESTONE_LEVELS[CORE_MILESTONE_LEVELS.length - 1];

    for (let i = 0; i < CORE_MILESTONE_LEVELS.length; i++) {
        const lv = CORE_MILESTONE_LEVELS[i];
        if (lv <= target) lower = lv;
        if (lv >= target) { upper = lv; break; }
    }

    if (lower === upper) return CORE_COST_MILESTONES[lower];

    const lowerCost = CORE_COST_MILESTONES[lower];
    const upperCost = CORE_COST_MILESTONES[upper];
    const ratio = (target - lower) / (upper - lower);
    const interpolated = Math.round(lowerCost * Math.pow(upperCost / lowerCost, ratio));
    return interpolated;
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