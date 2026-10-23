// 全站共享：菜单、页面转场、光标
(() => {
  const HUB = ['hub.html', '作品大厅', 'Hub'];
  const GROUPS = [
    ['着色器', 'Shaders', [
      ['liquid.html', '液态金属', 'Liquid', '光线步进融合液滴'],
      ['blackhole.html', '事件视界', 'Black Hole', '广义相对论光线追踪'],
      ['fluid.html', '流体墨水', 'Fluid', 'GPU 实时流体模拟'],
      ['reaction.html', '反应扩散', 'Reaction', '自组织生长的纹理'],
      ['aurora.html', '极光', 'Aurora', '北极夜空的光帘'],
      ['ocean.html', '落日海洋', 'Ocean', '实时计算的海浪'],
    ]],
    ['粒子', 'Particles', [
      ['index.html', '粒子宇宙', 'Particles', '两万粒子形态变换'],
      ['tunnel.html', '超空间跃迁', 'Warp', '按住冲进星光隧道'],
      ['text.html', '粒子文字', 'Typography', '输入文字，粒子组字'],
      ['boids.html', '鱼群', 'Boids', '群体智能与捕食者'],
      ['fireworks.html', '烟花', 'Fireworks', '点击夜空就绽放'],
      ['galaxy.html', '星系碰撞', 'Galaxy', '两个星系擦肩而过'],
    ]],
    ['3D 场景', 'Scenes', [
      ['synthwave.html', '霓虹公路', 'Neon Drive', '驾驶跑车穿越霓虹山脉'],
      ['garage.html', '跑车解构', 'Garage', '爆炸视图与 X 光透视'],
      ['sonic.html', '声波星球', 'Sonic Planet', '随音乐律动的星球'],
      ['cube.html', '霓虹魔方', 'Cube', '拖动转层，计时还原'],
      ['planet.html', '迷你星球', 'Tiny Planet', '种树盖房的小星球'],
      ['city.html', '赛博城市', 'Cyber City', '雨夜霓虹车流'],
    ]],
    ['物理', 'Physics', [
      ['physics.html', '物理实验室', 'Physics Lab', '推倒霓虹积木塔'],
      ['gravity.html', '失重网页', 'Gravity', '让整张网页坠落'],
      ['cloth.html', '撕裂布料', 'Cloth', '拉扯、剪开霓虹网'],
      ['sand.html', '落沙世界', 'Sand', '像素元素互相反应'],
      ['plinko.html', '高尔顿板', 'Galton Board', '小球落出钟形曲线'],
      ['jelly.html', '果冻软体', 'Jelly', '会看人的 Q 弹果冻'],
    ]],
  ];
  const ORDER = GROUPS.flatMap(g => g[2]);   // 编号与“上一个/下一个”的顺序
  const here = location.pathname.split('/').pop() || 'index.html';

  const style = document.createElement('style');
  style.textContent = `
  .pt-veil{position:fixed;inset:0;z-index:1000;pointer-events:none;background:#04030a;clip-path:circle(150% at 50% 50%);transition:clip-path .9s cubic-bezier(.7,0,.2,1)}
  .pt-veil::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#7cf7ff22,#ff5fd211 40%,transparent 70%)}
  .pt-btn{position:fixed;right:24px;bottom:24px;z-index:900;width:64px;height:64px;border-radius:50%;border:1px solid #ffffff40;background:#0b0a16cc;cursor:pointer;display:flex;flex-direction:column;justify-content:center;transition:transform .4s,background .4s}
  .pt-btn:hover{transform:scale(1.1);background:#ffffff22}
  .pt-btn span{display:block;width:22px;height:1.5px;background:#fff;margin:3px auto;transition:transform .4s}
  .pt-open .pt-btn span:first-child{transform:translateY(4.5px) rotate(45deg)}
  .pt-open .pt-btn span:last-child{transform:translateY(-4.5px) rotate(-45deg)}
  .pt-menu{position:fixed;inset:0;z-index:800;background:#05040c;display:flex;flex-direction:column;gap:clamp(18px,4vh,44px);padding:clamp(24px,7vh,72px) 6vw clamp(100px,13vh,124px);overflow-y:auto;opacity:0;visibility:hidden;transition:opacity .45s,visibility .45s}
  .pt-open .pt-menu{opacity:1;visibility:visible}
  .pt-mhead{display:flex;justify-content:space-between;align-items:center;gap:16px}
  .pt-mhead b{font:800 15px system-ui,sans-serif;letter-spacing:.3em;color:#fff}
  .pt-mhead span{margin-left:14px;font:500 11px "SF Mono",ui-monospace,monospace;letter-spacing:.25em;color:#8b90b8}
  .pt-hub{display:inline-flex;gap:10px;align-items:center;padding:10px 20px;border-radius:999px;border:1px solid #ffffff30;color:#fff;text-decoration:none;font:600 14px "PingFang SC",system-ui,sans-serif;letter-spacing:.1em;white-space:nowrap;transition:background .3s,color .3s,border-color .3s}
  .pt-hub:hover,.pt-hub.cur{background:linear-gradient(90deg,#7cf7ff,#ff5fd2);color:#04030a;border-color:transparent}
  .pt-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(16px,3vw,48px);flex:1;align-content:center}
  .pt-col h4{display:flex;align-items:baseline;gap:10px;padding-bottom:12px;margin-bottom:8px;border-bottom:1px solid #ffffff1c;font:700 13px "PingFang SC",system-ui,sans-serif;color:#fff;letter-spacing:.1em}
  .pt-col h4 em{font:500 10px "SF Mono",ui-monospace,monospace;font-style:normal;letter-spacing:.3em;color:#7cf7ff;text-transform:uppercase}
  .pt-col h4 span{margin-left:auto;font:500 10px "SF Mono",ui-monospace,monospace;color:#8b90b8}
  .pt-item{position:relative;display:grid;grid-template-columns:30px 1fr;align-items:baseline;gap:6px;padding:clamp(8px,1.5vh,14px) 10px;margin:0 -10px;border-radius:12px;color:#eef1ff;text-decoration:none;opacity:0;transform:translateY(24px);transition:opacity .5s,transform .6s cubic-bezier(.2,.9,.2,1),background .3s}
  .pt-open .pt-item{opacity:1;transform:none}
  .pt-item small{font:500 11px "SF Mono",ui-monospace,monospace;color:#8b90b8;letter-spacing:.1em}
  .pt-item b{display:block;font:700 clamp(17px,1.7vw,24px)/1.25 "PingFang SC",system-ui,sans-serif;letter-spacing:-.01em;transition:color .3s}
  .pt-item em{display:block;margin-top:3px;font:400 12px "PingFang SC",system-ui,sans-serif;font-style:normal;color:#8b90b8}
  .pt-item:hover{background:#ffffff0a}
  .pt-item:hover b{color:#ff5fd2}
  .pt-item.cur b,.pt-item.cur small{color:#7cf7ff}
  .pt-item.cur::after{content:"当前";position:absolute;right:10px;top:50%;transform:translateY(-50%);font:500 10px "PingFang SC",system-ui,sans-serif;color:#7cf7ff;border:1px solid #7cf7ff55;padding:2px 8px;border-radius:999px}
  .pt-mfoot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:16px;border-top:1px solid #ffffff14;font:500 13px "PingFang SC",system-ui,sans-serif}
  .pt-mfoot a{display:inline-flex;gap:8px;align-items:center;color:#c9cde8;text-decoration:none;transition:color .3s}
  .pt-mfoot a span{font:500 10px "SF Mono",ui-monospace,monospace;letter-spacing:.25em;color:#8b90b8}
  .pt-mfoot a:hover{color:#ff5fd2}
  .pt-keys{font:500 10px "SF Mono",ui-monospace,monospace;letter-spacing:.25em;color:#5f6488}
  @media (max-width:1000px){.pt-cols{grid-template-columns:repeat(2,minmax(0,1fr));align-content:start}}
  @media (max-width:520px){.pt-cols{gap:18px 14px}.pt-item{grid-template-columns:22px 1fr;padding:9px 8px;margin:0 -8px}.pt-item em,.pt-item.cur::after,.pt-keys,.pt-mhead span{display:none}.pt-col h4{font-size:12px}.pt-col h4 em{letter-spacing:.15em}.pt-mfoot{font-size:12px}}
  .pt-cur,.pt-ring{position:fixed;top:0;left:0;pointer-events:none;z-index:1100;border-radius:50%;mix-blend-mode:difference}
  .pt-cur{width:8px;height:8px;margin:-4px 0 0 -4px;background:#fff}
  .pt-ring{width:40px;height:40px;margin:-20px 0 0 -20px;border:1px solid #fff;transition:width .3s,height .3s,margin .3s,background .3s}
  .pt-ring.hover{width:76px;height:76px;margin:-38px 0 0 -38px;background:#fff2}
  @media (max-width:700px){.pt-btn{right:16px;bottom:16px;width:54px;height:54px}.pt-menu{padding:24px 16px 96px}}

  /* ===== 全站科技感按钮：切角 + 霓虹角标 + 等宽字体，覆盖各页面自带的圆角样式 ===== */
  :root{--cut:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));--cut-s:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));--tf:"SF Mono",ui-monospace,"PingFang SC",system-ui,monospace}
  /* 右下角悬浮按钮：菜单、音乐、大厅左右箭头，统一 56px 切角方块，等距排成一行 */
  html .pt-btn,html .bgm-btn,html .arrows button{width:56px!important;height:56px!important;border-radius:0!important;clip-path:var(--cut);border:1px solid #7cf7ff59!important;
    background:linear-gradient(135deg,#7cf7ff 0 6px,transparent 6px),linear-gradient(-45deg,#ff5fd2 0 6px,transparent 6px),#0b0a16e0!important;
    box-shadow:inset 0 0 14px #7cf7ff1f!important;transform:none!important;transition:border-color .3s,box-shadow .3s,background-color .3s!important;color:#e8f6ff;font:600 18px var(--tf)}
  html .pt-btn:hover,html .bgm-btn:hover,html .arrows button:hover{border-color:#7cf7ff!important;box-shadow:inset 0 0 22px #7cf7ff55!important;color:#fff}
  html .pt-btn{right:24px!important;bottom:24px!important}
  html .bgm-btn{right:92px!important;bottom:24px!important}
  html .bgm-btn.on{border-color:#7cf7ffaa!important;box-shadow:inset 0 0 18px #7cf7ff44!important}
  html .bgm-tip{bottom:92px!important;border-radius:0!important;clip-path:var(--cut-s);font-family:var(--tf)!important}
  html .arrows{right:160px!important;bottom:24px!important;gap:12px!important}
  /* 控制条、分类标签、色板等容器 */
  html .ctrl,html .tabs,html .palette,html .field,html #prompt{border-radius:0!important;clip-path:var(--cut);border-color:#7cf7ff40!important;box-shadow:inset 0 0 0 1px #7cf7ff1a,inset 0 0 26px #7cf7ff10}
  html .ctrl button,html .tabs button,html .seg button,html .palette button,html .modes button,html .fx button,html .chips button,html .field button,html #card .nav button,html #card .x,html .ctrl label{border-radius:0!important;font-family:var(--tf)!important;letter-spacing:.08em}
  html .ctrl button,html .tabs button,html .palette button,html .modes button,html .fx button,html .chips button,html .field button,html #card .nav button,html #card .x{clip-path:var(--cut-s)}
  html .seg,html .seg i{border-radius:0!important;clip-path:var(--cut-s)}
  html .ctrl button:not(.on):not(.main):hover,html .tabs button:not(.on):hover,html .palette button:not(.on):hover,html .modes button:not(.on):hover,html .chips button:hover,html #card .nav button:hover{background:#7cf7ff14!important;border-color:#7cf7ff66!important;color:#fff!important}
  html .fx button{width:84px!important;height:56px!important}
  html .hub-enter,html .enter,html a.btn{border-radius:0!important;clip-path:var(--cut-s);font-family:var(--tf)!important;letter-spacing:.12em}
  @media (max-width:700px){
    html .pt-btn,html .bgm-btn,html .arrows button{width:50px!important;height:50px!important}
    html .pt-btn{right:16px!important;bottom:16px!important} html .bgm-btn{right:76px!important;bottom:16px!important}
    html .bgm-tip{bottom:76px!important} html .arrows{right:auto!important;left:16px!important;bottom:16px!important;gap:10px!important}
  }
  `;
  document.head.appendChild(style);

  // 转场幕布：加载时从中心收缩
  const veil = document.createElement('div');
  veil.className = 'pt-veil';
  document.body.appendChild(veil);
  const reveal = () => { veil.style.clipPath = 'circle(0% at 50% 50%)'; };
  const afterFrames = () => { let n = 0; (function f() { if (++n >= 4) reveal(); else requestAnimationFrame(f); })(); };
  if (document.readyState === 'complete') afterFrames(); else addEventListener('load', afterFrames, { once: true });
  setTimeout(reveal, 3000);   // 资源很大的页面（如物理实验室）不让幕布一直挡着
  addEventListener('pageshow', e => { if (e.persisted) reveal(); });

  // 动态分辨率：按实测帧率在 [min, max] 间调整渲染像素比；先用 1.5 起步，流畅再逐步提高
  window.NEBULA = {
    adaptive(apply, { max = Math.min(devicePixelRatio, 2), min = 1 } = {}) {
      max = Math.max(min, max);
      let ratio = Math.min(max, 1.5), frames = 0, good = 0, t0 = performance.now();
      if (ratio !== max) apply(ratio);
      (function loop(now) {
        frames++;
        if (now - t0 >= 1000) {
          const fps = frames * 1000 / (now - t0);
          frames = 0; t0 = now;
          if (!document.hidden) {
            if (fps < 48 && ratio > min) { ratio = Math.max(min, ratio - .25); apply(ratio); good = 0; }
            else if (fps > 57 && ratio < max) { if (++good >= 3) { ratio = Math.min(max, ratio + .25); apply(ratio); good = 0; } }
            else good = 0;
          }
        }
        requestAnimationFrame(loop);
      })(t0);
    },
  };

  window.goPage = (href, x = innerWidth / 2, y = innerHeight / 2) => {
    window.BGM?.leave?.();
    veil.style.transition = 'none';
    veil.style.clipPath = `circle(0% at ${x}px ${y}px)`;
    veil.offsetWidth;
    veil.style.transition = '';
    veil.style.clipPath = `circle(150% at ${x}px ${y}px)`;
    setTimeout(() => location.href = href, 850);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-page]');
    if (!a) return;
    e.preventDefault();
    document.body.classList.remove('pt-open');
    goPage(a.getAttribute('href'), e.clientX, e.clientY);
  });

  // 背景音乐
  const bgm = document.createElement('script');
  bgm.src = 'bgm.js?v=20261022';
  document.body.appendChild(bgm);

  // 菜单
  const btn = document.createElement('button');
  btn.className = 'pt-btn';
  btn.setAttribute('aria-label', '菜单');
  btn.innerHTML = '<span></span><span></span>';
  btn.onclick = e => { e.stopPropagation(); document.body.classList.toggle('pt-open'); };
  const menu = document.createElement('nav');
  menu.className = 'pt-menu';
  const num = n => String(n).padStart(2, '0');
  const cur = href => href === here ? ' cur' : '';
  let k = 0;
  const cols = GROUPS.map(([zh, en, items]) => `<div class="pt-col"><h4>${zh}<em>${en}</em><span>${num(items.length)}</span></h4>${
    items.map(([href, name, , tag]) => { const i = ORDER.findIndex(p => p[0] === href);
      return `<a href="${href}" data-page class="pt-item${cur(href)}" style="transition-delay:${(.05 + k++ * .035).toFixed(3)}s"><small>${num(i + 1)}</small><div><b>${name}</b><em>${tag}</em></div></a>`; }).join('')
  }</div>`).join('');
  // 上一个 / 下一个：在大厅时从列表首尾开始
  const idx = ORDER.findIndex(p => p[0] === here);
  const prev = idx < 0 ? ORDER.at(-1) : ORDER[(idx - 1 + ORDER.length) % ORDER.length];
  const next = ORDER[(idx + 1) % ORDER.length];
  menu.innerHTML = `
    <div class="pt-mhead"><div><b>NEBULA LAB</b><span>作品目录 · ${num(ORDER.length)}</span></div>
      <a href="${HUB[0]}" data-page class="pt-hub${cur(HUB[0])}">${HUB[1]} →</a></div>
    <div class="pt-cols">${cols}</div>
    <div class="pt-mfoot">
      <a href="${prev[0]}" data-page>← <span>PREV</span>${prev[1]}</a>
      <span class="pt-keys">ESC 关闭 · ← → 切换作品</span>
      <a href="${next[0]}" data-page>${next[1]}<span>NEXT</span> →</a>
    </div>`;
  document.body.append(menu, btn);
  // 菜单打开时接管键盘，避免触发页面自身的快捷键
  addEventListener('keydown', e => {
    if (!document.body.classList.contains('pt-open')) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') document.body.classList.remove('pt-open');
    const go = { ArrowLeft: prev, ArrowRight: next }[e.key];
    if (go) { e.preventDefault(); document.body.classList.remove('pt-open'); goPage(go[0]); }
  }, true);

  // 光标（页面已自带则跳过）
  if (!document.querySelector('.cursor') && matchMedia('(pointer:fine)').matches) {
    document.body.style.cursor = 'none';
    const st = document.createElement('style');
    st.textContent = '*{cursor:none!important}';
    document.head.appendChild(st);
    const c = document.createElement('div'), r = document.createElement('div');
    c.className = 'pt-cur'; r.className = 'pt-ring';
    document.body.append(c, r);
    let x = -100, y = -100, rx = x, ry = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; });
    document.addEventListener('pointerover', e => r.classList.toggle('hover', !!e.target.closest('a,button,input,[data-hover]')));
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      c.style.transform = `translate(${x}px,${y}px)`;
      r.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(loop);
    })();
  }
})();
