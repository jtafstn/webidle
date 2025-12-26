1. jouguan定位

jouguan（酒館）是整個 Idle RPG（放置型角色扮演遊戲）的「供給與治理層」，不是主要的操作密集玩法。

jouguan 的核心價值：
- 提供材料（Materials，材料）與基礎補給（Supplies，補給），支援其他系統（例如戰鬥/製作/探索）
- 透過專案（Project，專案）解鎖能力：建築槽位、配方、倉庫容量、稅收效率、事件處理能力
- 透過合約（Contract，合約）控制金幣（Gold，金幣）流入，避免金幣氾濫

jouguan 的核心互動（刻意低頻）：
- 指派（Assignment，指派）：把有限的人力/槽位分配到產線（例如伐木/採礦/農耕/巡邏）
- 排程（Scheduling，排程）：選擇下一個要推進的專案（例如市集、工坊、倉庫、城牆）
- 取捨（Tradeoff，取捨）：在稅收、滿意度、治安與產量之間做選擇

jouguan 不再依賴「點擊獲取資源」，避免玩家把時間消耗在單一重複動作上。

1.1 奇幻冒險酒館版本（Fantasy Tavern Variant，奇幻冒險酒館版本）

本專案 vNext 規劃：將 jouguan（酒館）作為主場景。

jouguan（酒館）內包含兩類核心行為：
- 來客（Customers，來客）自動進店：消耗食材 → 產生營收與名聲
- 經營決策（Management Decisions，經營決策）：菜單、排班、補貨、專案、合約

jouguan（酒館）不負責：
- 戰鬥掉落（交由 Combat（戰鬥／冒險））
- 角色裝備整理（交由 Bank（銀行／倉庫））
- 無限制交易刷錢（交由 Shop（商店）並受限於規則/上限）

1.2 回遊節奏（Session Cadence，回遊節奏）

目標體驗：
- 玩家每幾個小時回來看一次（例如 2~6 小時）
- 每次花 5~30 分鐘做決策（不需要長時間在線）

設計落點（如何用規則支撐節奏）：
- 倉庫上限（Storage Cap，倉庫上限）：食材與加工品有容量上限，滿了就停止增加（軟上限）
- 來客結算上限（Offline Settlement Cap，離線結算上限）：離線結算最多累積 24 小時
- 決策點集中：回來後主要處理「缺料/菜單/合約/研發方向/設備升級」

1.3 三大核心上限（Core Caps，核心上限）

jouguan（酒館）的進度主要由三個上限推動，讓玩家每次回來都有明確的「下一個要解的瓶頸（Bottleneck，瓶頸）」：

- 座位上限（Seat Cap，座位上限）
	- 定義：同一時間可接待的來客能力上限（影響可服務的來客數/結算速度）
	- 玩法意義：想賺更多金幣/名聲，就必須擴座位或提高效率，而不是無限堆單一數值
	- 起始值（Starting Value，起始值）：4
	- 增加方式（Upgrade Gate，升級門檻）：必須購買「店面擴充（Shop Expansion，店面擴充）」才能增加

- 員工上限（Staff Cap，員工上限）
	- 定義：可配置的員工人數上限（例如廚師/服務生/採購）
	- 玩法意義：玩家的決策從「買更多」變成「把有限人力放在哪裡」
	- 起始值（Starting Value，起始值）：2
	- 增加方式（Upgrade Gate，升級門檻）：達到特定聲望（Reputation，名聲）門檻後才能增加

- 料理類別數上限（Menu Category Cap，料理類別數上限）
	- 定義：同一輪可啟用的料理類別數量上限（例如主食/湯品/點心）
	- 玩法意義：讓菜單有策略取捨；避免變成“全開=最優解”
	- 起始值（Starting Value，起始值）：2
	- 增加方式（Upgrade Gate，升級門檻）：必須購買「店面擴充（Shop Expansion，店面擴充）」才能增加

1.4 MVP 解鎖/升級清單（MVP Unlocks，MVP 解鎖）

