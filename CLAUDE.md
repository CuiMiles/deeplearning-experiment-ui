# CLAUDE.md

本仓库是实验结果看板模板。实验跑完后要把结果填进来时，请先完整阅读并遵循 [AGENTS.md](AGENTS.md)：

- 数据写入 `data/experiments/<id>.json`，媒体放 `public/media/<id>/`
- 用 `npm run new` 生成骨架，用 `npm run validate` 校验（必须 0 个错误）
- `insights`（研究启发）与 `claims`（文献核查）按 AGENTS.md 第 4、5 节的协议撰写
- 数字只能来自日志或评测输出，不允许编造
