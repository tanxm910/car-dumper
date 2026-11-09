# car-dumper-3d 部署说明

C型折返式单翻翻车机系统 3D 演示页面（纯静态，无后端）。

## 基本信息

| 项目 | 值 |
|---|---|
| 访问地址 | http://192.168.2.67:9080/ |
| 部署路径 | `/Users/tanxmai/apps/car-dumper-3d/` |
| 监听 | `0.0.0.0:9080`（仅局域网，未对公网暴露） |
| 守护方式 | launchd 用户级服务 `local.car-dumper-3d` |
| plist | `~/Library/LaunchAgents/local.car-dumper-3d.plist` |
| 运行时 | Node `/opt/homebrew/bin/node`（v26.x） |
| 日志 | `~/Library/Logs/car-dumper-3d.out.log` / `.err.log` |

## 文件构成

```
car-dumper-3d/
├── index.html      # 主页面（importmap 指向本地 vendor/）
├── server.js       # 极简静态文件服务（约 190 行，无第三方依赖）
└── vendor/         # three.js r170 及用到的 3 个 addon（离线可用）
    ├── three.module.js
    └── addons/{controls,renderers,utils}/*.js
```

`vendor/` 为长缓存（`immutable`, 1 年）；`index.html` 为 `no-cache` + ETag 协商缓存，
更新文件后浏览器刷新即可生效，无需重启服务。

## 常用操作

```bash
# 查看状态（运行中 / pid / 退出码）
launchctl print gui/$(id -u)/local.car-dumper-3d | grep -E 'state|pid|last exit'

# 重启（改 server.js 后需要）
launchctl kickstart -k gui/$(id -u)/local.car-dumper-3d

# 停止并注销（服务不再自启）
launchctl bootout gui/$(id -u)/local.car-dumper-3d

# 重新启用
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.car-dumper-3d.plist

# 实时看日志
tail -f ~/Library/Logs/car-dumper-3d.out.log

# 确认端口
lsof -nP -iTCP:9080 -sTCP:LISTEN
```

## 更新页面内容

只改 `index.html` 时直接覆盖即可（无需重启）：

```bash
# 在本地
scp index.html tanxmai@192.168.2.67:/Users/tanxmai/apps/car-dumper-3d/index.html
```

若同时改了 `vendor/` 或 `server.js`，覆盖后执行一次 `kickstart -k`。

## 完整回滚

```bash
launchctl bootout gui/$(id -u)/local.car-dumper-3d
rm -f ~/Library/LaunchAgents/local.car-dumper-3d.plist
rm -rf ~/apps/car-dumper-3d
rm -f ~/Library/Logs/car-dumper-3d.*.log
```

## 依赖与隔离

- 不依赖 CDN：three.js 已本地化，断网/弱网环境同样可打开。
- 不占用也不影响既有服务：8123（homeassistant）、4322、8443、8813、8899、8900、9443、5000、7000、53、3283 均未改动。
- 服务进程仅监听 9080，只读访问自身目录，不支持 POST/PUT（返回 405），拒绝目录遍历与符号链接逃逸。