本節的目的：把「上限如何成長」寫成可實作規格。

原則：
- 座位與料理類別屬於空間/設備擴張 → 用店面擴充（Shop Expansion，店面擴充）控制
- 員工屬於口碑招募 → 用聲望（Reputation，名聲）控制

建議的 MVP 節點（可調整數值，但先固定結構）：

0) 店面擴充等級表（Shop Expansion Table，店面擴充表）

設計目的：
- 用單一數值 shopExpansionLevel 綁定座位上限（seatCap）與料理類別上限（menuCategoryCap），避免效果散落各處難維護

建議實作方式（Implementation Note，實作備註）：
- 存檔只記錄 shopExpansionLevel
- seatCap 與 menuCategoryCap 由表格推導（避免「seatCap 寫死後忘了同步」）

| shopExpansionLevel | 名稱 | 成本（Gold，金幣） | 解鎖條件 | seatCap | menuCategoryCap |
|---:|---|---:|---|---:|---:|
| 0 | 初始店面 | 0 | 永遠可用 | 4 | 2 |
| 1 | 店面擴充 I | 1200 | Shop（商店）可購買 | 6 | 3 |
| 2 | 店面擴充 II | 8000 | 需聲望（Reputation，名聲）≥ R2（建議：200）或完成研發（Research，研發）節點 | 9 | 4 |

1) 店面擴充 I（Shop Expansion I，店面擴充 I）
- 效果：shopExpansionLevel 設為 1（並由表格推導 seatCap/menuCategoryCap）
- 取得方式：Shop（商店）購買
- 成本：見「店面擴充等級表」

2) 口碑招募 I（Staff Unlock I，招募 I）
- 解鎖條件：聲望（Reputation，名聲）達到門檻 R1（建議：40）
- 效果：staffCap +1
- 設計建議：R1 應該可在 1~2 次回合（Session，回合）內達到，讓玩家早期感到成長

3) 店面擴充 II（Shop Expansion II，店面擴充 II）
- 效果：shopExpansionLevel 設為 2（並由表格推導 seatCap/menuCategoryCap）
- 解鎖條件：見「店面擴充等級表」

4) 口碑招募 II（Staff Unlock II，招募 II）
- 解鎖條件：聲望（Reputation，名聲）達到門檻 R3（建議：600）
- 效果：staffCap +1

註：這組門檻的設計目的（配合 2~6 小時回遊）：
- R1：讓玩家在前 24 小時內幾乎必定能解鎖一次員工上限
- R2：讓玩家在 1~3 天內能推進第二次店面擴充（或改走研發路線）
- R3：讓玩家在 1~3 天內能解鎖第二次招募

1.5 成長曲線建議（Progression Cadence，成長節奏）

目標：耐玩（Long-term，長線）但不掉動力（Motivation，動力）。

設計原則（節奏版）：
- 每次回來（5~30 分鐘）都應該能做至少一個「有效決策」（菜單/補貨/升級/研發）
- 每 1~2 次回遊，至少看到一次「明確成長」：三大核心上限其一增加，或新料理/新來客解鎖
- 離線最多 24 小時：讓玩家一天回來一次也不吃虧；但 2~6 小時回來一次會更有效率（因為能更早處理缺料/投資）

節奏分段（建議）：
- 前期（0~24 小時）：
	- 目標：R1 + 店面擴充 I 至少完成其一
	- 玩家體感：從「人力卡住」或「座位卡住」變成可明顯服務更多來客

- 中期（1~3 天）：
	- 目標：R2 或店面擴充 II（或替代研發）逐步達成
	- 玩家體感：開始出現策略分流（偏金幣、偏名聲、偏稀有素材）

- 後期（>3 天）：
	- 目標：用新來客/稀有食材/合約（Contract，合約）讓策略變化，而不只是數字變大

1.6 MVP 數值建議（MVP Numbers，MVP 數值）

以下是與 R1/R2/R3 相容的「起始手感」建議，讓玩家在 2~6 小時回遊節奏下能穩定推進：

