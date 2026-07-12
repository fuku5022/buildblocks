(function(){
  "use strict";

  /* ============================================================
     感情判定 — キーワードベースの簡易分類
     ============================================================ */
  const EMOTION_RULES = [
    {
      key: "joy",
      color: "#C97D4A",
      colorDark: "#7A4325",
      colorLight: "#E4A97C",
      label: "よろこび",
      words: ["嬉しい","うれしい","楽しい","たのしい","最高","好き","すき","やった","ありがとう","わくわく","幸せ","しあわせ","笑","嬉","よかった","良かった","面白い","おもしろい","ハッピー","ワクワク"]
    },
    {
      key: "anger",
      color: "#8B3A2E",
      colorDark: "#501F17",
      colorLight: "#B15A47",
      label: "いかり",
      words: ["怒","むかつく","ムカつく","腹立つ","許せない","うざい","最悪","イライラ","いらいら","くそ","バカ","ばか","嫌い","きらい","うるさい","ふざけるな","despic"]
    },
    {
      key: "sorrow",
      color: "#4A5D6B",
      colorDark: "#263039",
      colorLight: "#6E8393",
      label: "かなしみ",
      words: ["悲しい","かなしい","つらい","辛い","泣","さみしい","寂しい","しんどい","疲れた","つかれた","無理","むり","不安","こわい","怖い","落ち込","へこむ","痛い","いたい"]
    },
    {
      key: "surprise",
      color: "#D4A843",
      colorDark: "#7A5C1B",
      colorLight: "#E8C978",
      label: "おどろき",
      words: ["驚","びっくり","えっ","マジ","まじ","うそ","嘘","すごい","スゴイ","信じられない","なんと","衝撃","突然"]
    },
    {
      key: "calm",
      color: "#B8A180",
      colorDark: "#6B5B3F",
      colorLight: "#D2C09E",
      label: "おだやか",
      words: ["普通","ふつう","まあまあ","そうですね","なるほど","了解","わかった","静か","穏やか","おだやか","落ち着"]
    }
  ];
  const DEFAULT_EMOTION = EMOTION_RULES.find(e => e.key === "calm");

  function classifyEmotion(text){
    let best = null, bestScore = 0;
    for (const rule of EMOTION_RULES){
      let score = 0;
      for (const w of rule.words){
        if (text.indexOf(w) !== -1) score++;
      }
      if (score > bestScore){ bestScore = score; best = rule; }
    }
    if (!best) {
      // 長さや感嘆符などのシグナルでフォールバック分類
      if (/[!！]{1,}/.test(text)) return EMOTION_RULES.find(e=>e.key==="surprise");
      if (/[?？]{1,}/.test(text)) return EMOTION_RULES.find(e=>e.key==="sorrow");
      return DEFAULT_EMOTION;
    }
    return best;
  }

  function sizeFromText(text){
    const len = text.length;
    const s = 34 + Math.min(46, len * 1.6);
    return Math.round(s);
  }

  /* ============================================================
     Matter.js セットアップ
     ============================================================ */
  const { Engine, Render, Runner, World, Bodies, Body, Events, Composite, Vector, Common } = Matter;

  const stageEl = document.getElementById("stage");
  const canvas = document.getElementById("stageCanvas");
  const ghostEl = document.getElementById("speechGhost");

  let engine, world, render, runner;
  let W = 0, H = 0;
  let walls = [];
  let blocks = []; // { body, shape info }

  function initPhysics(){
    engine = Engine.create();
    world = engine.world;
    engine.gravity.y = 1.0;

    render = Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: W,
        height: H,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1
      }
    });
    Render.run(render);

    runner = Runner.create();
    Runner.run(runner, engine);

    buildWalls();

    // 崩落の演出: たまに軽い揺れを加える
    Events.on(engine, "afterUpdate", function(){
      maybeTremor();
    });

    // 衝突音の代わりに軽い視覚フラッシュ（コンソールでの演出は割愛、木の質感を活かす）
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
    const thickness = 60;
    const floor = Bodies.rectangle(W/2, H + thickness/2 - 2, W * 2, thickness, { isStatic: true, render: { visible: false }, friction: 0.9 });
    const left = Bodies.rectangle(-thickness/2, H/2, thickness, H * 3, { isStatic: true, render: { visible: false } });
    const right = Bodies.rectangle(W + thickness/2, H/2, thickness, H * 3, { isStatic: true, render: { visible: false } });
    walls = [floor, left, right];
    World.add(world, walls);
  }

  function rebuildWalls(){
    World.remove(world, walls);
    buildWalls();
  }

  /* ---------- 木片の形状生成 ---------- */
  function makeBlockBody(x, y, emotion, size){
    const opts = {
      restitution: 0.08,
      friction: 0.62,
      frictionStatic: 0.9,
      density: 0.0016,
      render: {
        fillStyle: emotion.color,
        strokeStyle: emotion.colorDark,
        lineWidth: 2
      }
    };

    let body;
    switch(emotion.key){
      case "joy": { // 立方体
        body = Bodies.rectangle(x, y, size, size, opts);
        break;
      }
      case "anger": { // 三角柱（とがった印象）
        body = Bodies.polygon(x, y, 3, size * 0.62, opts);
        break;
      }
      case "sorrow": { // 細長い板
        body = Bodies.rectangle(x, y, size * 1.9, size * 0.5, opts);
        break;
      }
      case "surprise": { // 星形に近い五角/六角の角ばった形
        body = Bodies.polygon(x, y, 6, size * 0.58, opts);
        break;
      }
      case "calm":
      default: { // 円柱（角丸多角形で近似）
        body = Bodies.polygon(x, y, 16, size * 0.52, opts);
        break;
      }
    }
    Body.setAngle(body, Common.random(-0.15, 0.15));
    return body;
  }

  function addWoodTexture(ctx, body, emotion){
    // Matter.js の render は fillStyle のみ使うため、
    // afterRender で木目線を追加で描画する
  }

  /* ---------- 落下→積む ---------- */
  function dropBlock(text){
    const emotion = classifyEmotion(text);
    const size = sizeFromText(text);
    const x = Common.random(W * 0.28, W * 0.72);
    const y = -60;
    const body = makeBlockBody(x, y, emotion, size);
    Body.setAngularVelocity(body, Common.random(-0.06, 0.06));
    World.add(world, body);
    blocks.push({ body, emotion, size, text });

    // 木片が多すぎる場合は最古のものを片付ける（パフォーマンス）
    if (blocks.length > 90){
      const old = blocks.shift();
      World.remove(world, old.body);
    }
    return emotion;
  }

  /* ---------- 崩落演出 ---------- */
  let lastTremor = 0;
  function maybeTremor(){
    const now = Date.now();
    if (blocks.length < 8) return;
    if (now - lastTremor < 9000) return;
    // 積み木が高く積まれてきたら、一定確率でランダムに小さな衝撃を与える
    const maxHeight = blocks.reduce((m,b)=> Math.min(m, b.body.position.y), H);
    const stackHeightRatio = 1 - (maxHeight / H); // 0..1, 高いほど大きい
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
    for (const b of blocks){
      World.remove(world, b.body);
    }
    blocks = [];
  }

  /* ============================================================
     木目テクスチャの後処理描画
     ============================================================ */
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
        ctx.strokeStyle = b.emotion.colorDark;
        const s = b.size;
        const lines = 3;
        for (let i=0;i<lines;i++){
          const off = (i - (lines-1)/2) * (s*0.28);
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
     発言ゴースト演出
     ============================================================ */
  let ghostTimer = null;
  function showGhost(text){
    clearTimeout(ghostTimer);
    ghostEl.textContent = text;
    ghostEl.style.transition = "none";
    ghostEl.style.opacity = "0";
    ghostEl.style.transform = "translateX(-50%) translateY(-6px)";
    // force reflow
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

  function labelForEmotion(emotion){
    return emotion.label;
  }

  function handleFinalText(text){
    text = text.trim();
    if (!text) return;
    transcriptText.textContent = text;
    showGhost(text);
    const emotion = dropBlock(text);
    statusText.textContent = "「" + labelForEmotion(emotion) + "」の木片を積みました";
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
        if (res.isFinal){
          handleFinalText(res[0].transcript);
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim) transcriptText.textContent = interim;
    };

    micBtn.addEventListener("click", function(){
      if (listening){
        recognition.stop();
      } else {
        try{
          recognition.start();
        }catch(err){
          // already started, ignore
        }
      }
    });
  } else {
    statusText.textContent = "このブラウザは音声入力に対応していません";
    fallbackInput.style.display = "block";
    micBtn.style.opacity = "0.4";
    micBtn.style.cursor = "not-allowed";
    micBtn.setAttribute("aria-disabled", "true");
  }

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
    return function(){
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  boot();
})();
