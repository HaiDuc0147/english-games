(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const MODES = ["picture", "missing", "scramble", "sentence"];
  const MODE_TAG = { picture: "🖼️ Picture match", missing: "🧩 Missing letters", scramble: "🔀 Scrambled word", sentence: "📝 Sentence fill" };
  const similar = (a, b) => (typeof SIMILAR !== "undefined" ? SIMILAR : []).some((g) => g.includes(a) && g.includes(b));

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ws4_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ws4_" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const settings = Object.assign({ mode: "picture", count: 10, level: "easy" }, store.get("settings", {}));
  if (![...MODES, "mix"].includes(settings.mode)) settings.mode = "picture";
  let muted = store.get("muted", false);

  /* ---------- sound ---------- */
  let actx = null;
  function ac() {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type = "sine", vol = 0.14, delay = 0) {
    if (muted) return; const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  const sfx = {
    tap() { tone(700, 0.07, "triangle", 0.08); },
    back() { tone(420, 0.07, "triangle", 0.07); },
    good() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, "triangle", 0.12, i * 0.08)); },
    bad() { tone(190, 0.22, "sawtooth", 0.06); tone(150, 0.26, "sawtooth", 0.05, 0.09); },
    hint() { tone(880, 0.1, "sine", 0.1); tone(1175, 0.14, "sine", 0.08, 0.07); },
    win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, "triangle", 0.11, i * 0.12)); },
  };

  /* ---------- speech ---------- */
  let voice = null;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en[-_]GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : "en-GB"; if (voice) u.voice = voice; u.rate = 0.85;
    speechSynthesis.speak(u);
  }

  /* ---------- screens ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
    if (id === "home") renderHome();
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

  /* ---------- home ---------- */
  const bestKey = () => `best_${settings.mode}_${settings.count}_${settings.level}`;
  const LEVEL_NOTES = {
    picture: { easy: "Easy: the Vietnamese meaning is shown and the word is read aloud.", hard: "Hard: only the English word, no Vietnamese, no sound." },
    missing: { easy: "Easy: a few gaps, and the first letter is always given.", hard: "Hard: more gaps + 3 decoy letters that don't belong." },
    scramble: { easy: "Easy: the first letter of each word is given.", hard: "Hard: every letter is scrambled." },
    sentence: { easy: "Easy: a picture clue helps you.", hard: "Hard: no picture, and all choices are the same word type (noun/verb)." },
    mix: { easy: "Easy: extra clues in every game.", hard: "Hard: fewer clues, decoy letters, no pictures in Sentence Fill." },
  };
  function renderHome() {
    document.querySelectorAll(".mode").forEach((b) => b.classList.toggle("sel", b.dataset.mode === settings.mode));
    document.querySelectorAll(".seg").forEach((seg) => {
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", String(settings[seg.dataset.key]) === b.dataset.val));
    });
    $("#levelNote").textContent = LEVEL_NOTES[settings.mode][settings.level];
    const best = store.get(bestKey(), null);
    $("#bestLine").textContent = best ? `🏆 Your best here: ${best} pts` : "No score yet for this choice. Be the first! ✨";
  }
  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => { settings.mode = b.dataset.mode; store.set("settings", settings); sfx.tap(); renderHome(); }));
  document.querySelectorAll(".seg").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    const k = seg.dataset.key; settings[k] = k === "count" ? Number(b.dataset.val) : b.dataset.val;
    store.set("settings", settings); sfx.tap(); renderHome();
  })));
  $("#startBtn").addEventListener("click", () => startGame(WORDS, settings.count, false));
  $("#studyBtn").addEventListener("click", () => { renderStudy(); show("study"); });
  $("#studyStart").addEventListener("click", () => startGame(WORDS, settings.count, false));

  /* ---------- study ---------- */
  function renderStudy() {
    const g = $("#studyGrid"); if (g.childElementCount) return;
    WORDS.forEach((it) => {
      const c = el("button", "scard");
      const im = el("div", "im"); const img = el("img"); img.src = it.img; img.alt = it.w; img.loading = "lazy"; im.appendChild(img);
      const tx = el("div", "tx");
      const w = el("div", "w", it.w); w.appendChild(el("i", null, `(${it.t})`));
      tx.append(w, el("div", "ipa", it.ipa), el("div", "m", it.vi));
      c.append(im, tx);
      c.addEventListener("click", () => speak(it.w));
      g.appendChild(c);
    });
  }

  /* ---------- game state ---------- */
  let G = null; // whole game
  let R = null; // current round
  let lastMode = null;

  function startGame(list, n, practice) {
    ac();
    const words = shuffle(list).slice(0, Math.min(n, list.length));
    WORDS.forEach((w) => { const i = new Image(); i.src = w.img; }); // preload (Picture Match uses all pictures)
    G = { list: words, i: 0, score: 0, streak: 0, bestStreak: 0, results: [], practice };
    lastMode = null;
    show("play");
    newRound();
  }

  function chooseMode() {
    if (settings.mode !== "mix") return settings.mode;
    lastMode = pick(MODES.filter((m) => m !== lastMode));
    return lastMode;
  }

  function distractors(item, n, sameType) {
    let pool = WORDS.filter((w) => w.w !== item.w && !similar(w.w, item.w));
    if (sameType) { const same = pool.filter((w) => w.t === item.t); if (same.length >= n) pool = same; }
    return shuffle(pool).slice(0, n);
  }

  function buildRound(item) {
    const mode = chooseMode();
    const base = { item, mode, attempts: 0, hints: 0, done: false, won: false, busy: false };

    if (mode === "picture" || mode === "sentence") {
      const ds = distractors(item, 3, mode === "sentence" && settings.level === "hard");
      const options = shuffle([item, ...ds]).map((w) => ({ item: w, correct: w === item, state: "" }));
      return Object.assign(base, { kind: "choice", options });
    }

    const chars = item.w.toUpperCase().split("");
    const letterIdx = chars.map((c, i) => (c === " " ? -1 : i)).filter((i) => i >= 0);
    let hidden;
    if (mode === "missing") {
      const n = letterIdx.length;
      let k = settings.level === "easy" ? Math.max(1, Math.round(n * 0.35)) : Math.max(2, Math.round(n * 0.6));
      k = Math.min(k, n - 1);
      const pool = settings.level === "easy" ? letterIdx.filter((i) => i !== 0) : letterIdx;
      hidden = shuffle(pool).slice(0, k);
    } else {
      const firsts = new Set();
      if (settings.level === "easy") chars.forEach((c, i) => { if (c !== " " && (i === 0 || chars[i - 1] === " ")) firsts.add(i); });
      hidden = letterIdx.filter((i) => !firsts.has(i));
    }
    const hiddenSet = new Set(hidden);
    const slots = chars.map((c, i) => ({ ch: c, space: c === " ", given: c === " " || !hiddenSet.has(i), tile: null, state: "", locked: false }));
    const letters = hidden.map((i) => chars[i]);
    if (mode === "missing" && settings.level === "hard") for (let j = 0; j < 3; j++) letters.push(ABC[Math.floor(Math.random() * 26)]);
    let order = shuffle(letters);
    const target = slots.filter((s) => !s.given).map((s) => s.ch).join("");
    for (let t = 0; t < 12 && letters.length > 1 && order.join("") === target; t++) order = shuffle(letters);
    const tiles = order.map((ch, id) => ({ id, ch, used: false }));
    return Object.assign(base, { kind: "spell", slots, tiles, placed: [], pop: -1 });
  }

  function newRound() {
    R = buildRound(G.list[G.i]);
    const hard = settings.level === "hard";
    const noImg = R.mode === "picture" || (R.mode === "sentence" && hard);
    $("#card").className = `card mode-${R.mode} kind-${R.kind}` + (noImg ? " no-img" : "");

    const img = $("#pImg");
    img.hidden = noImg;
    if (!noImg) { img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; img.src = R.item.img; img.alt = "picture clue"; }
    const pw = $("#pWord"); pw.hidden = !noImg; pw.innerHTML = "";
    if (R.mode === "picture") {
      pw.append(el("div", "big", R.item.w), el("div", "sm", `${R.item.t === "v" ? "verb" : "noun"} · ${R.item.ipa}`));
    } else if (noImg) {
      pw.append(el("div", "emoji", "📝"), el("div", "sm", "Read the sentence and choose the missing word"));
    }
    $("#pMode").textContent = MODE_TAG[R.mode];
    $("#listenBtn").hidden = R.mode === "sentence";

    const showClue = R.kind === "spell" || (R.mode === "picture" && !hard);
    $("#clue").hidden = !showClue;
    $("#pType").textContent = R.item.t === "v" ? "verb" : "noun";
    $("#pVi").textContent = R.item.vi;

    $("#pSentence").hidden = R.mode !== "sentence";
    $("#slots").hidden = R.kind !== "spell";
    $("#bank").hidden = R.kind !== "spell";
    $("#choices").hidden = R.kind !== "choice";
    $("#answerArea").hidden = false;
    $("#feedback").classList.remove("show");
    $("#toast").textContent = "";
    updateHud();
    render();
    if (R.mode === "picture" && !hard) setTimeout(() => speak(R.item.w), 300);
  }

  /* ---------- rendering ---------- */
  function render() {
    if (R.kind === "spell") renderSpell(); else renderChoices();
  }

  function sizeSlots() {
    const maxLen = Math.max(...R.item.w.split(" ").map((w) => w.length));
    const W = $("#slots").clientWidth || 320;
    const gap = maxLen >= 9 && W < 420 ? 3 : 6;
    document.documentElement.style.setProperty("--gap", gap + "px");
    let s = Math.floor((W - gap * (maxLen - 1)) / maxLen);
    s = Math.max(24, Math.min(54, s));
    document.documentElement.style.setProperty("--slot", s + "px");
    const bw = $("#bank").clientWidth || 320;
    const perRow = Math.max(5, Math.ceil(R.tiles.length / 2));
    let t = Math.floor((bw - 28 - 9 * (perRow - 1)) / perRow);
    t = Math.max(40, Math.min(56, t));
    document.documentElement.style.setProperty("--tile", t + "px");
  }

  function renderSpell() {
    const { slots, tiles } = R;
    const box = $("#slots"); box.innerHTML = "";
    const nextIdx = R.done ? -1 : slots.findIndex((s) => !s.given && s.tile === null);
    let group = el("div", "word"); let k = 0;
    slots.forEach((s, i) => {
      if (s.space) { box.appendChild(group); group = el("div", "word"); return; }
      const d = el("button", "slot");
      if (s.given) { d.classList.add("given"); d.textContent = s.ch; d.disabled = true; }
      else if (s.state === "revealed") { d.textContent = s.ch; d.disabled = true; }
      else if (s.tile !== null) {
        d.classList.add(s.locked ? "hinted" : "filled"); d.textContent = tiles[s.tile].ch;
        if (!s.locked && !R.done) d.addEventListener("click", () => unplace(i)); else d.disabled = true;
      } else { d.classList.add("empty"); d.disabled = true; if (i === nextIdx) d.classList.add("next"); }
      if (s.state) d.classList.add(s.state);
      if (s.state === "right") d.style.setProperty("--d", (k * 0.04) + "s");
      if (i === R.pop) d.classList.add("pop");
      k++;
      group.appendChild(d);
    });
    box.appendChild(group);
    R.pop = -1;

    const bank = $("#bank"); bank.innerHTML = "";
    tiles.forEach((t) => {
      const b = el("button", "tile", t.ch);
      if (t.used) { b.classList.add("used"); b.tabIndex = -1; }
      b.addEventListener("click", () => place(t.id));
      bank.appendChild(b);
    });
    sizeSlots();
  }

  function renderChoices() {
    const box = $("#choices"); box.innerHTML = "";
    box.className = "choices " + (R.mode === "picture" ? "pics" : "words");
    R.options.forEach((o, i) => {
      const b = el("button", "choice");
      if (o.state) b.classList.add(o.state);
      if (R.done && !o.correct && o.state !== "wrong") b.classList.add("dim");
      b.appendChild(el("span", "num", String(i + 1)));
      if (R.mode === "picture") {
        const im = el("img"); im.src = o.item.img; im.alt = "picture " + (i + 1); b.appendChild(im);
        if (R.done) b.appendChild(el("span", "cap", o.item.w));
      } else {
        b.appendChild(el("span", "txt", o.item.w));
      }
      if (R.done || o.state) b.disabled = true;
      b.addEventListener("click", () => choose(i));
      box.appendChild(b);
    });

    if (R.mode === "sentence") {
      const [a, b] = R.item.s.split("___");
      const p = $("#pSentence"); p.innerHTML = "";
      const blank = R.done
        ? el("span", "blank filled " + (R.won ? "ok" : "rev"), a.trim() ? R.item.w : cap(R.item.w))
        : el("span", "blank");
      p.append(document.createTextNode(a), blank, document.createTextNode(b));
    }
  }

  function updateHud() {
    const n = G.list.length;
    $("#pFill").style.width = ((G.i + (R && R.done ? 1 : 0)) / n) * 100 + "%";
    $("#pCount").textContent = `Word ${Math.min(G.i + 1, n)} / ${n}`;
    $("#pScore").textContent = `⭐ ${G.score}`;
    const st = $("#pStreak");
    st.hidden = G.streak < 2; st.textContent = `🔥 ${G.streak}`;
  }
  function bump(sel) { const e = $(sel); e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }

  /* ---------- spelling actions ---------- */
  function freeSlot(i) {
    const s = R.slots[i]; if (s.tile === null) return;
    R.tiles[s.tile].used = false; s.tile = null; s.state = ""; s.locked = false;
    R.placed = R.placed.filter((x) => x !== i);
  }
  function place(id) {
    if (R.kind !== "spell" || R.done || R.busy) return;
    const t = R.tiles[id]; if (t.used) return;
    const i = R.slots.findIndex((s) => !s.given && s.tile === null); if (i < 0) return;
    R.slots[i].tile = id; R.slots[i].state = ""; t.used = true; R.placed.push(i); R.pop = i;
    $("#toast").textContent = "";
    sfx.tap(); render(); maybeCheck();
  }
  function unplace(i) {
    if (R.kind !== "spell" || R.done || R.busy) return;
    const s = R.slots[i]; if (s.tile === null || s.locked) return;
    freeSlot(i); sfx.back(); render();
  }
  function undo() {
    if (R.kind !== "spell" || R.done || R.busy) return;
    for (let j = R.placed.length - 1; j >= 0; j--) { const i = R.placed[j]; if (!R.slots[i].locked) { unplace(i); return; } }
  }
  function clearAll() {
    if (R.kind !== "spell" || R.done || R.busy) return;
    R.slots.forEach((s, i) => { if (!s.locked) freeSlot(i); });
    sfx.back(); render();
  }
  function maybeCheck() {
    if (R.slots.every((s) => s.given || s.tile !== null)) { R.busy = true; setTimeout(check, 230); }
  }
  function check() {
    const wrong = [];
    R.slots.forEach((s, i) => { if (!s.given && R.tiles[s.tile].ch !== s.ch) wrong.push(i); });
    if (!wrong.length) { success(); return; }
    R.attempts++; G.streak = 0;
    sfx.bad(); wrong.forEach((i) => (R.slots[i].state = "wrong"));
    render(); updateHud();
    setTimeout(() => {
      wrong.forEach((i) => freeSlot(i));
      R.busy = false;
      if (R.attempts >= 3) { reveal(); return; }
      render();
      $("#toast").textContent = R.attempts === 1
        ? "Not quite! The red letters went back. Try again 💪"
        : "Last try! Tap 💡 Hint if you need help.";
    }, 800);
  }
  function spellHint() {
    const i = R.slots.findIndex((s) => !s.given && (s.tile === null || R.tiles[s.tile].ch !== s.ch));
    if (i < 0) return;
    const need = R.slots[i].ch;
    if (R.slots[i].tile !== null) freeSlot(i);
    let t = R.tiles.find((x) => !x.used && x.ch === need);
    if (!t) {
      const j = R.slots.findIndex((s) => !s.given && s.tile !== null && R.tiles[s.tile].ch === need && s.ch !== need);
      if (j >= 0) { freeSlot(j); t = R.tiles.find((x) => !x.used && x.ch === need); }
    }
    if (!t) return;
    R.slots[i].tile = t.id; R.slots[i].locked = true; t.used = true; R.placed.push(i); R.pop = i;
    R.hints++; sfx.hint(); render(); maybeCheck();
  }

  /* ---------- choice actions ---------- */
  function choose(i) {
    if (R.kind !== "choice" || R.done || R.busy) return;
    const o = R.options[i]; if (!o || o.state) return;
    if (o.correct) { o.state = "right"; success(); return; }
    o.state = "wrong"; R.attempts++; G.streak = 0;
    sfx.bad(); render(); updateHud();
    if (R.attempts >= 2) { R.busy = true; setTimeout(() => { R.busy = false; reveal(); }, 700); }
    else $("#toast").textContent = "Not that one! Try again 💪";
  }
  function choiceHint() {
    const left = R.options.filter((o) => !o.correct && !o.state);
    if (left.length <= 1) { $("#toast").textContent = "No more hints, you can do it! 💪"; return; }
    pick(left).state = "gone";
    R.hints++; sfx.hint(); $("#toast").textContent = ""; render();
  }

  function hint() {
    if (R.done || R.busy) return;
    if (R.kind === "spell") spellHint(); else choiceHint();
  }

  /* ---------- round end ---------- */
  function success() {
    R.done = true; R.won = true; R.busy = false;
    const base = R.kind === "choice" ? [10, 5][Math.min(R.attempts, 1)] : [10, 6, 3][Math.min(R.attempts, 2)];
    let pts = Math.max(1, base - R.hints * 2);
    G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
    const bonus = G.streak >= 3 ? 2 : 0;
    pts += bonus; G.score += pts;
    if (R.kind === "spell") R.slots.forEach((s) => { if (!s.space) s.state = "right"; });
    const perfect = R.attempts === 0 && R.hints === 0;
    G.results.push({ item: R.item, ok: true, perfect, pts });
    sfx.good(); confetti(perfect ? 90 : 45);
    setTimeout(() => speak(R.mode === "sentence" ? R.item.s.replace("___", R.item.w) : R.item.w), 250);
    render(); updateHud(); bump("#pScore");
    showFeedback(perfect ? pick(["Perfect! 🌟", "Brilliant! 🎉", "Amazing! 🚀", "Superstar! ⭐"]) : pick(["Nice work! 👍", "You got it! ✅", "Well done! 😊"]), "good",
      `+${pts} points` + (bonus ? ` · 🔥 streak bonus` : ""));
  }
  function reveal() {
    if (R.done) return;
    R.done = true; R.busy = false;
    if (R.kind === "spell") R.slots.forEach((s, i) => { if (!s.given) { if (s.tile !== null) freeSlot(i); s.state = "revealed"; } });
    else R.options.forEach((o) => { if (o.correct) o.state = "answer"; });
    G.streak = 0;
    G.results.push({ item: R.item, ok: false, perfect: false, pts: 0 });
    setTimeout(() => speak(R.item.w), 150);
    render(); updateHud();
    showFeedback("Here's the answer 👀", "miss", "");
  }
  function showFeedback(title, cls, pts) {
    $("#answerArea").hidden = true;
    const t = $("#fbTitle"); t.textContent = title; t.className = "fb-title " + cls;
    $("#fbWord").textContent = R.item.w;
    $("#fbIpa").textContent = R.item.ipa;
    $("#fbVi").textContent = R.mode === "sentence" ? "🇻🇳 " + R.item.sv : R.kind === "choice" ? "🇻🇳 " + R.item.vi : "";
    $("#fbPts").textContent = pts;
    $("#nextBtn").textContent = G.i + 1 >= G.list.length ? "See results 🏁" : "Next ➜";
    $("#feedback").classList.add("show");
    setTimeout(() => $("#nextBtn").focus({ preventScroll: true }), 50);
  }
  function next() {
    if (!R || !R.done) return;
    G.i++;
    if (G.i >= G.list.length) finish(); else newRound();
  }

  $("#hintBtn").addEventListener("click", hint);
  $("#undoBtn").addEventListener("click", undo);
  $("#clearBtn").addEventListener("click", clearAll);
  $("#skipBtn").addEventListener("click", () => { if (!R.done && !R.busy) reveal(); });
  $("#nextBtn").addEventListener("click", next);
  $("#listenBtn").addEventListener("click", () => speak(R.item.w));
  $("#quitBtn").addEventListener("click", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); show("home"); });
  const muteBtn = $("#muteBtn");
  const paintMute = () => (muteBtn.textContent = muted ? "🔇" : "🔊");
  muteBtn.addEventListener("click", () => { muted = !muted; store.set("muted", muted); paintMute(); });
  paintMute();

  document.addEventListener("keydown", (e) => {
    if (!$("#play").classList.contains("active") || !R || e.metaKey || e.ctrlKey || e.altKey) return;
    if (R.done) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } return; }
    if (R.kind === "choice") { if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1); return; }
    if (e.key === "Backspace") { e.preventDefault(); undo(); return; }
    if (/^[a-z]$/i.test(e.key)) {
      const t = R.tiles.find((x) => !x.used && x.ch === e.key.toUpperCase());
      if (t) place(t.id); else { const b = $("#bank"); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); }
    }
  });
  window.addEventListener("resize", () => { if (R && R.kind === "spell" && $("#play").classList.contains("active")) sizeSlots(); });

  /* ---------- results ---------- */
  let lastTricky = [];
  function finish() {
    const n = G.results.length;
    const correct = G.results.filter((r) => r.ok).length;
    const perfect = G.results.filter((r) => r.perfect).length;
    const pct = G.score / (n * 10);
    const stars = pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : correct > 0 ? 1 : 0;
    $("#rStars").innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? "" : "off"}" style="animation-delay:${0.15 + i * 0.18}s">⭐</span>`).join("");
    $("#rTitle").textContent = ["Keep practising! 💪", "Good effort! 👏", "Great job! 🎉", "Outstanding! 🏆"][stars];
    $("#rScore").textContent = G.score;
    $("#rCorrect").textContent = `${correct}/${n}`;
    $("#rFirst").textContent = perfect;
    $("#rStreak").textContent = G.bestStreak;

    let isBest = false;
    if (!G.practice) {
      const prev = store.get(bestKey(), 0);
      if (G.score > prev) { store.set(bestKey(), G.score); isBest = G.score > 0; }
    }
    $("#rBest").hidden = !isBest;

    lastTricky = G.results.filter((r) => !r.perfect).map((r) => r.item);
    const pb = $("#practiceBtn");
    pb.hidden = lastTricky.length === 0;
    pb.textContent = `🎯 Practise tricky words (${lastTricky.length})`;

    const list = $("#rList"); list.innerHTML = "";
    G.results.forEach((r) => {
      const row = el("div", "rv");
      const img = el("img"); img.src = r.item.img; img.alt = "";
      const tx = el("div"); tx.append(el("div", "w", r.item.w), el("div", "m", `${r.item.ipa} · ${r.item.vi}`));
      const st = r.perfect ? el("span", "st ok", "✓ Perfect") : r.ok ? el("span", "st so", `✓ +${r.pts}`) : el("span", "st no", "✗ Review");
      row.append(img, tx, st);
      list.appendChild(row);
    });
    show("result");
    if (stars >= 2) { sfx.win(); confetti(160); }
  }
  $("#againBtn").addEventListener("click", () => startGame(G.practice ? G.list : WORDS, G.practice ? G.list.length : settings.count, G.practice));
  $("#practiceBtn").addEventListener("click", () => startGame(lastTricky, lastTricky.length, true));

  /* ---------- confetti ---------- */
  const cv = $("#confetti"), cx = cv.getContext("2d");
  let parts = [], raf = 0;
  const COLORS = ["#f43f5e", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
  function confetti(n) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.4, y: innerHeight * 0.38,
        vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 4,
        c: pick(COLORS), a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, life: 0,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    const d = devicePixelRatio;
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; p.life++;
      cx.save(); cx.translate(p.x * d, p.y * d); cx.rotate(p.a); cx.fillStyle = p.c;
      cx.globalAlpha = Math.max(0, 1 - p.life / 110);
      cx.fillRect(-p.r * d / 2, -p.r * d / 4, p.r * d, p.r * d / 2); cx.restore();
    });
    parts = parts.filter((p) => p.life < 110 && p.y < innerHeight + 40);
    raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, cv.width, cv.height), 0);
  }

  renderHome();
})();