- 基礎來客速率（Base Rate，基礎速率）：baseCustomersPerMin = 0.6
	- 解讀：約每 1.7 分鐘 1 位來客（在座位/員工允許的前提下）

- 料理選擇（Dish Pick，點餐規則）：
	- MVP 建議：來客在 activeMenu 中等機率選一道料理
	- 用途：簡單、可預測；玩家可用“暫時關掉某道菜”來改變金幣/名聲比例

- 店面擴充成本（Expansion Cost，擴充成本）建議：
	- 店面擴充 I：1,200 金幣（Gold，金幣）
	- 店面擴充 II：8,000 金幣（Gold，金幣）
	- 目的：I 在 24 小時內可達成；II 在 1~3 天達成

2. 核心循環定義

所有系統必須符合以下循環：


jouguan 子循環（jouguan Loop，酒館子循環）：

專案/合約/政策解鎖（Project/Contract/Policy，專案/合約/政策）
→ 時間流逝（含 Offline（離線）結算）
→ 材料產生 + 狀態變化（滿意度/治安/庫存）
→ 用材料推進專案 / 用材料履約取得金幣與稀有資源
→ 回到專案/合約/政策解鎖

2.1 與其他系統的閉環（Cross-system Loop，跨系統閉環）

- Combat（戰鬥／冒險）取得稀有食材/香料/食譜碎片
→ Kitchen（廚房）研發新菜色與加工配方
→ jouguan（酒館）用菜單接待來客產生金幣與名聲
→ Shop（商店）用金幣購買材料與功能（例如農場自動供應）
→ 回到 Combat（戰鬥／冒險）推進新區域與更高稀有度素材

任何新增系統若無法嵌入此循環，視為設計衝突。

3. 資源系統原則（Resource System，資源系統）


jouguan 建議資源分層（避免只有金幣）：

- 基礎材料（Base Materials，基礎材料）：木材、石材、糧食、鐵礦
	- 來源：對應產線自動產出（放置）
	- 用途：推進專案、製作加工品、供其他系統消耗

- 加工品（Processed Goods，加工品）：木板、磚塊、鋼錠、藥草包
	- 來源：工坊/配方（Recipe，配方）轉換
	- 用途：解鎖裝備/技能/建築升級門檻，作為中期瓶頸（Bottleneck，瓶頸）

- 金幣（Gold，金幣）：
	- 來源：稅收（Tax，稅收）、合約（Contract，合約）、少量交易（Trade，交易）
	- 用途：維護費（Maintenance，維護）、外包（Outsource，外包）、升級費、交易手續費
	- 禁止：材料直接「免費變金幣」形成無上限通膨

資源沉沒（Resource Sink，資源沉沒）必須存在且穩定：
- 建築維護費/人口薪資/交易手續費（三選一或混用），用於回收金幣

3.1 酒館版資源最小集合（MVP Resource Set，最小資源集合）

為避免資源爆炸（並符合「禁止無用途資源」）：
- 常見食材（Common Ingredients，常見食材）：肉、菜、穀物（三選二或三種起步）
- 稀有素材（Rare Ingredients，稀有食材）：香料（由 Combat 掉落）
- 料理（Dishes，料理）：至少 2 道
	- 一道偏賺錢（高金幣、低名聲）
	- 一道偏名聲（低金幣、高名聲或解鎖需求）
- 名聲（Reputation，名聲）：用於解鎖新菜色/更高級來客/新區域門檻


4. 成長與數值原則（Progression Rules，成長規則）


成長曲線遵循：
- 前期快：用少量專案解鎖 1~2 條產線，快速建立「材料→升級」循環
- 中期緩：開始遇到瓶頸（例如倉庫容量、治安、加工品），需要取捨與規劃
- 後期趨近上限：靠轉生（Prestige，轉生）或流派（Build，流派）改變策略，而不是單純堆數字

