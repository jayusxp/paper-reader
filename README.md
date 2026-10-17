# 阅研 · 论文双语阅读工作台

阅研是一个本地优先的文档阅读应用：导入论文或公开链接，保留 PDF 原始页面，按段翻译并对照阅读，支持高亮、笔记、书签和手动云备份。PDF 图片直接复用原图区域，不翻译图内文字；高清查看独立从 PDF 渲染。

**接手先读：阅读器主体是 `public/reader/` 下的原生 JavaScript；`app/` 主要提供入口和服务端 API。当前是个人研究工作台，尚不是具备团队权限、计费和运营保障的完整商用平台。**

## 导航

- [快速开始](#快速开始)
- [功能与边界](#功能与边界)
- [架构与代码导航](#架构与代码导航)
- [数据模型与持久化](#数据模型与持久化)
- [接口约定](#接口约定)
- [二次开发指南](#二次开发指南)
- [验证与验收](#验证与验收)
- [部署与迁移](#部署与迁移)
- [常见问题](#常见问题)

## 快速开始

### 1. 环境与安装

- Node.js **>= 22.13.0**，pnpm **11.25.0**，Git；版本以 [package.json](package.json) 为准。
- 浏览器需要支持 ES Modules、IndexedDB、Canvas、Web Crypto 和 PDF.js 所需能力。
- 克隆私有仓库前，先完成本机 GitHub 认证。

```bash
git clone https://github.com/jayusxp/paper-reader.git
cd paper-reader
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

浏览器打开 `http://localhost:5173/reader/index.html`。普通克隆默认采用 `portable` 执行配置，`pnpm dev` 通过 Vinext 启动；端口以终端输出为准。

Windows CMD / PowerShell 可以使用上述命令。`pnpm install:ci` 依赖 Bash、flock 和 GNU timeout，是 Linux 托管环境脚本，不是 Windows 安装入口。若原生 Windows 的 workerd 或依赖运行失败，可在 WSL2 中开发；目前没有完整 Windows 浏览器与运行环境验收记录。

### 2. 本地登录与服务端能力

普通本地开发配置通过 [build/sites-vite-plugin.ts](build/sites-vite-plugin.ts) 提供仅限回环地址的模拟登录。需要翻译、链接导入或云接口时，在同一浏览器中打开：

```text
http://localhost:5173/signin-with-chatgpt?return_to=/reader/index.html
```

然后访问 `http://localhost:5173/api/me`，成功应返回包含 `name` 和 `cloud` 的 JSON。这里是本地模拟身份，**不是生产登录**；`cloud: true` 也不代表已经验证 R2 可读写。不要交替使用 `localhost` 与 `127.0.0.1`，两者的 Cookie、IndexedDB 和来源校验不相同。

`pnpm dev` 的本地 R2 由 Cloudflare 开发运行时提供，不与线上存储同步。`pnpm start` 运行构建后的 Worker，不经过 Vite 的模拟登录中间件，不能据此假定本地 API 已登录。

### 3. 最小体验路径

1. 打开示例论文或导入一个可提取文本的 PDF。
2. 检查原版页面、段落定位、书签和笔记。
3. 在模型设置中填写 HTTPS 服务基址、模型名称和 API Key，先翻译一个段落。
4. 点击“查看高清原图”，切换“100% 查看”或下载 PNG。
5. 导出 JSON 备份，再测试恢复；操作真实阅读数据前先保留备份。

示例论文为 77 页的 *A Survey of Self-Evolving Agents*。首页预置译文用于体验，不代表模型接口已经连通。

### 4. 只开发阅读界面

如果暂时不需要服务端，可以用本机 Python 提供静态文件服务：

```bash
python -m http.server 8080 --bind 127.0.0.1 --directory public
```

打开 `http://localhost:8080/reader/index.html`。Windows 若使用 Python Launcher，可将 `python` 替换为 `py`。此方式支持本地导入和阅读，**不提供** `/api/*`，因此不能用于翻译、链接导入或云备份联调。不要直接双击 HTML 使用 `file://` 打开。

## 功能与边界

| 能力 | 当前实现 | 已知边界 |
| --- | --- | --- |
| PDF 阅读 | PDF.js 原版页面、段落定位与滚动联动 | 扫描 PDF 需要外部 OCR；段落识别仍可能有误 |
| 其他文档 | DOCX、PPTX、XLSX、EPUB、TXT、Markdown、HTML、CSV | 以文字结构解析为主，不保证 Office 原版式、图片及复杂公式完整还原 |
| 链接导入 | 服务端抓取公开 HTTPS 文档，支持 arXiv abs 链接转换 | 不支持需登录的网站；不是执行 JavaScript 的网页爬虫 |
| 翻译 | 按块翻译、术语表、编辑和校对状态、暂停后继续未完成段落 | 依赖用户模型服务；任务在当前页面运行，不是后台持久任务 |
| 原图 | 自动识别图像区域、手动框选、定位、高清查看和 PNG 下载 | 当前针对 PDF；低清位图不能恢复原本不存在的细节 |
| 批注与备份 | 高亮、笔记、书签、本地 JSON 备份、手动 R2 快照 | 无实时多人协作或自动跨设备同步 |
| 导出 | Markdown、双栏 HTML | 导出格式不等同 PDF 原版排版，图片复用尚未覆盖 HTML 导出 |

文件导入上限 20 MB，PDF 上限 1000 页，云快照上限 32 MB。旧版 DOC / PPT / XLS 请先转成新版格式。XLSX 读取缓存值，不执行公式计算。OpenXML / EPUB 解析还限制包内文件数量与解压后文本大小，具体见 `importers.js`。

## 架构与代码导航

处理链路：**文件或链接 → 格式识别 → 原文块与坐标 → 按块翻译 → 对照阅读与标注 → 本地保存 / 手动云备份**。

| 目录或文件 | 职责 | 接手时关注点 |
| --- | --- | --- |
| [public/reader/index.html](public/reader/index.html) | 阅读界面和对话框 DOM | `app.js` 通过元素 ID 绑定事件 |
| [public/reader/style.css](public/reader/style.css) | 布局、文章排版、高清图查看样式 | 原文和译文保持各自自然排版 |
| [public/reader/app.js](public/reader/app.js) | 导入、状态、渲染、翻译、批注、存储、云操作 | 业务入口集中；修改时按函数定位 |
| [public/reader/model.js](public/reader/model.js) | 段落生成、ID、翻译批次、结构、备份校验 | 保持原文块身份与顺序稳定 |
| [public/reader/importers.js](public/reader/importers.js) | 非 PDF 格式识别与解析 | 依赖浏览器 DOMParser；不直接渲染不可信 HTML |
| [public/reader/figures.js](public/reader/figures.js) | PDF 图形区域检测、图内文字判定 | 图注必须保留在正常翻译流程 |
| [public/reader/figure-renderer.js](public/reader/figure-renderer.js) | 独立高清区域渲染、PNG 缓存与尺寸限制 | 不从低分辨率阅读画布截屏放大 |
| `public/reader/vendor/` | PDF.js、worker、字体、CMap、WASM、fflate | 升级时成套更新并保留第三方许可 |
| [app/page.tsx](app/page.tsx) | 首页跳转 | 实际阅读入口为 `/reader/index.html` |
| `app/api/` | 链接导入、翻译代理、身份、云快照 | API 均经身份校验 |
| [lib/api.ts](lib/api.ts) / [lib/network.mjs](lib/network.mjs) | 身份、Origin、公网 URL、DNS、响应限制 | 修改网络能力时先读这些约束 |
| [app/chatgpt-auth.ts](app/chatgpt-auth.ts) | 读取可信上游注入的用户身份 | 独立部署时必须替换或接入可信认证层 |
| `tests/` | Node 内置测试与断言脚本 | 无独立 `pnpm test` 脚本 |
| `build/` / `scripts/` / `vite.config.ts` | Sites、Vinext、Cloudflare 运行支持 | `build/` 是受版本管理的源码，不是可随意删除的产物 |
| `components/` / `hooks/` / `db/` / `drizzle/` / `examples/` | Starter 组件、数据库和示例支持代码 | 不是当前阅读器核心；阅读文档没有存入 D1 |

技术栈以锁文件为准：Vinext + Vite + Cloudflare Workers 承载服务端，原生 JavaScript + PDF.js 承载阅读器。仓库虽然包含 React / Next 依赖，但不要把阅读器误当作 React SPA 重构入口。

## 数据模型与持久化

| 对象 | 关键字段 | 用途 |
| --- | --- | --- |
| Document | `schema: 2`、`id`、`format`、`bytes`、`blocks`、`page`、`numPages`、`notes`、`bookmarks` | 原文件、解析结果和阅读状态；普通导入 ID 来自文件 SHA-256 |
| Block | `id`、`page`、`text`、`kind`、`rects`、`translations` | 段落及定位；PDF 坐标是相对页面的归一化矩形 |
| Translation | `text`、`status`、`updated`、历史等 | 按目标语言保存在块的 `translations` 中 |
| Figure | `x/y/w/h`、`captionId`、`source` 等 | 按页存于 `doc.figures`；图内文字块用 `visualOnly` 排除自动翻译 |
| Snapshot | `version: 2`、`document`、`bytes` | JSON 备份；原文件字节在备份中编码为 Base64 |

- IndexedDB：数据库 `paper-reader-v1`，对象仓库 `docs`，主键 `id`。数据库名中的 v1 与文档 `schema: 2` 是不同版本概念。
- localStorage：模型基址、模型名、术语表、上次文档、目标语言等设置。**API Key 仅在页面内存中保存**，刷新后需要重新输入。
- R2：`readers/{encodedUserId}/{documentId}` 保存手动快照，按用户隔离。文件原文、译文和笔记都会随完整快照上传。
- 云保存使用 ETag 条件写入；冲突返回 409，不应直接重试覆盖。
- 改动块 ID、分段算法或文档结构前，先审查 `app.js` 的 `migrate()`、`snapshot()`、`restoreSnapshot()` 及 `model.js` 的 `validateSnapshot()`。必须考虑旧译文、笔记和书签迁移。

## 接口约定

全部接口与前端同源。非 GET 请求要求 `Origin` 等于请求 URL 的 origin；仅复制一个 API 地址到其他前端域名不能正常联调。错误响应通常为 `{ "error": "说明" }`。

| 方法与路径 | 输入 | 输出 / 行为 |
| --- | --- | --- |
| `GET /api/me` | 登录身份 | `{ name, cloud }`；未登录 401 |
| `POST /api/import` | JSON `{ url }` | 原始文档字节；`X-Document-Type` 为源 MIME，`X-Document-Url` 为编码后的最终 URL |
| `POST /api/translate` | `{ base, model, key, target, glossary?, blocks: [{id,text}] }` | `{ blocks: [{id,text}], usage }` |
| `GET /api/cloud` | 登录身份 | `{ items, truncated }`，当前最多列出 200 个快照，无完整分页 |
| `GET /api/cloud?id=...` | 文档 ID | 快照 JSON 与 ETag；不存在 404 |
| `PUT /api/cloud?id=...` | Snapshot JSON；更新时带 `If-Match` | 保存后返回 `{ etag, updated }`；版本冲突 409 |
| `DELETE /api/cloud?id=...` | 文档 ID | `{ deleted: true }`，不删除本地文档 |

### 翻译服务接入

在界面填写用户选择的 OpenAI 兼容服务基址，例如 `https://your-model-host.example/v1`（仅为占位示例）。服务端会补齐 `/chat/completions`，使用 Bearer Key；当前没有项目级 `OPENAI_API_KEY` 自动读取逻辑，不要只配置环境变量后期待界面自动可用。

模型需返回以下 JSON 内容，每个输入块恰好对应一个输出块，ID 不变：

```json
{
  "blocks": [
    { "id": "p1-b0-example", "text": "本段完整译文" }
  ]
}
```

客户端默认按最多 6 块组批；服务端最多接受 8 块、每块最多 18000 字符，并限制整批大小。目标语言当前为简体中文、English、日本語、한국어、繁體中文。响应会校验块 ID、数量、重复与空译文，截断输出不保存。当前只是格式和对应关系校验，不能替代翻译质量验收。

模型服务和导入链接都只允许公网 HTTPS；IP 字面量、私网 DNS 等被拒绝。接入公司内网模型需专门设计受控网关与鉴权，不要直接删除 SSRF 防护。原文会发送到用户配置的模型服务，可能产生模型费用。

## 二次开发指南

### 按需求寻找修改入口

| 想修改什么 | 先读 / 修改 | 同步检查 |
| --- | --- | --- |
| 页面布局、工具栏、弹窗 | `index.html`、`style.css`、`app.js` 的事件绑定 | DOM ID、键盘操作、窄窗口布局 |
| 新增文档格式 | `detectFormat()`、`parseDocument()`、上传控件 | 格式白名单、`validateSnapshot()`、旧数据兼容、样例文件 |
| PDF 分段 / 对齐 | `pdfBlocks()`、`articleStructure()`、`selectBlock()` | 块 ID、顺序、坐标、旧笔记迁移 |
| 翻译策略 / 新模型协议 | `startTranslate()`、`batchBlocks()`、翻译 API | 双端限制、目标语言、重试、响应 ID、错误提示 |
| 图片识别 / 高清参数 | `figures.js`、`figure-renderer.js`、`insertOriginalFigures()`、`showSharpFigure()` | 图注不被排除、宽高比、页切换、缓存与内存限制 |
| 笔记 / 备份字段 | `app.js` 的批注与快照函数、`validateSnapshot()` | schema 迁移、恢复旧备份、云冲突 |
| 账号 / 对象存储 | `chatgpt-auth.ts`、`lib/api.ts`、云 API | 用户隔离、可信身份、ETag、存储大小限制 |

高清图当前阅读侧目标宽度为 1800px，查看器为 4200px，并受最长边 6000px、总像素 1600 万限制。渲染缓存每个 PDF 最多保存 8 个压缩 PNG 任务结果。调整清晰度时同时评估内存，不能取消尺寸限制后直接渲染整页超大画布。

### 必须保持的业务约束

1. 原始 PDF 字节和原文页面不改写；译文保留标题层级、段落顺序与边界，不合并、拆分或总结原文。
2. 原文和译文按块对应，不要求中英文逐行等高，不用强制共享行高改变文章结构。
3. 图内文字默认不翻译、不重绘；图注仍作为文本翻译；放大图独立渲染。
4. 更改解析规则不能静默丢失旧译文、笔记和书签；数据变更必须有迁移方案。
5. 不能把密钥写入 localStorage、IndexedDB、仓库、日志或备份。

建议使用功能分支提交。PR 说明写清修改目的、涉及模块、数据兼容性和验证结果。业务代码目前部分函数较集中，优先按职责逐步拆分，避免同时进行大规模格式化与逻辑修改。

## 验证与验收

在仓库根目录运行；这些命令也适用于 Windows CMD：

```bash
node --check public/reader/app.js
node --test tests/v2.test.mjs tests/article-structure.test.mjs tests/figures.test.mjs tests/figure-renderer.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false
pnpm build
```

| 测试文件 | 覆盖范围 |
| --- | --- |
| `v2.test.mjs` | 公网 URL / IP 限制、翻译批次和 ID 校验、备份、转义及响应限制 |
| `article-structure.test.mjs` | 文章展示结构不修改原文 ID、文本和顺序 |
| `figures.test.mjs` | 图内文本排除、图注保留、图像范围与表格误判 |
| `figure-renderer.test.mjs` | 高清区域几何与像素 / 尺寸限制 |

README 更新不需要重跑全部产品测试；业务变更按涉及模块运行检查。`pnpm lint` 已定义，但不应将“有命令”当作全仓库 lint 已通过。纯 Node 测试也不覆盖依赖 DOMParser 的全部文档解析和真实浏览器交互。

发布前人工验收：导入 PDF 与至少一种非 PDF 文档；测试段落定位、长译文排版、高清图、批注刷新保存、备份恢复；用真实模型完成小批次翻译；在实际账号下验证云保存、恢复和冲突处理。77 页示例曾识别出 9 个带图注的图像区域；第 4 页高清分类图已进行本地渲染核验。这不是完整浏览器矩阵或生产端到端验收。

## 部署与迁移

### 当前 Sites 部署

[.openai/hosting.json](.openai/hosting.json) 绑定现有 Sites 项目，R2 绑定名为 `BUCKET`，D1 未启用。现有站点通过 Sites 的构建和发布流程部署。修改网站时应同步源代码、构建并发布；**向 GitHub main 提交不会自动更新现有 Sites 网站**。仓库没有常驻自动部署工作流，一次性源码导入工作流已经移除。

`pnpm build` 用于构建；`pnpm start` 使用 `dist/server/wrangler.json` 启动本地构建预览。`dist/`、`.next/`、`.wrangler/`、`node_modules/` 和 `.sites-runtime/` 是本地运行或生成目录，不应提交。不要把托管环境中的 `/root/.codex/...` 绝对路径作为新成员的启动前提。

### 迁移到其他平台

这不是复制到任意 Node / 静态托管就能完整运行的项目，迁移需要处理：

- **身份**：替换 Sites 登录流程；生产必须由可信网关验证并注入身份，不能直接信任外部请求自带的 `oai-authenticated-user-*` 头。
- **存储**：将 `cloudflare:workers` 的 `BUCKET` 替换为目标 R2 / S3 等适配器，保留用户隔离和条件写入语义。
- **运行时**：明确是否继续使用 Vinext + Cloudflare；迁往其他框架时适配路由、请求上下文、DNS 和超时行为。
- **配置**：新部署使用自己的项目身份和存储资源，不要复用原有托管项目 ID；环境密钥由部署平台管理。
- **数据**：IndexedDB 绑定浏览器和 origin，换域名不会自动迁移，需导出 / 恢复或手动云快照迁移。

正式商用仍需补齐团队权限、配额与计费、后台任务、限流、审计、可观测性、OCR、真实模型与存储压测，以及浏览器兼容性验收。

## 常见问题

| 现象 | 检查与处理 |
| --- | --- |
| 打开 HTML 后模块 / worker 失败 | 使用 HTTP 服务而非 `file://`；确认 `public/reader/vendor/` 的 worker、字体、CMap、WASM 完整 |
| `/api/*` 返回 404 | 是否只启动了静态服务器？切换到 `pnpm dev` 联调服务端 |
| API 返回 401 | 本地通过模拟登录入口建立会话；线上检查 Sites 登录。`pnpm start` 不提供 Vite 模拟登录 |
| 写接口返回 403 | 检查 Origin、代理转发和域名 / 端口是否一致，不要关闭校验来掩盖配置错误 |
| 翻译无结果 / HTTP 429 / ID 错误 | 检查基址、模型、Key、额度和兼容响应；先翻译一段。不要将部分结果强行写入其他块 |
| 内网模型或链接被拒绝 | 这是现有公网地址策略；通过受控网关设计接入，非简单放开私网 |
| 云保存 409 | 先导出本地备份，再读取云端版本并人工处理差异，避免覆盖其他设备修改 |
| 刷新后数据消失 | 检查浏览器、隐私模式和 origin 是否改变；浏览器清理会删除 IndexedDB，重要记录定期备份 |
| 图片模糊或检测漏图 | 用“查看高清原图 → 100% 查看”；低清位图受源质量限制；漏图可手动框选 |
| 修改源码后线上未变化 | GitHub 与现有 Sites 发布独立，确认已对对应版本执行构建和发布 |

第三方依赖和示例论文的许可分别由其原作者声明；私有仓库不等于已获得对所有附带素材的再分发或商用授权。
