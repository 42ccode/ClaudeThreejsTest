# NEBULA LAB · 网页动效作品集

一组纯前端的 3D / 物理 / 着色器动效页面，无需构建，所有库通过 CDN 加载。

## 运行

页面使用 ES Module 与 CDN 依赖，需要通过本地服务器打开（直接双击 HTML 会被浏览器拦截）：

```bash
python3 serve.py
```

`serve.py` 和 `python3 -m http.server` 一样，但会禁止浏览器缓存，改完代码普通刷新即可看到最新效果。

然后访问 http://localhost:5173/hub.html （作品大厅）。

## 页面

| 页面 | 文件 | 技术 |
|---|---|---|
| 作品大厅 | `hub.html` | three.js · 着色器卡片 3D 轮播 |
| 粒子宇宙 | `index.html` | three.js · 2 万粒子形态变换、滚动叙事 |
| 液态金属 | `liquid.html` | three.js · 光线步进 SDF |
| 超空间跃迁 | `tunnel.html` | three.js · 实例化 + 色差/径向模糊后期 |
| 粒子文字 | `text.html` | three.js · 文字采样 + 弹簧物理 |
| 霓虹公路 | `synthwave.html` | three.js · 程序化地形 + 可驾驶跑车 |
| 跑车解构 | `garage.html` | three.js · 爆炸/平铺视图、X 光、扫描 |
| 事件视界 | `blackhole.html` | OGL · 广义相对论黑洞光线追踪 |
| 物理实验室 | `physics.html` | Babylon.js 7 + Havok 刚体物理 |
| 失重网页 | `gravity.html` | Matter.js · DOM 元素刚体化 |
| 流体墨水 | `fluid.html` | three.js · GPU Navier–Stokes 流体模拟 |
| 声波星球 | `sonic.html` | three.js · FFT 频谱驱动地形的音乐可视化 |
| 反应扩散 | `reaction.html` | three.js · Gray–Scott 反应扩散方程 |
| 霓虹魔方 | `cube.html` | three.js · 可拖动转层的 3×3 魔方 |
| 撕裂布料 | `cloth.html` | three.js · Verlet 质点弹簧布料，可拉断、可剪开 |
| 鱼群 | `boids.html` | three.js · Boids 群体智能 + 空间网格邻居查找 |
| 落沙世界 | `sand.html` | Canvas 2D · 像素元胞自动机 |
| 极光 | `aurora.html` | three.js · 分层采样的极光光帘与湖面倒影 |
| 落日海洋 | `ocean.html` | three.js · 光线步进海浪 |
| 烟花 | `fireworks.html` | three.js · 粒子 + AfterimagePass 残影拖尾 |
| 星系碰撞 | `galaxy.html` | three.js · 双核心引力下的 2.6 万颗恒星 |
| 迷你星球 | `planet.html` | three.js · 低多边形星球，可种树盖房 |
| 赛博城市 | `city.html` | three.js · 实例化楼群与悬浮车流飞越 |
| 高尔顿板 | `plinko.html` | Matter.js · 钉阵落球与正态分布 |
| 果冻软体 | `jelly.html` | Canvas 2D · 形状匹配软体物理 |

## 共享模块

- `shared.js` — 全站菜单、圆形转场、自定义光标，并加载 BGM
- `bgm.js` — Web Audio 实时合成的 140 BPM trap 背景音乐（默认静音，M 键开关）
- `car.js` — 程序化科幻跑车模型，霓虹公路与跑车解构共用
- `serve.py` — 禁止缓存的本地开发服务器

各 3D 页面通过 `shared.js` 提供的 `NEBULA.adaptive()` 按实测帧率自动调整渲染分辨率，保证流畅。
