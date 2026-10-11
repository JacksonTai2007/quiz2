# quiz2 · DESIGN.md

> 紙墨題庫。保留原站的閱讀節奏，只替換比賽與 IT 題目，仍是原站可練、可背、可核對的工具。

**狀態**：用戶已確認「按原站做」，並限定「只換題目和比賽」。直接按本規範實作，不另創視覺方向。
**比賽標題**：2026全澳中学生资讯科技知识问答比赛高中组模拟题。
**最高優先限制**：原站布局、配色、字體、動效與 8 模式不重設計。下面新增狀態只是新題型／待核對的必要相容適配。原有 CSS 數值優先。  
**範圍**：靜態 HTML + 原有 CSS + 原有 GSAP。只改題庫功能所需部分。  
**輸入證據**：已讀取 `work/reference-site/quiz/index.html`、`quiz.css`、`quiz.js`。未宣稱已做視覺截圖驗收。  
**成功判據**：準確顯示指定比賽標題；紙墨雙主題與原站結構對齊；424 條 IT 題目可使用；首訪載入 `latest2026`；單選、多選、填空可操作；歧義題明確不計分；桌面與手機均無內容遮擋。

## 1. Visual Theme & Atmosphere

**Style**：Paper & Ink / 紙墨閱讀介面。  
**Keywords**：暖紙、墨色、衬線、細框、克制、緊湊、可靠、繁體中文。  
**Tone**：比賽前可快速使用。不是科技產品宣傳頁。  
**Feel**：一本可翻閱、可標記的考前筆記。

**Interaction Tier**：L1。保留原站的局部轉場、數字動畫與卡片狀態反馈。沒有行銷型 hero、視差、pin、3D 或光標特效。  
**Dependencies**：沿用本地 `vendor/gsap/`。使用 GSAP、Flip、Observer、ScrollToPlugin、SplitText、DrawSVGPlugin。沒有 Lenis、ScrollTrigger 或新增框架。

### 原站結構審計

原站有 **4 個主畫面**，共用頂栏、答題卡抽屜、modal 與 toast：

1. `screen-home`：hero、題庫選擇、6 個統計格、進度、8 個模式、來源註記。
2. `screen-practice`：模式／計時／題數、進度、題卡、操作欄、答題卡。
3. `screen-result`：成績環、統計、操作、錯題回顧。
4. `screen-browse`：搜尋、狀態篩選、答案切換、題目列表。

保留 **順序、隨機、智能複習、錯題本、收藏、模考、背題、搜尋** 8 個模式。不增設 landing page。待核對題放入搜尋篩選與題卡，不增加第 5 個主畫面。

### 原站對齊 / 有意變更

| 項目 | 對齊原站 | 有意變更及原因 |
|---|---|---|
| 色板 | 暖紙、墨色、藍色操作、綠／紅答題狀態 | 新增待核對樣式，使用原 warning token |
| 結構 | 4 畫面、8 模式、桌面右欄／手機抽屜 | 來源題庫與狀態篩選擴充 |
| 容器 | 820px；桌面 1120px；答題卡 300px | 不擴成滿版 dashboard |
| 字體 | 原字體鏈、原字級、衬線題文／無衬線 UI | 不載入或替換新字體；新填空及解析遵既有 UI 字體 |
| 觸控 | 原站選項最小 52px、操作按鈕 44px、圖標 36px | 原元件不放大；新增填空確認使用既有 44px 按鈕 |
| 題型 | 原站單選選項卡 | 加多選明確確認、填空输入、未取圖片提示 |
| 評分 | 正確／錯誤／已答／收藏 | review 不進正確率、錯題本、模考分母 |
| 儲存 | localStorage、無登入 | `quiz2:` 隔離進度；`theme` 仍可與原站共用 |
| 動效 | 已有 GSAP 時間與方向 | 尊重 reduced motion；不新增簽名行銷特效 |

### 資訊與內容規則

首頁 H1 與文件 title 使用比賽指定名稱。窄屏允許標題自然換行；頂欄短名稱「IT 題庫」。不把長比賽名塞进顶栏。

- 424 是合併來源題目紀錄數。不是 424 道去重後知識點。
- 題目保留原題號、原選項順序與來源標籤。不能因去重丟失出處。
- 首訪預設 `latest2026`，對應 IT2026_初22。以資料實際 count 顯示題數。
- 下次可恢復使用者上次題庫；設定提供「回到最新題庫」。
- 答案是推導答案。不得標成「官方標準答案」。
- `review` 包含歧義、選項錯誤、無唯一答案、未取得圖片。統一顯示「待核對 · 不計分」。
- 不收集姓名、學號、email。不提交原 Google Forms。
- 外部來源鏈接明確標註開新分頁。

## 2. Color Palette & Roles

