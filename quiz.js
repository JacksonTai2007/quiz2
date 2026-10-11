/* ============================================================
   題庫練習 — quiz.js
   零依賴（除 GSAP）、零建置。所有動效遵循 GSAP 官方 skills 的建議：
   - 只動 transform / opacity（x, y, scale, autoAlpha），不動 layout 屬性
   - 多步驟一律用 timeline + position parameter，不用 delay 串接
   - gsap.matchMedia() 處理 prefers-reduced-motion 與手機 / 桌面差異
   - Flip 做列表篩選的版面過渡、Observer 做手勢滑動、ScrollTo 做捲動、
     SplitText 做標題揭示、DrawSVG 畫成績環
   ============================================================ */
(function () {
  "use strict";

  if (!window.gsap || ["Flip", "Observer", "ScrollToPlugin", "SplitText", "DrawSVGPlugin"].some((name) => !window[name])) {
    document.getElementById("app").innerHTML = '<p class="empty">動畫引擎載入失敗，請重新整理頁面。</p>';
    return;
  }
  gsap.registerPlugin(Flip, Observer, ScrollToPlugin, SplitText, DrawSVGPlugin);
  gsap.defaults({ ease: "power2.out", duration: 0.4 });

  /* ---------- 小工具 ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const SITE_TITLE = "2026全澳中学生资讯科技知识问答比赛高中组模拟题";
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = (d) => { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const fmtClock = (s) => Math.floor(s / 60) + ":" + pad(s % 60);
  const fmtDur = (s) => (s >= 60 ? Math.floor(s / 60) + " 分 " : "") + (s % 60) + " 秒";
  const fmtDate = (t) => { const d = new Date(t); return d.getMonth() + 1 + "/" + d.getDate(); };

  /* ---------- 題型與判分（純函數） ---------- */
  const normalizeText = (s) => String(s == null ? "" : s).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const expectedIndices = (q) => q.type === "multi" ? q.answers : q.type === "single" && Number.isInteger(q.answer) ? [q.answer] : [];
  const isScorable = (q) => !!q && (q.type === "single" || q.type === "multi" || q.type === "text");
  function gradeAnswer(q, value) {
    if (!isScorable(q)) return null;
    if (q.type === "text") return q.acceptedAnswers.some((a) => normalizeText(a) === normalizeText(value));
    if (q.type === "single") return Number.isInteger(value) && value === q.answer;
    if (!Array.isArray(value) || value.some((i) => !Number.isInteger(i))) return false;
    const picked = [...new Set(value)].sort((a, b) => a - b), correct = q.answers.slice().sort((a, b) => a - b);
    return picked.length === correct.length && picked.every((v, i) => v === correct[i]);
  }
  function formatValue(q, value, order) {
    if (value == null) return "未作答";
    if (q.type === "text") return String(value);
    const indices = Array.isArray(value) ? value : [value];
    return indices.map((i) => {
      const vi = order ? order.indexOf(i) : i;
      return (LETTERS[vi] || String(vi + 1)) + ". " + (q.options[i] || "");
    }).join("；");
  }
  function answerLabel(q, order) {
    if (q.type === "review") return q.answerText || "原題有歧義，請閱讀速記與核對說明。";
    if (q.type === "text") return q.answerText || q.acceptedAnswers[0] || "";
    return formatValue(q, q.type === "multi" ? q.answers : q.answer, order);
  }
  function normalizeQuestion(q, i) {
    if (!q || typeof q !== "object") throw new Error("第 " + (i + 1) + " 題格式無效");
    const id = q.id == null ? i + 1 : q.id;
    const stem = String(q.stem || q.question || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !stem) throw new Error("第 " + (i + 1) + " 題缺少有效題號或題幹");
    const options = Array.isArray(q.options) ? q.options.map((o) => typeof o === "string" ? o : String((o && o.text) || "")) : [];
    const validIndex = (a) => Number.isInteger(a) && a >= 0 && a < options.length;
    let answer = typeof q.answer === "string" && /^[A-Z]$/i.test(q.answer.trim()) ? LETTERS.indexOf(q.answer.trim().toUpperCase()) : q.answer;
    let type = ["single", "multi", "text", "review"].includes(q.type) ? q.type : "single";
    const answers = Array.isArray(q.answers) ? [...new Set(q.answers)] : [];
    const answerText = String(q.answerText || "");
    const acceptedAnswers = (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length ? q.acceptedAnswers : type === "text" && answerText ? [answerText] : []).filter((a) => a != null && (typeof a === "string" || typeof a === "number")).map(String).filter((a) => normalizeText(a));
    // 不可信答案保留題目供閱讀，絕不以位元運算把 null 變成選項 A。
    if ((type === "single" && (options.length < 2 || !validIndex(answer))) ||
        (type === "multi" && (options.length < 2 || !answers.length || !answers.every(validIndex))) ||
        (type === "text" && !acceptedAnswers.length)) type = "review";
    if (!validIndex(answer)) answer = null;
    return { id, stem, options, answer, answers: answers.filter(validIndex), type, answerText,
      acceptedAnswers, explain: String(q.explain || q.explanation || ""),
      sourceName: String(q.sourceName || ""), sourceUrl: String(q.sourceUrl || ""),
      sourceNumber: q.sourceNumber == null ? "" : String(q.sourceNumber), sourceStatus: String(q.sourceStatus || "推導答案") };
  }
  /* ---------- 題型與判分結束 ---------- */

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("無法儲存進度：瀏覽器儲存空間不可用"); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  const ICONS = {
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    spark: '<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    cross: '<path d="M18 6L6 18M6 6l12 12"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    play: '<path d="M7 4l12 8-12 8z"/>',
  };
  const icon = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + "</svg>";

  /* ---------- 設定 & 動效偏好 ---------- */
  const DEFAULTS = { autoNext: "fast", shuffle: false, font: "md", motion: "auto", examCount: 50, examMinutes: 30, browseAnswers: true };
  const settings = Object.assign({}, DEFAULTS, store.get("quiz2:settings", {}));
  const saveSettings = () => store.set("quiz2:settings", settings);
  const applySettings = () => { document.documentElement.dataset.font = settings.font; };

  // gsap.matchMedia：系統「減少動態」與手機版面；條件變動時自動清理
  const MOTION = { reduce: false, mobile: false };
  const mm = gsap.matchMedia();
  mm.add({ reduce: "(prefers-reduced-motion: reduce)", mobile: "(max-width: 1023px)" }, (ctx) => {
    MOTION.reduce = !!ctx.conditions.reduce;
    MOTION.mobile = !!ctx.conditions.mobile;
    return () => { MOTION.reduce = false; MOTION.mobile = false; };
  });
  const motionOn = () => (settings.motion === "on" ? true : settings.motion === "off" ? false : !MOTION.reduce);
  const D = (x) => (motionOn() ? x : 0);   // 時長 / stagger 統一經過這裡，關動畫時全部歸零

  /* ---------- 狀態 ---------- */
  let banksIndex = [], bank = null, qById = new Map();
  let records = {}, progress = {}, exams = [], days = {};
  let session = null;
  let current = "home";

  const K = () => ({ rec: "quiz2:" + bank.id + ":records", prog: "quiz2:" + bank.id + ":progress", exams: "quiz2:" + bank.id + ":exams", days: "quiz2:" + bank.id + ":days" });
  function loadState() { const k = K(); records = store.get(k.rec, {}); progress = store.get(k.prog, {}); exams = store.get(k.exams, []); days = store.get(k.days, {}); sanitizeState(); }
  function sanitizeState() {
    const object = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
    records = object(records); progress = object(progress); days = object(days); exams = Array.isArray(exams) ? exams.filter((e) => e && Number.isFinite(e.score) && Number.isFinite(e.total)).slice(-30) : [];
    Object.keys(records).forEach((id) => {
      if (!qById.has(+id)) { delete records[id]; return; }
      const r = object(records[id]);
      ["seen", "correct", "wrong", "streak", "last"].forEach((k) => { r[k] = Number.isFinite(r[k]) && r[k] >= 0 ? r[k] : 0; });
      r.fav = !!r.fav; r.mastered = !!r.mastered; r.lastOk = typeof r.lastOk === "boolean" ? r.lastOk : null;
      if (!isScorable(qById.get(+id))) { r.correct = 0; r.wrong = 0; r.streak = 0; r.mastered = false; r.lastOk = null; }
      records[id] = r;
    });
    progress.seq = Number.isInteger(progress.seq) && progress.seq >= 0 ? progress.seq : 0;
    Object.keys(days).forEach((k) => { if (!Number.isFinite(days[k]) || days[k] < 0) delete days[k]; });
  }
  const saveRecords = () => store.set(K().rec, records);
  const saveProgress = () => store.set(K().prog, progress);
  const saveExams = () => store.set(K().exams, exams);
  const saveDays = () => store.set(K().days, days);
  const rec = (id) => records[id] || (records[id] = { seen: 0, correct: 0, wrong: 0, streak: 0, last: 0, lastOk: null, fav: false, mastered: false });
  const isWrong = (q) => { const r = records[q.id]; return isScorable(q) && !!r && r.wrong > 0 && !r.mastered; };
  const isFav = (q) => !!(records[q.id] && records[q.id].fav);
  const isNew = (q) => !(records[q.id] && records[q.id].seen > 0);

  /* ---------- 題庫載入 ---------- */
  function normalizeBank(b) {
    if (!b || typeof b !== "object") throw new Error("題庫格式無效");
    const qs = Array.isArray(b.questions) ? b.questions : [];
    b.questions = qs.map(normalizeQuestion);
    if (!b.questions.length) throw new Error("題庫沒有可讀取的題目");
    if (new Set(b.questions.map((q) => q.id)).size !== b.questions.length) throw new Error("題庫有重複題號");
    b.count = b.questions.length;
    b.title = b.title || "題庫";
    b.short = b.short || b.title;
    return b;
  }
  async function loadIndex() {
    banksIndex = [];
    try {
      const r = await fetch("./data/index.json", { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      banksIndex = ((await r.json()).banks || []).slice();
    } catch (e) { /* 沒有 index 也可以只靠自訂題庫 */ }
    const custom = store.get("quiz2:customBanks", {});
    Object.keys(custom).forEach((id) => banksIndex.push({ id, title: custom[id].title, short: custom[id].short, count: (custom[id].questions || []).length, custom: true }));
  }
  async function loadBank(id) {
    cancelQuestionTransition(); cancelAutoNext(); stopTimer();
    const entry = banksIndex.find((b) => b.id === id) || banksIndex[0];
    if (!entry) throw new Error("找不到任何題庫（data/index.json）");
    let data;
    if (entry.custom) data = store.get("quiz2:customBanks", {})[entry.id];
    else { const r = await fetch("./data/" + entry.file, { cache: "no-cache" }); if (!r.ok) throw new Error("HTTP " + r.status); data = await r.json(); }
    bank = normalizeBank(data);
    bank.id = entry.id;
    qById = new Map(bank.questions.map((q) => [q.id, q]));
    loadState();
    store.set("quiz2:lastBank", bank.id);
    document.title = SITE_TITLE + " · " + bank.short;
  }

  /* ---------- 畫面切換（timeline 串接：舊畫面淡出 → 新畫面滑入 → 子元素 stagger） ---------- */
  const screens = { home: $("#screen-home"), practice: $("#screen-practice"), result: $("#screen-result"), browse: $("#screen-browse") };
  let screenTl = null;
  function show(name, render, after) {
    if (name !== "practice") cancelQuestionTransition();
    if (screenTl) screenTl.kill();
    const to = screens[name];
    const from = current !== name ? screens[current] : null;
    if (render) render();                 // 先在隱藏狀態把內容準備好
    screenTl = gsap.timeline({ onComplete: () => { screenTl = null; if (after) after(); } });
    if (from) screenTl.to(from, { autoAlpha: 0, y: -6, duration: D(0.14), ease: "power2.in" });
    screenTl.add(() => {
      Object.keys(screens).forEach((k) => { const s = screens[k]; if (s !== to) { s.hidden = true; gsap.set(s, { clearProps: "opacity,visibility,transform" }); } });
      to.hidden = false; current = name; document.body.dataset.screen = name; window.scrollTo(0, 0);
    });
    screenTl.fromTo(to, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: D(0.3), ease: "power3.out", clearProps: "opacity,visibility,transform" });
    const kids = $$("[data-anim]", to);
    if (kids.length) screenTl.fromTo(kids, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: D(0.36), stagger: D(0.04), ease: "power3.out", clearProps: "opacity,visibility,transform" }, "<0.04");
  }

  /* ---------- 首頁 ---------- */
  const MODES = [
    { id: "seq", name: "順序練習", tone: "accent", icon: "list", desc: "按題號逐題作答，自動記住進度。" },
    { id: "random", name: "隨機練習", tone: "accent", icon: "shuffle", desc: "打亂題序，避免靠位置記答案。" },
    { id: "smart", name: "智能複習", tone: "ok", icon: "spark", desc: "優先出錯題、沒做過和太久沒碰的題，每輪 20 題。" },
    { id: "wrong", name: "錯題本", tone: "bad", icon: "xcircle", desc: "只練做錯的題，連續答對 2 次自動移出。" },
    { id: "fav", name: "收藏夾", tone: "warn", icon: "star", desc: "練習你標記過的題目。" },
    { id: "exam", name: "模擬考試", tone: "accent", icon: "clock", desc: "隨機抽題、限時作答，交卷後統一評分。" },
    { id: "memo", name: "背題模式", tone: "plain", icon: "eye", desc: "直接顯示答案，快速過一遍。" },
    { id: "browse", name: "瀏覽 / 搜尋", tone: "plain", icon: "search", desc: "全部題目列表，關鍵字或題號搜尋。" },
  ];
  const MODE_NAME = {}; MODES.forEach((m) => { MODE_NAME[m.id] = m.name; }); MODE_NAME.redo = "錯題重練";

  function calcStreak() {
    let n = 0; const d = new Date();
    if (!days[todayKey(d)]) d.setDate(d.getDate() - 1);   // 今天還沒練，從昨天起算
    while (days[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function homeStats() {
    const qs = bank.questions; let seen = 0, c = 0, w = 0;
    qs.forEach((q) => { const r = records[q.id]; if (r && r.seen) { seen++; if (isScorable(q)) { c += r.correct; w += r.wrong; } } });
    return {
      total: qs.length, seen, answered: c + w, acc: c + w ? Math.round((c / (c + w)) * 100) : 0,
      wrong: qs.filter(isWrong).length, fav: qs.filter(isFav).length, streak: calcStreak(),
      today: days[todayKey()] || 0, lastExam: exams[exams.length - 1],
    };
  }
  function renderHome() {
    $("#hero-title").textContent = SITE_TITLE;
    $("#hero-lead").textContent = bank.description || ("共 " + bank.count + " 題，支援單選、多選、填答與待核對題；待核對題不評分。");
    const row = $("#bank-row"), sel = $("#bank-select");
    if (banksIndex.length > 1) {
      row.hidden = false;
      sel.innerHTML = banksIndex.map((b) => '<option value="' + esc(b.id) + '"' + (b.id === bank.id ? " selected" : "") + ">" + esc(b.short || b.title) + "（" + b.count + " 題）</option>").join("");
    } else row.hidden = true;

    const s = homeStats();
    $("#stats").innerHTML = [
      { k: "已練題數", v: s.seen, unit: "/" + s.total, cls: "accent" },
      { k: "正確率", v: s.acc, unit: "%", cls: s.answered ? (s.acc >= 80 ? "ok" : s.acc >= 60 ? "warn" : "bad") : "" },
      { k: "錯題本", v: s.wrong, unit: "題", cls: s.wrong ? "bad" : "" },
      { k: "收藏", v: s.fav, unit: "題", cls: s.fav ? "warn" : "" },
      { k: "連續天數", v: s.streak, unit: "天", cls: s.streak ? "ok" : "" },
      { k: "今日作答", v: s.today, unit: "題", cls: "" },
    ].map((x) => '<div class="stat ' + x.cls + '"><div class="v"><span data-count="' + x.v + '">' + x.v + "</span>" + (x.unit ? "<small>" + x.unit + "</small>" : "") + '</div><div class="k">' + x.k + "</div></div>").join("");
    $("#seen-label").textContent = s.seen + " / " + s.total;
    gsap.to("#seen-bar", { scaleX: s.total ? s.seen / s.total : 0, duration: D(0.8), ease: "power3.out", delay: D(0.25), overwrite: "auto" });

    const seqPos = progress.seq || 0;
    $("#modes").innerHTML = MODES.map((m) => {
      let badge = "", sub = "";
      if (m.id === "seq" && seqPos > 0 && seqPos < s.total) { badge = '<span class="badge">第 ' + (seqPos + 1) + " / " + s.total + " 題</span>"; sub = '<span class="sub">繼續上次進度 →</span>'; }
      if (m.id === "wrong") badge = '<span class="badge' + (s.wrong ? " hot" : "") + '">' + s.wrong + " 題</span>";
      if (m.id === "fav") badge = '<span class="badge">' + s.fav + " 題</span>";
      if (m.id === "exam" && s.lastExam) badge = '<span class="badge' + (s.lastExam.score >= 80 ? " good" : "") + '">上次 ' + s.lastExam.score + " 分</span>";
      if (m.id === "smart") { const n = bank.questions.filter((q) => isWrong(q) || isNew(q)).length; if (n) badge = '<span class="badge">待複習 ' + n + "</span>"; }
      return '<button class="mode tone-' + m.tone + '" type="button" data-mode="' + m.id + '" data-anim><span class="ic">' + icon(m.icon) + '</span><span class="t">' + m.name + '</span><span class="d">' + m.desc + "</span>" + sub + badge + "</button>";
    }).join("");
  }
  function countUp(scope) {
    $$("[data-count]", scope).forEach((el) => {
      const to = +el.dataset.count || 0;
      if (!to) { el.textContent = "0"; return; }
      const o = { v: 0 };
      gsap.to(o, { v: to, duration: D(0.8), ease: "power2.out", snap: "v", onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
  }
  let heroDone = false;
  function heroReveal() {
    if (heroDone || !motionOn()) return;
    heroDone = true;
    try {
      const split = SplitText.create("#hero-title", { type: "chars", mask: "chars", aria: "auto" });
      gsap.from(split.chars, { yPercent: 105, duration: 0.7, stagger: 0.022, ease: "power3.out", onComplete: () => split.revert() });
    } catch (e) { /* 字型或環境不支援時安靜略過 */ }
  }

  /* ---------- 練習 session ---------- */
  function smartPick(n) {
    const now = Date.now();
    const scored = bank.questions.map((q) => {
      const r = records[q.id]; let s = 0;
      if (!r || !r.seen) s += 2.5;
      else {
        s += r.wrong * 3;
        if (r.lastOk === false) s += 2;
        s -= Math.min(r.streak, 3);
        s += Math.min(3, (now - r.last) / 864e5) * 0.3;   // 越久沒碰越優先
        if (r.mastered) s -= 1;
      }
      return { id: q.id, s: s + Math.random() * 0.6 };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, n).map((x) => x.id);
  }
  function buildIds(mode) {
    const qs = bank.questions;
    switch (mode) {
      case "random": return gsap.utils.shuffle(qs.map((q) => q.id));
      case "wrong": return qs.filter(isWrong).map((q) => q.id);
      case "fav": return qs.filter(isFav).map((q) => q.id);
      case "smart": return smartPick(Math.min(20, qs.length));
      default: return qs.map((q) => q.id);
    }
  }
  function startSession(mode, opts) {
    opts = opts || {};
    const ids = opts.ids || buildIds(mode);
    if (!ids.length) {
      toast(mode === "wrong" ? "錯題本是空的，先去練習吧" : mode === "fav" ? "還沒有收藏任何題目" : "沒有可練習的題目");
      return;
    }
    stopTimer(); cancelAutoNext();
    session = {
      mode, ids, pos: 0, answers: {}, drafts: {}, reviewed: {}, results: {}, order: {}, startedAt: Date.now(), submitted: false,
      title: opts.title || MODE_NAME[mode] || "練習", timeLimit: opts.minutes ? opts.minutes * 60 : 0, examOpts: opts.examOpts || null,
    };
    if (mode === "seq" && !opts.fromStart) session.pos = gsap.utils.clamp(0, ids.length - 1, progress.seq || 0);
    if (opts.startId != null) session.pos = Math.max(0, ids.indexOf(opts.startId));
    show("practice", () => { renderChrome(); renderQuestion(0); renderSheet(); }, () => { if (mode === "exam") startTimer(); });
  }
  function startExam(o) {
    const eligible = bank.questions.filter(isScorable), total = eligible.length;
    if (!total) { toast("沒有可評分題目，請使用背題或瀏覽模式"); return; }
    const count = gsap.utils.clamp(1, total, o.count || total);
    const ids = gsap.utils.shuffle(eligible.map((q) => q.id)).slice(0, count);
    startSession("exam", { ids, minutes: o.minutes, examOpts: { count, minutes: o.minutes } });
  }
  const currentQ = () => session ? qById.get(session.ids[session.pos]) : null;
  function orderOf(q) {
    const base = q.options.map((_, i) => i);
    if (!session || !settings.shuffle || session.mode === "memo" || q.type === "review" || q.type === "text") return base;
    return session.order[q.id] || (session.order[q.id] = gsap.utils.shuffle(base.slice()));
  }

  function renderChrome() {
    if (!session) return;
    $("#p-mode").textContent = session.title;
    $("#p-timer").hidden = !(session.mode === "exam" && session.timeLimit);
    const fin = $("#btn-finish");
    fin.textContent = session.mode === "exam" ? "交卷" : session.mode === "memo" ? "結束瀏覽" : "結束本輪";
    fin.className = "btn grow" + (session.mode === "exam" ? " accent" : "");
    gsap.set("#p-bar", { scaleX: (session.pos + 1) / session.ids.length });
    updateChrome();
  }
  function updateChrome() {
    if (!session || !currentQ()) return;
    const n = session.ids.length, i = session.pos, q = currentQ();
    $("#p-counter").textContent = (i + 1) + " / " + n;
    gsap.to("#p-bar", { scaleX: (i + 1) / n, duration: D(0.4), ease: "power2.out", overwrite: "auto" });
    $("#btn-prev").disabled = i === 0;
    const last = i === n - 1;
    $("#btn-next").innerHTML = last ? (session.mode === "exam" ? "交卷" : "完成") + icon("check") : "下一題" + icon("chevR");
    const fav = isFav(q), fb = $("#btn-fav");
    fb.classList.toggle("is-fav", fav); fb.setAttribute("aria-pressed", String(fav));
    const read = Object.keys(session.reviewed).length;
    $("#sheet-count").textContent = "已答 " + Object.keys(session.answers).length + (read ? " · 已閱 " + read : "") + " / " + n;
  }

  const stemHtml = (stem) => esc(stem).split("____").join('<span class="blank" role="img" aria-label="空格"></span>');
  const displayNumber = (q) => bank.id === "all" ? q.id : (q.sourceNumber || q.id);
  function sourceHtml(q) {
    const label = q.sourceName + (q.sourceNumber ? " · 原題 " + q.sourceNumber : "");
    const url = /^https?:\/\//i.test(q.sourceUrl) ? q.sourceUrl : "";
    return '<div class="source-line">' + (label ? (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + " ↗</a>" : esc(label)) : "") +
      '<span class="type-badge' + (q.type === "review" ? " needs-review" : "") + '">' + ({ single: "單選", multi: "多選", text: "填答", review: "待核對 · 不評分" }[q.type]) + '</span><span class="source-status">' + esc(q.sourceStatus) + "</span></div>";
  }
  function buildCard(q) {
    const el = document.createElement("article");
    el.className = "qcard"; el.dataset.type = q.type;
    const r = records[q.id], order = orderOf(q), memo = session.mode === "memo";
    const picked = session.answers[q.id], draft = session.drafts[q.id] != null ? session.drafts[q.id] : picked;
    const hist = r && r.seen ? (q.type === "review" ? '<span class="hist">已閱 ' + r.seen + " 次</span>" : '<span class="hist">歷史 <b class="ok">對 ' + r.correct + '</b> · <b class="bad">錯 ' + r.wrong + "</b></span>") : "";
    let controls = "";
    if (q.type === "text" && !memo) {
      controls = '<label class="text-label" for="answer-' + q.id + '">你的答案</label><textarea class="text-answer" id="answer-' + q.id + '" data-text-answer rows="2" maxlength="2000" autocomplete="off" spellcheck="false" aria-describedby="text-hint-' + q.id + '">' + esc(draft || "") + '</textarea><p class="answer-hint" id="text-hint-' + q.id + '">依題目填寫；不區分大小寫，忽略首尾與重複空白。</p><button class="btn primary answer-submit" type="button" data-submit-answer>提交答案</button>';
    } else if (q.options.length) {
      controls = '<ul class="options" role="group" aria-label="' + (q.type === "multi" ? "多選選項" : "選項") + '">' + order.map((oi, vi) => {
        const chosen = q.type === "multi" ? Array.isArray(draft) && draft.includes(oi) : draft === oi;
        const inner = '<span class="key">' + LETTERS[vi] + '</span><span class="txt">' + esc(q.options[oi]) + '</span><span class="mark"></span>';
        return '<li>' + (q.type === "review" ? '<div class="opt review-option">' + inner + '</div>' : '<button class="opt' + (chosen ? " is-picked" : "") + '" type="button" data-oi="' + oi + '" data-vi="' + vi + '" aria-pressed="' + chosen + '">' + inner + '</button>') + '</li>';
      }).join("") + "</ul>";
      if (q.type === "multi" && !memo) controls += '<p class="answer-hint">可選一項或多項；選齊後提交，完全吻合才得分。</p><button class="btn primary answer-submit" type="button" data-submit-answer>提交答案</button>';
    }
    el.innerHTML = '<div class="qmeta"><span class="num">第 ' + displayNumber(q) + " 題</span>" + (isFav(q) ? '<span class="cat">★ 已收藏</span>' : "") + hist + "</div>" + sourceHtml(q) + '<p class="stem">' + stemHtml(q.stem) + "</p>" + controls + '<div class="feedback" hidden aria-live="polite"></div>';
    if (q.type === "review") {
      showMemo(el, q);
      if (!memo) el.insertAdjacentHTML("beforeend", '<button class="btn answer-submit" type="button" data-review-read>' + (session.reviewed[q.id] ? "已閱 · 下一題" : "標記已閱 · 下一題") + "</button>");
    } else if (memo) { markCorrect(el, q, null, false); showMemo(el, q); }
    else if (picked != null && !(session.mode === "exam" && !session.submitted)) { markCorrect(el, q, picked, false); showFeedback(el, q, picked, false); }
    return el;
  }
  function markCorrect(card, q, picked, animate) {
    const correct = expectedIndices(q), selected = Array.isArray(picked) ? picked : picked == null ? [] : [picked];
    $$(".opt", card).forEach((b) => {
      if (b.tagName === "BUTTON") b.disabled = true;
      const oi = +b.dataset.oi, mark = b.querySelector(".mark");
      b.setAttribute("aria-pressed", String(selected.includes(oi)));
      b.classList.remove("is-picked");
      if (correct.includes(oi)) { b.classList.add("is-correct"); mark.innerHTML = icon("check"); }
      else if (selected.includes(oi)) { b.classList.add("is-wrong"); mark.innerHTML = icon("cross"); }
      else b.classList.add("is-dim");
      if (!animate) gsap.set(mark, { autoAlpha: 1 });
    });
    const input = card.querySelector("[data-text-answer]"); if (input) input.disabled = true;
    const submit = card.querySelector("[data-submit-answer]"); if (submit) submit.hidden = true;
  }
  function showMemo(card, q) {
    const fb = card.querySelector(".feedback"), review = q.type === "review";
    fb.hidden = false; fb.className = "feedback " + (review ? "review-note" : "memo");
    fb.innerHTML = '<span class="fb-ic">' + icon("eye") + '</span><div class="fb-main"><b>' + (review ? "待核對，僅供複習（不評分）" : "推導答案") + '</b><span class="fb-answer">' + esc(answerLabel(q, orderOf(q))) + '</span>' + (q.explain ? '<span class="fb-sub">' + esc(q.explain) + "</span>" : "") + "</div>";
  }
  function showFeedback(card, q, picked, animate) {
    const fb = card.querySelector(".feedback"), ok = gradeAnswer(q, picked), r = records[q.id] || {};
    if (ok == null) { showMemo(card, q); return; }
    fb.hidden = false; fb.className = "feedback " + (ok ? "ok" : "bad");
    const sub = q.explain || ("這題你答對 " + (r.correct || 0) + " 次、答錯 " + (r.wrong || 0) + " 次");
    fb.innerHTML = '<span class="fb-ic">' + icon(ok ? "check" : "cross") + '</span><div class="fb-main"><b>' + (ok ? "答對了" : "答錯了") + '</b><span class="fb-answer">推導答案：' + esc(answerLabel(q, orderOf(q))) + '</span><span class="fb-sub">' + esc(sub) + "</span></div>";
    if (animate) gsap.fromTo(fb, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: D(0.3), ease: "power3.out", clearProps: "transform,opacity,visibility" });
  }

  // 換題：舊卡片向反方向滑出 → 新卡片滑入 → 選項 stagger；快速連按時 kill 前一條 timeline
  let qTl = null;
  function cancelQuestionTransition() {
    if (qTl) qTl.kill();
    qTl = null;
  }
  function renderQuestion(dir) {
    if (!session) return;
    cancelQuestionTransition();
    const owner = session, pos = session.pos;
    const stage = $("#stage"), q = currentQ();
    if (!stage || !q) return;
    const card = buildCard(q), old = stage.firstElementChild;
    if (!old || !dir || !motionOn()) { stage.replaceChildren(card); updateChrome(); return; }
    const dist = MOTION.mobile ? 48 : 64;
    qTl = gsap.timeline({ onComplete: () => { if (session === owner && session.pos === pos) qTl = null; } });
    qTl.to(old, { x: -dir * dist * 0.5, autoAlpha: 0, duration: 0.13, ease: "power2.in" });
    qTl.add(() => {
      // 已退出、跳到另一題或切換題庫的 callback 不得回寫新畫面。
      if (session !== owner || owner.pos !== pos || qById.get(q.id) !== q) return;
      stage.replaceChildren(card); updateChrome();
    });
    qTl.fromTo(card, { x: dir * dist, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.32, ease: "power3.out", clearProps: "transform,opacity,visibility" });
    const options = $$(".opt", card);
    if (options.length) qTl.fromTo(options, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, stagger: 0.05, ease: "power3.out", clearProps: "transform,opacity,visibility" }, "<0.06");
  }

  function updateDraftSelection(card, q, value) {
    $$(".opt[data-oi]", card).forEach((b) => {
      const selected = Array.isArray(value) ? value.includes(+b.dataset.oi) : +b.dataset.oi === value;
      b.classList.toggle("is-picked", selected); b.setAttribute("aria-pressed", String(selected));
    });
  }
  function onPick(btn) {
    if (!session) return;
    const q = currentQ(), oi = +btn.dataset.oi, card = btn.closest(".qcard");
    if (!isScorable(q) || session.mode === "memo" || (session.mode !== "exam" && session.answers[q.id] != null)) return;
    cancelAutoNext();
    if (q.type === "multi") {
      const draft = (session.drafts[q.id] || session.answers[q.id] || []).slice();
      const at = draft.indexOf(oi); if (at < 0) draft.push(oi); else draft.splice(at, 1);
      session.drafts[q.id] = draft;
      if (session.mode === "exam") { delete session.answers[q.id]; const submit = card.querySelector("[data-submit-answer]"); if (submit) submit.textContent = "提交答案"; }
      updateDraftSelection(card, q, draft); updateCell(session.pos); updateChrome(); return;
    }
    commitAnswer(q, oi, card, btn);
  }
  function submitCurrentAnswer() {
    if (!session || session.mode === "memo") return;
    const q = currentQ(), card = $("#stage .qcard");
    if (!isScorable(q) || (session.mode !== "exam" && session.answers[q.id] != null)) return;
    let value;
    if (q.type === "text") value = card.querySelector("[data-text-answer]").value.trim();
    else if (q.type === "multi") value = (session.drafts[q.id] || session.answers[q.id] || []).slice();
    else return;
    if (q.type === "text" ? !value : !value.length) { toast("請先填寫答案或選擇選項"); return; }
    commitAnswer(q, value, card, null);
  }
  function commitAnswer(q, value, card, btn) {
    cancelAutoNext(); session.answers[q.id] = value; session.drafts[q.id] = Array.isArray(value) ? value.slice() : value;
    if (session.mode === "exam") {
      updateDraftSelection(card, q, value); updateCell(session.pos); updateChrome();
      const submit = card.querySelector("[data-submit-answer]"); if (submit) submit.textContent = "已保存 · 可修改後重新提交";
      if (settings.autoNext !== "off" && session.pos < session.ids.length - 1) scheduleNext(0.35);
      return;
    }
    const ok = gradeAnswer(q, value); if (ok == null) return;
    session.results[q.id] = ok;
    const change = updateRecord(q, ok); markCorrect(card, q, value, !!btn);
    if (btn) animateFeedback(card, btn, ok);
    showFeedback(card, q, value, true); updateCell(session.pos); updateChrome();
    if (change === "mastered") toast("連續答對 2 次，已移出錯題本");
    if (ok && settings.autoNext !== "off" && session.pos < session.ids.length - 1) scheduleNext(settings.autoNext === "fast" ? 0.9 : 1.8);
  }
  function markReviewed() {
    if (!session || currentQ().type !== "review") return;
    const q = currentQ();
    if (!session.reviewed[q.id]) { const r = rec(q.id); r.seen++; r.last = Date.now(); r.lastOk = null; saveRecords(); session.reviewed[q.id] = true; }
    next();
  }
  function animateFeedback(card, btn, ok) {
    const correctBtn = card.querySelector(".opt.is-correct");
    const tl = gsap.timeline();
    if (ok) {
      tl.to(btn, { scale: 1.02, duration: D(0.12) })
        .to(btn, { scale: 1, duration: D(0.4), ease: "back.out(3)", clearProps: "transform" });
      tl.fromTo(btn.querySelector(".mark"), { scale: 0, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: D(0.45), ease: "back.out(2)" }, "<");
    } else {
      const d = D(0.07);
      tl.to(btn, { keyframes: [{ x: -8, duration: d }, { x: 7, duration: d }, { x: -5, duration: d }, { x: 3, duration: d }, { x: 0, duration: d }], ease: "none", clearProps: "transform" });
      tl.fromTo(btn.querySelector(".mark"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: D(0.3), ease: "back.out(2)" }, "<0.05");
      if (correctBtn) {
        tl.fromTo(correctBtn, { scale: 1 }, { scale: 1.02, duration: D(0.16), yoyo: true, repeat: 1, ease: "power1.inOut", clearProps: "transform" }, "-=0.1");
        tl.fromTo(correctBtn.querySelector(".mark"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: D(0.35), ease: "back.out(2)" }, "<");
      }
    }
  }
  function updateRecord(q, ok) {
    if (!isScorable(q) || typeof ok !== "boolean") return null;
    const r = rec(q.id); let change = null;
    r.seen++; r.last = Date.now(); r.lastOk = ok;
    if (ok) { r.correct++; r.streak++; if (r.wrong > 0 && !r.mastered && r.streak >= 2) { r.mastered = true; change = "mastered"; } }
    else { r.wrong++; r.streak = 0; if (r.mastered) { r.mastered = false; change = "unmastered"; } }
    const k = todayKey(); days[k] = (days[k] || 0) + 1;
    saveRecords(); saveDays();
    return change;
  }

  /* ---------- 導航 ---------- */
  let autoCall = null;
  function scheduleNext(sec) {
    cancelAutoNext(); const owner = session, pos = owner && owner.pos;
    if (!owner) return;
    autoCall = gsap.delayedCall(sec, () => { autoCall = null; if (session === owner && owner.pos === pos) next(); });
  }
  function cancelAutoNext() { if (autoCall) { autoCall.kill(); autoCall = null; } }
  function goTo(pos, dir) {
    if (!session) return;
    pos = gsap.utils.clamp(0, session.ids.length - 1, pos);
    if (pos === session.pos) return;
    dir = dir || (pos > session.pos ? 1 : -1);
    cancelAutoNext();
    session.pos = pos;
    if (session.mode === "seq") { progress.seq = pos; saveProgress(); }
    renderQuestion(dir); updateCells();
    if (sheetOpen) closeSheet();
    if (window.scrollY > 40) gsap.to(window, { scrollTo: { y: 0 }, duration: D(0.3), ease: "power2.out" });
  }
  function next() { if (!session) return; if (session.pos >= session.ids.length - 1) { finish(); return; } goTo(session.pos + 1, 1); }
  function prev() { if (!session) return; goTo(session.pos - 1, -1); }

  function finish() {
    if (!session) return;
    if (session.mode === "exam") { submitExam(false); return; }
    cancelAutoNext();
    const s = session, ids = s.ids;
    const answered = ids.filter((id) => isScorable(qById.get(id)) && s.answers[id] != null);
    if (s.mode === "memo") { session = null; goHome(); return; }
    if (s.mode === "seq") {
      const lastId = ids[ids.length - 1];
      const finishedAll = s.pos >= ids.length - 1 && (s.answers[lastId] != null || s.reviewed[lastId]);
      progress.seq = finishedAll ? 0 : s.pos; saveProgress();
    }
    const correct = answered.filter((id) => s.results[id]).length;
    const wrong = answered.filter((id) => s.results[id] === false).map((id) => ({ q: qById.get(id), a: s.answers[id], order: s.order[id] }));
    const pct = answered.length ? Math.round((correct / answered.length) * 100) : 0;
    session = null;
    showResult({
      title: s.title + " · 本輪小結", unit: answered.length ? "%" : "不評分", ring: pct, celebrate: answered.length >= 10 && pct === 100,
      nums: [
        { k: "作答", v: answered.length, unit: "/" + ids.filter((id) => isScorable(qById.get(id))).length, cls: "accent" },
        { k: "已閱待核對", v: Object.keys(s.reviewed).length, cls: "" },
        { k: "答對", v: correct, cls: "ok" },
        { k: "答錯", v: wrong.length, cls: wrong.length ? "bad" : "" },
      ],
      wrong, reviewedOnly: !answered.length,
      actions: [
        { label: "再練一輪", cls: "primary", fn: () => startSession(s.mode === "redo" ? "redo" : s.mode, s.mode === "redo" ? { ids: s.ids, title: s.title } : {}) },
        ...(wrong.length ? [{ label: "只練本輪錯題", cls: "accent", fn: () => startSession("redo", { ids: wrong.map((w) => w.q.id), title: "錯題重練" }) }] : []),
        { label: "回首頁", cls: "", fn: goHome },
      ],
    });
  }

  /* ---------- 考試計時 & 交卷 ---------- */
  let timerId = null;
  function startTimer() {
    if (!session || !session.timeLimit) return;
    stopTimer();
    session.endAt = Date.now() + session.timeLimit * 1000;
    const el = $("#p-timer"); el.classList.remove("low"); let warned = false;
    const tick = () => {
      if (!session || session.mode !== "exam") { stopTimer(); return; }
      const left = Math.max(0, Math.round((session.endAt - Date.now()) / 1000));
      el.textContent = fmtClock(left);
      if (left <= 60 && !warned) {
        warned = true; el.classList.add("low");
        gsap.fromTo(el, { scale: 1 }, { scale: 1.1, duration: D(0.45), yoyo: true, repeat: 5, ease: "power1.inOut", clearProps: "transform" });
        toast("剩下最後 1 分鐘");
      }
      if (left <= 0) { stopTimer(); toast("時間到，自動交卷"); submitExam(true); }
    };
    tick(); timerId = setInterval(tick, 1000);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
  async function submitExam(force) {
    if (!session || session.submitted) return;
    const s = session, ids = s.ids.filter((id) => isScorable(qById.get(id)));
    if (!ids.length) { toast("本輪沒有可評分題目"); goHome(); return; }
    const un = ids.filter((id) => s.answers[id] == null).length;
    if (!force && un > 0) {
      const ok = await ask("還有 " + un + " 題未作答", "未作答的題目會算作錯誤，確定要交卷嗎？", "交卷", "再檢查一下");
      if (!ok || session !== s || s.submitted) return;
    }
    if (force && modalOpen) closeModal(false);
    stopTimer(); cancelAutoNext(); s.submitted = true;
    let correct = 0; const wrong = [];
    ids.forEach((id) => {
      const q = qById.get(id), a = s.answers[id];
      if (a == null) { wrong.push({ q, a: null, order: s.order[id] }); return; }
      const ok = gradeAnswer(q, a); s.results[id] = ok; updateRecord(q, ok);
      if (ok) correct++; else wrong.push({ q, a, order: s.order[id] });
    });
    const total = ids.length, score = Math.round((correct / total) * 100), dur = Math.round((Date.now() - s.startedAt) / 1000);
    exams.push({ t: Date.now(), score, correct, total, un, dur });
    if (exams.length > 30) exams = exams.slice(-30);
    saveExams();
    session = null;
    showResult({
      title: "模擬考試 · 成績", unit: "分", ring: score, celebrate: score >= 90,
      nums: [
        { k: "答對", v: correct, unit: "/" + total, cls: "ok" },
        { k: "答錯", v: wrong.length - un, cls: "bad" },
        { k: "未作答", v: un, cls: "" },
        { k: "用時", v: fmtDur(dur), raw: true, cls: "" },
      ],
      wrong,
      actions: [
        { label: "再考一次", cls: "primary", fn: () => startExam(s.examOpts || { count: total, minutes: s.timeLimit / 60 }) },
        ...(wrong.length ? [{ label: "錯題重練", cls: "accent", fn: () => startSession("redo", { ids: wrong.map((w) => w.q.id), title: "錯題重練" }) }] : []),
        { label: "回首頁", cls: "", fn: goHome },
      ],
    });
  }

  /* ---------- 結果頁 ---------- */
  function showResult(r) {
    show("result", () => {
      $("#r-title").textContent = r.title;
      $("#result-nums").innerHTML = r.nums.map((x) => '<div class="stat ' + (x.cls || "") + '"><div class="v">' + (x.raw ? esc(String(x.v)) : '<span data-count="' + x.v + '">' + x.v + "</span>") + (x.unit ? "<small>" + x.unit + "</small>" : "") + '</div><div class="k">' + x.k + "</div></div>").join("");
      const acts = $("#result-actions");
      acts.innerHTML = r.actions.map((a, i) => '<button class="btn ' + (a.cls || "") + '" type="button" data-act="' + i + '">' + a.label + "</button>").join("");
      $$(".btn", acts).forEach((b) => b.addEventListener("click", () => r.actions[+b.dataset.act].fn()));
      $("#review-title").innerHTML = r.wrong.length ? '錯題回顧 <span class="count">' + r.wrong.length + " 題</span>" : r.reviewedOnly ? "僅閱讀待核對題，未產生分數" : "已作答題目全部答對";
      $("#review-list").innerHTML = r.wrong.map((w) => reviewHtml(w.q, w.a, w.order)).join("");
      const ring = $("#ring"); ring.classList.toggle("good", r.ring >= 80); ring.classList.toggle("poor", r.ring < 60);
      $("#ring-unit").textContent = r.unit; $("#ring-num").textContent = "0";
      gsap.set("#ring-bar", { drawSVG: "0%" });
    }, () => {
      if (r.reviewedOnly) { $("#ring-num").textContent = "—"; countUp($("#result-nums")); return; }
      gsap.to("#ring-bar", { drawSVG: Math.max(0.5, r.ring) + "%", duration: D(1.2), ease: "power2.inOut" });
      const o = { v: 0 };
      gsap.to(o, { v: r.ring, duration: D(1.2), ease: "power2.inOut", snap: "v", onUpdate: () => { $("#ring-num").textContent = Math.round(o.v); } });
      countUp($("#result-nums"));
      if (r.celebrate) confetti();
    });
  }
  function reviewHtml(q, a, order) {
    const mine = a == null ? '<span class="none">未作答</span>' : '<span class="bad">你的答案：' + esc(formatValue(q, a, order)) + "</span>";
    return '<li class="review"><div class="row"><span class="num">第 ' + displayNumber(q) + ' 題</span><span class="tools"><button class="mini' + (isFav(q) ? " on" : "") + '" type="button" data-fav="' + q.id + '" aria-label="收藏">' + icon("star") + '</button></span></div>' + sourceHtml(q) + '<p class="stem">' + stemHtml(q.stem) + '</p><div class="ans">' + mine + '<span class="answer-block ok">推導答案：' + esc(answerLabel(q, order)) + "</span>" + (q.explain ? '<div class="none">' + esc(q.explain) + "</div>" : "") + "</div></li>";
  }
  function confetti() {
    if (!motionOn()) return;
    const colors = ["#b5412c", "#2b4f7e", "#b7861a", "#2e7d4f"], dots = [], frag = document.createDocumentFragment();
    const cx = window.innerWidth / 2, cy = Math.min(window.innerHeight * 0.32, 260);
    for (let i = 0; i < 40; i++) { const d = document.createElement("i"); d.className = "confetti"; d.style.background = colors[i % 4]; frag.appendChild(d); dots.push(d); }
    document.body.appendChild(frag);
    gsap.set(dots, { x: cx, y: cy, scale: 0.6 });
    gsap.to(dots, { x: "random(-220, 220)", y: "random(-260, 80)", rotation: "random(-360, 360)", scale: "random(0.6, 1.3)", autoAlpha: 0, duration: 1.5, ease: "power3.out", stagger: { each: 0.008, from: "random" }, onComplete: () => dots.forEach((d) => d.remove()) });
  }

  /* ---------- 答題卡（手機：底部抽屜；桌面：右側常駐） ---------- */
  let sheetOpen = false, sheetIsDrawer = false;
  mm.add("(max-width: 1023px)", () => {
    sheetIsDrawer = true; gsap.set("#sheet", { yPercent: 100 });
    return () => { sheetIsDrawer = false; sheetOpen = false; gsap.set("#sheet", { clearProps: "transform" }); gsap.set("#scrim", { autoAlpha: 0 }); };
  });
  function renderSheet() {
    $("#sheet-grid").innerHTML = session.ids.map((id, i) => '<button class="cell" type="button" data-i="' + i + '" aria-label="第 ' + displayNumber(qById.get(id)) + ' 題">' + displayNumber(qById.get(id)) + "</button>").join("");
    updateCells();
  }
  function cellClass(i) {
    const id = session.ids[i]; let c = "cell";
    if (i === session.pos) c += " cur";
    if (session.reviewed[id]) c += " reviewed";
    else if (session.answers[id] != null) c += session.mode === "exam" && !session.submitted ? " done" : session.results[id] === true ? " ok" : session.results[id] === false ? " bad" : " done";
    if (isFav(qById.get(id))) c += " fav";
    return c;
  }
  function updateCell(i) { if (!session) return; const el = $("#sheet-grid").children[i]; if (el) el.className = cellClass(i); }
  function updateCells() { if (!session) return; const cells = $("#sheet-grid").children; for (let i = 0; i < cells.length; i++) cells[i].className = cellClass(i); }
  function openSheet() {
    if (!sheetIsDrawer || sheetOpen) return;
    sheetOpen = true;
    gsap.to("#scrim", { autoAlpha: 1, duration: D(0.2) });
    gsap.to("#sheet", { yPercent: 0, duration: D(0.4), ease: "power3.out" });
    const cur = $("#sheet-grid .cur");
    if (cur) gsap.to("#sheet .sheet-body", { scrollTo: { y: cur, offsetY: 80 }, duration: D(0.3), delay: D(0.1) });
  }
  function closeSheet() {
    if (!sheetIsDrawer || !sheetOpen) return;
    sheetOpen = false;
    gsap.to("#scrim", { autoAlpha: 0, duration: D(0.2) });
    gsap.to("#sheet", { yPercent: 100, duration: D(0.3), ease: "power2.in" });
  }

  /* ---------- 手勢：左右滑動換題（Observer 只聽 touch，桌面選字不受影響） ---------- */
  let lastSwipe = 0;
  Observer.create({
    target: "#stage", type: "touch", tolerance: 45, lockAxis: true, preventDefault: false,
    onLeft: () => swipe(1), onRight: () => swipe(-1),
  });
  function swipe(dir) {
    if (!session || current !== "practice" || sheetOpen || modalOpen) return;
    const now = Date.now(); if (now - lastSwipe < 450) return; lastSwipe = now;
    if (dir > 0) { if (session.pos < session.ids.length - 1) next(); } else prev();
  }

  /* ---------- 收藏 ---------- */
  function toggleFav(q, btn) {
    const r = rec(q.id); r.fav = !r.fav; saveRecords();
    if (btn) gsap.fromTo(btn, { scale: 0.75 }, { scale: 1, duration: D(0.5), ease: "elastic.out(1, 0.45)", clearProps: "transform" });
    toast(r.fav ? "已加入收藏" : "已取消收藏");
    return r.fav;
  }

  /* ---------- 瀏覽 / 搜尋 ---------- */
  const browse = { q: "", status: "all" };
  function renderBrowse() {
    $("#search").value = browse.q;
    $$("#browse-status button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === browse.status)));
    $("#toggle-answers").setAttribute("aria-pressed", String(settings.browseAnswers));
    $("#browse-list").innerHTML = bank.questions.map(itemHtml).join("");
    applyBrowseFilter(false);
  }
  function itemHtml(q) {
    const r = records[q.id] || {}, correct = expectedIndices(q);
    const history = q.type === "review" ? (r.seen ? "已閱 " + r.seen + " 次" : "未閱") : (r.seen ? '<span class="ok">對 ' + r.correct + '</span> · <span class="bad">錯 ' + r.wrong + "</span>" : "未做");
    return '<li class="item" data-id="' + q.id + '" data-hide-ans="' + (settings.browseAnswers ? 0 : 1) + '"><div class="row"><span class="num">第 ' + displayNumber(q) + ' 題</span><span class="st">' + history + '</span><span class="tools"><button class="mini' + (r.fav ? " on" : "") + '" type="button" data-fav="' + q.id + '" aria-label="收藏">' + icon("star") + '</button><button class="mini" type="button" data-go="' + q.id + '" aria-label="從這題開始順序練習">' + icon("play") + "</button></span></div>" + sourceHtml(q) + '<p class="stem">' + stemHtml(q.stem) + '</p><ul class="opts">' + q.options.map((o, i) => '<li class="' + (correct.includes(i) ? "ans-line" : "") + '">' + LETTERS[i] + ". " + esc(o) + "</li>").join("") + '</ul><div class="browse-answer' + (q.type === "review" ? " needs-review" : "") + '"><b>' + (q.type === "review" ? "待核對參考（不評分）：" : "推導答案：") + '</b>' + esc(answerLabel(q)) + (q.explain ? '<p class="browse-explain">' + esc(q.explain) + "</p>" : "") + "</div></li>";
  }
  function matches(q) {
    if (browse.status === "wrong" && !isWrong(q)) return false;
    if (browse.status === "fav" && !isFav(q)) return false;
    if (browse.status === "new" && !isNew(q)) return false;
    if (browse.q) {
      const s = browse.q.toLowerCase();
      if (!(String(q.id) === s || String(q.sourceNumber) === s || [q.stem, q.sourceName, q.answerText, q.explain].some((v) => v.toLowerCase().includes(s)) || q.options.some((o) => o.toLowerCase().includes(s)))) return false;
    }
    return true;
  }
  function applyBrowseFilter(animate) {
    const items = $$("#browse-list .item");
    const useFlip = animate && motionOn() && items.length <= 160;
    const state = useFlip ? Flip.getState(items) : null;
    let n = 0;
    items.forEach((el) => { const on = matches(qById.get(+el.dataset.id)); el.classList.toggle("is-hidden", !on); if (on) n++; });
    $("#browse-count").textContent = n + " / " + bank.questions.length + " 題";
    $("#browse-empty").hidden = n > 0;
    if (useFlip) Flip.from(state, {
      duration: 0.35, ease: "power2.inOut", absolute: true,
      onEnter: (els) => { if (els.length) gsap.fromTo(els, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.3, clearProps: "transform" }); },
      onLeave: (els) => { if (els.length) gsap.to(els, { autoAlpha: 0, scale: 0.97, duration: 0.2 }); },
    });
  }

  /* ---------- 對話框 ---------- */
  let modalOpen = false, modalResolve = null, modalClick = null, lastFocus = null;
  function openModal(html) {
    const m = $("#modal"), box = $("#modal .box");
    lastFocus = document.activeElement;
    $("#modal-content").innerHTML = html; m.hidden = false; modalOpen = true;
    gsap.fromTo(m, { autoAlpha: 0 }, { autoAlpha: 1, duration: D(0.2) });
    gsap.fromTo(box, { y: MOTION.mobile ? 40 : 12, scale: MOTION.mobile ? 1 : 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: D(0.32), ease: "power3.out", clearProps: "transform" });
    const f = box.querySelector("[data-autofocus]") || box.querySelector("button.btn, button, select, input");
    if (f) setTimeout(() => f.focus(), 60);
  }
  function closeModal(result) {
    if (!modalOpen) return;
    modalOpen = false; modalClick = null;
    const m = $("#modal"), box = $("#modal .box");
    gsap.to(box, { y: MOTION.mobile ? 30 : 8, autoAlpha: 0, duration: D(0.18), ease: "power2.in" });
    gsap.to(m, { autoAlpha: 0, duration: D(0.2), onComplete: () => { m.hidden = true; $("#modal-content").innerHTML = ""; gsap.set(box, { clearProps: "all" }); } });
    if (modalResolve) { const r = modalResolve; modalResolve = null; r(!!result); }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function ask(title, text, okLabel, cancelLabel) {
    return new Promise((res) => {
      modalResolve = res;
      openModal("<h2>" + esc(title) + "</h2><p>" + esc(text) + '</p><div class="btn-row"><button class="btn" type="button" data-close="0">' + esc(cancelLabel || "取消") + '</button><button class="btn primary" type="button" data-close="1" data-autofocus>' + esc(okLabel || "確定") + "</button></div>");
    });
  }
  const closeBtn = '<button class="icon-btn small" type="button" data-close="0" aria-label="關閉">×</button>';
  const seg = (key, opts) => '<div class="seg sm" data-key="' + key + '">' + opts.map((o) => '<button type="button" data-v="' + o.v + '" aria-pressed="' + (String(settings[key]) === String(o.v)) + '">' + o.l + "</button>").join("") + "</div>";
  function segClick(e) {
    const b = e.target.closest(".seg button"); if (!b) return false;
    const key = b.closest(".seg").dataset.key; let v = b.dataset.v;
    if (v === "true") v = true; else if (v === "false") v = false; else if (/^-?\d+$/.test(v)) v = +v;
    settings[key] = v; saveSettings(); applySettings();
    $$("button", b.parentElement).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (key === "shuffle" && session) session.order = {};
    return true;
  }

  function openSettings() {
    const isCustom = !!banksIndex.find((b) => b.id === bank.id && b.custom);
    openModal("<h2>設定 " + closeBtn + "</h2>" +
      '<div class="field"><span class="lbl">答對後自動下一題<span class="hint">答錯會停留，方便看正確答案</span></span>' + seg("autoNext", [{ v: "off", l: "關" }, { v: "fast", l: "快" }, { v: "slow", l: "慢" }]) + "</div>" +
      '<div class="field"><span class="lbl">選項亂序<span class="hint">避免只記住「答案是 B」</span></span>' + seg("shuffle", [{ v: false, l: "關" }, { v: true, l: "開" }]) + "</div>" +
      '<div class="field"><span class="lbl">題目字號</span>' + seg("font", [{ v: "sm", l: "小" }, { v: "md", l: "中" }, { v: "lg", l: "大" }]) + "</div>" +
      '<div class="field"><span class="lbl">動畫<span class="hint">「自動」會跟隨系統的減少動態設定</span></span>' + seg("motion", [{ v: "auto", l: "自動" }, { v: "on", l: "開" }, { v: "off", l: "關" }]) + "</div>" +
      "<h3>資料</h3><p>進度只存在這台裝置的瀏覽器裡。換裝置前先匯出，再到新裝置匯入即可接續。</p>" +
      '<div class="data-row"><button class="btn sm" type="button" data-act="export">匯出進度</button><button class="btn sm" type="button" data-act="import">匯入進度</button><button class="btn sm danger" type="button" data-act="reset">重置本題庫進度</button></div>' +
      "<h3>題庫</h3><p>可匯入自訂題庫 JSON；支援 single、multi、text、review。待核對題僅供閱讀，不納入評分。</p>" +
      '<div class="data-row"><button class="btn sm" type="button" data-act="import-bank">匯入題庫 JSON</button>' + (isCustom ? '<button class="btn sm danger" type="button" data-act="remove-bank">移除目前題庫</button>' : "") + "</div>");
    modalClick = async (e) => {
      if (segClick(e)) return;
      const a = e.target.closest("[data-act]"); if (!a) return;
      const act = a.dataset.act;
      if (act === "export") {
        download("quiz-progress-" + bank.id + "-" + todayKey() + ".json", JSON.stringify({ app: "quiz2", bank: bank.id, exportedAt: new Date().toISOString(), records, progress, exams, days }, null, 1));
        toast("已匯出進度檔");
      } else if (act === "import") {
        pickFile(async (data) => {
          if (!data || data.app !== "quiz2" || !data.records) { toast("這不是進度檔"); return; }
          if (data.bank !== bank.id) { toast("題庫不一致；請先切換至進度檔對應題庫，避免題號誤配"); return; }
          records = data.records || {}; progress = data.progress || {}; exams = data.exams || []; days = data.days || {};
          sanitizeState();
          saveRecords(); saveProgress(); saveExams(); saveDays();
          closeModal(false); toast("已匯入進度"); goHome();
        });
      } else if (act === "reset") {
        const ok = await ask("重置進度？", "會清除本題庫的作答記錄、錯題本、收藏與考試成績，無法復原。", "清除", "取消");
        if (!ok) return;
        const k = K(); store.del(k.rec); store.del(k.prog); store.del(k.exams); store.del(k.days); loadState();
        toast("已重置"); goHome();
      } else if (act === "import-bank") {
        pickFile(async (data) => {
          const b = data && normalizeBank(Object.assign({}, data));
          if (!b || !b.questions.length) { toast("題庫格式不正確：需要 questions 陣列"); return; }
          const id = String(data.id || "custom-" + Date.now()).replace(/[^\w-]/g, "_");
          const custom = store.get("quiz2:customBanks", {}); custom[id] = data; store.set("quiz2:customBanks", custom);
          await loadIndex(); await loadBank(id);
          closeModal(false); toast("已匯入題庫：" + b.short); goHome();
        });
      } else if (act === "remove-bank") {
        const ok = await ask("移除題庫？", "會一併刪除它的作答記錄。", "移除", "取消");
        if (!ok) return;
        const custom = store.get("quiz2:customBanks", {}); delete custom[bank.id]; store.set("quiz2:customBanks", custom);
        const k = K(); store.del(k.rec); store.del(k.prog); store.del(k.exams); store.del(k.days);
        await loadIndex(); await loadBank(null); goHome();
      }
    };
  }
  function openExamConfig() {
    const total = bank.questions.filter(isScorable).length;
    if (!total) { toast("沒有可評分題目，請使用背題或瀏覽模式"); return; }
    const counts = [10, 20, 50, 100].filter((n) => n < total); counts.push(total);
    if (!counts.includes(settings.examCount)) settings.examCount = counts[counts.length - 1];
    openModal("<h2>模擬考試 " + closeBtn + "</h2><p>從 " + total + " 道可評分題隨機抽題；包含單選、多選與填答。待核對題不進入模考。多選與填答需按提交答案，交卷後才顯示對錯。</p>" +
      '<div class="field"><span class="lbl">題數</span><div class="seg sm" data-key="examCount">' + counts.map((n) => '<button type="button" data-v="' + n + '" aria-pressed="' + (n === settings.examCount) + '">' + (n === total ? "全部 " + n : n) + "</button>").join("") + "</div></div>" +
      '<div class="field"><span class="lbl">時限</span><div class="seg sm" data-key="examMinutes">' + [0, 10, 20, 30, 45].map((m) => '<button type="button" data-v="' + m + '" aria-pressed="' + (m === settings.examMinutes) + '">' + (m ? m + " 分" : "不限") + "</button>").join("") + "</div></div>" +
      (exams.length ? "<h3>最近成績</h3><p>" + exams.slice(-5).reverse().map((e) => fmtDate(e.t) + " · " + e.score + " 分（" + e.correct + "/" + e.total + "）").join("　") + "</p>" : "") +
      '<div class="btn-row"><button class="btn" type="button" data-close="0">取消</button><button class="btn accent" type="button" data-start-exam data-autofocus>開始考試</button></div>');
    modalClick = (e) => {
      if (segClick(e)) return;
      if (e.target.closest("[data-start-exam]")) { closeModal(false); startExam({ count: settings.examCount, minutes: settings.examMinutes }); }
    };
  }
  function openHelp() {
    openModal("<h2>說明與快捷鍵 " + closeBtn + "</h2>" +
      "<p>手機：左右滑動題目卡片可換題；底部按鈕打開答題卡。電腦：</p>" +
      '<div class="kbd-list"><span><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> 或 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></span><span>選擇選項</span>' +
      "<span><kbd>→</kbd> / <kbd>J</kbd></span><span>下一題</span><span><kbd>←</kbd> / <kbd>K</kbd></span><span>上一題</span>" +
      "<span><kbd>Enter</kbd> / <kbd>Space</kbd></span><span>提交多選／填答；已作答後跳下一題</span><span><kbd>F</kbd></span><span>收藏 / 取消收藏</span>" +
      "<span><kbd>G</kbd></span><span>打開答題卡</span><span><kbd>T</kbd></span><span>切換深淺色</span><span><kbd>Esc</kbd></span><span>關閉面板</span><span><kbd>?</kbd></span><span>本說明</span></div>" +
      "<h3>模式</h3><p>順序練習會記住進度；智能複習依「錯過幾次、多久沒碰、有沒有做過」排序；錯題本裡的題連續答對 2 次自動移出；模擬考試不即時判分；多選須完整吻合，填答依已列出的等價答案判分。待核對題不評分、不計入錯題或正確率。</p>");
  }
  function download(name, text) {
    const blob = new Blob([text], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function pickFile(cb) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json,.json";
    inp.addEventListener("change", () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onerror = () => toast("讀取檔案失敗，請重新選取");
      rd.onload = async () => { try { await cb(JSON.parse(String(rd.result))); } catch (e) { toast("匯入失敗：" + (e.message || "檔案格式無效")); } };
      rd.readAsText(f, "utf-8");
    });
    inp.click();
  }

  /* ---------- Toast ---------- */
  let toastTl = null;
  function toast(msg) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg;
    if (toastTl) toastTl.kill();
    toastTl = gsap.timeline()
      .fromTo(t, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: D(0.25), ease: "power3.out" })
      .to(t, { y: 6, autoAlpha: 0, duration: D(0.25), ease: "power2.in" }, "+=1.8");
  }

  /* ---------- 主題 ---------- */
  function toggleTheme() {
    const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    gsap.fromTo("#btn-theme", { rotation: -90, scale: 0.8 }, { rotation: 0, scale: 1, duration: D(0.45), ease: "back.out(2)", clearProps: "transform" });
  }

  /* ---------- 導向 ---------- */
  function goHome() {
    stopTimer(); cancelAutoNext(); cancelQuestionTransition(); if (sheetOpen) closeSheet();
    session = null;
    show("home", renderHome, () => countUp($("#stats")));
  }
  async function exitPractice() {
    if (!session) { goHome(); return; }
    if (session.mode === "exam" && !session.submitted) {
      const ok = await ask("離開考試？", "目前的作答不會被評分，也不會記錄。", "離開", "繼續作答");
      if (!ok || !session) return;
    }
    if (session && session.mode === "seq") { progress.seq = session.pos; saveProgress(); }
    goHome();
  }

  /* ---------- 鍵盤 ---------- */
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") {
      if (e.key === "Escape") e.target.blur();
      if (tag === "textarea" && e.target.hasAttribute("data-text-answer") && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submitCurrentAnswer(); }
      return;
    }
    if (tag === "button" && (e.key === "Enter" || e.key === " ")) return;
    if (modalOpen) { if (e.key === "Escape") closeModal(false); return; }
    if (e.key === "?") { openHelp(); return; }
    if (e.key === "Escape") { if (sheetOpen) closeSheet(); return; }
    if (e.key === "t" || e.key === "T") { toggleTheme(); return; }
    if (current !== "practice" || !session) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) pickVisual(+k - 1);
    else if (/^[a-eA-E]$/.test(k)) pickVisual(k.toUpperCase().charCodeAt(0) - 65);
    else if (k === "ArrowRight" || k === "j" || k === "J" || k === "n" || k === "N") next();
    else if (k === "ArrowLeft" || k === "k" || k === "K" || k === "p" || k === "P") prev();
    else if (k === "Enter" || k === " ") {
      const q = currentQ();
      if (q.type === "review" && session.mode !== "memo") { e.preventDefault(); markReviewed(); }
      else if ((q.type === "multi" || q.type === "text") && session.mode !== "memo" && session.answers[q.id] == null) { e.preventDefault(); submitCurrentAnswer(); }
      else if (session.mode === "memo" || session.mode === "exam" || session.answers[q.id] != null) { e.preventDefault(); next(); }
    }
    else if (k === "f" || k === "F") $("#btn-fav").click();
    else if (k === "g" || k === "G") $("#btn-sheet").click();
  }
  function pickVisual(vi) { const b = $('#stage .opt[data-vi="' + vi + '"]'); if (b && !b.disabled) onPick(b); }

  /* ---------- 事件綁定 ---------- */
  function bindEvents() {
    $("#modes").addEventListener("click", (e) => {
      const b = e.target.closest(".mode"); if (!b) return;
      const m = b.dataset.mode;
      if (m === "exam") openExamConfig();
      else if (m === "browse") show("browse", renderBrowse);
      else startSession(m);
    });
    $("#bank-select").addEventListener("change", async (e) => {
      try { await loadBank(e.target.value); goHome(); } catch (err) { toast("題庫載入失敗"); }
    });
    $("#stage").addEventListener("click", (e) => {
      if (e.target.closest("[data-submit-answer]")) { submitCurrentAnswer(); return; }
      if (e.target.closest("[data-review-read]")) { markReviewed(); return; }
      const b = e.target.closest("button.opt"); if (b && !b.disabled) onPick(b);
    });
    $("#stage").addEventListener("input", (e) => {
      if (!session || !e.target.matches("[data-text-answer]")) return;
      const q = currentQ(); cancelAutoNext(); session.drafts[q.id] = e.target.value;
      if (session.mode === "exam") { delete session.answers[q.id]; const b = $("#stage [data-submit-answer]"); if (b) b.textContent = "提交答案"; }
      updateCell(session.pos); updateChrome();
    });
    $("#btn-prev").addEventListener("click", prev);
    $("#btn-next").addEventListener("click", next);
    $("#btn-fav").addEventListener("click", () => {
      if (!session) return;
      toggleFav(currentQ(), $("#btn-fav")); updateChrome(); updateCell(session.pos);
      const tag = $("#stage .qmeta .cat"); if (tag) tag.remove(); else $("#stage .qmeta .num").insertAdjacentHTML("afterend", '<span class="cat">★ 已收藏</span>');
    });
    $("#btn-sheet").addEventListener("click", () => (sheetOpen ? closeSheet() : openSheet()));
    $("#btn-sheet-close").addEventListener("click", closeSheet);
    $("#scrim").addEventListener("click", closeSheet);
    $("#sheet-grid").addEventListener("click", (e) => { const c = e.target.closest(".cell"); if (c) goTo(+c.dataset.i); });
    $("#btn-finish").addEventListener("click", finish);
    $("#btn-exit").addEventListener("click", exitPractice);
    $("#btn-result-home").addEventListener("click", goHome);
    $("#btn-browse-home").addEventListener("click", goHome);
    $("#btn-settings").addEventListener("click", openSettings);
    $("#btn-help").addEventListener("click", openHelp);
    $("#btn-theme").addEventListener("click", toggleTheme);

    let st = null;
    $("#search").addEventListener("input", (e) => { clearTimeout(st); st = setTimeout(() => { browse.q = e.target.value.trim(); applyBrowseFilter(true); }, 160); });
    $("#browse-status").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      browse.status = b.dataset.v;
      $$("#browse-status button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      applyBrowseFilter(true);
    });
    $("#toggle-answers").addEventListener("click", () => {
      settings.browseAnswers = !settings.browseAnswers; saveSettings();
      $("#toggle-answers").setAttribute("aria-pressed", String(settings.browseAnswers));
      $$("#browse-list .item").forEach((el) => { el.dataset.hideAns = settings.browseAnswers ? "0" : "1"; });
    });
    $("#browse-list").addEventListener("click", (e) => {
      const f = e.target.closest("[data-fav]");
      if (f) { const on = toggleFav(qById.get(+f.dataset.fav), f); f.classList.toggle("on", on); if (browse.status === "fav") applyBrowseFilter(true); return; }
      const g = e.target.closest("[data-go]");
      if (g) startSession("seq", { startId: +g.dataset.go });
    });
    $("#review-list").addEventListener("click", (e) => {
      const f = e.target.closest("[data-fav]");
      if (f) { const on = toggleFav(qById.get(+f.dataset.fav), f); f.classList.toggle("on", on); }
    });
    $("#modal").addEventListener("click", (e) => {
      if (e.target === $("#modal")) { closeModal(false); return; }
      const c = e.target.closest("[data-close]");
      if (c) { closeModal(c.dataset.close === "1"); return; }
      if (modalClick) modalClick(e);
    });
    document.addEventListener("keydown", onKey);
  }

  /* ---------- 啟動 ---------- */
  async function init() {
    applySettings();
    try {
      await loadIndex();
      const want = new URLSearchParams(location.search).get("bank") || store.get("quiz2:lastBank", null) || "latest2026";
      await loadBank(want);
    } catch (e) {
      $("#hero-lead").innerHTML = "題庫載入失敗：" + esc(e.message) + "<br>如果是直接用檔案開啟，請改用 http 伺服器（例如 <code>python -m http.server</code>）。";
      return;
    }
    bindEvents();
    show("home", renderHome, () => { countUp($("#stats")); heroReveal(); });
  }
  init();
})();
