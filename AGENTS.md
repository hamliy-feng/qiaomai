# AGENTS.md — 侨脉前端项目规则

## Scope
本文件适用于 `D:\APP\侨脉` 整个项目树。

## Source project isolation
- `D:\BaiduNetdiskDownload\华侨志` 仅允许只读参考。
- 禁止对旧华侨志项目执行写入、移动、删除、格式化、重构、服务切换或数据库迁移。
- 任何复制的思路/布局必须落在本项目新文件中；不得把侨脉代码写回旧目录。

## Current frontend objective
- 使用 HTML + CSS + Vanilla JavaScript。
- 视觉继承旧项目的纸张、棕金、宋体标题、列表—详情、时间线、来源卡风格。
- 页面：主页、人物、家族、地点、事件、组织、历史档案、侨批、研究工具、全库检索、侨批工作台。
- 前端通过统一 repository/API adapter 读取数据；Demo 与真实后端切换不改页面。
- Demo 数据必须显式标记，不得伪装成真实生产统计。

## Memory
- 项目记忆：`.agent_memory/MEMORY.md`。
- 每次实质工作开始先读本文件和 MEMORY.md；结束前更新 MEMORY.md。
