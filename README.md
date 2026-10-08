# 侨脉 Qiaomai

面向全球华侨历史、家族与跨国记忆的中文 Web 项目。使用 HTML、CSS 和 Vanilla JavaScript，将人物、家族、地点、事件、组织、历史档案与侨批连接为可检索的资料网络。

本仓库公开项目代码、结构化资料、采集与构建脚本、设计规范和验证记录，供读者了解实现并撰写项目报告。

- **报告阅读入口**：[REPORT_GUIDE.md](REPORT_GUIDE.md)
- **机器可读项目索引**：[PROJECT_INDEX.json](PROJECT_INDEX.json)
- **设计与资料文档**：[docs/README.md](docs/README.md)
- **当前前端状态**：[FRONTEND_STATUS.md](FRONTEND_STATUS.md)

## 当前实现

更新日期：2026-10-08。当前是前端演示系统，默认 `QM_CONFIG.mode = "demo"`；真实后端 API、账户认证与 OCR 服务尚未接入。

| 资料类型 | 当前演示库条数 |
|---|---:|
| 人物 | 1001 |
| 家族 | 89 |
| 地点 | 383 |
| 组织 | 126 |
| 事件 | 2774 |
| 历史档案 | 1208 |
| 侨批元数据 | 81 |

数量以 [MANIFEST.json](data/frontend_demo/MANIFEST.json) 和 [VALIDATION.json](data/frontend_demo/VALIDATION.json) 为依据，表示演示库记录规模。原始资料的来源与质量字段保留在数据层；页面不展示审核标签。报告引用具体史实时仍需核对原始来源。

当前可供原件阅读器展示的侨批 `clean_original` 数量为 **0**。元数据条数不能作为已公开原件数量；采集样图不随仓库上传。

页面共 11 个：首页、人物、家族、地点、事件、组织、历史档案、侨批、研究工具、全库检索、侨批工作台。支持列表与详情联动、地图、关系图、家族树、档案收藏，以及原件翻页、缩放和全屏组件。

## 获取与运行

```sh
git clone https://github.com/hamliy-feng/qiaomai.git
cd qiaomai
python scripts/serve_frontend.py
```

Windows 也可双击 `启动侨脉前端.bat`。启动器在 `8767–8799` 中选择可用端口，以终端输出为准。无需 npm 安装即可浏览前端；也可直接打开 `frontend/index.html` 离线阅读。

公开仓库提供代码阅读和下载。上述 `127.0.0.1` 本地预览地址只在运行者自己的电脑上有效。

## 项目结构

| 路径 | 内容 |
|---|---|
| `frontend/` | 11 个 HTML 页面、共享组件、页面脚本、本地媒体和第三方库 |
| `frontend/assets/api.js` | 统一 Repository 与 Demo / Backend 访问适配 |
| `frontend/assets/data.js` | 构建生成的浏览器演示数据 |
| `data/frontend_demo/` | 演示库 JSON、清单、结构验证与静态集成检查 |
| `data/collection/` | R01 / R02 来源登记、采集记录与质量记录 |
| `data/canonical/` | 规范化人物、家族、地点、组织、事件与关系 |
| `data/presentation/`、`data/release/` | 展示层与阶段性数据快照 |
| `data/media_acquisition/` | 真实图片采集任务及汇总 |
| `scripts/` | 采集、清洗、构建、验证与本地服务脚本 |
| `docs/` | 九页设计系统、资料规则、实施记录和图片工程方案 |
| `artifacts/frontend-redesign/` | 九页重构阶段的截图与验证记录 |

## 构建与验证

数据更新后重新生成前端适配结果：

```sh
node scripts/build_frontend_full_demo_database.mjs
node scripts/validate_frontend_full_demo_database.mjs
node scripts/check_frontend_full_demo_static.mjs
node scripts/validate_no_review_labels.mjs
```

结构验证检查实体 ID、关系引用、坐标格式和侨批媒体条件；静态集成检查验证脚本可解析及关键人物已接入。浏览器冒烟脚本 `scripts/smoke_frontend_full_demo.cjs` 额外依赖 Playwright 和 Chromium。

`artifacts/frontend-redesign/verification.json` 是早期小演示库阶段的 55 组尺寸、19 项交互和 10 页离线验证，不代表当前全量数据已经通过同一轮浏览器验收。当前证据范围见 [FRONTEND_STATUS.md](FRONTEND_STATUS.md)。

## 数据与媒体使用

- 从 Source → Canonical → Presentation → 前端适配结果保留追溯链，使用 `sourceLinks`、`sourceIds`、QID 和来源矩阵核对证据。
- 已使用前端照片的作者、来源与许可见 [media_manifest.json](frontend/assets/media/media_manifest.json)；Lucide、ECharts 各自的许可随 `frontend/vendor/` 保存。
- 侨批原件须同时满足无水印、无修改、完整原页、权利允许、`clean_original` 五个条件。不得通过去水印、裁切规避、AI 修补或重绘进入展示。
- 公开阅读与项目分析不改变第三方资料、图片和库的原有许可；复用时请核对对应许可并注明来源。项目自有代码尚未另行指定开源许可证。

## 公开读取

仓库：https://github.com/hamliy-feng/qiaomai

无需仓库成员权限即可读取公开文件，机器或 AI 工具可从以下固定入口开始：

- README：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/README.md
- 报告导读：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/REPORT_GUIDE.md
- JSON 索引：https://raw.githubusercontent.com/hamliy-feng/qiaomai/main/PROJECT_INDEX.json

撰写报告时请记录所读 commit SHA，并引用对应版本的文件永久链接。
