(function () {
    // ==========================================================
    // ▼▼▼ jouguan（酒館）MVP：經營項目資料表（JININ_ITEMS） ▼▼▼
    // 用途：提供「補貨（買食材）/雇用員工/店面擴充」等低頻決策
    // 影響範圍：
    // - jouguan-ui.js 的經營面板渲染
    // - jouguan.js 的 purchaseItem() 購買流程
    // ==========================================================

    if (window.JININ_ITEMS) return;

    function getSeatCap(shopExpansionLevel) {
        if (shopExpansionLevel >= 2) return 9;
        if (shopExpansionLevel >= 1) return 6;
        return 4;
    }

    function getMenuCategoryCap(shopExpansionLevel) {
        if (shopExpansionLevel >= 2) return 4;
        if (shopExpansionLevel >= 1) return 3;
        return 2;
    }

    function getStaffCap(rep) {
        if (rep >= 600) return 5;
        if (rep >= 200) return 4;
        if (rep >= 40) return 3;
        return 2;
    }

    function getOrInitInventory(playerData) {
        playerData.inventory = playerData.inventory || {};
        playerData.inventory.meat = playerData.inventory.meat || 0;
        playerData.inventory.veg = playerData.inventory.veg || 0;
        playerData.inventory.grain = playerData.inventory.grain || 0;
        return playerData.inventory;
    }

    const JININ_ITEMS = {
        buyMeat10: {
            name: '買肉x10',
            repeatable: true,
            cost: 30,
            tiougian: () => true,
            info: (playerData) => {
                const inv = getOrInitInventory(playerData);
                return `花費 30 金幣，肉 +10\n目前：肉 ${inv.meat}`;
            },
            effect: (playerData) => {
                const inv = getOrInitInventory(playerData);
                inv.meat += 10;
            }
        },
        buyVeg10: {
            name: '買菜x10',
            repeatable: true,
            cost: 20,
            tiougian: () => true,
            info: (playerData) => {
                const inv = getOrInitInventory(playerData);
                return `花費 20 金幣，菜 +10\n目前：菜 ${inv.veg}`;
            },
            effect: (playerData) => {
                const inv = getOrInitInventory(playerData);
                inv.veg += 10;
            }
        },
        buyGrain10: {
            name: '買穀物x10',
            repeatable: true,
            cost: 15,
            tiougian: () => true,
            info: (playerData) => {
                const inv = getOrInitInventory(playerData);
                return `花費 15 金幣，穀物 +10\n目前：穀物 ${inv.grain}`;
            },
            effect: (playerData) => {
                const inv = getOrInitInventory(playerData);
                inv.grain += 10;
            }
        },

        hireStaff: {
            name: '雇員工+1',
            repeatable: true,
            cost: (playerData) => 500 + 250 * (playerData.staffCount || 0),
            tiougian: (playerData) => {
                const cap = getStaffCap(playerData.rep || 0);
                return (playerData.staffCount || 0) < cap;
            },
            info: (playerData) => {
                const cap = getStaffCap(playerData.rep || 0);
                const current = playerData.staffCount || 0;
                const cost = 500 + 250 * current;
                return `花費 ${cost} 金幣，員工 +1\n目前：${current}/${cap}`;
            },
            effect: (playerData) => {
                const cap = getStaffCap(playerData.rep || 0);
                playerData.staffCount = Math.min(cap, (playerData.staffCount || 0) + 1);
            }
        },

        shopExpansion1: {
            name: '店面擴充I',
            cost: 1200,
            tiougian: (playerData) => (playerData.shopExpansionLevel || 0) === 0,
            info: (playerData) => {
                const beforeSeat = getSeatCap(playerData.shopExpansionLevel || 0);
                const beforeMenu = getMenuCategoryCap(playerData.shopExpansionLevel || 0);
                const afterSeat = getSeatCap(1);
                const afterMenu = getMenuCategoryCap(1);
                return `花費 1200 金幣\n座位：${beforeSeat} → ${afterSeat}\n料理類別：${beforeMenu} → ${afterMenu}`;
            },
            effect: (playerData) => {
                playerData.shopExpansionLevel = 1;
            }
        },
        shopExpansion2: {
            name: '店面擴充II',
            cost: 8000,
            tiougian: (playerData) => (playerData.shopExpansionLevel || 0) === 1 && (playerData.rep || 0) >= 200,
            info: (playerData) => {
                const beforeSeat = getSeatCap(playerData.shopExpansionLevel || 0);
                const beforeMenu = getMenuCategoryCap(playerData.shopExpansionLevel || 0);
                const afterSeat = getSeatCap(2);
                const afterMenu = getMenuCategoryCap(2);
                return `花費 8000 金幣（需名聲≥200）\n座位：${beforeSeat} → ${afterSeat}\n料理類別：${beforeMenu} → ${afterMenu}`;
            },
            effect: (playerData) => {
                playerData.shopExpansionLevel = 2;
            }
        }
    };

    window.JININ_ITEMS = JININ_ITEMS;
})();