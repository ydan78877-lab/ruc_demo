# 人大中法学生助手

这是人大苏州中法学生助手的私有协作仓库，统一管理微信小程序、CloudBase 云函数、电脑端管理后台和本地网页 Demo。

## 项目结构

| 目录 | 用途 |
| --- | --- |
| `web/` | 本地网页 Demo，含它的 Cloudflare Worker + D1 后端（`worker/`、`db/`、`drizzle/`）、图片资源与测试 |
| `admin/` | 电脑端管理后台，独立入口，接 CloudBase HTTP 触发器 |
| `miniprogram/` | Taro + React 微信小程序与云函数 |

`web/` 与 `admin/` 共用仓库根的 `node_modules`；`miniprogram/` 因 Taro 需要 React 18，保留自己的依赖树。

## 分支与环境

- `develop`：日常集成分支，只连接开发 CloudBase 环境和模拟数据。
- `main`：内测正式分支，只由项目所有者发布微信体验版或正式版。
- 新功能从 `develop` 创建 `feature/...` 分支，修复从 `develop` 创建 `fix/...` 分支。
- 功能分支通过 Pull Request 合并到 `develop`；发布通过 Pull Request 将 `develop` 合并到 `main`。

## 本地安装

```bash
npm ci
npm --prefix miniprogram ci
cp admin/.env.example admin/.env.local
cp miniprogram/.env.example miniprogram/.env.local
cp miniprogram/cloudbaserc.example.json miniprogram/cloudbaserc.json
```

每位开发者只在本地填写自己有权访问的环境。不得将 `.env.local`、`cloudbaserc.json`、微信私人项目配置、密码、Token 或私钥提交到 Git。

## 开发与校验

```bash
# 本地网页 Demo
npm run dev

# 电脑端管理后台
npm run dev:admin

# Codex 中的小程序 H5 预览
npm --prefix miniprogram run dev:h5

# 微信小程序持续编译
npm --prefix miniprogram run dev:weapp

# 提交前检查
npm run build
npm test
npm --prefix miniprogram run check
npm --prefix miniprogram run build:weapp
```

微信开发者工具应导入 `miniprogram/` 目录，不要单独导入 `miniprogram/dist/`。

## 一键同步本地 Demo

本地修改完成后，可以运行：

```bash
./scripts/sync-demo.sh "本次修改说明"
```

或使用 npm 命令：

```bash
npm run sync:demo -- -m "本次修改说明"
```

脚本会依次检查敏感文件、同步 GitHub 状态、构建网页与小程序、运行云函数测试、提交并推送当前分支，然后上传微信小程序开发版本。微信版本号默认按运行时间生成，例如 `2026.08.23.173000`；也可以手动指定：

```bash
./scripts/sync-demo.sh -v 2026.8.23.3 -m "优化概览页事项入口"
```

第一次使用前，请确认微信开发者工具已登录。若开发者工具保持打开，需要在“设置 → 安全设置”中开启服务端口；也可以先保存工作并关闭开发者工具，让 CLI 按默认端口启动。只想验证、不修改 GitHub 或微信时运行：

```bash
./scripts/sync-demo.sh --dry-run -m "发布前检查"
```

脚本上传的是微信开发版本，不会自动提交审核或发布正式版。只有 `miniprogram/src/` 下的同源页面修改才会进入微信包；网页 `web/src/` 的专属修改只会同步到 GitHub。

桌面的 `同步中法Demo到GitHub和微信.command` 会以完整同步模式调用脚本：即使 GitHub 当前没有新的云函数差异，也会通过 `--force-cloud` 重新部署 `rucStudentApi`，然后上传微信开发版本。上传成功后，登录微信公众平台，进入“管理 → 版本管理”，在对应开发版本右侧选择“选为体验版”。该操作只生成体验版，不会提交审核或发布正式版。

只在命令行需要强制重新部署云函数时，也可以运行：

```bash
./scripts/sync-demo.sh --force-cloud -m "同步云函数与小程序"
```

## 数据与权限边界

- 开发环境不得复制内测正式环境的真实用户数据。
- 技术合作者可修改小程序、云函数和管理后台代码，但不拥有正式数据库、真实用户资料、超级管理员或发布凭据。
- 案例库只提交已脱敏的前台快照；飞书原始导出、真实姓名和运营备注不进入仓库。
- 正式云函数的管理员密码哈希、Session Secret 和允许域名由 CloudBase 环境变量管理。

详细协作要求见 [CONTRIBUTING.md](CONTRIBUTING.md)。
