# 侨批识读服务

状态：服务端代码与本地模拟接口测试已完成；尚未配置真实供应商、调用真实模型或部署为公开 HTTPS API。GitHub Pages 仅托管网页，不能运行此服务。

## 运行

需要 Node.js 20 或更新版本，无第三方依赖。使用支持持续运行 Node 进程的主机，通过环境变量配置：

| 环境变量 | 用途 |
|---|---|
| `QM_AI_BASE_URL` | 所选供应商的 OpenAI 兼容基础地址，以 `/v1` 等接口基础路径结尾，不包含 `/chat/completions` |
| `QM_AI_KEY` | 服务端密钥，仅由主机环境注入，禁止写入网页、仓库、日志或命令示例 |
| `QM_OCR_MODEL` | 实际可用且支持图片输入的模型 ID |
| `QM_TRANSLATION_MODEL` | 实际可用的转译模型 ID |
| `QM_ALLOWED_ORIGINS` | 允许的网站来源，逗号分隔；默认侨脉.wiki 与本地8767 |
| `QM_DAILY_LIMIT` | 单进程每日任务总上限，默认50，识别和转译分别计一次 |
| `PORT` / `QM_BIND` | 默认8787 / 127.0.0.1；主机要求对外监听时设 `QM_BIND=0.0.0.0` |
| `QM_TRUST_PROXY` | 默认false；仅在反向代理会覆盖伪造转发头时设true |

启动：`node server/workbench/server.mjs`。检查 `/health`；`configured:false` 时会拒绝识读，不返回示例。

公开使用时需要主机 HTTPS 与常驻进程，再将 `frontend/assets/workbench-config.js` 中 `apiBase` 改为该公开服务地址（可含 `/api` 前缀）。不把 localhost 地址用于公开网站。凭据保持在服务端；网页只得到临时会话令牌。

若选择千问，可按[阿里云官方视觉兼容接口文档](https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai)配置对应地域的基础地址与模型。此文档不代表已经启用该供应商或获得其图像调用授权。

## 接口

- `POST /sessions` → `{sessionToken}`，内存会话30分钟。
- `POST /recognition-jobs`：Bearer会话、multipart `file` + `rotation`（0/90/180/270）→ `{jobId,status}`。
- `POST /translation-jobs`：Bearer会话、JSON `{text,target:"modern-zh"}` → `{jobId,status}`。
- `GET /recognition-jobs/:id` / `GET /translation-jobs/:id` → `status`及完成时的`result.text`。
- `POST /jobs/:id/cancel`：取消该会话的任务，晚返回结果不覆盖取消状态。

仅返回真实供应商结果；原文与白话转译分开调用。缺字保留□，不补造姓名、金额或关系；输出长度截断视作失败。上传仅接受20MB内JPG/PNG/WebP，转译最多16000字符，并发2、每IP与会话每日各10任务。未部署多副本共享计数与持久任务队列，当前按单进程部署；重启会清空任务，浏览器本地草稿不受影响。正式公开部署应配置持久配额计数或供应商侧消费上限，避免重启重置额度。

上传与识读结果不写磁盘或数据库，服务内存结果最多保留30分钟，日志不记录原文、图片、令牌和密钥。临时会话按IP隔离；CORS仅限制网页调用，不替代互联网身份认证。开放服务仍应设供应商消费上限，后续可接用户账户。

## 验证

`node --test scripts/test_workbench_api.mjs scripts/test_workbench_server.mjs`：使用测试供应商模拟服务响应，无真实模型调用，无计费。覆盖上传字节、校订原文、会话隔离、取消与晚返回、失败、限额、缺失配置及密钥隔离。真实侨批识别质量另需用获准原件验证。
