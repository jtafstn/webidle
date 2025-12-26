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
// 注意：為了避免 defer/解析時序或頁面結構調整導致抓不到元素，
// 這裡用「延遲取得 + 防呆」方式存取 #main-content。
let mainContent = null;
function ensureMainContent() {
  if (mainContent) return mainContent;
  mainContent = document.getElementById('main-content');
  return mainContent;
}
/**
 * main.js（重建版）
 * 目標：讓 index.html 的基本功能在 Codespaces Live Server 下穩定運作
 * - 左側按鈕可切換右側頁面
 * - 子頁面內的 <script> 會被正確執行
 * - 提供最小的全域狀態與存檔 API（避免其他頁面引用時崩潰）
 */

(function () {
  'use strict';

  const SAVE_KEY = 'webidle-save';
  const SAVE_VERSION = 1;

  function setAppStatus(message) {
    const el = document.getElementById('app-status');
    if (!el) return;
    el.textContent = `狀態：${message}`;
  }

  function safeClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaultPlayerData() {
    return {
      saveVersion: SAVE_VERSION,
      gold: 0,
      rep: 0,
      inventory: { meat: 0, veg: 0, grain: 0 },
      unlockedItems: [],
      upgrades: [],
      learnedSkills: [],
      itemCounts: {},
      lastSeenMs: Date.now()
    };
  }

  function mergeDefaults(target, defaults) {
    if (target == null || typeof target !== 'object') return safeClone(defaults);
    const result = Array.isArray(defaults) ? [] : {};

    for (const key of Object.keys(target)) result[key] = target[key];
    for (const key of Object.keys(defaults)) {
      if (!(key in result)) {
        result[key] = safeClone(defaults[key]);
        continue;
      }
      const dv = defaults[key];
      const tv = result[key];
      if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
        result[key] = mergeDefaults(tv, dv);
      }
    }
    return result;
  }

  function sanitizePlayerData(raw) {
    const defaults = getDefaultPlayerData();
    const merged = mergeDefaults(raw || {}, defaults);
    merged.saveVersion = SAVE_VERSION;

    merged.gold = Number.isFinite(merged.gold) ? merged.gold : 0;
    merged.rep = Number.isFinite(merged.rep) ? merged.rep : 0;
    merged.inventory = merged.inventory || { meat: 0, veg: 0, grain: 0 };
    merged.inventory.meat = Math.max(0, Math.floor(Number.isFinite(merged.inventory.meat) ? merged.inventory.meat : 0));
    merged.inventory.veg = Math.max(0, Math.floor(Number.isFinite(merged.inventory.veg) ? merged.inventory.veg : 0));
    merged.inventory.grain = Math.max(0, Math.floor(Number.isFinite(merged.inventory.grain) ? merged.inventory.grain : 0));
    merged.unlockedItems = Array.isArray(merged.unlockedItems) ? merged.unlockedItems : [];
    merged.upgrades = Array.isArray(merged.upgrades) ? merged.upgrades : [];
    merged.learnedSkills = Array.isArray(merged.learnedSkills) ? merged.learnedSkills : [];
    merged.itemCounts = merged.itemCounts && typeof merged.itemCounts === 'object' ? merged.itemCounts : {};
    merged.lastSeenMs = Number.isFinite(merged.lastSeenMs) ? merged.lastSeenMs : Date.now();
    return merged;
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return sanitizePlayerData(null);
      return sanitizePlayerData(JSON.parse(raw));
    } catch (e) {
      console.warn('讀取存檔失敗，改用預設狀態', e);
      return sanitizePlayerData(null);
    }
  }

  function saveGame() {
    try {
      if (!window.playerData) return;
      window.playerData.lastSeenMs = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(window.playerData));
    } catch (e) {
      console.warn('寫入存檔失敗', e);
    }
  }

  // --- 全域 API ---
  window.playerData = loadGame();
  window.saveGame = saveGame;
  window.loadGame = function () {
    window.playerData = loadGame();
    if (typeof window.updateUI === 'function') window.updateUI();
    return window.playerData;
  };

  window.updateUI = function () {
    const goldDisplay = document.getElementById('gold-display');
    if (goldDisplay) {
      goldDisplay.textContent = `💰 ${Math.floor(window.playerData?.gold || 0)}`;
    }
  };

  // --- 導頁（含快取與 script 執行） ---
  const pageCache = new Map();

  function getMainContent() {
    return document.getElementById('main-content');
  }

  async function executeScriptsSequentially(container) {
    const scripts = Array.from(container.querySelectorAll('script'));
    for (const oldScript of scripts) {
      const newScript = document.createElement('script');
      const type = oldScript.getAttribute('type');
      if (type) newScript.type = type;

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
  }

  async function loadPage(url) {
    const main = getMainContent();
    if (!main) {
      setAppStatus('錯誤：找不到 #main-content');
      return;
    }

    // 移除靜態 Home fallback（只移除一次）
    const fallback = document.getElementById('home-fallback');
    if (fallback && fallback.parentElement === main) fallback.remove();

    // 隱藏其他快取頁
    for (const page of pageCache.values()) page.style.display = 'none';

    // 已快取：直接顯示
    if (pageCache.has(url)) {
      pageCache.get(url).style.display = 'block';
      setAppStatus(`已切換：${url}`);
      return;
    }

    setAppStatus(`載入頁面：${url}`);
    const loading = document.createElement('div');
    loading.className = 'panel';
    loading.textContent = `載入中：${url}`;
    main.appendChild(loading);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      const pageContainer = document.createElement('div');
      pageContainer.style.width = '100%';
      pageContainer.style.height = '100%';
      pageContainer.style.display = 'block';
      pageContainer.innerHTML = html;
      main.appendChild(pageContainer);
      pageCache.set(url, pageContainer);

      await executeScriptsSequentially(pageContainer);
      setAppStatus(`已載入：${url}`);
      if (typeof window.updateUI === 'function') window.updateUI();
    } catch (e) {
      console.error('loadPage failed:', url, e);
      setAppStatus(`載入失敗：${url}`);
      const msg = (e && e.message) ? e.message : String(e);
      main.innerHTML = `<p style="color:red;">頁面載入失敗：${url}</p><p>${msg}</p>`;
    } finally {
      if (loading.parentNode) loading.parentNode.removeChild(loading);
    }
  }

  window.loadPage = loadPage;

  // --- 啟動 ---
  document.addEventListener('DOMContentLoaded', () => {
    setAppStatus(`JS 已啟動（${location.protocol}//）`);
    window.updateUI();

    // 左側按鈕（data-page）
    const sidebar = document.querySelector('.zuo-panel');
    if (sidebar) {
      sidebar.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-page]');
        if (!btn) return;
        const url = btn.getAttribute('data-page');
        if (!url) return;
        loadPage(url);
      });
    }

    // 預設載入 welcome
    loadPage('pages/welcome.html');

    // 自動存檔
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveGame();
    });
    window.addEventListener('beforeunload', () => saveGame());
  });
})();
  const inv = playerData.inventory;
