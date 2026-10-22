// 全站共享：菜单、页面转场、光标
(() => {
  const HUB = ['hub.html', '作品大厅', 'Hub'];
  const GROUPS = [
    ['着色器', 'Shaders', [
      ['liquid.html', '液态金属', 'Liquid', '光线步进融合液滴'],
      ['blackhole.html', '事件视界', 'Black Hole', '广义相对论光线追踪'],
      ['fluid.html', '流体墨水', 'Fluid', 'GPU 实时流体模拟'],
    ]],
    ['粒子', 'Particles', [
      ['index.html', '粒子宇宙', 'Particles', '两万粒子形态变换'],
      ['tunnel.html', '超空间跃迁', 'Warp', '按住冲进星光隧道'],
      ['text.html', '粒子文字', 'Typography', '输入文字，粒子组字'],
    ]],
    ['3D 场景', 'Scenes', [
      ['synthwave.html', '霓虹公路', 'Neon Drive', '驾驶跑车穿越霓虹山脉'],
      ['garage.html', '跑车解构', 'Garage', '爆炸视图与 X 光透视'],
      ['sonic.html', '声波星球', 'Sonic Planet', '随音乐律动的星球'],
    ]],
    ['物理', 'Physics', [
      ['physics.html', '物理实验室', 'Physics Lab', '推倒霓虹积木塔'],
      ['gravity.html', '失重网页', 'Gravity', '让整张网页坠落'],
    ]],
  ];
  const ORDER = GROUPS.flatMap(g => g[2]);   // 编号与“上一个/下一个”的顺序
  const here = location.pathname.split('/').pop() || 'index.html';

  const style = document.createElement('style');
  style.textContent = `
  .pt-veil{position:fixed;inset:0;z-index:1000;pointer-events:none;background:#04030a;clip-path:circle(150% at 50% 50%);transition:clip-path .9s cubic-bezier(.7,0,.2,1)}
  .pt-veil::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#7cf7ff22,#ff5fd211 40%,transparent 70%)}
  .pt-btn{position:fixed;right:24px;bottom:24px;z-index:900;width:64px;height:64px;border-radius:50%;border:1px solid #ffffff40;background:#ffffff0d;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;display:flex;flex-direction:column;justify-content:center;transition:transform .4s,background .4s}
  .pt-btn:hover{transform:scale(1.1);background:#ffffff22}
  .pt-btn span{display:block;width:22px;height:1.5px;background:#fff;margin:3px auto;transition:transform .4s}
  .pt-open .pt-btn span:first-child{transform:translateY(4.5px) rotate(45deg)}
  .pt-open .pt-btn span:last-child{transform:translateY(-4.5px) rotate(-45deg)}
  .pt-menu{position:fixed;inset:0;z-index:800;background:#04030aeb;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;flex-direction:column;gap:clamp(18px,4vh,44px);padding:clamp(24px,7vh,72px) 6vw clamp(100px,13vh,124px);overflow-y:auto;opacity:0;visibility:hidden;transition:opacity .45s,visibility .45s}
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
  `;
  document.head.appendChild(style);

  // 转场幕布：加载时从中心收缩
  const veil = document.createElement('div');
  veil.className = 'pt-veil';
  document.body.appendChild(veil);
  const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    veil.style.clipPath = 'circle(0% at 50% 50%)';
  }));
  reveal();
  addEventListener('pageshow', e => { if (e.persisted) reveal(); });

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
  bgm.src = 'bgm.js';
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
  const cols = GROUPS.map(([zh, en, items]) => `<section class="pt-col"><h4>${zh}<em>${en}</em><span>${num(items.length)}</span></h4>${
    items.map(([href, name, , tag]) => { const i = ORDER.findIndex(p => p[0] === href);
      return `<a href="${href}" data-page class="pt-item${cur(href)}" style="transition-delay:${(.05 + k++ * .035).toFixed(3)}s"><small>${num(i + 1)}</small><div><b>${name}</b><em>${tag}</em></div></a>`; }).join('')
  }</section>`).join('');
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