保留原站變數名。新樣式只加語義別名。所有 CSS 顏色都從 token 讀取。RGB 輔助值對應同一主題。

```css
:root {
  --bg: #f3f0e7;
  --bg-rgb: 243, 240, 231;
  --card: #f9f6ee;
  --card-rgb: 249, 246, 238;
  --text: #33302a;
  --text-rgb: 51, 48, 42;
  --soft: #5f594d;
  --faint: #6a6355;
  --rule: #cfc9ba;
  --rule-soft: #ddd7c8;
  --chip-bg: #eae5d8;
  --accent: #2b4f7e;
  --accent-rgb: 43, 79, 126;
  --ok: #2e7d4f;
  --ok-rgb: 46, 125, 79;
  --bad: #b5412c;
  --bad-rgb: 181, 65, 44;
  --warn: #b7861a;
  --warn-rgb: 183, 134, 26;
  --scrim-rgb: 30, 26, 20;
  --scrim: rgba(var(--scrim-rgb), .42);
  --shadow: 0 2px 10px rgba(var(--text-rgb), .08);
  --sel: rgba(var(--text-rgb), .16);
  --accent-soft: rgba(var(--accent-rgb), .10);
  --ok-soft: rgba(var(--ok-rgb), .13);
  --bad-soft: rgba(var(--bad-rgb), .12);
  --warn-soft: rgba(var(--warn-rgb), .14);
  --on-accent: #ffffff;
  --on-status: #ffffff;
  --clear: transparent;
  --surface: var(--card);
  --surface-alt: var(--chip-bg);
  --surface-hover: var(--card);
  --border: var(--rule);
  --border-hover: var(--soft);
  --text-secondary: var(--soft);
  --text-tertiary: var(--faint);
  --accent-hover: var(--text);
  --success: var(--ok);
  --error: var(--bad);
  --warning: var(--warn);
  --review: var(--soft);
  --review-bg: var(--warn-soft);
  --focus: var(--accent);
}
html[data-theme="dark"] {
  --bg: #211e19;
  --bg-rgb: 33, 30, 25;
  --card: #272319;
  --card-rgb: 39, 35, 25;
  --text: #d9d3c5;
  --text-rgb: 217, 211, 197;
  --soft: #a8a191;
  --faint: #9c9583;
  --rule: #453f33;
  --rule-soft: #37322a;
  --chip-bg: #2c2820;
  --accent: #8fb3e0;
  --accent-rgb: 143, 179, 224;
  --ok: #7fc79a;
  --ok-rgb: 127, 199, 154;
  --bad: #e08a75;
  --bad-rgb: 224, 138, 117;
  --warn: #e6b84f;
  --warn-rgb: 230, 184, 79;
  --scrim-rgb: 0, 0, 0;
  --scrim: rgba(var(--scrim-rgb), .55);
  --shadow: 0 2px 12px rgba(var(--scrim-rgb), .35);
  --sel: rgba(var(--text-rgb), .22);
  --accent-soft: rgba(var(--accent-rgb), .14);
  --ok-soft: rgba(var(--ok-rgb), .14);
  --bad-soft: rgba(var(--bad-rgb), .14);
  --warn-soft: rgba(var(--warn-rgb), .16);
  --on-accent: #1b1a17;
  --on-status: #ffffff;
}
```

**Color Rules**

- 正確、錯誤、待核對三者同時帶圖標與文字。不只靠色彩。
- 明確待核對題不套綠色答案高亮。顯示「參考作答」，避免看起來已驗證。
- 淺色 warning 原色只用邊框／圖標。小字用 `--soft`，不以黃字承載正文。
- 主要 CTA 是墨色實心。藍色只用連結、進度、選中與焦點。
- 深色維持暖墨。不是純黑／霓虹配色。
- 原站兩处白色選項字與深色 accent 字改成 `--on-status` / `--on-accent`，消除组件硬編碼。

## 3. Typography Rules