數值的核心：不追求無限指數；改用「效率遞減 + 新層級解鎖」維持長期目標。



5. 系統設計原則（Design Principles，設計原則）

所有系統必須可 Offline（離線） 運作
玩家不在線時，不得產生懲罰
UI（使用者介面）僅反映狀態，不決定結果

jouguan 的離線結算（Offline Progress，離線進度）建議做法：
- 以「產線每秒產出」與「倉庫上限」計算（可預測）
- 若滿倉則停止該資源增加（軟上限），避免懲罰
- 事件（Event，事件）不在玩家離線期間強制觸發負面結果；可改為上線後出現「需要處理」的提示

5.1 酒館來客結算（Customer Settlement，來客結算）

為支援「每幾小時回來一次」的節奏：
- 來客結算應以固定速率（可預測）進行：來客數/分鐘、每位消耗的料理/食材、每位產生的金幣與名聲
- 離線結算以「可服務來客數」為上限：缺料或滿倉都會自然停下（軟上限）
- 不做離線負面懲罰：離線期間不扣滿意度、不強制事件造成損失

5.2 離線支出與停止條件（Offline Expenses，離線支出）

你已確認的規則：離線期間可有支出，但只扣到 0，並在「扣到 0 或 24 小時」後停止運作。

具體化（可直接做進結算邏輯）：
- 離線結算時間：$t=\min(\text{離線時間}, 24\text{小時})$

- 支出（Expenses，支出）：本專案 MVP 採用「薪資（Wage，薪資）+ 店面維護費（Maintenance，維護）」
	- 離線期間支出最多扣到金幣為 0（不產生負債，不會變成負數）
	- 若金幣歸零，jouguan（酒館）停止服務來客（等同本輪結算停止）

MVP 支出規格（可預測、好平衡）：

1) 薪資（Wage，薪資）
- 目的：把「更多員工 = 更強」變成需要付費的長期承諾，防止金幣通膨
- 計算方式（建議）：
	- 已雇用員工數：staffCount（MVP 可先令 staffCount = staffCap）
	- 每小時薪資：$\text{wagePerHour}=25\times\text{staffCount}$
	- 每分鐘薪資：$\text{wagePerMin}=\text{wagePerHour}/60$

2) 店面維護費（Maintenance，維護）
- 目的：店面越大（座位/料理類別越高）越難養，避免擴充後一路無腦滾雪球
- 計算方式（建議）：
	- 店面擴充等級：shopExpansionLevel（起始 0；買店面擴充 I 後為 1，以此類推）
	- 每小時維護：$\text{maintPerHour}=15+10\times\text{shopExpansionLevel}$
	- 每分鐘維護：$\text{maintPerMin}=\text{maintPerHour}/60$

3) 本輪總支出（Total Expense，總支出）
- 每分鐘總支出：$\text{expensePerMin}=\text{wagePerMin}+\text{maintPerMin}$

4) 結算順序（Settlement Order，結算順序）
- 建議做法：每分鐘（或批次）先服務來客產生收入，再扣支出
	- 好處：玩家直覺更一致（先做生意，才付營運成本）
	- 同時符合你的停止條件：扣到 0 就停，不會負債

這樣的效果：
- 不會出現「玩家離線反而被倒扣到負債」的懲罰體驗
- 又能保留金幣沉沒（Resource Sink，資源沉沒）的必要性，避免金幣通膨

5.3 即時消耗結算（Instant Settlement，即時結算）

你已確認：來客來了即時消耗食材直接結算（不做料理庫存）。

定義：
- 每位來客（Customer，來客）會嘗試消耗「一份料理配方（Recipe，配方）」所需食材
- 若食材不足，該位來客無法被服務（不扣分，直接停止或跳過）
- 成功服務後，立即產生金幣（Gold，金幣）與名聲（Reputation，名聲）

6.1 MVP 結算規格（MVP Settlement Spec，MVP 結算規格）

本節是最小可玩版本（MVP，最小可玩）的“可實作規格”。

