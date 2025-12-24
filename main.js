// ==========================================================
// ▼▼▼ main.js（全域入口與核心循環） ▼▼▼
// 用途：
// - 建立全域 State（狀態）（window.playerData）
// - 提供 UI 更新函式（window.updateUI）
// - 提供頁面切換函式（loadPage）
// - 啟動 Game Loop（遊戲主循環）：每秒自動加金幣
// 影響範圍：
// - 任何頁面都會讀寫 window.playerData
// - 任何頁面都可呼叫 window.updateUI 與 loadPage
// ==========================================================

// 主要內容容器（Content Root，內容根節點）
// 用途：所有子頁面 HTML 都會插入到此容器中
// 影響範圍：loadPage() 會新增/切換 mainContent 的子節點
const mainContent = document.getElementById('main-content');

// ==========================================================
// ▼▼▼ 全域玩家狀態與 UI 更新 ▼▼▼
// ==========================================================
// 全域 State（全局遊戲狀態）
// 用途：集中儲存「玩家金幣/已購買/已解鎖/產出」等所有會跨頁共用的資料
// 影響範圍：Town（城鎮）/Bank（銀行）等頁面會依賴這份資料做渲染與計算
window.playerData = {
  // gold：目前金幣
  // 用途：購買判斷、畫面顯示、主循環累加
  // 影響範圍：Town 面板購買/技能學習、左側選單顯示、每秒產出
  gold: 0,

  // unlockedItems：已解鎖清單（曾經滿足條件就記住）
  // 用途：讓 UI 顯示「曾解鎖過」的項目，不會因條件變動而消失
  // 影響範圍：Town（城鎮）經營面板上半部顯示
  unlockedItems: [],

  // upgrades：已購買的經營項目 ID 清單
  // 用途：計算 GPS、判斷條件、顯示已擁有清單
  // 影響範圍：Town（城鎮）經營面板上下兩區、技能條件判斷
  upgrades: [],

  // gps：Gold Per Second（每秒金幣）
  // 用途：主循環每秒加到 gold
  // 影響範圍：每秒金幣成長速度
  gps: 0,

  // gpc：Gold Per Click（每次點擊金幣）
  // 用途：點背景時加到 gold
  // 影響範圍：點擊獲利速度
  gpc: 1,

  // farmLevel：農場等級（保留欄位，供未來擴充或顯示用途）
  // 用途：可用於顯示/計算，但目前主要以 upgrades 裡的 farmX 推導
  // 影響範圍：若未來使用此欄位，會影響產出/顯示
  farmLevel: 0,

  // maxGold：歷史最高金幣
  // 用途：當作解鎖門檻（例如某些項目需要曾到達某金額）
  // 影響範圍：Town（城鎮）項目解鎖條件
  maxGold: 0
};

// UI 更新函式（UI Refresh，介面同步）
// 用途：把 window.playerData 的狀態同步到畫面上（目前只更新左側金幣顯示）
// 影響範圍：任何呼叫 window.updateUI 的地方，都會刷新對應 DOM
window.updateUI = function() {
  const goldDisplay = document.getElementById('gold-display');
  if (goldDisplay) {
    goldDisplay.textContent = `💰 ${Math.floor(window.playerData.gold)}`;
  }
};

// 頁面快取（Cache，快取）
// 用途：把已載入的頁面 DOM 保留起來，下次切換回來只要顯示/隱藏即可
// 影響範圍：
// - 切換速度更快
// - 頁面內的狀態/事件可能會持續存在（因為 DOM 沒被銷毀）
const pageCache = new Map();

/**
 * 異步載入頁面內容到 #main-content div 中
 * @param {string} url - 要載入的頁面路徑
 */
/**
 * 動態載入子頁面內容到主容器
 * @param {string} url - 頁面路徑
 * 用途：切換不同功能頁面（如 town、bank 等）
 * 影響範圍：mainContent 內容、快取、子頁面腳本執行
 */
