# R01 首轮数据质检摘要

日期：2026-10-08  
任务：TASK-2476eb55  
自动质检：`scripts/validate_r01_data.mjs`  
机器报告：`AUTO_VALIDATION.json`

# 当前结构化结果

| 对象 | 当前数量 | reviewed / metadata_reviewed |
|---|---:|---:|
| 人物 | 5 | 5 |
| 地点 | 14 | 地点仍按 candidate authority 继续补坐标/历史名 |
| 组织 | 53 | 10 reviewed |
| 人物事件 | 28 | 28 reviewed |
| 组织事件 | 24 | 24 reviewed |
| 事件合计 | 52 | 52 reviewed |
| 关系 | 26 | 26 reviewed |
| 来源记录 | 43 | 已进入 Source Matrix |
| Presentation 人物 | 5 | 5 |
| 侨批候选 | 81 | 5 metadata_reviewed |
| 侨批文献对象 | 5 | 5 metadata_reviewed |
| 原件页存在性已核侨批 | 16 | — |
| 已完成 normalized_text 侨批 | 0 | 0 |

# 已通过

- [x] 人物门槛：至少 5 个 Complete/Usable；当前 5 个 reviewed/usable。
- [x] 组织门槛：至少 10 个 reviewed；当前 10 个。
- [x] Canonical / Presentation 稳定 ID 无重复。
- [x] 人物 source_id 全部可解析。
- [x] 人物 event_id 全部存在。
- [x] Presentation 的 placeIds/orgIds 均指向真实 Canonical 实体。
- [x] 26 条关系无悬挂 subject/object/source。
- [x] 52 条 reviewed 事件无悬挂人物/地点/组织/来源。
- [x] Canonical 侨批 5 件均有对应 Document 和 Source。
- [x] qiaopi_candidates 无重复 archive_number。
- [x] 异常档案日期保留 raw，并标 date_needs_review，没有擅自解释。
- [x] 图片未确认再发布权限时没有下载进正式 frontend media。

# 尚未通过

- [ ] 侨批逐页/原件存在性核查 >=30；当前 16。
- [ ] 侨批 normalized_text >=10；当前 0。
- [ ] 家族 reviewed >=10；当前仍为候选池，尚未完成 2–3 代证据。
- [ ] 总事件 >=231；当前 reviewed 52。
- [ ] 人物最终 >=1000；当前 reviewed 5。
- [ ] 侨批最终规范化 >=3000；当前 metadata_reviewed 5。

# 当前自动质检结果

```text
errors = 0
warnings =
- R01 publish gate: page/image checked qiaopi < 30
- R01 publish gate: normalized qiaopi text < 10

publish_gate_passed = false
```

# 发布决定

**R01 暂不切换正式前端 Repository。**

允许：
- 内部 reviewed 预览。
- Canonical / Presentation 契约联调。
- 使用 reviewed 人物和组织继续生成事件、关系、家族候选。
- 使用 qiaopi metadata_reviewed 对象调试档案页元数据，但页面必须标“正文待转录”。

禁止：
- 把 81 个侨批候选计入“规范化侨批”。
- 把无转录侨批写成全文可检索。
- 把候选家族画成正式世系树。
- 把当前 53 个组织全部写成 reviewed；当前只有 10 个满足审核条件。
