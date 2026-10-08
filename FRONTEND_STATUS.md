# 前端当前状态

更新日期：2026-10-08。本文记录当前有效状态；各阶段过程和旧验证结果见 `docs/18–21`。

## 已实现

- 九个主页面、全库检索和侨批工作台，共 11 路由。
- 纸张、棕金、宋体标题的统一设计系统与响应式布局。
- 独立页面模块、地图、家族树、关系图与原件阅读器。
- 本地 Lucide、ECharts、Natural Earth 地图及带来源许可的前端照片。
- 统一 Repository，默认读取全量前端演示数据库。
- 资料规模：人物 1001 / 家族 89 / 地点 383 / 组织 126 / 事件 2774 / 历史档案 1208 / 侨批元数据 81。
- 页面不展示审核/候选标签；原始采集质量状态与证据保留在数据层。
- 已生成 1680 条真实主图采集任务，详见 `data/media_acquisition/`。

## 验证证据

- `data/frontend_demo/VALIDATION.json`：当前全量数据库结构、ID、关系引用、坐标和媒体门槛验证。
- `data/frontend_demo/STATIC_INTEGRATION_CHECK.json`：当前页面关键脚本与数据接入检查。
- `scripts/validate_no_review_labels.mjs`：前端可见审核标签检查。
- `artifacts/frontend-redesign/verification.json`：早期九页重构阶段的小演示库浏览器验证，55 组尺寸 / 19 项交互 / 10 页离线通过。数据规模变化后，旧断言不能作为当前全量库的浏览器验收结论。
- `scripts/smoke_frontend_full_demo.cjs`：全量库浏览器冒烟脚本。此前执行环境缺少 Playwright，尚无已完成的当前全量浏览器验收记录。

## 待完成

- 真实 `/api/v1` DTO 联调、账户认证、Evidence 与 OCR 服务。
- 按 `docs/21` 继续补真实图片、来源与权利登记。
- 侨批 `clean_original` 当前为 0，原件阅读器保持无可公开原件状态。
- 在具备 Playwright 和 Chromium 的环境完成当前全量库浏览器验收。

## 公开仓库范围

公开前端、脚本、结构化数据、设计文档和已有验证记录。内部 Agent 记忆、运行日志、旧交付 ZIP、重复 Base64 和未通过公开使用检查的侨批采集样图保留本地。读取入口见根目录 `REPORT_GUIDE.md` 和 `PROJECT_INDEX.json`。
