(function(){
  "use strict";

  /* ============================================================
     1. 感情キーワード判定 — 色を決める軸
     スコアリング方式: 単語一致 + 語尾パターン + 接続表現を加点合成
     ============================================================ */
  const EMOTIONS = {
    joy:      { color:"#C97D4A", colorDark:"#7A4325", label:"よろこび", glow:false,
                words:["嬉し","うれし","楽し","たのし","最高","好き","すき","やった","ありがと","わくわく","幸せ","しあわせ","よかっ","良かっ","面白","おもしろ","おもろ","ハッピー","嬉","楽"] },
    anger:    { color:"#8B3A2E", colorDark:"#501F17", label:"いかり", glow:false,
                words:["怒","むかつ","ムカつ","腹立","許せな","うざ","最悪","イライラ","いらいら","くそ","嫌","きら","うるさ","ふざけるな","だる"] },
    sorrow:   { color:"#4A5D6B", colorDark:"#263039", label:"かなしみ", glow:false,
                words:["悲し","かなし","つら","辛","泣","さみし","寂し","しんど","疲れ","つかれ","不安","こわ","怖","落ち込","へこ"] },
    surprise: { color:"#D4A843", colorDark:"#7A5C1B", label:"おどろき", glow:false,
                words:["驚","びっくり","えっ","マジ","まじ","うそ","嘘","すご","スゴ","信じられな","なんと","衝撃","突然"] },
    thought:  { color:"#6E7B57", colorDark:"#3C4530", label:"かんがえ", glow:false,
                words:["なんで","どうして","気づき","気付き","本質","つまり","要するに","考え","かんがえ","思う","たぶん","おそらく","仮説","疑問","なぜ","はず","というか","逆に言うと","言い換えると","結局","そもそも","前提として","仮に","例えば","たとえば","一方で","むしろ","気がす"] },
    insight:  { color:"#C9A84C", colorDark:"#6E5A1F", label:"ひらめき", glow:true,
                words:["わかった","分かった","そうか","そういうことか","なるほど","閃い","ひらめい","発見","気づい","気付い","腑に落ち","繋がった","つながった","これだ","わかったぞ","見えた","そういうことだったのか","アイデア","案として","というアイデア","という案"] },
    calm:     { color:"#B8A180", colorDark:"#6B5B3F", label:"おだやか", glow:false,
                words:["普通","ふつう","まあまあ","そうですね","了解","わかりました","静か","穏やか","おだやか","落ち着"] }
  };
  const EMOTION_KEYS = Object.keys(EMOTIONS);

  // 文末・文法パターンによる強シグナル。単語一致より重みを大きくし、
  // かんがえ系の話し方（活用ゆらぎに強い言い回し）を優先的に拾う。
  const GRAMMAR_SIGNALS = [
    { key:"thought", weight:4, test:/(かな|かも|だろう|でしょう|と思(う|って)|気がする|んじゃない|のかな|のかも)[。、]?$/ },
    { key:"thought", weight:3, test:/(なんで|どうして|なぜ)/ },
    { key:"thought", weight:2, test:/[?？]$/ },
    { key:"thought", weight:2, test:/^(そもそも|つまり|要するに|結局|一方で|逆に|仮に|例えば|たとえば)/ },
    { key:"surprise", weight:2, test:/[!！]{1,}$/ },
    { key:"insight", weight:3, test:/^(あ、|あっ、|そうか、?|なるほど、?)/ },
    // アイデアの兆し: 「面白い/良さそう/イケる/アリ」などの評価語 と
    // 「んじゃないか/かも/かもしれない」などの仮説語尾が同じ文に共存するとき、
    // 確定した気づきではなく「思いついた瞬間」としてひらめき判定する。
    // 「気がする」等はthought側にも語彙・語尾双方で乗るため、重みを強めに設定して優先させる。
    { key:"insight", weight:8, test:/(面白|おもしろ|おもろ|良さそう|よさそう|イケ|いけ|アリ|あり(かも)?|いいかも|良いかも).*(んじゃない|かもしれない|かも|気がする)/ },
    { key:"insight", weight:8, test:/(んじゃないか|かもしれない).*(面白|おもしろ|おもろ|良さそう|よさそう|イケ|いけ)/ },
    // アイデア提案の文脈: 評価語や「〜も」「〜けど」のような並列・提案の言い回しが
    // 同じ文にあれば、確定した気づきでなくとも「思いつき」としてひらめき寄りに扱う。
    { key:"insight", weight:5, test:/(面白|おもしろ|おもろ|良さそう|よさそう|イケ|いけ).*(けど|も|という|といった|みたいな)/ },
    { key:"insight", weight:4, test:/(アイデア|案)(として|も|は|だ|だけど)?/ }
  ];

  function classifyEmotion(text){
    let scores = {};
    for (const key of EMOTION_KEYS) scores[key] = 0;

    for (const key of EMOTION_KEYS){
      for (const w of EMOTIONS[key].words){
        if (text.indexOf(w) !== -1) scores[key] += 2;
      }
    }
    for (const sig of GRAMMAR_SIGNALS){
      if (sig.test.test(text)) scores[sig.key] += sig.weight;
    }

    let best = "calm", bestScore = 0;
    for (const key of EMOTION_KEYS){
      if (scores[key] > bestScore){ bestScore = scores[key]; best = key; }
    }
    if (bestScore === 0) return "calm";
    return best;
  }

  /* ============================================================
     2. 語尾・言い回しのリズム判定 — 形を決める軸
     Web Speech APIの認識結果は句読点をほぼ付けないため、
     句読点ではなく語尾の「音」そのものにマッチさせる。
     ============================================================ */
  const ENDING_RULES = [
    { key:"question",  test:/(かな|かしら|の|ですか|ますか)?[?？]$/,               shape:"star" },
    { key:"question2", test:/(なんで|どうして|なぜ).*$/,                            shape:"star" },
    { key:"casual",    test:/(だよね|だよ|じゃん|かも|っしょ|よな|んだ|んだよ)$/,   shape:"round" },
    { key:"soft",      test:/(なあ|なぁ|ねえ|ねぇ|よね|よねえ)$/,                    shape:"round" },
    { key:"formal",    test:/(です|ます|ました|でした|である|ございます)$/,         shape:"cube" },
    { key:"sharp",     test:/(だ|！|!)$/,                                            shape:"spike" },
    { key:"trail",     test:/(\.\.\.|…|て|で|けど|が|し)$/,                          shape:"plank" },
    { key:"chain",     test:/(て|で).*(て|で)/,                                      shape:"L" },
    { key:"assertive", test:/^.{1,8}(だ|だね|でしょ)$/,                              shape:"prism" }
  ];
  function classifyEnding(text){
    const trimmed = text.trim();
    for (const rule of ENDING_RULES){
      if (rule.test.test(trimmed)) return rule.shape;
    }
    const commaCount = (trimmed.match(/、/g) || []).length;
    if (commaCount >= 2) return "plank";
    // どれにも当てはまらない場合はランダムに割り振り、単調さを避ける
    const fallback = ["cube","round","prism","blob"];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  /* ============================================================
     3. 話す速さ — 大きさ・音のテンポを決める軸
     ============================================================ */
  let lastFinalAt = Date.now();
  function estimatePace(text){
    const now = Date.now();
    const elapsedSec = Math.max(0.6, (now - lastFinalAt) / 1000);
    lastFinalAt = now;
    const charsPerSec = text.length / elapsedSec;
    return Math.max(0, Math.min(1, (charsPerSec - 1.5) / 6));
  }

  function sizeFromPace(text, pace){
    const base = 34 + Math.min(30, text.length * 1.1);
    const paceBoost = pace * 22;
    return Math.round(base + paceBoost);
  }

  /* ============================================================
     永続化: localStorageに発言ログを保存し、次回起動時に復元
     ============================================================ */
  const STORAGE_KEY = "kotoba-tsumiki:blocks:v1";
  function saveHistory(){
    try{
      const data = blocks.map(b => ({ emoKey:b.emoKey, shape:b.shape, size:b.size, text:b.text }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(e){ /* storage unavailable, ignore */ }
  }
  function loadHistory(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.slice(-60);
    }catch(e){ return []; }
  }
  function clearHistory(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }

  /* ============================================================
     Matter.js セットアップ
     ============================================================ */
  const { Engine, Render, Runner, World, Bodies, Body, Events, Common } = Matter;

  const stageEl = document.getElementById("stage");
  const canvas = document.getElementById("stageCanvas");
  const ghostEl = document.getElementById("speechGhost");

  let engine, world, render, runner;
  let W = 0, H = 0;
  let walls = [];
  let blocks = [];

  function initPhysics(){
    engine = Engine.create();
    world = engine.world;
    engine.gravity.y = 1.0;

    render = Render.create({
      canvas: canvas,
      engine: engine,
      options: { width: W, height: H, wireframes:false, background:"transparent", pixelRatio: window.devicePixelRatio || 1 }
    });
    Render.run(render);

    runner = Runner.create();
    Runner.run(runner, engine);

    buildWalls();
    Events.on(engine, "afterUpdate", maybeTremor);
  }

  function resizeStage(){
    const rect = stageEl.getBoundingClientRect();
    W = Math.round(rect.width);
    H = Math.round(rect.height);
    if (render){
      render.canvas.width = W * (window.devicePixelRatio || 1);
      render.canvas.height = H * (window.devicePixelRatio || 1);
      render.canvas.style.width = W + "px";
      render.canvas.style.height = H + "px";
      render.options.width = W;
      render.options.height = H;
      Render.setPixelRatio(render, window.devicePixelRatio || 1);
      rebuildWalls();
    }
  }

  function buildWalls(){
    const t = 60;
    const floor = Bodies.rectangle(W/2, H + t/2 - 2, W*2, t, { isStatic:true, render:{visible:false}, friction:0.9 });
    const left  = Bodies.rectangle(-t/2, H/2, t, H*3, { isStatic:true, render:{visible:false} });
    const right = Bodies.rectangle(W + t/2, H/2, t, H*3, { isStatic:true, render:{visible:false} });
    walls = [floor, left, right];
    World.add(world, walls);
  }
  function rebuildWalls(){ World.remove(world, walls); buildWalls(); }

  /* ---------- 木片の形状生成 ---------- */
  function makeBlockBody(x, y, emoKey, shape, size){
    const emo = EMOTIONS[emoKey];
    const opts = {
      restitution: 0.02, friction: 0.95, frictionStatic: 1.1, frictionAir: 0.012, density: 0.0022,
      render: { fillStyle: emo.color, strokeStyle: emo.colorDark, lineWidth: 2 }
    };
    let body;
    switch(shape){
      case "cube":      body = Bodies.rectangle(x, y, size, size, opts); break;
      case "spike":      body = Bodies.polygon(x, y, 3, size*0.62, opts); break;
      case "plank":      body = Bodies.rectangle(x, y, size*1.9, size*0.5, opts); break;
      case "star":       body = Bodies.polygon(x, y, 6, size*0.58, opts); break;
      case "prism":      body = Bodies.polygon(x, y, 5, size*0.56, opts); break;
      case "round":      body = Bodies.polygon(x, y, 16, size*0.5, { ...opts, friction: 1.15, frictionStatic: 1.3 }); break;
      case "L": {
        // L字はrectangleのパーツを合成した複合ボディ。
        // Matter.jsは複合ボディの各パーツごとにrenderを見るため、両方に明示指定する。
        const s = size * 0.62;
        const partOpts = { render: { fillStyle: emo.color, strokeStyle: emo.colorDark, lineWidth: 2 } };
        const partA = Bodies.rectangle(-s*0.25, 0, s*0.5, s*1.4, partOpts);
        const partB = Bodies.rectangle(s*0.25, s*0.45, s*1.0, s*0.5, partOpts);
        body = Matter.Body.create({ parts: [partA, partB], ...opts });
        break;
      }
      case "blob": {
        // 不定形多角形（角数と半径をランダムに揺らす）
        const sides = 5 + Math.floor(Common.random(0, 3));
        body = Bodies.polygon(x, y, sides, size*0.55, opts);
        break;
      }
      default:           body = Bodies.rectangle(x, y, size, size, opts); break;
    }
    Body.setAngle(body, Common.random(-0.1, 0.1));
    return body;
  }

  /* ---------- 落下→積む ---------- */
  function dropBlock(text, opts){
    opts = opts || {};
    const emoKey = classifyEmotion(text);
    const shape = classifyEnding(text);
    const pace = opts.silent ? 0.3 : estimatePace(text);
    const size = sizeFromPace(text, pace);
    const x = opts.x !== undefined ? opts.x : Common.random(W*0.28, W*0.72);
    const y = -60;
    const body = makeBlockBody(x, y, emoKey, shape, size);
    Body.setAngularVelocity(body, Common.random(-0.06, 0.06));
    World.add(world, body);
    const glow = !!EMOTIONS[emoKey].glow;
    const entry = { body, emoKey, shape, size, text, pace, glow, bornAt: Date.now() };
    blocks.push(entry);

    if (blocks.length > 90){
      const old = blocks.shift();
      World.remove(world, old.body);
    }
    if (!opts.silent){
      playNote(emoKey, shape, pace);
      saveHistory();
    }
    return { emoKey, shape, pace, glow };
  }

  /* ---------- 崩落演出 ---------- */
  let lastTremor = 0;
  function maybeTremor(){
    const now = Date.now();
    if (blocks.length < 8) return;
    if (now - lastTremor < 9000) return;
    const maxHeight = blocks.reduce((m,b)=> Math.min(m, b.body.position.y), H);
    const stackHeightRatio = 1 - (maxHeight / H);
    if (stackHeightRatio < 0.35) return;
    const chance = Math.min(0.55, stackHeightRatio * 0.6);
    if (Math.random() < chance * 0.02){
      lastTremor = now;
      triggerTremor();
    }
  }
  function triggerTremor(){
    for (const b of blocks){
      const fx = Common.random(-0.012, 0.012) * b.body.mass;
      const fy = Common.random(-0.02, -0.002) * b.body.mass;
      Body.applyForce(b.body, b.body.position, { x: fx, y: fy });
    }
  }
  function clearAll(){
    for (const b of blocks) World.remove(world, b.body);
    blocks = [];
    clearHistory();
  }

  /* ---------- 木目テクスチャ + ひらめきの発光 ---------- */
  function setupWoodGrainOverlay(){
    Events.on(render, "afterRender", function(){
      const ctx = render.context;
      const now = Date.now();

      // 発光レイヤー（木目より先に描いて下敷きにする）
      ctx.save();
      for (const b of blocks){
        if (!b.glow) continue;
        const body = b.body;
        const age = now - b.bornAt;
        const burst = Math.max(0, 1 - age / 900); // 出現直後にパッと明るい
        const ambient = 0.35 + Math.sin(now/700 + body.position.x) * 0.12; // その後もじんわり
        const alpha = Math.min(0.85, ambient + burst * 0.9);
        const s = b.size;
        const grad = ctx.createRadialGradient(body.position.x, body.position.y, s*0.1, body.position.x, body.position.y, s*1.1);
        grad.addColorStop(0, "rgba(255, 226, 140," + alpha + ")");
        grad.addColorStop(1, "rgba(255, 226, 140, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, s*1.1, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // 木目
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1;
      for (const b of blocks){
        const body = b.body;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.strokeStyle = EMOTIONS[b.emoKey].colorDark;
        const s = b.size;
        for (let i=0;i<3;i++){
          const off = (i - 1) * (s*0.28);
          ctx.beginPath();
          ctx.moveTo(-s*0.5, off);
          ctx.bezierCurveTo(-s*0.15, off + s*0.06, s*0.15, off - s*0.06, s*0.5, off);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    });
  }

  /* ============================================================
     音楽: 会話全体の流れをジャズセッションとして表現する
     - テンポ: 直近の発言頻度でBPMが動的に変わる（テンポよく話すほど速く、間が空くほど遅く）
     - 不協和: 直近の感情が対立するほど、コードにテンションノートが混ざる
     - 収束: 同じ感情が続くほど、コードが解決に向かい落ち着く
     これらは常時計算され、ウォーキングベース・ブラシ・パッドのループになめらかに反映される。
     ============================================================ */
  const SCALES = {
    joy:      ["C4","D4","E4","G4","A4","C5","D5"],
    anger:    ["C3","D#3","F#3","G3","A#3","C4"],
    sorrow:   ["A3","C4","D4","E4","F4","A4"],
    surprise: ["E5","G5","A5","B5","D6"],
    thought:  ["D4","F4","G4","A4","C5","D5"],
    insight:  ["C5","E5","G5","B5","C6"],
    calm:     ["G3","A3","C4","D4","E4","G4"]
  };
  // 感情ごとの基本コード（協和トーン）
  const CHORDS = {
    joy:      ["C4","E4","G4","B4"],   // Cmaj7
    anger:    ["C3","D#3","F#3","A3"], // Cdim7
    sorrow:   ["A3","C4","E4","G4"],   // Am7
    surprise: ["E4","G#4","B4","D5"],  // E7
    thought:  ["D4","F4","A4","C5"],   // Dm7
    insight:  ["C4","E4","G4","A4"],   // C6
    calm:     ["G3","B3","D4","F4"]    // Gmaj7
  };
  // コードに足すテンションノート（不協和が強いほど混ぜる半音・増4度系の緊張音）
  const TENSIONS = {
    joy:      "F#4",
    anger:    "F4",
    sorrow:   "Bb3",
    surprise: "C5",
    thought:  "G#4",
    insight:  "D#5",
    calm:     "C#4"
  };
  // 感情同士の「対立度」。0=近い(協和), 1=対立(不協和)
  const EMOTION_DISTANCE = {
    joy:      { joy:0, insight:0.1, calm:0.3, thought:0.4, surprise:0.5, sorrow:0.8, anger:1.0 },
    anger:    { anger:0, sorrow:0.4, thought:0.5, surprise:0.6, calm:0.8, insight:0.9, joy:1.0 },
    sorrow:   { sorrow:0, anger:0.4, thought:0.3, calm:0.4, insight:0.7, surprise:0.7, joy:0.8 },
    surprise: { surprise:0, insight:0.3, joy:0.5, thought:0.5, anger:0.6, calm:0.6, sorrow:0.7 },
    thought:  { thought:0, insight:0.2, sorrow:0.3, joy:0.4, calm:0.4, anger:0.5, surprise:0.5 },
    insight:  { insight:0, thought:0.2, joy:0.1, surprise:0.3, calm:0.4, sorrow:0.7, anger:0.9 },
    calm:     { calm:0, thought:0.4, joy:0.3, sorrow:0.4, surprise:0.6, anger:0.8, insight:0.4 }
  };
  const TIMBRE = {
    cube:  "triangle",
    spike: "sawtooth",
    plank: "sine",
    star:  "square",
    round: "sine"
  };

  const BPM_MIN = 58, BPM_MID = 78, BPM_MAX = 132;

  let synth = null;
  let bassSynth = null;
  let hatSynth = null;
  let padSynth = null;
  let audioReady = false;
  let grooveOn = true;
  let lastNoteIndex = {};
  let lastPlayedAt = 0;
  let currentChordKey = "calm";
  let reactPulse = 0;
  let hatAccent = 0;

  // 直近の発言履歴（感情とタイムスタンプ）。会話の状態計算に使う。
  let emotionHistory = []; // [{ key, at }]
  const HISTORY_WINDOW_MS = 30000;

  function recordEmotionHistory(emoKey){
    const now = Date.now();
    emotionHistory.push({ key: emoKey, at: now });
    emotionHistory = emotionHistory.filter(e => now - e.at < HISTORY_WINDOW_MS).slice(-12);
  }

  // 直近の発言間隔からBPMを算出。テンポよく話すほど速く、間が空くほど遅くなる。
  function computeTargetBpm(){
    if (emotionHistory.length < 2) return BPM_MID;
    const recent = emotionHistory.slice(-6);
    let gaps = [];
    for (let i = 1; i < recent.length; i++){
      gaps.push(recent[i].at - recent[i-1].at);
    }
    const avgGapSec = (gaps.reduce((a,b)=>a+b, 0) / gaps.length) / 1000;
    // 1秒間隔なら速く、8秒以上なら遅く
    const t = Math.max(0, Math.min(1, 1 - (avgGapSec - 1) / 7));
    return Math.round(BPM_MIN + (BPM_MAX - BPM_MIN) * t);
  }

  // 直近の感情の対立度から不協和度を算出。0=協和、1=強い不協和。
  function computeDissonance(){
    if (emotionHistory.length < 2) return 0;
    const recent = emotionHistory.slice(-4);
    let total = 0, count = 0;
    for (let i = 1; i < recent.length; i++){
      const a = recent[i-1].key, b = recent[i].key;
      const dist = (EMOTION_DISTANCE[a] && EMOTION_DISTANCE[a][b] !== undefined) ? EMOTION_DISTANCE[a][b] : 0.5;
      total += dist;
      count++;
    }
    return count ? total / count : 0;
  }

  // 直近で同じ感情が連続しているほど収束度が高い。0=バラバラ、1=完全に収束。
  function computeConvergence(){
    if (emotionHistory.length < 2) return 0;
    const recent = emotionHistory.slice(-4);
    let same = 0;
    for (let i = 1; i < recent.length; i++){
      if (recent[i].key === recent[i-1].key) same++;
    }
    return same / (recent.length - 1);
  }

  function ensureAudio(){
    if (synth) return;
    if (typeof Tone === "undefined") return;

    synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.15, release: 0.6 },
      volume: -8
    }).toDestination();

    bassSynth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.4 },
      volume: -16
    }).toDestination();

    hatSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0 },
      volume: -28
    }).toDestination();

    padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 1.2, decay: 0.5, sustain: 0.6, release: 2.5 },
      volume: -22
    }).toDestination();

    Tone.Transport.bpm.value = BPM_MID;
    setupGroove();
    startFlowTracker();
  }

  // BPMを毎秒なめらかに目標値へ寄せていく（急変せずスライドするように）
  function startFlowTracker(){
    setInterval(() => {
      if (!grooveOn || typeof Tone === "undefined") return;
      const target = computeTargetBpm();
      const cur = Tone.Transport.bpm.value;
      const next = cur + (target - cur) * 0.25;
      Tone.Transport.bpm.rampTo(next, 1.5);
    }, 2000);
  }

  function setupGroove(){
    let bassStep = 0;
    new Tone.Loop((time) => {
      if (!grooveOn) return;
      const chord = CHORDS[currentChordKey] || CHORDS.calm;
      const note = chord[bassStep % chord.length];
      bassSynth.triggerAttackRelease(Tone.Frequency(note).transpose(-12), "4n", time, 0.55);
      if (reactPulse > 0){
        reactPulse--;
        const passingIdx = (bassStep + 1) % chord.length;
        const passing = chord[passingIdx];
        bassSynth.triggerAttackRelease(Tone.Frequency(passing).transpose(-12), "8n", time + Tone.Time("8n").toSeconds(), 0.4);
      }
      bassStep++;
    }, "4n").start(0);

    new Tone.Loop((time) => {
      if (!grooveOn) return;
      const vel = hatAccent > 0 ? 0.55 : 0.3;
      if (hatAccent > 0) hatAccent--;
      hatSynth.triggerAttackRelease("16n", time, vel);
    }, "8n").start("8n");

    // コードパッド: 不協和度が高いほどテンションノートを重ね、
    // 収束度が高いほど和音を薄く協和にまとめる（解決していく感じ）
    new Tone.Loop((time) => {
      if (!grooveOn) return;
      const chord = CHORDS[currentChordKey] || CHORDS.calm;
      const dissonance = computeDissonance();
      const convergence = computeConvergence();
      let notes = chord.slice();
      if (dissonance > 0.45 && TENSIONS[currentChordKey]){
        notes = notes.concat([TENSIONS[currentChordKey]]);
      }
      if (convergence > 0.6){
        notes = notes.slice(0, 3); // 収束時は音数を減らしすっきり着地させる
      }
      const vel = 0.14 + dissonance * 0.12;
      padSynth.triggerAttackRelease(notes, "2m", time, vel);
    }, "2m").start(0);

    Tone.Transport.start();
  }

  async function unlockAudio(){
    if (typeof Tone === "undefined") return;
    if (!audioReady){
      await Tone.start();
      audioReady = true;
    }
    ensureAudio();
  }

  function setGroove(on){
    grooveOn = on;
  }

  function playNote(emoKey, shape, pace){
    if (!synth) return;
    currentChordKey = emoKey;
    recordEmotionHistory(emoKey);

    const scale = SCALES[emoKey] || SCALES.calm;
    const prevIdx = lastNoteIndex[emoKey] !== undefined ? lastNoteIndex[emoKey] : Math.floor(scale.length/2);

    const now = Date.now();
    const gapSec = (now - lastPlayedAt) / 1000;
    lastPlayedAt = now;
    const isCallResponse = gapSec < 2.2;
    const maxStep = isCallResponse ? 1 : 2;
    const step = Math.floor(Common.random(-maxStep, maxStep + 1));
    let idx = Math.max(0, Math.min(scale.length - 1, prevIdx + step));
    lastNoteIndex[emoKey] = idx;
    const note = scale[idx];

    synth.set({ oscillator: { type: TIMBRE[shape] || "sine" } });
    const dur = shape === "spike" || shape === "star" ? "16n" : "8n";
    const velocity = 0.35 + pace * 0.35;

    const humanize = isCallResponse ? Common.random(-0.02, 0.01) : Common.random(-0.04, 0.04);
    synth.triggerAttackRelease(note, dur, Tone.now() + Math.max(0, humanize), velocity);

    reactPulse = 1;
    hatAccent = 3;
  }

  /* ============================================================
     発言ゴースト演出
     ============================================================ */
  let ghostTimer = null;
  function showGhost(text){
    clearTimeout(ghostTimer);
    ghostEl.textContent = text;
    ghostEl.style.transition = "none";
    ghostEl.style.opacity = "0";
    ghostEl.style.transform = "translateX(-50%) translateY(-6px)";
    void ghostEl.offsetWidth;
    ghostEl.style.transition = "opacity 0.5s ease, transform 0.9s ease";
    ghostEl.style.opacity = "0.9";
    ghostEl.style.transform = "translateX(-50%) translateY(0px)";
    ghostTimer = setTimeout(function(){
      ghostEl.style.opacity = "0";
      ghostEl.style.transform = "translateX(-50%) translateY(10px)";
    }, 1400);
  }

  /* ============================================================
     音声認識
     ============================================================ */
  const micBtn = document.getElementById("micBtn");
  const statusText = document.getElementById("statusText");
  const transcriptText = document.getElementById("transcriptText");
  const fallbackInput = document.getElementById("fallbackInput");
  const clearBtn = document.getElementById("clearBtn");
  const grooveBtn = document.getElementById("grooveBtn");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  let lastCommittedText = "";
  let lastCommittedAt = 0;
  const DUP_WINDOW_MS = 4000;

  function isDuplicateOfRecent(text){
    if (!lastCommittedText) return false;
    if (Date.now() - lastCommittedAt > DUP_WINDOW_MS) return false;
    // 同一文、または一方が他方を包含する場合（確定の重複送信で
    // 「これ面白い」→「これ面白いんじゃないかな」のように後続が伸びるケースを含む）は重複とみなす
    if (text === lastCommittedText) return true;
    if (text.length > lastCommittedText.length && text.indexOf(lastCommittedText) !== -1) return true;
    if (lastCommittedText.length > text.length && lastCommittedText.indexOf(text) !== -1) return true;
    return false;
  }

  function handleFinalText(text){
    text = text.trim();
    if (!text) return;
    if (isDuplicateOfRecent(text)) return;
    lastCommittedText = text;
    lastCommittedAt = Date.now();
    transcriptText.textContent = text;
    showGhost(text);
    const result = dropBlock(text);
    const emo = EMOTIONS[result.emoKey];
    statusText.textContent = result.glow
      ? "「" + emo.label + "」が光りました"
      : "「" + emo.label + "」の木片を積みました";
  }

  if (SpeechRecognition){
    recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function(){
      listening = true;
      micBtn.classList.add("listening");
      statusText.textContent = "聞いています…";
    };
    recognition.onend = function(){
      listening = false;
      micBtn.classList.remove("listening");
      if (statusText.textContent === "聞いています…"){
        statusText.textContent = "マイクを押して話してください";
      }
    };
    recognition.onerror = function(e){
      listening = false;
      micBtn.classList.remove("listening");
      if (e.error === "not-allowed" || e.error === "service-not-allowed"){
        statusText.textContent = "マイクの使用が許可されていません";
        fallbackInput.style.display = "block";
      } else if (e.error === "no-speech"){
        statusText.textContent = "声が聞こえませんでした。もう一度どうぞ";
      } else {
        statusText.textContent = "音声認識でエラーが発生しました";
      }
    };
    // isFinalの確定を待たず、無音が続いたら現時点のinterim結果を確定扱いにする。
    // 日本語は句読点なしで話すことが多く、ブラウザのisFinal判定が遅れがちなため。
    let silenceTimer = null;
    let pendingInterim = "";
    const SILENCE_MS = 1100;

    function scheduleSilenceCommit(){
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function(){
        if (pendingInterim.trim()){
          const text = pendingInterim;
          pendingInterim = "";
          handleFinalText(text);
        }
      }, SILENCE_MS);
    }

    recognition.onresult = function(event){
      let interim = "";
      let hadFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++){
        const res = event.results[i];
        if (res.isFinal){
          hadFinal = true;
          pendingInterim = "";
          clearTimeout(silenceTimer);
          handleFinalText(res[0].transcript);
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim){
        transcriptText.textContent = interim;
        pendingInterim = interim;
        scheduleSilenceCommit();
      } else if (hadFinal){
        clearTimeout(silenceTimer);
      }
    };

    micBtn.addEventListener("click", async function(){
      await unlockAudio();
      if (listening){
        recognition.stop();
      } else {
        try{ recognition.start(); } catch(err){ /* already started */ }
      }
    });
  } else {
    statusText.textContent = "このブラウザは音声入力に対応していません";
    fallbackInput.style.display = "block";
    micBtn.style.opacity = "0.4";
    micBtn.style.cursor = "not-allowed";
    micBtn.setAttribute("aria-disabled", "true");
  }

  fallbackInput.addEventListener("focus", unlockAudio);
  fallbackInput.addEventListener("keydown", function(e){
    if (e.key === "Enter" && fallbackInput.value.trim()){
      handleFinalText(fallbackInput.value);
      fallbackInput.value = "";
    }
  });

  clearBtn.addEventListener("click", function(){
    clearAll();
    statusText.textContent = "積み木を片付けました";
  });

  grooveBtn.addEventListener("click", async function(){
    await unlockAudio();
    const nextOn = !grooveOn;
    setGroove(nextOn);
    grooveBtn.textContent = nextOn ? "セッション: オン" : "セッション: オフ";
    grooveBtn.setAttribute("aria-pressed", String(nextOn));
  });

  /* ============================================================
     起動: 保存された履歴から積み木を復元
     ============================================================ */
  function restoreHistory(){
    const history = loadHistory();
    if (!history.length) return;
    let i = 0;
    const step = function(){
      if (i >= history.length) return;
      const item = history[i];
      const x = Common.random(W*0.28, W*0.72);
      const body = makeBlockBody(x, -60, item.emoKey, item.shape, item.size);
      World.add(world, body);
      const glow = !!EMOTIONS[item.emoKey] && !!EMOTIONS[item.emoKey].glow;
      blocks.push({ body, emoKey: item.emoKey, shape: item.shape, size: item.size, text: item.text, pace: 0.3, glow, bornAt: Date.now() - 5000 });
      i++;
      setTimeout(step, 55);
    };
    step();
  }

  function boot(){
    const rect = stageEl.getBoundingClientRect();
    W = Math.round(rect.width);
    H = Math.round(rect.height);
    initPhysics();
    setupWoodGrainOverlay();
    window.addEventListener("resize", debounce(resizeStage, 200));
    restoreHistory();
  }
  function debounce(fn, wait){
    let t;
    return function(){ clearTimeout(t); t = setTimeout(fn, wait); };
  }

  boot();
})();
