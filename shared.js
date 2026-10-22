// 全站共享：菜单、页面转场、光标
(() => {
  const PAGES = [
    ['hub.html', '作品大厅', 'Hub'],
    ['index.html', '粒子宇宙', 'Particles'],
    ['liquid.html', '液态金属', 'Liquid'],
    ['tunnel.html', '超空间跃迁', 'Warp'],
    ['text.html', '粒子文字', 'Typography'],
    ['synthwave.html', '霓虹公路', 'Neon Drive'],
    ['garage.html', '跑车解构', 'Garage'],
    ['blackhole.html', '事件视界', 'Black Hole'],
    ['physics.html', '物理实验室', 'Physics Lab'],
    ['gravity.html', '失重网页', 'Gravity'],
    ['fluid.html', '流体墨水', 'Fluid'],
    ['sonic.html', '声波星球', 'Sonic Planet'],
  ];
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
  .pt-menu{position:fixed;inset:0;z-index:800;background:#04030ae8;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;flex-direction:column;justify-content:center;padding:0 10vw;opacity:0;visibility:hidden;transition:opacity .5s,visibility .5s}
  .pt-open .pt-menu{opacity:1;visibility:visible}
  .pt-menu a{display:flex;align-items:baseline;gap:24px;color:#eef1ff;text-decoration:none;font:800 clamp(20px,min(5vw,5.6vh),64px)/1.16 "PingFang SC",system-ui,sans-serif;letter-spacing:-.02em;opacity:0;transform:translateY(60px);transition:opacity .6s,transform .8s cubic-bezier(.2,.9,.2,1),color .3s}
  .pt-open .pt-menu a{opacity:1;transform:none}
  .pt-menu a small{font:500 12px system-ui;letter-spacing:.3em;color:#7cf7ff;width:36px;flex:none}
  .pt-menu a em{font:400 13px system-ui;font-style:normal;letter-spacing:.25em;color:#8b90b8;text-transform:uppercase}
  .pt-menu a:hover{color:#ff5fd2}
  .pt-menu a.cur em::after{content:" ●";color:#7cf7ff}
  .pt-cur,.pt-ring{position:fixed;top:0;left:0;pointer-events:none;z-index:1100;border-radius:50%;mix-blend-mode:difference}
  .pt-cur{width:8px;height:8px;margin:-4px 0 0 -4px;background:#fff}
  .pt-ring{width:40px;height:40px;margin:-20px 0 0 -20px;border:1px solid #fff;transition:width .3s,height .3s,margin .3s,background .3s}
  .pt-ring.hover{width:76px;height:76px;margin:-38px 0 0 -38px;background:#fff2}
  @media (max-width:700px){.pt-btn{right:16px;bottom:16px;width:54px;height:54px}.pt-menu{padding:0 16px}}
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
  menu.innerHTML = PAGES.map(([href, zh, en], i) =>
    `<a href="${href}" data-page class="${href === here ? 'cur' : ''}" style="transition-delay:${0.05 + i * 0.06}s"><small>${String(i).padStart(2, '0')}</small>${zh}<em>${en}</em></a>`
  ).join('');
  document.body.append(menu, btn);
  addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('pt-open'); });

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
