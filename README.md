# car-dumper
# C 型折返式翻车机 · 3D 工艺演示

在浏览器里观察铁路敞车如何进机、压紧、翻卸和折返，以及卸下的煤如何进入料场或配煤仓。项目使用 Three.js r170 构建三维场景，支持鼠标和触屏操作。模型尺寸、动作时序和煤流用于教学演示。

## 快速开始

| 页面 | 内容 | 打开方式 |
| --- | --- | --- |
| 系统总览 | 翻卸、空车折返和料场煤流 | 在本地静态服务中打开 [index.html](index.html) |
| 本体详解 | 点选部件、切换车皮、逐步观察翻卸 | 下载并双击 [dumper-detail.html](dumper-detail.html) |
| 经典离线版 | 翻车机、拨车机、迁车台、推车机及重空车线 | 下载并双击 [c-dumper.html](c-dumper.html) |

使用支持 WebGL 2 的浏览器。两份离线 HTML 已包含渲染依赖，下载后即可打开。

体验完整系统时，在下载或克隆后的项目根目录启动静态服务。总览通过 CDN 加载 Three.js。

```bash
python3 -m http.server 8899 --bind 127.0.0.1
```

[打开本地系统总览](http://127.0.0.1:8899/index.html)

## 系统总览

仿真打开后自动运行。拨车机牵引重车入机，翻车机在压车梁和靠车板锁定车体后翻转约 165°。上一节空车经迁车台移到空车线，再由推车机送入空车列。

- 控制栏可暂停、继续、调整 0.25–4 倍速、切换视角和显示标签。「本体详解」按钮打开独立的部件演示。
- 桌面用左键拖动旋转、右键拖动平移、滚轮缩放。手机用单指旋转、双指捏合缩放，并通过下拉菜单切换视角。点「状态」可展开设备信息。
- 料场支持自动、堆料、取料和直通。切换工况时会演示共用皮带排空和悬臂转位。

| 工况 | 主要煤流 |
| --- | --- |
| 堆料 | 翻车机煤斗 → B01 → B02 → 转运站 → B03 → 固定尾车与悬臂 → A 煤堆 |
| 取料 | B 煤堆 → 斗轮与悬臂 → B03 → B04A → B04B → B02 → 转运站 → B06 → 配煤仓 |
| 直通 | 翻车机煤斗 → B01 → B02 → 转运站 → B06 → 配煤仓 |

总览支持 `t`（启动时快进的仿真秒数）、`view`（视角）和 `yard`（初始料场工况）。例如在本地静态服务中打开 `index.html?yard=reclaim&view=stacker`，可从堆取料机视角观察取料。

## 翻车机本体详解

可观察 C 形端环、液压压车梁和靠车板、弧形轨道与齿圈、均衡托轮、驱动电机、减速机和承车平台。点选模型或部件索引可高亮并聚焦部件，也可使用端面、传动侧和靠车侧预设视角。

1. 选择「无车皮」观察机构，或选择「有车皮」查看敞车和落煤动画。
2. 点「播放循环」观看待机、压紧、翻转、卸料、回位和松开。也可点任一工步从头播放，该步结束后会自动暂停。
3. 拖动时间轴定位到指定姿态，观察齿轮啮合、托轮滚动和油缸伸缩。

## 开发与构建

构建离线文件需要 Node.js 18 或更高版本及 npm。在项目根目录运行以下命令。

```bash
npm ci
npm run build:detail
npm run build
```

| 命令 | 输入 | 生成文件 |
| --- | --- | --- |
| `npm run build:detail` | [detail/](detail/) | `dumper-detail.html` |
| `npm run build` | [index.original.html](index.original.html) | `c-dumper.html` |

系统总览直接编辑 [index.html](index.html)。详解的布局在 [detail/index.html](detail/index.html)，部件建模在 [detail/machine.js](detail/machine.js)，工步和姿态计算在 [detail/motion.js](detail/motion.js)，交互在 [detail/main.js](detail/main.js)。[构建脚本](build-standalone.mjs) 使用 esbuild 将脚本和依赖内嵌到离线 HTML。

发布静态站点时，将 `index.html` 与生成的 `dumper-detail.html` 放在同一目录，两个页面可通过相对链接互相跳转。