async function loadPage(url) {
  // 用途：切換右側主區塊顯示的頁面
  // 影響範圍：mainContent 會新增/切換子節點；新頁面內 <script> 會被執行
  // 1. 隱藏所有已緩存的頁面
  //    現在，所有頁面容器都會一直保留在 mainContent 中。
  for (const page of pageCache.values()) {
    page.style.display = 'none';
  }

  // 2. 如果頁面已在緩存中，則將其顯示並返回
  if (pageCache.has(url)) {
    const cachedPage = pageCache.get(url);
    cachedPage.style.display = 'block';
    return;
  }

  try {
    // fetch（抓取）HTML：把子頁面當作純文字取回
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // 創建一個新的 div 容器來存放頁面內容
    // 用途：讓每個頁面都有獨立容器，方便 display 切換
    const pageContainer = document.createElement('div');
    pageContainer.style.width = '100%';
    pageContainer.style.height = '100%';
    // 預設設為可見
    pageContainer.style.display = 'block';
    pageContainer.innerHTML = html;
    mainContent.appendChild(pageContainer);

    // 將新載入的頁面存入緩存
    pageCache.set(url, pageContainer);

    // 查找並執行新頁面中的腳本
    // 用途：子頁面若帶有 <script>，必須手動插入新 script 才會執行
    // 影響範圍：子頁面會建立自己的事件監聽/渲染邏輯
    const scripts = pageContainer.querySelectorAll('script');
    
    // 順序執行（Sequential，依序）：確保 script src 先載入完再跑下一個
    const executeScriptsSequentially = async () => {
      for (const oldScript of scripts) {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          await new Promise((resolve, reject) => {
            newScript.src = oldScript.getAttribute('src');
            newScript.onload = resolve;
            newScript.onerror = reject;
            oldScript.parentNode.replaceChild(newScript, oldScript);
          });
        } else {
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode.replaceChild(newScript, oldScript);
        }
      }
    };

    await executeScriptsSequentially();

  } catch (error) {
    console.error('Could not load page: ', error);
    mainContent.innerHTML = `<p style="color: red;">頁面載入失敗: ${url}</p><p>${error.message}</p>`;
  }
}

// 入口點：初始化主事件監聽、遊戲主循環與初始頁面
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================
  // ▼▼▼ 事件委派：在父層容器監聽點擊事件 ▼▼▼
  // ==========================================================
  // 事件委派：統一處理主內容區的所有互動
  // 事件委派（Event Delegation，事件委派）
  // 用途：只在 mainContent 綁一次 click，就能處理子頁面的點擊
  // 影響範圍：Town（城鎮）點擊背景加錢、其他頁面也能共享此監聽
  mainContent.addEventListener('click', (event) => {
    // 檢查點擊事件是否發生在 #town-content 頁面內
    // 判斷是否在 town 頁面背景點擊，觸發點擊產出
    const townWrapper = event.target.closest('#town-wrapper');

    // 變更：取消 Town 內「點擊賺取資源」
    // - 依需求：Town 不再透過點擊背景取得 cost/金幣資源。
    // - 仍保留 townWrapper 的判斷，避免未來要加回互動時找不到掛點。
    // - 目前不做任何事。
    if (townWrapper && event.target.id === 'town-content') {
      return;
    }

    // ▼▼▼（保留）舊版購買按鈕事件委派 ▼▼▼
    // 用途：支援舊 UI 產生的 .btn-buy 按鈕
    // 影響範圍：若某些頁面仍使用 .btn-buy，這段可維持其可購買
    const buyButton = event.target.closest('.btn-buy');
    if (buyButton && !buyButton.disabled) {
      const itemId = buyButton.dataset.itemId;
      if (itemId && typeof buyJininItem === 'function') {
        // 執行購買流程，並自動更新狀態
        buyJininItem(itemId);
      }
    }
  });

  // ==========================================================
  // ▼▼▼ 遊戲主循環 (Game Loop) ▼▼▼
  // ==========================================================
  // 遊戲主循環（Game Loop，遊戲主循環）
  // 用途：每秒把 gps 加到 gold，形成放置型（Idle，放置）收益
  // 影響範圍：window.playerData.gold、window.playerData.maxGold 會持續變動
  setInterval(() => {
    window.playerData.gold += window.playerData.gps;
    window.playerData.maxGold = Math.max(window.playerData.maxGold || 0, window.playerData.gold);
    window.updateUI();
  }, 1000);

  // 初始更新一次UI，確保金幣數量正確顯示
  // 首次載入時初始化 UI 並載入歡迎頁
  window.updateUI();
  loadPage('pages/welcome.html');
});
