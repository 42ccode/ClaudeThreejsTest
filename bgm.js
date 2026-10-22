// 全站 BGM：用 Web Audio 实时合成的 120 BPM synthwave，无需音频文件
// 对外暴露 window.BGM：playing / pulse()（0~1 鼓点脉冲）/ level() / toggle() / leave()
(() => {
  const BPM = 120, STEP = 60 / BPM / 4, BARS = 16, STEPS = BARS * 16, VOL = 0.55;
  const SEEN = 'nebula-bgm-seen', POS = 'nebula-bgm-pos';
  const get = (s, k) => { try { return s.getItem(k); } catch { return null; } };
  const set = (s, k, v) => { try { s.setItem(k, v); } catch {} };

  // A 小调 Am – F – C – G
  const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
  const ROOTS = [33, 29, 36, 31];
  const LEAD = [ // [第几个 16 分音符, MIDI 音高, 时值]
    [[0, 76, 3], [4, 74, 2], [6, 72, 2], [8, 71, 4], [12, 69, 4]],
    [[0, 72, 3], [4, 69, 2], [6, 72, 2], [8, 77, 6], [14, 76, 2]],
    [[0, 76, 3], [4, 79, 2], [6, 76, 2], [8, 74, 4], [12, 72, 4]],
    [[0, 74, 6], [6, 71, 2], [8, 74, 4], [12, 79, 4]],
  ];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  let ctx, comp, master, analyser, duck, reverb, delay, noiseBuf, timer, freq;
  let step = 0, nextTime = 0, startTime = 0, startStep = 0;
  const BGM = window.BGM = { playing: false };

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    freq = new Uint8Array(analyser.frequencyBinCount);
    comp.connect(master); master.connect(analyser); analyser.connect(ctx.destination);
    duck = ctx.createGain(); duck.connect(comp); // 侧链压缩总线：底鼓响时让铺底和贝斯“呼吸”

    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    reverb.buffer = ir;
    const rv = ctx.createGain(); rv.gain.value = 0.35; reverb.connect(rv); rv.connect(comp);

    delay = ctx.createDelay(1); delay.delayTime.value = STEP * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.35;
    const dl = ctx.createGain(); dl.gain.value = 0.3;
    delay.connect(fb); fb.connect(delay); delay.connect(dl); dl.connect(comp);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // ---------- 音色 ----------
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.5);
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(0.25, t); duck.gain.linearRampToValueAtTime(1, t + 0.3);
  }
  function noise(t, dur, type, f, vol, q = 1) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(comp);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return g;
  }
  const clap = (t, v = 0.5) => noise(t, 0.22, 'bandpass', 1500, v, 0.8).connect(reverb);
  const hat = (t, open, v) => noise(t, open ? 0.18 : 0.045, 'highpass', 8000, v);
  function bass(t, m, dur) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(g); g.connect(duck); o.start(t); o.stop(t + dur + 0.02);
  }
  function pad(t, notes, dur) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.5);
    g.gain.setValueAtTime(0.045, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    f.connect(g); g.connect(duck); g.connect(reverb);
    notes.forEach(n => [-9, 9].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(t + dur + 0.5);
    }));
  }
  function arp(t, m, s) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = 'square'; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.frequency.value = 900 + 700 * Math.sin(s / 64 * Math.PI * 2); f.Q.value = 4;
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    p.pan.value = s % 2 ? 0.35 : -0.35;
    o.connect(f); f.connect(g); g.connect(p); p.connect(duck); p.connect(delay);
    o.start(t); o.stop(t + 0.15);
  }
  function lead(t, m, dur) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.02);
    g.gain.setValueAtTime(0.08, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.15);
    lfo.frequency.value = 5.5; lg.gain.value = 14; lfo.connect(lg);
    f.connect(g); g.connect(comp); g.connect(delay); g.connect(reverb);
    [['sawtooth', 0], ['triangle', 7]].forEach(([type, dt]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(m); o.detune.value = dt;
      lg.connect(o.detune); o.connect(f); o.start(t); o.stop(t + dur + 0.2);
    });
    lfo.start(t); lfo.stop(t + dur + 0.2);
  }

  // ---------- 编曲：0-3 小节前奏，4-7 加入鼓和贝斯，8-15 加入拍手与主旋律 ----------
  function schedule(s, t) {
    const bar = Math.floor(s / 16) % BARS, st = s % 16, ci = bar % 4;
    const drums = bar >= 4, full = bar >= 8;
    const chord = CHORDS[ci], arpNotes = [...chord, ...chord.map(n => n + 12)];
    if (st === 0) pad(t, chord, STEP * 16);
    arp(t, arpNotes[[0, 1, 2, 3, 4, 5, 4, 3][st % 8]] + 12, s);
    if (drums) {
      if (st % 4 === 0) kick(t);
      hat(t, st % 4 === 2, st % 4 === 2 ? 0.12 : st % 2 ? 0.04 : 0.07);
      if (st % 2 === 0) bass(t, ROOTS[ci] + (st % 4 === 2 ? 12 : 0), STEP * 1.8);
    }
    if (full && (st === 4 || st === 12)) clap(t);
    if (bar % 8 === 7 && st >= 12) clap(t, 0.15 + (st - 12) * 0.08);
    if (full) LEAD[ci].forEach(([s0, m, l]) => { if (s0 === st) lead(t, m, l * STEP); });
  }
  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      schedule(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % STEPS;
    }
  }
  const curStep = () => Math.max(0, startStep + Math.floor((ctx.currentTime - startTime) / STEP));

  // ---------- 对外接口 ----------
  BGM.start = () => {
    if (!ctx) init();
    ctx.resume();
    if (BGM.playing) return;
    BGM.playing = true;
    startStep = parseInt(get(sessionStorage, POS)) || 0;
    startStep -= startStep % 16; // 从上一页停下的小节继续
    step = startStep; nextTime = startTime = ctx.currentTime + 0.08;
    const g = master.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(VOL, now + 1.2);
    clearInterval(timer); timer = setInterval(tick, 25); tick();
    set(localStorage, SEEN, '1');
    ui();
  };
  BGM.stop = () => {
    if (!BGM.playing) return;
    BGM.playing = false;
    BGM.save();
    const g = master.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.5);
    setTimeout(() => { if (!BGM.playing) clearInterval(timer); }, 600);
    ui();
  };
  BGM.toggle = () => (BGM.playing ? BGM.stop() : BGM.start());
  BGM.save = () => { if (ctx) set(sessionStorage, POS, curStep() % STEPS); };
  BGM.leave = () => { // 切换页面：记住播放位置并淡出
    if (!BGM.playing) return;
    BGM.save();
    const g = master.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.7);
  };
  BGM.pulse = () => {
    if (!BGM.playing || !ctx) return 0;
    const s = startStep + (ctx.currentTime - startTime) / STEP;
    if (s < startStep) return 0;
    const bar = Math.floor(s / 16) % BARS, phase = (s % 4) / 4;
    return Math.pow(1 - phase, 4) * (bar >= 4 ? 1 : 0.3);
  };
  BGM.level = () => {
    if (!BGM.playing || !analyser) return 0;
    analyser.getByteFrequencyData(freq);
    let sum = 0; for (let i = 1; i < 9; i++) sum += freq[i];
    return sum / 8 / 255;
  };
  addEventListener('pagehide', () => BGM.playing && BGM.save());
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !BGM.playing) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });

  // ---------- 界面：均衡器按钮 + 提示 ----------
  const css = document.createElement('style');
  css.textContent = `
  .bgm-btn{position:fixed;right:100px;bottom:24px;z-index:900;width:64px;height:64px;border-radius:50%;border:1px solid #ffffff40;background:#ffffff0d;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;transition:transform .4s,background .4s,border-color .4s}
  .bgm-btn:hover{transform:scale(1.1);background:#ffffff22}
  .bgm-btn.on{border-color:#5ff8ff;box-shadow:0 0 24px -6px #5ff8ff}
  .bgm-btn i{width:3px;height:4px;border-radius:2px;background:#fff;transition:height .08s}
  .bgm-btn.on i{background:linear-gradient(#ff3dbb,#5ff8ff)}
  .bgm-tip{position:fixed;right:24px;bottom:100px;z-index:900;padding:9px 16px;border-radius:999px;background:linear-gradient(90deg,#5ff8ff,#ff3dbb);color:#05060c;font:700 12px "PingFang SC",system-ui,sans-serif;letter-spacing:.12em;pointer-events:none;white-space:nowrap;animation:bgmPulse 1.6s ease-in-out infinite;transition:opacity .5s}
  .bgm-tip.hide{opacity:0;animation:none}
  @keyframes bgmPulse{50%{transform:translateY(-6px);box-shadow:0 0 30px -4px #ff3dbb}}
  @media (max-width:700px){.bgm-btn{right:80px;bottom:16px;width:54px;height:54px}.bgm-tip{right:16px;bottom:80px;font-size:11px;padding:7px 12px}}
  `;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.className = 'bgm-btn'; btn.setAttribute('aria-label', '背景音乐 (M)');
  btn.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
  const tip = document.createElement('div');
  tip.className = 'bgm-tip';
  document.body.append(btn, tip);
  const bars = [...btn.children];
  // 默认静音：每次打开页面都不发声，只在用户点按钮或按 M 时播放
  tip.textContent = '♪ 开启电子音乐';
  if (get(localStorage, SEEN)) tip.classList.add('hide');
  else setTimeout(() => tip.classList.add('hide'), 6000);
  function ui() {
    btn.classList.toggle('on', BGM.playing);
    tip.classList.add('hide');
  }
  btn.addEventListener('click', e => { e.stopPropagation(); BGM.toggle(); });
  addEventListener('keydown', e => { if (e.key === 'm' && !e.target.closest('input,textarea')) BGM.toggle(); });


  const BINS = [2, 5, 10, 20, 40];
  (function meter() {
    if (BGM.playing && analyser) {
      analyser.getByteFrequencyData(freq);
      bars.forEach((b, i) => b.style.height = 4 + freq[BINS[i]] / 255 * 22 + 'px');
    } else bars.forEach(b => b.style.height = '4px');
    requestAnimationFrame(meter);
  })();
})();
