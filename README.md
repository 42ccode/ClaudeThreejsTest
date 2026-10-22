# NEBULA LAB · 网页动效作品集

一组纯前端的 3D / 物理 / 着色器动效页面，无需构建，所有库通过 CDN 加载。

## 运行

页面使用 ES Module 与 CDN 依赖，需要通过本地服务器打开（直接双击 HTML 会被浏览器拦截）：

```bash
python3 -m http.server 5173
```

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

## 共享模块

- `shared.js` — 全站菜单、圆形转场、自定义光标，并加载 BGM
- `bgm.js` — Web Audio 实时合成的 140 BPM trap 背景音乐（默认静音，M 键开关）
- `car.js` — 程序化科幻跑车模型，霓虹公路与跑车解构共用
