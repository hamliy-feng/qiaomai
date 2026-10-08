# 侨脉资料采集 Agent 任务模板与交付格式

用途：把本文件中的模板直接交给另一个 AI / Agent / 人工资料员，快速开展人物、地点、组织、家族、事件、档案、侨批采集。

# 1. 通用任务提示词

复制后替换【对象】和【对象类型】：

> 你负责为“侨脉”华侨历史数据库采集【对象类型：人物/家族/地点/事件/组织/档案/侨批】【对象名称】的资料。
>
> 目标不是写百科文章，而是形成可直接入库的结构化资料包。优先使用官方档案、大学、博物馆、政府、原始史料、学术论文、Wikidata/Wikipedia/Wikimedia Commons。百度百科等只用于发现线索，关键事实尽量寻找更直接来源。
>
> 所有事实必须保存 source_name、source_url、source_title、支持该事实的短摘录或页面定位、review_status。不同来源冲突时不要自行抹平，分别记录。
>
> 图片必须记录来源、作者/机构、年代、许可说明、原尺寸；不要使用无来源搜索缩略图，不要用 AI 图片冒充历史原图。
>
> 输出必须包括：主档 JSON、事件表、关系表、地点表、组织表、档案表、图片表、来源表、缺失/争议报告。若某字段搜不到，填 null 并说明“未找到”，不得编造。
>
> 采集范围优先服务广东、福建华侨史及海外迁徙、家族、社团、侨批研究。

# 2. 人物任务模板

输入：
- 人物姓名：
- 已知英文名：
- 初步籍贯：
- 目标时间范围：

必须搜索：
- 中文/繁体/英文/方言音译。
- 生卒。
- 出生地与祖籍。
- 海外活动地。
- 5–10 个关键事件。
- 家族关系。
- 组织关系。
- 相关档案/书信/侨批。
- 主肖像和相关建筑/地点图。

交付文件：
- person.json
- events.csv
- family_relations.csv
- place_relations.csv
- organization_relations.csv
- documents.csv
- images.csv
- sources.csv
- unresolved.md

# 3. 地点任务模板

输入：
- 地点标准名：
- 已知历史名：
- 国家/行政区：

必须搜索：
- 标准名、繁体、英文、历史名。
- 华侨历史。
- 侨居/侨乡角色。
- 经纬度和精度。
- 关联人物。
- 相关事件。
- 会馆/商会/学校/企业。
- 侨批和档案。
- 历史港口/建筑/街区图片。

交付：
- place.json
- aliases.csv
- person_relations.csv
- events.csv
- organizations.csv
- documents.csv
- images.csv
- sources.csv

# 4. 组织任务模板

输入：
- 组织名：
- 类型：
- 地点：

必须搜索：
- 正式名、旧名、英文名。
- 成立时间。
- 创办人。
- 历届关键负责人。
- 总部/旧址/分支。
- 重要事件。
- 章程/名册/会刊/照片/档案。
- 与华侨人物、地点、侨批关系。

交付：
- organization.json
- aliases.csv
- person_relations.csv
- place_relations.csv
- events.csv
- documents.csv
- images.csv
- sources.csv

# 5. 家族任务模板

输入：
- 家族/姓氏：
- 祖籍：
- 代表人物：

必须搜索：
- 2–3 代可证实关系。
- 族谱/墓志/官方传记。
- 核心成员。
- 祖籍。
- 主要迁徙地。
- 族谱、侨批、契约等家族档案。
- 家族合影、祖屋、宗祠。

交付：
- family.json
- family_relations.csv
- members.csv
- migration_routes.csv
- documents.csv
- images.csv
- sources.csv

# 6. 事件任务模板

输入：
- 事件名称/线索：
- 相关人物/组织：
- 大概时间：

必须搜索：
- 精确/大致时间。
- 地点。
- 参与人物。
- 相关组织。
- 发生了什么。
- 原始/权威证据。
- 现场照或相关图片。

交付：
- event.json
- participants.csv
- place_relations.csv
- documents.csv
- images.csv
- sources.csv

# 7. 历史档案任务模板

输入：
- 档案名称/来源页：
- 类型：

必须提取：
- 标题。
- 日期。
- 收藏机构。
- 档号。
- 集合名。
- 页数。
- 语言。
- 原图。
- 权限。
- 人物/地点/事件/组织关系。
- 原文/转录可得情况。

交付：
- document.json
- pages.csv
- relations.csv
- transcription.txt / json
- images.csv
- sources.csv

# 8. 侨批任务模板

输入：
- 侨批图片/来源：
- 档号：

必须提取：
- 正反面/信封/汇款单。
- 寄件人原文。
- 收件人原文。
- 日期原文和标准日期。
- 寄出地原文和标准地点。
- 收件地。
- 金额与币种原文。
- 批局/银号。
- OCR。
- 忠实转录。
- 规范化文本。
- 人物/地点 mention。
- 汇款事件。
- 亲属称谓。
- 来源和图片权限。

交付：
- qiaopi.json
- pages/
- raw_ocr.txt
- diplomatic_transcription.txt
- normalized_text.txt
- mentions.csv
- remittances.csv
- candidate_links.csv
- sources.csv

# 9. Agent 不得做的事

- 不得把没找到的字段补成“常识”。
- 不得把同名人物自动合并。
- 不得把祖籍写成出生地。
- 不得把历史地名直接覆盖为现代名。
- 不得把“拟”“计划”“准备”写成已发生事件。
- 不得伪造日期、金额、经纬度。
- 不得下载/使用无来源图片而不记录出处。
- 不得只给一篇总结文章作为交付。

# 10. 最终交付报告格式

每次任务最后输出：

完成：
- 已确认主档字段：
- 已确认关系数：
- 已确认事件数：
- 图片数：
- 档案数：
- 来源数：

未完成：
- 缺失字段：
- 搜不到的关系：
- 图片版权问题：
- 待确认身份：

冲突：
- 事实 A：
- 来源 A：
- 事实 B：
- 来源 B：

建议下一步：
- 需要人工核查的 3–5 项。
