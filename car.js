// 程序化科幻跑车：每个部件记录自己的“解构”偏移，供霓虹公路与车库页面复用
import * as THREE from 'three';

export const NEON_C = 0x5ff8ff, NEON_P = 0xff3dbb;

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const radialGlow = color => canvasTexture(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
// reverse=false：贴图顶部最亮；reverse=true：底部最亮
export const linearGlow = (color, reverse = false) => canvasTexture(4, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(reverse ? 1 : 0, color); gr.addColorStop(reverse ? 0 : 1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

function withEdges(mesh, color, threshold = 30, opacity = 1) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  e.userData.edge = true;
  mesh.add(e);
  return mesh;
}

// 侧面轮廓（Shape 的 x = 车长方向 z，y = 高度）拉伸成车宽，再按 shapeFn 收腰塑形
function extrude(shape, width, bevel, shapeFn) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2, 0, 0);
  if (shapeFn) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * shapeFn(p.getY(i), p.getZ(i)));
    g.computeVertexNormals();
  }
  return g;
}

export function buildCar() {
  const car = new THREE.Group();
  const parts = [], wheels = [];
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0x2a1442, metalness: .85, roughness: .22, clearcoat: 1, clearcoatRoughness: .08 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0c0c14, metalness: .5, roughness: .55 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x15161d, metalness: .7, roughness: .35 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9aa2b2, metalness: 1, roughness: .28 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a2636, metalness: .9, roughness: .04, transparent: true, opacity: .62, clearcoat: 1 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x060608, roughness: .85 }),
    cell: new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: NEON_C, emissiveIntensity: .35, metalness: .5, roughness: .4 }),
    cyan: new THREE.MeshBasicMaterial({ color: NEON_C }),
    pink: new THREE.MeshBasicMaterial({ color: NEON_P }),
    white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    orange: new THREE.MeshBasicMaterial({ color: 0xff8a3d }),
    hud: new THREE.MeshBasicMaterial({ color: NEON_P, transparent: true, opacity: .45, side: THREE.DoubleSide }),
  };
  M.paint.side = THREE.DoubleSide;
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const part = (obj, zh, en, off, rot = [0, 0, 0], label = true) => {
    obj.userData.part = { base: obj.position.clone(), baseRot: obj.rotation.clone(), off: new THREE.Vector3(...off), rot: new THREE.Vector3(...rot), zh, en, label };
    car.add(obj); parts.push(obj);
    return obj;
  };

  // ---------- 底盘层 ----------
  part(withEdges(box(1.6, .08, 4.3, M.carbon, 0, .3, 0), NEON_C, 30, .55), '碳纤维底盘', 'Carbon Chassis', [0, -1.0, 0]);

  const bat = new THREE.Group();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++)
    bat.add(withEdges(box(.32, .12, .36, M.cell, (i - 1) * .36, .41, (j - 2.5) * .4 + .1), NEON_C, 30, .8));
  part(bat, '固态电池组', 'Solid-State Battery', [0, -.55, 0]);

  const susp = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    susp.add(withEdges(box(.5, .04, .07, M.metal, sx * .6, .34, sz * 1.45 - .06), NEON_C, 30, .5));
    susp.add(withEdges(box(.5, .04, .07, M.metal, sx * .6, .46, sz * 1.45 + .06), NEON_C, 30, .5));
    const damper = mesh(new THREE.CylinderGeometry(.035, .035, .34, 10), M.cyan, sx * .66, .5, sz * 1.45);
    damper.rotation.z = sx * .5;
    susp.add(damper);
  }
  part(susp, '电磁主动悬挂', 'Active Suspension', [0, -.25, 0]);

  // ---------- 座舱层 ----------
  const seats = new THREE.Group();
  for (const sx of [-.3, .3]) {
    seats.add(withEdges(box(.42, .1, .5, M.dark, sx, .55, .35), NEON_P, 30, .6));
    seats.add(withEdges(box(.42, .48, .09, M.dark, sx, .8, .62), NEON_P, 30, .6));
    seats.add(withEdges(box(.26, .14, .08, M.dark, sx, 1.1, .64), NEON_P, 30, .6));
  }
  part(seats, '桶形赛车座椅', 'Racing Seats', [0, .12, .2]);

  const cockpit = new THREE.Group();
  const yoke = mesh(new THREE.TorusGeometry(.13, .018, 8, 32, Math.PI * 1.4), M.cyan, -.3, .86, -.15);
  yoke.rotation.set(-.5, 0, -Math.PI * .2);
  const hud = mesh(new THREE.PlaneGeometry(.62, .2), M.hud, -.12, 1.0, -.42);
  hud.rotation.x = -.35;
  cockpit.add(yoke, hud, withEdges(box(1.0, .08, .2, M.dark, 0, .74, -.45), NEON_C, 30, .6));
  part(cockpit, '全息驾驶舱', 'Holo Cockpit', [0, .15, -1.0]);

  // ---------- 动力层 ----------
  const core = new THREE.Group(); core.position.set(0, .62, 1.5);
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.24, 1), new THREE.MeshBasicMaterial({ color: NEON_P, wireframe: true })));
  core.add(new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 24), M.white));
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(.34, .012, 8, 64), M.cyan); ringA.rotation.x = Math.PI / 2;
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(.3, .01, 8, 64), M.pink); ringB.rotation.set(.9, .4, 0);
  core.add(ringA, ringB);
  core.userData.rings = [ringA, ringB];
  part(core, '量子核心引擎', 'Quantum Core', [0, .3, 2.7]);

  // ---------- 车身层 ----------
  const hs = new THREE.Shape();
  hs.moveTo(-2.15, .28); hs.lineTo(-2.38, .36);
  hs.quadraticCurveTo(-2.46, .46, -2.3, .52);
  hs.quadraticCurveTo(-1.6, .66, -.95, .78);
  hs.lineTo(-.35, .85); hs.lineTo(1.05, .9);
  hs.quadraticCurveTo(1.9, .95, 2.25, .9);
  hs.quadraticCurveTo(2.42, .86, 2.38, .62);
  hs.lineTo(2.3, .38);
  hs.quadraticCurveTo(2.25, .28, 2.0, .28);
  hs.lineTo(-2.15, .28);
  // 收腰：越高越窄，车头收尖
  const hull = mesh(extrude(hs, 1.7, .05, (y, z) => (1 - Math.max(0, y - .3) * .2) * (1 - Math.max(0, -z - 1.5) * .28)), M.paint);
  part(withEdges(hull, NEON_C, 28), '一体式车身', 'Monocoque Body', [0, 1.0, 0]);

  const cs = new THREE.Shape();
  cs.moveTo(-1.0, .76);
  cs.quadraticCurveTo(-.5, 1.12, .1, 1.2);
  cs.quadraticCurveTo(.8, 1.24, 1.3, .95);
  cs.lineTo(1.05, .9); cs.lineTo(-.35, .84); cs.lineTo(-1.0, .76);
  const canopy = mesh(extrude(cs, 1.1, .04, y => 1 - Math.max(0, y - .85) * .9), M.glass);
  part(withEdges(canopy, NEON_P, 28), '电致变色座舱罩', 'Canopy', [0, 1.9, -.3], [-.25, 0, 0]);

  // 翼型截面的主动尾翼
  const ws = new THREE.Shape();
  ws.moveTo(-.26, 0); ws.quadraticCurveTo(-.2, .07, .05, .055); ws.quadraticCurveTo(.25, .035, .28, 0); ws.quadraticCurveTo(.1, -.02, -.26, 0);
  const wing = new THREE.Group();
  const blade = mesh(extrude(ws, 1.9, .01), M.paint, 0, 1.28, 2.0); blade.rotation.x = -.12;
  wing.add(withEdges(blade, NEON_P, 20));
  for (const sx of [-1, 1]) {
    wing.add(withEdges(box(.05, .36, .16, M.carbon, sx * .5, 1.08, 2.0), NEON_C, 30, .6));
    wing.add(withEdges(box(.035, .28, .6, M.paint, sx * .97, 1.29, 2.0), NEON_P));
  }
  part(wing, '主动尾翼', 'Active Wing', [0, 1.4, 1.3], [.35, 0, 0]);

  part(withEdges(box(1.9, .035, .45, M.carbon, 0, .25, -2.25), NEON_C), '可伸缩前铲', 'Front Splitter', [0, -.3, -1.4]);
  const diff = new THREE.Group();
  diff.add(withEdges(box(1.5, .03, .55, M.carbon, 0, .22, 2.15), NEON_C, 30, .7));
  for (let i = 0; i < 5; i++) diff.add(withEdges(box(.025, .18, .5, M.carbon, (i - 2) * .3, .3, 2.15), NEON_C, 30, .7));
  part(diff, '五片式扩散器', 'Rear Diffuser', [0, -.35, 1.5]);

  // ---------- 灯光 ----------
  const head = new THREE.Group();
  for (const sx of [-1, 1]) {
    const b = box(.5, .035, .05, M.white, sx * .5, .5, -2.3); b.rotation.z = sx * .12;
    const drl = box(.04, .14, .05, M.cyan, sx * .78, .44, -2.22);
    head.add(b, drl);
  }
  part(head, '矩阵激光大灯', 'Laser Headlights', [0, .15, -1.3]);
  const tail = new THREE.Group();
  tail.add(box(1.5, .045, .05, M.pink, 0, .82, 2.36));
  for (const sx of [-1, 1]) tail.add(box(.05, .2, .05, M.pink, sx * .76, .74, 2.34));
  part(tail, '贯穿式尾灯', 'Light Bar', [0, .3, 1.25]);
  for (const sx of [-1, 1]) part(box(.03, .04, 2.2, M.cyan, sx * .9, .52, 0), '侧裙光带', 'Side Neon', [sx * .75, .05, 0], [0, 0, 0], sx > 0);

  // ---------- 车轮层 ----------
  const tireGeo = new THREE.LatheGeometry([[.29, -.17], [.36, -.17], [.395, -.14], [.41, -.07], [.41, .07], [.395, .14], [.36, .17], [.29, .17]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
  tireGeo.rotateZ(Math.PI / 2);
  const fenderGeo = new THREE.CylinderGeometry(.48, .48, .42, 40, 1, true, 0, Math.PI);
  fenderGeo.rotateZ(Math.PI / 2);
  let first = true;
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const brake = new THREE.Group(); brake.position.set(sx * .8, .4, sz * 1.45);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .025, 40), M.metal); disc.rotation.z = Math.PI / 2;
    withEdges(disc, NEON_C, 30, .4);
    brake.add(disc, box(.08, .14, .13, M.orange, 0, .17, -.08));
    part(brake, '碳陶刹车', 'Ceramic Brakes', [sx * .8, 0, sz * .15], [0, 0, 0], first);

    const wheel = new THREE.Group(); wheel.position.set(sx * .98, .4, sz * 1.45);
    const spin = new THREE.Group(); wheel.add(spin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.3, .022, 10, 64), M.cyan); rim.rotation.y = Math.PI / 2; rim.position.x = sx * .15;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.29, .29, .3, 40, 1, true), M.dark); barrel.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .34, 16), M.white); hub.rotation.z = Math.PI / 2;
    spin.add(new THREE.Mesh(tireGeo, M.rubber), rim, barrel, hub);
    for (let k = 0; k < 6; k++) { // 涡轮式轮辐
      const a = k / 6 * Math.PI * 2;
      const arm = box(.03, .23, .07, M.metal, sx * .12, Math.cos(a) * .16, Math.sin(a) * .16);
      arm.rotation.set(-a, sx * .35, 0);
      spin.add(arm);
    }
    wheels.push(spin);
    part(wheel, '涡轮轮毂', 'Hover Wheels', [sx * 1.5, 0, sz * .45], [0, 0, 0], first);

    const fender = withEdges(mesh(fenderGeo, M.paint, sx * .98, .4, sz * 1.45), NEON_C, 30, .8);
    part(fender, '外露轮拱', 'Aero Fenders', [sx * .95, .75, sz * .45], [0, 0, sx * .3], first);
    first = false;
  }

  return { car, parts, wheels, core, M };
}
