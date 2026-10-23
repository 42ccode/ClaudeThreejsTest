// 全站 BGM：用 Web Audio 实时合成的 140 BPM trap，无需音频文件
// 对外暴露 window.BGM：playing / pulse()（0~1 底鼓脉冲）/ level() / spectrum() / waveform() / toggle() / leave()
(() => {
  const BPM = 140, STEP = 60 / BPM / 4, BARS = 16, STEPS = BARS * 16, VOL = 0.6;
  const SEEN = 'nebula-bgm-seen', POS = 'nebula-bgm-pos';
  const get = (s, k) => { try { return s.getItem(k); } catch { return null; } };
  const set = (s, k, v) => { try { s.setItem(k, v); } catch {} };

  // C 小调 Cm – Ab – Fm – G（和声小调，G 和弦制造张力）
  const CHORDS = [[60, 63, 67], [56, 60, 63], [53, 56, 60], [55, 59, 62]];
  const ROOTS = [36, 32, 29, 31];
  // 铃声主旋律：每小节 16 格，null 为休止
  const BELL = [
    [72, 0, 0, 75, 0, 0, 79, 0, 77, 0, 0, 75, 0, 0, 74, 0],
    [72, 0, 0, 75, 0, 0, 80, 0, 79, 0, 0, 75, 0, 0, 72, 0],
    [68, 0, 0, 72, 0, 0, 77, 0, 75, 0, 0, 72, 0, 0, 70, 0],
    [71, 0, 0, 74, 0, 0, 79, 0, 77, 0, 0, 74, 0, 0, 71, 0],
  ];
  // 底鼓切分型（按小节轮换），808 跟着底鼓走
  const KICKS = [[0, 10], [0, 3, 10], [0, 10, 13], [0, 6, 11]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  let ctx, comp, master, analyser, duck, reverb, delay, noiseBuf, distCurve, timer, freq, last808 = null;
  let step = 0, nextTime = 0, startTime = 0, startStep = 0;
  const hits = [];   // 已排程的底鼓 [时间, 强度]，用于视觉同步
  const BGM = window.BGM = { playing: false };

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 5; comp.attack.value = .005; comp.release.value = .12;
    master = ctx.createGain(); master.gain.value = 0;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    freq = new Uint8Array(analyser.frequencyBinCount);
    comp.connect(master); master.connect(analyser); analyser.connect(ctx.destination);
    duck = ctx.createGain(); duck.connect(comp); // 底鼓响时让铺底与铃声让位

    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    reverb.buffer = ir;
    const rv = ctx.createGain(); rv.gain.value = 0.32; reverb.connect(rv); rv.connect(comp);

    delay = ctx.createDelay(1); delay.delayTime.value = STEP * 3; // 附点八分
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dl = ctx.createGain(); dl.gain.value = 0.28;
    delay.connect(fb); fb.connect(delay); delay.connect(dl); dl.connect(comp);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // 808 的软削波失真：给低频加上谐波，小音箱也听得到
    distCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; distCurve[i] = Math.tanh(x * 3) / Math.tanh(3); }
  }

  // ---------- 音色 ----------
  function noise(t, dur, type, f, vol, q = 1, out = comp) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return g;
  }
  function kick(t, strength = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.08);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.3);
    noise(t, 0.012, 'highpass', 3000, 0.35);   // 起音的“咔”声
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(0.35, t); duck.gain.linearRampToValueAtTime(1, t + 0.25);
    hits.push([t, strength]);
  }
  function snare(t, v = 1) {
    // 拍手三连击 + 噪声尾巴 + 音调层
    [0, 0.011, 0.023].forEach(d => noise(t + d, 0.04, 'bandpass', 1300, 0.32 * v, 1.2));
    noise(t + 0.03, 0.2, 'bandpass', 1900, 0.3 * v, 0.7).connect(reverb);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    g.gain.setValueAtTime(0.22 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.14);
  }
  function hat(t, v, open = false) {
    const p = ctx.createStereoPanner();
    p.pan.value = 0.25; p.connect(comp);
    noise(t, open ? 0.22 : 0.032, 'highpass', 9000, v, 1, p);
  }
  // 808：失真正弦 + 起音下滑，单声道（新音会切断旧音），可选滑音
  function b808(t, m, dur, glideTo) {
    if (last808 && last808.end > t) { last808.g.gain.cancelScheduledValues(t); last808.g.gain.setTargetAtTime(0, t, 0.012); }
    const o = ctx.createOscillator(), sh = ctx.createWaveShaper(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const fr = mtof(m);
    o.type = 'sine';
    o.frequency.setValueAtTime(fr * 1.8, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.05);
    if (glideTo) { o.frequency.setValueAtTime(fr, t + dur * 0.45); o.frequency.exponentialRampToValueAtTime(mtof(glideTo), t + dur * 0.75); }
    sh.curve = distCurve;
    f.type = 'lowpass'; f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.006);
    g.gain.setValueAtTime(0.5, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(sh); sh.connect(f); f.connect(g); g.connect(comp);
    o.start(t); o.stop(t + dur + 0.05);
    last808 = { g, end: t + dur };
  }
  // FM 铃声：载波 + 3.5 倍频调制，调制深度快速衰减
  function bell(t, m, v = 0.07) {
    const c = ctx.createOscillator(), mo = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), p = ctx.createStereoPanner();
    const f = mtof(m);
    c.frequency.value = f; mo.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.7);
    mo.connect(mg); mg.connect(c.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    p.pan.value = (m % 5 - 2) * 0.15;
    c.connect(g); g.connect(p); p.connect(duck); p.connect(delay); p.connect(reverb);
    [c, mo].forEach(o => { o.start(t); o.stop(t + 1.6); });
  }
  function pad(t, notes, dur) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 750; f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.032, t + 0.8);
    g.gain.setValueAtTime(0.032, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    f.connect(g); g.connect(duck); g.connect(reverb);
    notes.forEach(n => [-12, 12].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n - 12); o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(t + dur + 0.7);
    }));
  }
  function riser(t, dur) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(400, t); fl.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    s.connect(fl); fl.connect(g); g.connect(comp); g.connect(reverb);
    s.start(t); s.stop(t + dur + 0.05);
  }

  // ---------- 编曲 ----------
  // 0-3 小节：铺底 + 铃声 + 长 808（前奏）；4-15：完整鼓组；11、15 小节后半段抽掉鼓制造停顿，15 小节加入上扬音效
  function schedule(s, t) {
    const bar = Math.floor(s / 16) % BARS, st = s % 16, ci = bar % 4;
    const intro = bar < 4, lift = bar >= 8;
    const breakdown = (bar === 11 && st >= 8) || (bar === 15 && st >= 8);
    if (st === 0) pad(t, CHORDS[ci], STEP * 16);
    const note = BELL[ci][st];
    if (note) { bell(t, note, intro ? 0.05 : 0.07); if (lift) bell(t, note + 12, 0.025); }

    if (intro) {
      if (st === 0) { b808(t, ROOTS[ci], STEP * 15); hits.push([t, 0.45]); }
      if (bar >= 2 && st % 4 === 2) hat(t, 0.05);
      if (bar === 3 && st === 8) riser(t, STEP * 8);
      return;
    }
    if (bar === 15 && st === 8) riser(t, STEP * 8);
    if (breakdown) {
      if (st === 8) b808(t, ROOTS[ci], STEP * 8, ROOTS[ci] + 12);   // 停顿里只留一记滑音 808
      return;
    }

    const kicks = KICKS[bar % 4];
    if (kicks.includes(st)) {
      kick(t);
      const next = kicks.find(k => k > st) ?? 16;
      const glide = ci === 3 && st === kicks[kicks.length - 1] ? ROOTS[ci] + 12 : 0;   // G 和弦小节尾巴往上滑
      b808(t, ROOTS[ci], STEP * Math.max(next - st, 3), glide);
    }
    if (st === 8) snare(t);
    if (st === 15 && bar % 2 === 1) snare(t, 0.35);   // 鬼音

    // Hi-hat：八分为底，偶数小节尾巴 32 分连击，每 4 小节一次三连音滚奏
    const accent = st % 4 === 0 ? 0.11 : 0.07;
    if (bar % 2 === 1 && st >= 12) { hat(t, accent); hat(t + STEP / 2, 0.05); }
    else if (bar % 4 === 3 && (st === 4 || st === 6)) for (let k = 0; k < 3; k++) hat(t + k * STEP * 2 / 3, 0.08 - k * 0.012);
    else if (st % 2 === 0) hat(t, accent, st === 14 && bar % 4 === 1);
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
    hits.length = 0; last808 = null;
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
  // 底鼓脉冲：取最近一次已发声的底鼓，按指数衰减
  BGM.pulse = () => {
    if (!BGM.playing || !ctx) return 0;
    const now = ctx.currentTime;
    while (hits.length > 1 && hits[1][0] <= now - 1) hits.shift();
    // 击中后先保持 60ms 满值，保证各页面按帧检测“> 0.9”时不会漏拍
    for (let i = hits.length - 1; i >= 0; i--) if (hits[i][0] <= now) return hits[i][1] * Math.exp(-Math.max(0, now - hits[i][0] - 0.06) * 7);
    return 0;
  };
  BGM.level = () => {
    if (!BGM.playing || !analyser) return 0;
    analyser.getByteFrequencyData(freq);
    let sum = 0; for (let i = 1; i < 9; i++) sum += freq[i];
    return sum / 8 / 255;
  };
  // 供可视化页面读取：频谱（128 个频段）与波形，未播放时返回静默数据
  BGM.spectrum = out => (analyser && BGM.playing ? analyser.getByteFrequencyData(out) : out.fill(0), out);
  BGM.waveform = out => (analyser && BGM.playing ? analyser.getByteTimeDomainData(out) : out.fill(128), out);
  addEventListener('pagehide', () => BGM.playing && BGM.save());
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !BGM.playing) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });

  // ---------- 界面：均衡器按钮 + 提示 ----------
  const css = document.createElement('style');
  css.textContent = `
  .bgm-btn{position:fixed;right:100px;bottom:24px;z-index:900;width:64px;height:64px;border-radius:50%;border:1px solid #ffffff40;background:#0b0a16cc;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;transition:transform .4s,background .4s,border-color .4s}
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