核心狀態（State，狀態）建議欄位：
- 金幣（Gold，金幣）：gold
- 名聲（Reputation，名聲）：rep
- 食材庫存（Ingredients Inventory，食材庫存）：meat/veg/grain/spice
- 座位上限（Seat Cap，座位上限）：seatCap
- 員工上限（Staff Cap，員工上限）：staffCap
- 已雇用員工數（Staff Count，員工數）：staffCount（MVP 可先等同 staffCap）
- 店面擴充等級（Shop Expansion Level，店面擴充等級）：shopExpansionLevel
- 料理類別數上限（Menu Category Cap，料理類別數上限）：menuCategoryCap
- 啟用菜單（Active Menu，啟用菜單）：activeMenu（指向 1~N 道料理）

來客生成（Customer Rate，來客速率）：
- 基礎來客速率（Base Rate，基礎速率）：baseCustomersPerMin
- 有效來客速率（Effective Rate，有效速率）：
	- $\text{customersPerMin}=\text{base} \times f(\text{seatCap}) \times f(\text{staffCap}) \times f(\text{rep})$

建議先用簡單可預測函式（避免複雜）：
- $f(\text{seatCap})=1$（MVP 可先把座位直接當硬上限，不要做倍率）
- $f(\text{staffCap})=1$（同上；先用硬上限的方式控制）
- $f(\text{rep})=1+\min(0.5, \text{rep}/100)$（名聲最多 +50% 來客）

服務上限（Service Cap，服務上限）：
- 每分鐘最多服務的來客數：$\min(\text{seatCap}, \text{staffCap})$
	- 用意：座位與員工任何一邊不足都會卡住（符合你的「核心上限」設計）

料理（Dishes，料理）MVP 範例：

| 料理 | 類別（Category，類別） | 配方（Recipe，配方） | 收入（Gold，金幣） | 名聲（Reputation，名聲） |
|---|---|---|---:|---:|
| 冒險者燉肉 | 主食 | 肉 2 + 菜 1 | 12 | 1 |
| 森林蔬湯 | 湯品 | 菜 2 + 穀物 1 | 6 | 3 |

菜單限制（Menu Category Cap，料理類別數上限）：
- 同一輪啟用的料理，其「類別」去重後不得超過 menuCategoryCap
- MVP 建議：menuCategoryCap=2 起步（符合「起始料理類別數量上限=2」）

離線結算流程（Offline Settlement Flow，離線結算流程）建議順序：
1) 計算 $t=\min(\text{離線時間}, 24\text{小時})$
2) 逐分鐘或用批次（Batch，批次）計算可服務來客數（受 seatCap/staffCap 與食材限制）
3) 扣支出直到金幣為 0 即停止
4) 回傳結算摘要（Summary，摘要）：總服務人數、各食材消耗、金幣/名聲增加、停止原因（缺料/金幣歸零/時間到）


6. 狀態與存檔規則（State & Save Rules，狀態與存檔規則）

存檔資料必須具備版本號（Save Version，存檔版本）
未知欄位必須被忽略，以確保向前相容。

需記錄（建議）：
- 已解鎖專案/已完成專案
- 產線指派狀態（人力/槽位分配）
- 倉庫內容（材料/加工品數量）
- 稅收/滿意度/治安等城鎮狀態

7. Skin 系統設計限制（Skin System，外觀系統）

Skin（主題／外觀配置）僅能影響：

顏色
字型
間距
動畫效果
顯示圖片

禁止：

修改數值
操作存檔
改變核心規則

8. 禁止事項（Hard Rules，硬性規則）

禁止即時反射操作（Reflex-based Gameplay，即時反應玩法）
禁止必須長時間在線才能取得最佳收益
禁止繞過核心循環的捷徑系統
禁止流派、技能、轉生等系統破壞核心循環或產生無法預測的複雜度

（jouguan 補充）
- 禁止把 jouguan 設計成主要「點擊刷資源」頁面
- 禁止金幣作為唯一資源導致所有系統被單一數值統一