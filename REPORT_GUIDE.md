# 侨脉项目报告阅读指南

日期：2026-10-08。面向项目评估、课程报告、技术报告及 AI 辅助分析。

## 公开读取入口

仓库：https://github.com/hamliy-feng/qiaomai

- 项目概览：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/README.md
- 本导读：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/REPORT_GUIDE.md
- 机器索引：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/PROJECT_INDEX.json
- 演示数据清单：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/data/frontend_demo/MANIFEST.json
- GitHub Contents API：https://api.github.com/repos/hamliy-feng/qiaomai/contents/

公开仓库不要求授予写权限即可阅读、克隆或下载。GitHub API 未登录访问受平台速率限制，批量读取可直接克隆仓库。

```sh
git clone https://github.com/hamliy-feng/qiaomai.git
cd qiaomai
git rev-parse HEAD
```

最后一条命令返回报告所引用的版本。建议使用 `https://github.com/hamliy-feng/qiaomai/blob/<commit>/<path>` 引用固定版本。

## 推荐阅读路线

| 报告主题 | 优先阅读 | 可回答的问题 |
|---|---|---|
| 项目目的与范围 | `README.md`、`FRONTEND_STATUS.md` | 面向谁、当前实现什么、哪些能力尚未完成 |
| 视觉与信息架构 | `docs/00_侨脉九页Web设计系统与布局执行规范.md`、`docs/design-references/` | 九页如何组织，纸张/棕金视觉如何落地 |
| 前端技术架构 | `frontend/assets/app.js`、`api.js`、`js/core.js`、`js/pages/` | 页面启动、统一数据适配、共享组件如何协作 |
| 数据规模与构建 | `data/frontend_demo/MANIFEST.json`、`frontend_demo_database.json`、`scripts/build_frontend_full_demo_database.mjs` | 数据从哪里来，如何合并并进入浏览器 |
| 来源与证据 | `docs/01`、`docs/13` 对应文档；`data/collection/` 来源矩阵；`data/canonical/` | 来源等级、实体 ID、关系与质量状态如何保存 |
| 质量验证 | `data/frontend_demo/VALIDATION.json`、`STATIC_INTEGRATION_CHECK.json` 及对应脚本 | 哪些约束实际检查过，哪些测试仍未完成 |
| 真实图片工程 | `docs/21_全量真实图片采集尺寸适配与前端填充执行方案.md`、`data/media_acquisition/` | 图片覆盖、尺寸、来源、权利与下一步工作 |
| 媒体准入 | `frontend/assets/js/image-viewer.js`、`data/collection/R02/qiaopi_media_gate_summary.json` | 原件为何为空，什么条件允许展示 |

完整文件名见 `docs/README.md`；`docs/00–21` 是不同阶段的规范及执行记录，遇到当前状态差异，以根目录 README、FRONTEND_STATUS 和当前数据清单为准。

## 建议报告结构

1. 项目背景、使用者与研究问题。
2. 十一页面的信息架构、视觉语言与主要交互。
3. HTML / CSS / Vanilla JavaScript、Repository 及模块划分。
4. Source → Canonical → Presentation → 前端演示库的数据流程。
5. 实体、关系、来源追溯与媒体准入规则。
6. 已有验证结果、可重复运行方式与证据范围。
7. 图片覆盖、后端接入、原件获取等现存限制与后续工作。

## 事实表述边界

- 当前数量为人物 1001、家族 89、地点 383、组织 126、事件 2774、档案 1208、侨批元数据 81，属于演示库记录数。
- “已入演示库”“前端允许展示”“来源已经完整学术核验”分别表示不同状态；原始采集记录可用于核对来源与质量。
- 侨批可公开原件数为 0。81 条元数据不等于 81 件可公开扫描原件；不能把示意 SVG 或其他侨批图片当作本件原件。
- 家族和迁徙关系应核对相应来源；地图关系图不能单独作为历史行程证据。
- 原九页重构测试的 55 / 19 / 10 项结论属于当时的小演示库，不应写成全量数据浏览器测试已经通过。
- Backend 模式预留适配不等于已有生产后端；账户、OCR 和 Evidence 服务尚未接入。

## 引用与公开范围

请引用项目名称、仓库地址、commit SHA、阅读日期以及具体文件路径；涉及历史事实和图片时，同时引用记录中的原始来源。

项目照片许可在 `frontend/assets/media/media_manifest.json`，第三方代码许可在 `frontend/vendor/`。公开阅读不改变各资料原有许可。代码尚未另行指定开源许可证。

本仓库不包含本地内部记忆、运行日志、旧交付压缩包、重复 Base64 文件，以及未通过公开使用检查的侨批采集样图。相关元数据、来源与媒体质量汇总保留，便于评估研究过程。
