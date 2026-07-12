(function(){
  "use strict";

  /* ============================================================
     1. 感情キーワード判定 — 色を決める軸
     ============================================================ */
  const EMOTIONS = {
    joy:      { color:"#C97D4A", colorDark:"#7A4325", label:"よろこび",
                words:["嬉しい","うれしい","楽しい","たのしい","最高","好き","すき","やった","ありがとう","わくわく","幸せ","しあわせ","よかった","良かった","面白い","おもしろい","ハッピー"] },
    anger:    { color:"#8B3A2E", colorDark:"#501F17", label:"いかり",
                words:["怒","むかつく","ムカつく","腹立つ","許せない","うざい","最悪","イライラ","いらいら","くそ","嫌い","きらい","うるさい","ふざけるな"] },
    sorrow:   { color:"#4A5D6B", colorDark:"#263039", label:"かなしみ",
                words:["悲しい","かなしい","つらい","辛い","泣","さみしい","寂しい","しんどい","疲れた","つかれた","不安","こわい","怖い","落ち込","へこむ"] },
    surprise: { color:"#D4A843", colorDark:"#7A5C1B", label:"おどろき",
                words:["驚","びっくり","えっ","マジ","まじ","うそ","嘘","すごい","スゴイ","信じられない","なんと","衝撃","突然"] },
    thought:  { color:"#6E7B57", colorDark:"#3C4530", label:"かんがえ",
                words:["なんで","どうして","気づき","気付き","本質","つまり","要するに","考える","かんがえ","思うに","たぶん","おそらく","仮説","疑問"] },
    calm:     { color:"#B8A180", colorDark:"#6B5B3F", label:"おだやか",
                words:["普通","ふつう","まあまあ","そうですね","なるほど","了解","わかった","静か","穏やか","おだやか","落ち着"] }
  };
  const EMOTION_KEYS = Object.keys(EMOTIONS);

  function classifyEmotion(text){
    let best = null, bestScore = 0;
    for (const key of EMOTION_KEYS){
      const rule = EMOTIONS[key];
      let score = 0;
      for (const w of rule.words) if (text.indexOf(w) !== -1) score++;
      if (score > bestScore){ bestScore = score; best = key; }
    }
    if (best) return best;
    if (/[!！]{1,}/.test(text)) return "surprise";
    if (/なんで|どうして|かな[。、]?$/.test(text)) return "thought";
    if (/[?？]{1,}/.test(text)) return "sorrow";
    return "calm";
  }

  /* ============================================================
     2. 語尾・句読点のリズム判定 — 形を決める軸
     語尾が砕けている/硬い、句読点が多い/少ない、で角ばり具合を変える
     ============================================================ */
  const ENDING_RULES = [
    { key:"casual",  test:/(だよね|じゃん|かも|っしょ|よな|んだ)[。！？]?$/, shape:"round" },
    { key:"question",test:/[?？]$/, shape:"star" },
    { key:"formal",  test:/(です|ます|である|ございます)[。]?$/, shape:"cube" },
    { key:"trail",   test:/(\.\.\.|…|、)$/, shape:"plank" },
    { key:"sharp",   test:/[!！]$/, shape:"spike" }
  ];
  function classifyEnding(text){
    const trimmed = text.trim();
    for (const rule of ENDING_RULES){
      if (rule.test.test(trimmed)) return rule.shape;
    }
    const commaCount = (trimmed.match(/、/g) || []).length;
    if (commaCount >= 2) return "plank";
    return "cube";
  }

  /* ============================================================
     3. 話す速さ — 大きさ・音のテンポを決める軸
     発話の文字数 ÷ 経過時間(秒) で概算する
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

  /* ---------- 木片の形状生成（語尾リズムで形状を決定） ---------- */
  function makeBlockBody(x, y, emoKey, shape, size){
    const emo = EMOTIONS[emoKey];
    const opts = {
      restitution: 0.08, friction: 0.62, frictionStatic: 0.9, density: 0.0016,
      render: { fillStyle: emo.color, strokeStyle: emo.colorDark, lineWidth: 2 }
    };
    let body;
    switch(shape){
      case "cube":     body = Bodies.rectangle(x, y, size, size, opts); break;
      case "spike":     body = Bodies.polygon(x, y, 3, size*0.62, opts); break;
      case "plank":     body = Bodies.rectangle(x, y, size*1.9, size*0.5, opts); break;
      case "star":      body = Bodies.polygon(x, y, 6, size*0.58, opts); break;
      case "round":
      default:          body = Bodies.polygon(x, y, 16, size*0.52, opts); break;
    }
    Body.setAngle(body, Common.random(-0.15, 0.15));
    return body;
  }

  /* ---------- 落下→積む ---------- */
  function dropBlock(text){
    const emoKey = classifyEmotion(text);
    const shape = classifyEnding(text);
    const pace = estimatePace(text);
    const size = sizeFromPace(text, pace);
    const x = Common.random(W*0.28, W*0.72);
    const y = -60;
    const body = makeBlockBody(x, y, emoKey, shape, size);
    Body.setAngularVelocity(body, Common.random(-0.06, 0.06));
    World.add(world, body);
    blocks.push({ body, emoKey, shape, size, text, pace });

    if (blocks.length > 90){
      const old = blocks.shift();
      World.remove(world, old.body);
    }
    playNote(emoKey, shape, pace);
    return { emoKey, shape, pace };
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
  }

  /* ---------- 木目テクスチャ ---------- */
  function setupWoodGrainOverlay(){
    Events.on(render, "afterRender", function(){
      const ctx = render.context;
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
     音楽: 感情=スケール/音色、語尾=アーティキュレーション、速さ=テンポ
     ============================================================ */
  const SCALES = {
    joy:      ["C4","D4","E4","G4","A4","C5","D5"],
    anger:    ["C3","D#3","F#3","G3","A#3","C4"],
    sorrow:   ["A3","C4","D4","E4","F4","A4"],
    surprise: ["E5","G5","A5","B5","D6"],
    thought:  ["D4","F4","G4","A4","C5","D5"],
    calm:     ["G3","A3","C4","D4","E4","G4"]
  };
  const TIMBRE = {
    cube:  "triangle",
    spike: "sawtooth",
    plank: "sine",
    star:  "square",
    round: "sine"
  };

  let synth = null;
  let audioReady = false;
  let lastNoteIndex = {};

  function ensureAudio(){
    if (synth) return;
    if (typeof Tone === "undefined") return;
    synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.15, release: 0.6 },
      volume: -8
    }).toDestination();
  }

  async function unlockAudio(){
    if (typeof Tone === "undefined") return;
    if (!audioReady){
      await Tone.start();
      audioReady = true;
    }
    ensureAudio();
  }

  function playNote(emoKey, shape, pace){
    if (!synth) return;
    const scale = SCALES[emoKey] || SCALES.calm;
    const prevIdx = lastNoteIndex[emoKey] !== undefined ? lastNoteIndex[emoKey] : Math.floor(scale.length/2);
    const step = Common.random(-2, 2) | 0;
    let idx = Math.max(0, Math.min(scale.length - 1, prevIdx + step));
    lastNoteIndex[emoKey] = idx;
    const note = scale[idx];

    synth.set({ oscillator: { type: TIMBRE[shape] || "sine" } });
    const dur = shape === "spike" || shape === "star" ? "16n" : "8n";
    const velocity = 0.35 + pace * 0.35;
    synth.triggerAttackRelease(note, dur, undefined, velocity);
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

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  function handleFinalText(text){
    text = text.trim();
    if (!text) return;
    transcriptText.textContent = text;
    showGhost(text);
    const result = dropBlock(text);
    const emo = EMOTIONS[result.emoKey];
    statusText.textContent = "「" + emo.label + "」の木片を積みました";
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
    recognition.onresult = function(event){
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++){
        const res = event.results[i];
        if (res.isFinal) handleFinalText(res[0].transcript);
        else interim += res[0].transcript;
      }
      if (interim) transcriptText.textContent = interim;
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

  /* ============================================================
     起動
     ============================================================ */
  function boot(){
    const rect = stageEl.getBoundingClientRect();
    W = Math.round(rect.width);
    H = Math.round(rect.height);
    initPhysics();
    setupWoodGrainOverlay();
    window.addEventListener("resize", debounce(resizeStage, 200));
  }
  function debounce(fn, wait){
    let t;
    return function(){ clearTimeout(t); t = setTimeout(fn, wait); };
  }

  boot();
})();