```css
/* 字型來源記錄，非部署新增依賴：
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&family=Noto+Serif+TC:wght@400;600;700&display=swap");
只換題目，實作保留以下原站本機 fallback stack，不啟用 import。 */

:root {
  --serif: Georgia, "Times New Roman", "Songti SC", "Noto Serif CJK TC", "Noto Serif CJK SC",
    "Source Han Serif TC", "Source Han Serif SC", PMingLiU, SimSun, "PingFang TC", "PingFang SC", serif;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "PingFang SC",
    "Hiragino Sans GB", "Microsoft JhengHei", "Microsoft YaHei", sans-serif;
  --mono-ui: ui-monospace, SFMono-Regular, Menlo, Consolas,
    "Liberation Mono", monospace;
  --q-size: 18px;
}
html[data-font="sm"] { --q-size: 16px; }
html[data-font="lg"] { --q-size: 20px; }
body { font: 16px/1.7 var(--serif); }
.stem { font-size: var(--q-size); line-height: 1.8; }
.opt { font-size: calc(var(--q-size) - 1px); line-height: 1.6; }
code, pre, kbd { font-family: var(--mono-ui); }
code { overflow-wrap: anywhere; }
pre { overflow-x: auto; max-width: 100%; }
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| 主畫面 H1 | serif | clamp(23px, 5.4vw, 34px) | 700 | 1.32 | .01em |
| 題幹 | serif | 16 / 18 / 20px | 400 | 1.8 | .02em |
| 模式卡標題 | serif | 16px | 700 | 1.3 | 0 |
| 章節小標題 | sans | 12px | 600 | 1.7 | .12em |
| 正文／解析 | sans | 16px | 400 | 1.7 | .02em |
| 模式與篩選標籤 | sans | 13–15px | 500–700 | 1.7 | .02em |
| 題目選項 | serif | 15–19px | 400 | 1.6 | 0 |
| 統計數字 | sans | 22px | 700 | 1.2 | -.01em |
| 成績主數字 | sans | 34px | 700 | 1 | 0 |
| 短出處／metadata | sans | 12–13px | 400 | 1.7 | .02em |
| Code / 快捷鍵 | mono | 14px / 12px | 400 | 1.7 | 0 |

**Typography Rules**

- 題文不縮成 dashboard 小字。沿用原字級與行高；新長解析可用 15–16px/1.7，短副註保留原樣。
- 保留 `tabular-nums` 在計時、題號、統計。
- 國際縮寫與程式碼完整保留。不得把 `<input>` 當 HTML 執行；用文字或 code 安全呈現。
- 引用原題明顯錯字時不悄悄改題。在解析指出問題。
- 字型載入失敗仍可閱讀。不可因等 webfont 阻塞題庫。
- **NEVER use**：Comic Sans、Papyrus、手寫展示字；不以英文字型單獨承載中文正文。

**Text Decoration**

- H1/H2/H3、題幹與正文：無漸變、無文字投影。
- 章節小標沿用細線延伸，不做彩色高光。
- 文字連結 hover 加底線。唯一數字動畫來自原站 countUp。

## 4. Component Stylings

以下是原站 CSS 的補充／對齊規則。部署時沿用 `quiz.css`，不要重建外觀。靜態卡片不偽裝可點擊；所有可互動组件都有 default、hover、active、focus、disabled。

### 共用狀態、按鈕與圖標按鈕

```css
:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}
button, a, input, select { -webkit-tap-highlight-color: var(--clear); }
.btn, .icon-btn, .mini {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; border: 1px solid var(--rule);
  background: var(--card); color: var(--text); cursor: pointer;
  font-family: var(--sans); touch-action: manipulation;
  transition: color .15s, border-color .15s, background-color .15s;
}
.btn { border-radius: 12px; padding: 0 16px; gap: 6px; }
.icon-btn { width: 36px; height: 36px; min-height: 36px; border-radius: 50%; padding: 0; }
.icon-btn.small, .mini { min-width: 30px; width: 30px; height: 30px; min-height: 30px; }
.btn.primary { background: var(--text); border-color: var(--text); color: var(--bg); }
.btn.accent { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.btn.danger { color: var(--bad); border-color: var(--bad); background: var(--clear); }
.btn.icon { width: 44px; flex: none; padding: 0; }
.btn.grow { flex: 1; }
.btn.is-fav { color: var(--warn); border-color: var(--warn); background: var(--warn-soft); }
.btn.is-fav svg { fill: currentColor; }
@media (hover: hover) {
  :is(.btn,.icon-btn,.mini):not(:disabled):not([aria-disabled="true"]):hover {
    border-color: var(--soft);
  }
}
:is(.btn,.icon-btn,.mini):not(:disabled):active { transform: translateY(1px); }
:is(.btn,.icon-btn,.mini):focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
:is(.btn,.icon-btn,.mini):disabled,
:is(.btn,.icon-btn,.mini)[aria-disabled="true"] { opacity: .4; cursor: default; transform: none; }
```

### 模式卡、題卡與列表卡

```css
.stat, .mode, .qcard, .review, .item {
  background: var(--card); border: 1px solid var(--rule-soft);
  box-shadow: var(--shadow); min-width: 0;
}
.stat, .review, .item { border-radius: 12px; }
.mode, .qcard { border-radius: var(--radius); }
.mode {
  text-align: left; min-height: 124px; padding: 14px;
  display: flex; flex-direction: column; gap: 6px; cursor: pointer;
  transition: border-color .15s, transform .15s;
}
.qcard { padding: 18px 18px 16px; }
.review, .item { padding: 12px 14px; }
.mode .ic { width: 34px; height: 34px; border-radius: 10px;
  background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; }
@media (hover: hover) { .mode:not(:disabled):hover {
  border-color: var(--soft); transform: translateY(-2px);
} }
.mode:not(:disabled):active { transform: translateY(0); }
.mode:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
.mode:disabled { opacity: .4; cursor: default; transform: none; }
.qcard[data-review="true"] { border-color: var(--warn); }
```

`.qcard`、`.stat`、列表 `li` 是静态容器。无 hover 抬升、active 或伪 disabled。里面的按钮承担交互状态。

### 題目選項：單選、多選與評分狀態

```css
.options { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.opt {
  display: flex; align-items: flex-start; gap: 12px; width: 100%;
  min-height: 52px; padding: 12px 14px; text-align: left;
  color: var(--text); background: var(--bg); border: 1px solid var(--rule);
  border-radius: 12px; cursor: pointer; font-family: var(--serif);
  transition: border-color .15s, background-color .15s;
}
.opt .key { flex: none; width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center; font: 700 13px/1 var(--sans);
  color: var(--soft); background: var(--card); border: 1px solid var(--rule); }
.qcard[data-type="multi"] .opt .key { border-radius: 6px; }
.opt .txt { min-width: 0; flex: 1; overflow-wrap: anywhere; }
@media (hover: hover) { .opt:not(:disabled):not(.is-picked):hover {
  border-color: var(--soft); background: var(--card);
} }
.opt:not(:disabled):active { border-color: var(--accent); }
.opt:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
.opt:disabled { cursor: default; }
.opt.is-picked { border-color: var(--accent); background: var(--accent-soft); }
.opt.is-picked .key { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.opt.is-correct { border-color: var(--ok); background: var(--ok-soft); }
.opt.is-correct .key { background: var(--ok); color: var(--on-status); border-color: var(--ok); }
.opt.is-wrong { border-color: var(--bad); background: var(--bad-soft); }
.opt.is-wrong .key { background: var(--bad); color: var(--on-status); border-color: var(--bad); }
.opt.is-dim { opacity: .55; }
.qcard[data-review="true"] .opt.is-picked { border-color: var(--accent); }
.feedback { margin-top: 14px; padding: 12px 14px; border-radius: 12px;
  font: 14px/1.5 var(--sans); overflow-wrap: anywhere; }
.feedback.ok { color: var(--ok); background: var(--ok-soft); }
.feedback.bad { color: var(--bad); background: var(--bad-soft); }
.feedback.memo { color: var(--accent); background: var(--accent-soft); }
.feedback.review { color: var(--soft); background: var(--review-bg); }
```

- 單選：保留原站點選作答。自動下一題遵設定。
- 多選：`aria-pressed` 表示選中；題型提示「多選，可選多項」；以「確認答案」才評分。不要第一個選項即提交。
- 模考：單選可改選。多選亦需確認。提交前不顯正誤。
- 預設不隨機重排選項。若开启，需要 remap answer indices；來源選項內的 A/B 字樣不可與顯示快捷鍵混淆。
- `review` 可選、可記錄已讀／收藏；永遠不套 correct/wrong 樣式。
- 背題：直接顯示答案與速記。review 顯示「參考作答／歧義說明」。

### 填空、搜尋與題庫選擇

```css
.search, .answer-input, .bank-row select, .field select {
  font: 16px/1.7 var(--sans); color: var(--text); background: var(--card);
  min-height: 44px; padding: 8px 12px; border: 1px solid var(--rule);
  border-radius: 10px; max-width: 100%; min-width: 0;
}
.search { height: 40px; min-height: 40px; }
.bank-row select, .field select { min-height: 0; padding: 6px 10px; font-size: 14px; border-radius: 8px; }
.answer-input { width: 100%; min-height: 44px; }
textarea.answer-input { min-height: 104px; resize: vertical; }
.search::placeholder, .answer-input::placeholder { color: var(--faint); }
@media (hover: hover) { :is(.search,.answer-input,select):not(:disabled):hover {
  border-color: var(--soft);
} }
:is(.search,.answer-input,select):not(:disabled):active { border-color: var(--accent); }
:is(.search,.answer-input,select):focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
:is(.search,.answer-input,select):disabled { opacity: .5; cursor: default; }
.answer-input[aria-invalid="true"] { border-color: var(--bad); }
.answer-input[readonly] { background: var(--chip-bg); }
.input-help { margin: 6px 0 12px; color: var(--soft); font: 15px/1.7 var(--sans); }
```

- 填空题保留所有題目。不能再用「選項少於 2 則丟棄」的 normalize 規則。
- 可可靠比較的短答案接受明確列出的別名、大小寫與首尾空白正規化。
- 長敘述題或多種合法回答無法客觀比對時，轉成 review 或明確自評。不把文字匹配失敗當知識錯誤。
- 搜尋覆蓋題號、題幹、選項、答案、速記、來源。入力中文字時等 compositionend 再篩選。
- 載入失敗顯示原因與「重試」。不要永久停在「正在載入」。

### 導航、連結、標籤與篩選

```css
.topbar { position: sticky; top: 0; z-index: 40;
  background: color-mix(in srgb, var(--bg) 92%, var(--clear));
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--rule); }
.topbar .in { max-width: var(--maxw); height: 56px; margin: auto;
  padding: 0 16px; display: flex; gap: 8px; align-items: center; }
.brand { display: inline-flex; gap: 10px; align-items: center; color: var(--text); font-weight: 700; }
.brand:hover { color: var(--accent); }
.brand:active { color: var(--soft); }
.brand:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
a[aria-disabled="true"] { opacity: .4; cursor: default; pointer-events: none; }
.text-link { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.text-link:hover { color: var(--text); }
.text-link:active { color: var(--soft); }
.text-link:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
.chip, .seg button {
  padding: 6px 12px; font: 13px/1.7 var(--sans);
  color: var(--soft); background: var(--card); border: 1px solid var(--rule);
  border-radius: 999px; cursor: pointer;
}
.seg button { min-height: 38px; border-radius: 0; }
.chip:hover, .seg button:hover { color: var(--text); border-color: var(--soft); }
.chip:active, .seg button:active { background: var(--chip-bg); }
.chip:focus-visible, .seg button:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
.chip[aria-pressed="true"], .seg button[aria-pressed="true"] {
  color: var(--bg); background: var(--text); border-color: var(--text);
}
.chip:disabled, .seg button:disabled { opacity: .4; cursor: default; }
.tag { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px;
  border-radius: 999px; background: var(--chip-bg); color: var(--soft); font: 12px/1.7 var(--sans); }
.tag.review { background: var(--review-bg); color: var(--soft); border: 1px solid var(--warn); }
```

頂欄不做 scroll 隱藏／縮小；它本來就是 sticky。靜態 `.tag` 不可點；可點的來源或篩選用 button/anchor，繼承完整狀態。

### 答題卡、圖片、對話框與空狀態

```css
.sheet { background: var(--card); border: 1px solid var(--rule);
  border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(42px, 1fr)); gap: 8px; }
.cell { min-height: 40px; border-radius: 10px; border: 1px solid var(--rule);
  background: var(--bg); color: var(--soft); font: 600 13px/1 var(--sans); cursor: pointer; }
.cell:hover { border-color: var(--soft); }
.cell:active { background: var(--chip-bg); }
.cell:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
.cell:disabled { opacity: .4; cursor: default; }
.cell.done { background: var(--chip-bg); color: var(--text); }
.cell.ok { color: var(--ok); border-color: var(--ok); background: var(--ok-soft); }
.cell.bad { color: var(--bad); border-color: var(--bad); background: var(--bad-soft); }
.cell.review { color: var(--soft); border-style: dashed; border-color: var(--warn); background: var(--review-bg); }
.cell.cur { outline: 2px solid var(--accent); outline-offset: 1px; }
.question-media { margin: 0 0 16px; }
.question-media img { max-width: 100%; height: auto; display: block; border-radius: 8px; }
.media-unavailable, .empty, .load-error { padding: 16px; border: 1px dashed var(--rule);
  border-radius: 12px; background: var(--card); color: var(--soft); font: 16px/1.7 var(--sans); }
.modal { position: fixed; inset: 0; z-index: 70; background: var(--scrim);
  display: flex; align-items: flex-end; justify-content: center; }
.modal .box { width: 100%; max-width: 540px; max-height: 88dvh; overflow: auto;
  background: var(--card); border: 1px solid var(--rule); border-radius: 18px 18px 0 0;
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom)); box-shadow: var(--shadow); }
```

- 圖片有 alt 與來源。未取到圖時顯示實際限制，不用純色偽圖片。
- 答題卡 aria-label 讀出来源、原題號、已答／待核對／收藏；顯示題號不使用巨大的 Google Forms ID。
- review 图例独立，不能与 wrong 同色同文案。
- 對話框鎖定焦點、Esc 關閉、關閉後還原焦點。背景 inert。
- 模考結束前確認一次。題庫切換未提交模考時需明確提示。
- 「無錯題」「未收藏」「搜尋無結果」「無可計分題」提供短原因與返回／清除篩選。
- Toast 用 `role="status"`；錯誤訊息持續存在於畫面，不只短暫 Toast。

## 5. Layout Principles

**Container**
- 手機／中等視口 `--maxw: 820px`；左右 16px。
- 桌面 `--maxw-wide: 1120px`；左右仍 16px。
- 頂欄與首頁閱讀寬度保持 820px。題目桌面雙欄才用 1120px。
- 题卡正文的 available width 必須使用 `minmax(0,1fr)`；程式碼和長 URL 不撐破網格。

**Spacing Scale**：4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 30px。不是大 section padding 的展示頁。

```css
:root {
  --maxw: 820px; --maxw-wide: 1120px; --radius: 14px;
  --space-xs: 4px; --space-sm: 8px; --space-md: 12px;
  --space-lg: 16px; --space-xl: 24px;
}
* { box-sizing: border-box; }
main#app { max-width: var(--maxw); margin: 0 auto; padding: 20px 16px 110px; }
.hero { padding: 6px 0 8px; }
.stats { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; margin: 18px 0 14px; }
.modes { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.toolbar, .bank-row, .qmeta, .legend { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.list, .review-list { display: grid; gap: 10px; list-style: none; padding: 0; }
.section-title { display: flex; gap: 10px; align-items: center; margin: 24px 0 10px; }
.section-title::after { content: ""; flex: 1; height: 1px; background: var(--rule-soft); }
```

### 首頁內容順序

題庫標題 → 「最新 2026 / 全部 IT / 各來源」選擇 → 來源／推導答案說明 → 6 統計格 → 已練進度 → 8 模式 → 來源與本機儲存註記。待核對數以小標籤顯示；不要擠出主要模式。

### 計數與評分

- 首頁顯示已練題數、正確率、錯題、收藏、連續天數、今日作答。
- 待核對可計已讀，不計 correct/wrong；正確率分母只含可判定作答。
- 模考預設只抽可計分題。題數不足時自動減至實際可用數，開始前說明。
- 如使用者顯式包含 review，視為附加閱讀；成績仍排除。結果顯示「可計分 N 題、待核對 M 題」。
- 可計分分母為 0 時顯示「— / 無可計分題」。不能顯示 NaN、0% 失敗或 100% 正確。
- 錯題本只接收客觀錯題；兩次連續答對移出，保留原站機制。
- 智能複習保留錯題／新題／久未練權重。review 不被記為錯題權重。
- 全部題庫與單一來源使用穩定全局 key，避免原表單重複數字 ID 引起碰撞；顯示原題號。

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | 無陰影，細線 | 頂欄、進度、來源、標籤 |
| Subtle | 原 `--shadow` | 統計、模式、題卡、列表 |
| Elevated | 同色板的柔陰影 + scrim | modal、手機答題卡抽屜 |
| Focus | 2px outline，3px offset | 所有鍵盤焦點 |

```css
:root { --shadow-elevated: 0 12px 32px rgba(var(--scrim-rgb), .16); }
html[data-theme="dark"] { --shadow-elevated: 0 12px 32px rgba(var(--scrim-rgb), .4); }
.modal .box { box-shadow: var(--shadow-elevated); }
.sheet { box-shadow: var(--shadow); }
```

只保留頂欄、底部操作欄小面積 `blur(10px)`。不給題卡、列表或整個滾動區加毛玻璃。深色以邊框維持分層，不用發光。

## 7. Animation & Interaction

**Motion Philosophy**：動效解釋換頁、換題與作答，不拖延讀題。  
**Tier**：L1。保留原站已存在的應用型轉場，沒有 L2/L3 行銷動效。  
**Dependencies**：只載入現成的本地 GSAP 檔。若 GSAP 不可用，題庫仍可用立即 DOM 切換與 CSS 狀態。不要把動畫失敗當題庫載入失敗。

```html
<script src="./vendor/gsap/gsap.min.js"></script>
<script src="./vendor/gsap/Flip.min.js"></script>
<script src="./vendor/gsap/Observer.min.js"></script>
<script src="./vendor/gsap/ScrollToPlugin.min.js"></script>
<script src="./vendor/gsap/SplitText.min.js"></script>
<script src="./vendor/gsap/DrawSVGPlugin.min.js"></script>
```

### 原站 Motion Audit

| Trigger | Driver | Elements | Effect | Timing |
|---|---|---|---|---|
| 4 畫面切換 | GSAP timeline | screen、data-anim | 舊淡出 y -6；新 y 12 → 0；子項 stagger | .14s / .30s / .36s，stagger .04s |
| 首次首頁 | SplitText | hero-title 字元 | yPercent 105 → 0，完成 revert | .70s，stagger .022s |
| 首頁統計 | GSAP object tween | data-count | countUp 整數 | .80s |
| 換題 | GSAP timeline | qcard、opt | 水平淡出／入；選項 y10 | .13s / .32s / .30s，stagger .05s |
| 答對 | GSAP timeline | picked opt、mark | 1 → 1.02 → 1，對號入場 | .12s + .40s |
| 答錯 | GSAP keyframes | picked opt | x -8,7,-5,3,0；正解提示 | 5 × .07s |
| 收藏／主題 | GSAP | button | 收藏小彈跳；主題圖標旋轉 | .50s / .45s |
| 開答題卡 | GSAP + ScrollToPlugin | scrim、sheet | yPercent 100 → 0；對準目前題 | .20s / .40s / .30s |
| 篩選 | Flip | visible list items | 位置平滑重排、淡出入 | .35s |
| Modal | GSAP | scrim、box | 小幅位移／opacity | .20s / .32s |
| Toast | GSAP timeline | toast | y12 → 0 → y6 | .25s，停留 1.8s |

保留以上原站體驗。review 不播放答錯抖動；只展開中性說明。新的多選確認／填空確認使用同一反馈機制，不添新特效。原站慶祝粒子不擴增；高頻練習預設不使用。

### Base Setup 與減少動態

系統減少動態是上限；即使使用者選「開啟」，也不覆蓋系統 reduce。這是對原 `motionOn` 的有意修正。

```js
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canAnimate = () => !reducedMotion.matches && settings.motion !== "off";
const duration = value => canAnimate() ? value : 0;
function enterScreen(screen) {
  if (!window.gsap || !canAnimate()) {
    screen.style.removeProperty("opacity");
    screen.style.removeProperty("transform");
    return;
  }
  gsap.fromTo(screen, { autoAlpha: 0, y: 12 }, {
    autoAlpha: 1, y: 0, duration: .3, ease: "power3.out",
    clearProps: "opacity,visibility,transform"
  });
}
function animateCounter(el, target) {
  if (!window.gsap || !canAnimate()) { el.textContent = String(target); return; }
  const counter = { value: 0 };
  gsap.to(counter, { value: target, duration: .8, ease: "power2.out",
    onUpdate: () => { el.textContent = String(Math.round(counter.value)); } });
}
```

實作沿用原 `show()`、`renderQuestion()`、`animateFeedback()`，所有 duration、delay、stagger 必須經相同開關。不要留下原 `Flip.from()`、`SplitText` 的固定時間繞過 reduce。

### 入場、Hover、換題與捲動

- 頁面轉場只操作 opacity / transform。不能對移動元件做 blur。
- 新畫面先在隱藏状態 render，切換後將焦點移到該畫面標題／題幹。不要每題搶走正在輸入的焦點。
- 快速換題先 kill 舊 timeline，最後 clearProps。不可堆出多個題卡。
- 觸控 Observer 只聽 touch，`preventDefault:false`；保留垂直捲動。
- 填空、textarea、程式碼選字時不觸發左右滑題；未確認多選／未提交填空時不能被手勢丟失。
- 模考不自動下一題，直到明確選擇或確認完成。
- 搜尋資料篩選正常同步更新。動畫只處理可見列表；大量結果不為 424 條同時做 stagger。
- 不加 scroll reveal、parallax 或 pin。頂欄維持 sticky。
- 原生捲動。定位答題卡可使用現成 ScrollToPlugin；reduce 時立即定位。

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .mode:hover { transform: none; }
}
html[data-motion="off"] .mode:hover { transform: none; }
```

### 快捷鍵與安全操作

沿用原站按鍵說明。單選 A–G 可作答；多選 A–G 只切換，Enter 確認。輸入欄位 focus 時不攔截文字按鍵。左／右換題、Esc 關 modal／抽屜，不能直接交卷。收藏用明確按鈕與 aria-pressed。來源 URL 使用安全 link，不將題庫文字插入可執行 HTML。

## 8. Do's and Don'ts

### Do

1. 沿用紙墨 token、細框、原半徑與原畫面結構。
2. 保留 8 模式與本機儲存。進度 key 与外交原題庫隔離。
3. 首訪優先 2026；顯示當前來源與題數。
4. 題目與選項完整顯示。手機可自然換行。
5. 歧義以「待核對 · 不計分」標記，在題卡、答題卡、列表、結果一致。
6. 模考只對明確可計分題評分；分母清楚。
7. 為多選和填空提供確定提交操作。
8. 圖片未取得保留題目，明確說明，不丟題。
9. 長解析可折疊，但答案狀態與一行速記先可見。
10. 所有鍵盤焦點清晰；既有小圖標不重畫。新增主要操作 touch target 至少 44×44px。
11. 測試 360px 手機、1024px 雙欄臨界值、1440px 桌面，兩種主題。
12. 真實題库完整性與答題行為優先於視覺裝飾。

### Don't

1. ❌ 不加入巨型 marketing hero、CTA funnel、3D、pin 或自定義光標。
2. ❌ 不改成 neon、冷白 SaaS、卡片彩虹或滿版 dashboard。
3. ❌ 不在題庫選項區硬寫 hex；只用 token。
4. ❌ 不把推導答案稱為官方答案。
5. ❌ 不將 review 計成答錯、正確或納入正確率分母。
6. ❌ 不猜未取得圖片；不以原站／來源表單登入身份換取圖片。
7. ❌ 不只靠紅綠辨識狀態；不以小黃字承載重要提示。
8. ❌ 不让第一個多選選項立即鎖題；不以必填姓名當使用門檻。
9. ❌ 不因沒有選項而丟棄填空題；不强制「缺 answer 就是 A」。
10. ❌ 不用資料中的 Google Forms 數字 ID 作可讀題號或唯一跨來源 key。
11. ❌ 不讓手機固定操作欄蓋住解析／輸入或鍵盤焦點。
12. ❌ 不為 424 個列表項同時做數字／入場動畫。
13. ❌ 不強制 CDN 動畫或 webfont 可用才顯示題庫。
14. ❌ 不宣稱做過未執行的截圖、功能或響應式測試。

## 9. Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile | <640px | 3 統計欄、2 模式欄；單題欄；底部操作；答題卡抽屜；modal 底部面板 |
| Tablet | 640–1023px | 6 統計欄；≥720px 4 模式欄；仍是固定底部操作／抽屜；modal 居中 |
| Desktop | ≥1024px | 1120px 寬；主欄 + 300px 常駐答題卡，gap24px；操作欄回文流 |
| Wide | ≥1440px | 保持最大寬度，不繼續放大字／卡片 |

**Touch Targets**：題目選項最少 52px；主要操作與新填空確認至少 44×44px。原站圖標 36px／小圖標 30px、答題格 40px 保留，以免只換內容時改動版面。  
**Collapsing Strategy**：次要筛选換行。手機答題卡為底部抽屜。metadata 自然換行。不要水平捲動整個頁面。程式碼區才允許局部横向捲動。

```css
html { -webkit-text-size-adjust: 100%; color-scheme: light; }
html[data-theme="dark"] { color-scheme: dark; }
body { margin: 0; min-height: 100dvh; background: var(--bg); color: var(--text); }
img, svg { max-width: 100%; }
.actions {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  background: color-mix(in srgb, var(--bg) 94%, var(--clear));
  backdrop-filter: blur(10px); border-top: 1px solid var(--rule);
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
}
.actions .in { display: flex; gap: 8px; max-width: var(--maxw); margin: auto; }
@media (max-width: 1023px) {
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
    border-radius: 18px 18px 0 0; max-height: 78dvh; transform: translateY(100%); }
  .sheet-body { overflow-y: auto; padding: 12px 14px; }
  .sheet-foot { padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
  .toolbar .search { flex-basis: 100%; }
}
@media (min-width: 640px) {
  .stats { grid-template-columns: repeat(6,minmax(0,1fr)); }
  .modal { align-items: center; padding: 20px; }
  .modal .box { border-radius: 16px; padding: 22px; }
}
@media (min-width: 720px) {
  .modes { grid-template-columns: repeat(4,minmax(0,1fr)); }
}
@media (min-width: 1024px) {
  main#app { max-width: var(--maxw-wide); padding-bottom: 60px; }
  .practice-grid { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 24px; align-items: start; }
  .p-main { min-width: 0; }
  .sheet { position: sticky; top: 74px; max-height: calc(100dvh - 96px); }
  .sheet-body { overflow-y: auto; }
  .actions { position: static; background: var(--clear); border: 0;
    padding: 16px 0 0; backdrop-filter: none; }
  #btn-sheet, #btn-sheet-close { display: none; }
}
@supports not (background: color-mix(in srgb, black 50%, white)) {
  .topbar, .actions { background: var(--bg); }
}
```

**手機額外要求**

- 虛擬鍵盤開啟後填空仍可捲入可視區。输入 focus 时允许操作栏回文流或利用 VisualViewport 補償，不以固定栏覆盖输入。
- iOS input 字號至少 16px，避免自動放大。
- 首頁 brand 保留「← 首頁」與「IT 題庫」；窄屏不能被三個 icon 擠掉。
- 320px–360px 模式仍可兩欄；説明自然换行。操作栏三个44px按钮加主CTA可容纳。
- 深色／淺色切換不改元件寬度，首次繪製前確定主題，避免閃白。

**Phase C 驗收清單**

「原站數值保留」是本次用戶明確要求，優先於模板的可選字型與觸控尺寸現代化建議。不能為滿足泛用設計規範偷偷改版。

1. 424 條來源記錄與所有題型完整保留；最新題庫首次預設正確。
2. 單選、多選、填空、背題、搜尋、收藏、錯題、模考各做一個定向例子。
3. review 的結果／分母／錯題更新都不計分；零可計分題沒有 NaN。
4. 載入失敗、圖片缺失、無收藏、儲存失敗皆有清楚出口。
5. Desktop / Mobile、light / dark、reduced-motion 一次實際驗收。
6. 原站差異審計：色板、字體、容器、8 模式、4 畫面、動效；逐项列出對齊與上述有意變更。

