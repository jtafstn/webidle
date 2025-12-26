/**
 * jouguan-ui.js
 * 用途：jouguan（酒館）頁面的 UI / 渲染層（面板、tooltip、事件綁定）
 *
 * 職責分層（對應 jouguan_contect.md 的設計原則）：
 * - UI 只負責「反映狀態」與「觸發動作」，不直接決定結果
 * - 實際購買/學習邏輯由 pages/jouguan/jouguan.js（API/商業層）處理
 * - 經營/技能資料表由 pages/jouguan/jinin.js 與 pages/jouguan/skill.js 提供
 *
 * 依賴：
 * - window.playerData（全域狀態，main.js 建立）
 * - window.JININ_ITEMS / window.SKILL_ITEMS（資料表）
 * - window.purchaseItem / window.learnSkill / window.syncUnlockedItems（API）
 */

(function () {
  // 避免在同一個頁面容器中重複初始化
  // （main.js 會快取 pageContainer，不會重跑 script，但保留防呆）
  if (window.__jouguanUIInitialized) return;
  window.__jouguanUIInitialized = true;

  // --- 取得 DOM ---
  const jouguanWrapper = document.getElementById('jouguan-wrapper');
  const jouguanContent = document.getElementById('jouguan-content');
  const container = document.getElementById('floating-controls-container');
  const managementPanel = document.getElementById('panel-management');
  const skillsPanel = document.getElementById('panel-skills');
  const tooltip = document.getElementById('item-tooltip');

  if (!jouguanWrapper || !jouguanContent || !container || !managementPanel || !skillsPanel || !tooltip) return;

  // 確保 playerData 欄位存在（舊存檔/其他頁面可能缺欄位）
  if (!window.playerData) {
    window.playerData = { gold: 0, upgrades: [], unlockedItems: [], learnedSkills: [] };
  }
  window.playerData.upgrades = window.playerData.upgrades || [];
  window.playerData.unlockedItems = window.playerData.unlockedItems || [];
  window.playerData.learnedSkills = window.playerData.learnedSkills || [];

  // 確保酒館 MVP 欄位存在（避免舊存檔造成 UI 讀取錯誤）
  window.playerData.rep = window.playerData.rep || 0;
  window.playerData.staffCount = window.playerData.staffCount || 0;
  window.playerData.shopExpansionLevel = window.playerData.shopExpansionLevel || 0;
  window.playerData.inventory = window.playerData.inventory || { meat: 0, veg: 0, grain: 0 };

  function resolveCost(cost, playerData) {
    try {
      return typeof cost === 'function' ? Number(cost(playerData)) : Number(cost);
    } catch {
      return NaN;
    }
  }

  function getSafeSeatCap(playerData) {
    if (typeof window.getSeatCap === 'function') return window.getSeatCap(playerData.shopExpansionLevel || 0);
    const level = playerData.shopExpansionLevel || 0;
    if (level >= 2) return 9;
    if (level >= 1) return 6;
    return 4;
  }

  function getSafeMenuCategoryCap(playerData) {
    if (typeof window.getMenuCategoryCap === 'function') return window.getMenuCategoryCap(playerData.shopExpansionLevel || 0);
    const level = playerData.shopExpansionLevel || 0;
    if (level >= 2) return 4;
    if (level >= 1) return 3;
    return 2;
  }

  function getSafeStaffCap(playerData) {
    if (typeof window.getStaffCap === 'function') return window.getStaffCap(playerData.rep || 0);
    const rep = playerData.rep || 0;
    if (rep >= 600) return 5;
    if (rep >= 200) return 4;
    if (rep >= 40) return 3;
    return 2;
  }

  // --- 頁面可見性旗標 ---
  // main.js 使用 display:none 切換快取頁面；當此頁隱藏時，不要做額外渲染。
  let isActive = true;

  // --- 初始同步 UI（左側金幣顯示） ---
  if (typeof window.updateUI === 'function') window.updateUI();

  // --- 裝飾 updateUI：當面板打開時自動刷新內容 ---
  const originalUpdateUI = window.updateUI;
  if (typeof originalUpdateUI === 'function') {
    window.updateUI = function () {
      originalUpdateUI.apply(this, arguments);
      if (!isActive) return;

      if (managementPanel.classList.contains('open')) renderManagementPanel();
      if (skillsPanel.classList.contains('open')) renderSkillsPanel();
      const dataPanel = document.getElementById('panel-data');
      if (dataPanel && dataPanel.classList.contains('open')) renderDataPanel();
    };
  }

  // --------------------------------------------------
  // 經營面板渲染
  // --------------------------------------------------
  function renderManagementPanel() {
    const jininItems = window.JININ_ITEMS;
    if (!jininItems) return;

    // 由商業層同步解鎖清單：UI 不直接決定解鎖結果
    if (typeof window.syncUnlockedItems === 'function') {
      window.syncUnlockedItems();
    }

    const purchasableContainer = managementPanel.querySelector('.management-purchasable');
    const purchasedContainer = managementPanel.querySelector('.management-purchased');
    const separator = managementPanel.querySelector('.panel-separator');
    if (!purchasableContainer || !purchasedContainer) return;

    purchasableContainer.innerHTML = '';
    purchasedContainer.innerHTML = '';
    if (separator) separator.style.display = 'block';

    for (const itemId in jininItems) {
      const item = jininItems[itemId];
      const isPurchased = window.playerData.upgrades.includes(itemId);

      // 非 repeatable 才會進「已購買」區
      const isRepeatable = !!item.repeatable;

      if (isPurchased && !isRepeatable) {
          const itemBtn = document.createElement('button');
          itemBtn.type = 'button';
          itemBtn.className = 'mgmt-item-owned';
          itemBtn.dataset.itemId = itemId;
          itemBtn.setAttribute('aria-disabled', 'true');
          itemBtn.textContent = item.name;
          purchasedContainer.appendChild(itemBtn);
        continue;
      }

      if (!window.playerData.unlockedItems.includes(itemId)) continue;

      const costNumber = resolveCost(item.cost, window.playerData);
      const gold = window.playerData.gold || 0;
      const canAfford = Number.isFinite(costNumber) ? gold >= costNumber : false;
      const meetsCondition = typeof item.tiougian === 'function' ? !!item.tiougian(window.playerData) : true;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mgmt-item-btn';
      btn.dataset.itemId = itemId;

      // repeatable：顯示「現況」摘要（庫存/上限），避免只看得到買按鈕
      if (itemId === 'buyMeat10') {
        btn.textContent = `${item.name}（肉：${window.playerData.inventory.meat || 0}）`;
      } else if (itemId === 'buyVeg10') {
        btn.textContent = `${item.name}（菜：${window.playerData.inventory.veg || 0}）`;
      } else if (itemId === 'buyGrain10') {
        btn.textContent = `${item.name}（穀物：${window.playerData.inventory.grain || 0}）`;
      } else if (itemId === 'hireStaff') {
        const cap = getSafeStaffCap(window.playerData);
        btn.textContent = `${item.name}（${window.playerData.staffCount || 0}/${cap}）`;
      } else {
        btn.textContent = item.name;
      }

      // 不使用 disabled：買不起也要能 hover 看 tooltip
      const unaffordable = !canAfford;
      const locked = !meetsCondition;
      if (unaffordable || locked) {
        btn.classList.add('unaffordable');
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.classList.add('affordable');
        btn.setAttribute('aria-disabled', 'false');
      }

      purchasableContainer.appendChild(btn);
    }

    // 若沒有任何已購買項目，隱藏下半部（避免空白）
    if (purchasedContainer.children.length === 0 && separator) {
      separator.style.display = 'none';
    }
  }

  // --------------------------------------------------
  // 技能面板渲染
  // --------------------------------------------------
  function renderSkillsPanel() {
    const skillItems = window.SKILL_ITEMS;
    if (!skillItems) return;

    skillsPanel.innerHTML = '';

    const skillIds = Object.keys(skillItems);
    if (skillIds.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'MVP 版本：目前沒有技能。';
      skillsPanel.appendChild(empty);
      return;
    }

    const purchasableContainer = document.createElement('div');
    purchasableContainer.className = 'skill-purchasable';

    const separator = document.createElement('hr');
    separator.className = 'panel-separator';

    const purchasedContainer = document.createElement('div');
    purchasedContainer.className = 'skill-purchased';

    const learned = window.playerData.learnedSkills || [];

    for (const skillId in skillItems) {
      const skill = skillItems[skillId];
      const isLearned = learned.includes(skillId);

      if (isLearned) {
        const ownedBtn = document.createElement('button');
        ownedBtn.type = 'button';
        ownedBtn.className = 'skill-item-owned';
        ownedBtn.dataset.itemId = skillId;
        ownedBtn.setAttribute('aria-disabled', 'true');
        ownedBtn.textContent = skill.name;
        purchasedContainer.appendChild(ownedBtn);
        continue;
      }

      if (typeof skill.tiougian === 'function' && !skill.tiougian(window.playerData)) {
        continue;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'skill-item-btn';
      btn.dataset.itemId = skillId;
      btn.textContent = skill.name;

      const unaffordable = (window.playerData.gold || 0) < skill.cost;
      if (unaffordable) {
        btn.classList.add('unaffordable');
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.setAttribute('aria-disabled', 'false');
      }

      purchasableContainer.appendChild(btn);
    }

    skillsPanel.appendChild(purchasableContainer);
    skillsPanel.appendChild(separator);
    skillsPanel.appendChild(purchasedContainer);
  }

  // --------------------------------------------------
  // 數據面板渲染
  // --------------------------------------------------
  function renderDataPanel() {
    const panel = document.getElementById('panel-data');
    if (!panel) return;

    const dataContainer = document.createElement('div');
    dataContainer.style.display = 'flex';
    dataContainer.style.flexDirection = 'column';
    dataContainer.style.gap = '8px';

    const gold = document.createElement('div');
    gold.textContent = `目前金幣：${Math.floor(window.playerData.gold || 0)}`;

    const rep = document.createElement('div');
    rep.textContent = `名聲：${Math.floor(window.playerData.rep || 0)}`;

    const shop = document.createElement('div');
    shop.textContent = `店面等級：${window.playerData.shopExpansionLevel || 0}`;

    const seatCap = getSafeSeatCap(window.playerData);
    const menuCap = getSafeMenuCategoryCap(window.playerData);
    const staffCap = getSafeStaffCap(window.playerData);
    const caps = document.createElement('div');
    caps.textContent = `上限：座位 ${seatCap}｜員工 ${window.playerData.staffCount || 0}/${staffCap}｜料理類別 ${menuCap}`;

    const inv = window.playerData.inventory || { meat: 0, veg: 0, grain: 0 };
    const inventory = document.createElement('div');
    inventory.textContent = `食材：肉 ${inv.meat || 0}｜菜 ${inv.veg || 0}｜穀物 ${inv.grain || 0}`;

    dataContainer.appendChild(gold);
    dataContainer.appendChild(rep);
    dataContainer.appendChild(shop);
    dataContainer.appendChild(caps);
    dataContainer.appendChild(inventory);

    const last = window.playerData.lastSettlement;
    if (last) {
      const lastTitle = document.createElement('div');
      lastTitle.style.marginTop = '6px';
      lastTitle.textContent = '最近一次結算：';

      const lastBody = document.createElement('div');
      const tag = last.tag ? `（${last.tag}）` : '';
      lastBody.textContent = `${tag} ${last.minutesSimulated || 0} 分鐘｜服務 ${last.customersServed || 0}｜收入 ${Math.floor(last.goldEarned || 0)}｜支出 ${Math.floor(last.goldSpent || 0)}｜名聲 +${Math.floor(last.repEarned || 0)}｜停止：${last.stopReason || '—'}`;

      dataContainer.appendChild(lastTitle);
      dataContainer.appendChild(lastBody);
    }

    panel.innerHTML = '';
    panel.appendChild(dataContainer);
  }

  // --------------------------------------------------
  // 面板切換
  // --------------------------------------------------
  function openFloatingPanel(targetPanel) {
    const targetPanelId = targetPanel.id;

    document.querySelectorAll('.floating-panel.open').forEach((panel) => panel.classList.remove('open'));

    if (targetPanelId === 'panel-management') renderManagementPanel();
    else if (targetPanelId === 'panel-skills') renderSkillsPanel();
    else if (targetPanelId === 'panel-data') renderDataPanel();

    targetPanel.classList.add('open');
  }

  // --------------------------------------------------
  // Tooltip handlers
  // --------------------------------------------------
  const handleMouseOver = (event) => {
    if (!isActive) return;

    const itemElement = event.target.closest('.mgmt-item-btn, .mgmt-item-owned, .skill-item-btn, .skill-item-owned');
    if (!itemElement) return;

    const itemId = itemElement.dataset.itemId;
    const item = (window.JININ_ITEMS && window.JININ_ITEMS[itemId]) || (window.SKILL_ITEMS && window.SKILL_ITEMS[itemId]);
    if (!item) return;

    const infoText = typeof item.info === 'function' ? item.info(window.playerData) : item.info;
    tooltip.textContent = infoText || '';
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
  };

  const handleMouseOut = () => {
    tooltip.style.display = 'none';
  };

  const handleMouseMove = (event) => {
    if (!isActive) return;
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
  };

  // --------------------------------------------------
  // Click handlers：只呼叫 API，不直接改動 state
  // --------------------------------------------------
  const handlePurchaseClick = (event) => {
    if (!isActive) return;

    const btn = event.target.closest('.mgmt-item-btn');
    if (!btn) return;
    if (btn.classList.contains('unaffordable') || btn.getAttribute('aria-disabled') === 'true') return;

    const itemId = btn.dataset.itemId;
    if (typeof window.purchaseItem !== 'function') return;

    const result = window.purchaseItem(itemId);
    if (result && result.success) {
      renderManagementPanel();
      if (typeof window.updateUI === 'function') window.updateUI();
    }
  };

  const handleSkillClick = (event) => {
    if (!isActive) return;

    const btn = event.target.closest('.skill-item-btn');
    if (!btn) return;
    if (btn.classList.contains('unaffordable') || btn.getAttribute('aria-disabled') === 'true') return;

    const skillId = btn.dataset.itemId;
    if (typeof window.learnSkill !== 'function') return;

    const result = window.learnSkill(skillId);
    if (result && result.success) renderSkillsPanel();
  };

  const handleContainerClick = (event) => {
    if (!isActive) return;

    const button = event.target.closest('.floating-btn');
    if (!button) return;

    const targetPanelId = button.dataset.target;
    const targetPanel = document.getElementById(targetPanelId);
    if (!targetPanel) return;

    const isPanelOpen = targetPanel.classList.contains('open');
    document.querySelectorAll('.floating-panel.open').forEach((panel) => panel.classList.remove('open'));

    if (!isPanelOpen) openFloatingPanel(targetPanel);
  };

  // --- 綁定事件（事件委派） ---
  container.addEventListener('click', handleContainerClick);
  managementPanel.addEventListener('mouseover', handleMouseOver);
  managementPanel.addEventListener('mouseout', handleMouseOut);
  managementPanel.addEventListener('mousemove', handleMouseMove);
  managementPanel.addEventListener('click', handlePurchaseClick);
  skillsPanel.addEventListener('mouseover', handleMouseOver);
  skillsPanel.addEventListener('mouseout', handleMouseOut);
  skillsPanel.addEventListener('mousemove', handleMouseMove);
  skillsPanel.addEventListener('click', handleSkillClick);

  // --- 監聽頁面顯示/隱藏（支援 main.js pageCache） ---
  // main.js 會切換 pageContainer.style.display，這裡用 observer 偵測並停用/啟用 UI。
  const pageContainer = jouguanWrapper.parentElement;
  if (pageContainer) {
    const observer = new MutationObserver(() => {
      const hidden = pageContainer.style.display === 'none';
      if (hidden) {
        isActive = false;
        tooltip.style.display = 'none';
        document.querySelectorAll('.floating-panel.open').forEach((panel) => panel.classList.remove('open'));
      } else {
        isActive = true;
        if (typeof window.updateUI === 'function') window.updateUI();
      }
    });

    observer.observe(pageContainer, { attributes: true, attributeFilter: ['style'] });
  }
})();
