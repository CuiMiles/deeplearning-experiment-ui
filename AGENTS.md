# AGENTS.md：智能体填写协议

> 读者：跑完实验后负责“把结果填进看板”的智能体（Claude Code、Codex 等）。
> 目标：让研究者**不看代码和日志**就能看懂这个实验，并且**从中长出论文想法**。
> 你不只是搬运数字的人，还要做研究伙伴：指出现象，找到历史上的同构问题，提出可检验的假设，判断已发表结论该信几分。

---

## 0. 五步流程

```bash
# 1. 生成骨架（task 取值见 data/tasks.json）
npm run new -- --task vtg --id vtg-09-my-idea --title "一句话标题" --parent vtg-04-rlvr-thinking

# 2. 填写 data/experiments/vtg-09-my-idea.json（字段见第 1 节）
# 3. 把案例视频/图片放到 public/media/vtg-09-my-idea/，JSON 里写 media/vtg-09-my-idea/xxx.mp4

# 4. 校验（必须 0 个错误）
npm run validate -- vtg-09-my-idea

# 5. 预览
npm run dev
```

`npm run validate` 会检查：JSON Schema、字段拼写、交叉引用（方法 / 数据集 / 指标 / 透镜 / 提示卡 / 核查项 id）、媒体文件是否存在，以及 VTG 指标的数值自洽（R1 单调、mIoU 必须落在由 R1@0.3/0.5/0.7 推出的区间内）。**不要为了通过校验而改数字**；校验报错通常说明解析或记录有误，应回到日志核对。

---

## 1. 字段速查

| 字段 | 回答的问题 | 写法要点 |
|---|---|---|
| `tldr` | 这个实验在干嘛、结果如何？ | ≤ 90 字，一句话，必须含关键数字 |
| `brief.question / change / conclusion` | 想回答什么？改了什么？结论？ | 每条 ≤ 80 字；不用缩写黑话，没做过的人也能懂 |
| `brief.verdict` | 有效吗？ | `positive / negative / mixed / inconclusive`；负结果同样重要，如实填 |
| `brief.pipeline` | 方法长什么样、改了哪一环？ | 3–6 个环节，`changed: true` 标出改动，`note` 写具体改法 |
| `setup` | 用了什么模型、数据、算力？ | `evalData` 用 `data/tasks.json` 中注册的数据集 id |
| `results.methods` | 和谁比？ | 恰好一个 `ours`；最直接的对照设为第一个 `baseline`（关键指标卡的 Δ 相对它计算） |
| `results.main` | 主结果 | 指标 key 用 `data/tasks.json` 的 `metrics` 键名；数字直接来自评测输出 |
| `results.headline` | 置顶看哪几个数？ | 2–4 个；缺省时用任务的 `primaryMetrics` × 第一个评测集 |
| `curves` | 训练过程正常吗？ | loss / reward / 验证指标 / 生成长度；`markers` 标关键步（早停、学习率变化） |
| `ablations` | 每个因素单独贡献多少？ | 一张卡只改一个因素；`isDefault` 标出默认设置（页面会画相对它的 Δ） |
| `breakdowns` | 在哪赢、在哪输？ | 按时长、片段长度、位置、查询类型等切分；写 `count` |
| `charts` | 其他关键图 | `bar / line / scatter / heatmap / radar`；散点可设 `diagonal: true` |
| `cases` | 具体样本长什么样？ | 见第 3 节 |
| `insights` | 对发论文意味着什么？ | **见第 4 节，最重要** |
| `claims` | 已发表的结论可信吗？ | 见第 5 节；只在与已发表结果对照时填写 |
| `reproduce` | 想自己跑怎么跑？ | 可直接复制运行的命令、完整超参数、配置文件、产物路径 |

所有可选的 `takeaway` 字段只写**一句话结论**，不要复述图里已有的数字。

### 写作原则

1. **少字多图**：能用图表或数字表达的，就不写成段落。每段文字都有长度上限（schema 中的 `maxLength`）。
2. **数字只能来自日志或评测输出**，不允许估算、补全或“看起来合理”的数字。缺失就不填，或者把 `status` 设为 `running`。
3. **不夸大**：用“提升 3.1”，不用“显著提升”（除非做了显著性检验）；单种子结果要说明是单种子。
4. **真实实验不要设置 `demo: true`**；只有模板自带的编造示例才有这个标记。
5. 语言：界面是中文；数据集原文（查询、问题、描述）保留原语言。

---

## 2. 图表怎么选

| 你手上的数据 | 放到哪个字段 | 页面效果 |
|---|---|---|
| 多方法 × 多指标 × 多数据集 | `results.main` | 分组柱状图 + 表格；VTG 自动画 IoU 阈值–召回曲线 |
| 随训练步数变化的标量 | `curves` | 多线折线图，可切换 |
| 单因素扫描（数值型：帧数、数据量） | `ablations`，`kind: numeric` | 折线；默认显示相对 ★ 的 Δ |
| 单因素对比（类别型：奖励设计、编码方式） | `ablations`，`kind: categorical` | 点图（不截断坐标轴、不误导） |
| 按子集切分 | `breakdowns` | 分组柱状图，悬停显示样本数 |
| 二维关系（预测 vs GT、置信度 vs IoU） | `charts`，`type: scatter` | 散点 + 可选对角线 |
| 两个维度交叉 | `charts`，`type: heatmap` | 热力图，自动选择格内文字颜色 |

---

## 3. 案例（cases）

- 选 **3–6 个**：至少 1 个成功、1 个失败、1 个边界情况（`partial`）。失败案例比成功案例更有价值。
- 每个案例写一句 `note`：**为什么**对或错（例如“事件只覆盖 2 个输入帧”），而不是“预测错了”。
- 时序类案例务必填 `sampledFrames`（模型实际输入帧的时间点），页面会在时间轴上画出来，很多失败一眼就能看出原因。
- 多个方法的预测都放进 `predictions`，第一个片段视为 Top-1，其余按置信度淡化显示。
- 高光检测填 `saliency.values`（以及 `saliency.gt`）。
- 媒体放在 `public/media/<实验id>/`。为了逐帧步进流畅，请转成关键帧间隔 1 秒的 H.264：

```bash
ffmpeg -i input.mp4 -c:v libx264 -pix_fmt yuv420p -crf 26 -g 25 -movflags +faststart -an public/media/<id>/case1.mp4
```

视频太大不想放进仓库时，`video.src` 可以写 http(s) URL；不可用时页面会显示占位，时间轴仍可交互。

---

## 4. 研究启发（insights）协议 ★

这一部分决定了看板是“结果展示”还是“研究伙伴”。核心信念：**你在实验里遇到的现象，几乎都在人类历史的某个领域出现过**，哪怕那个领域和深度学习无关。找到它，就能借来别人已经付过学费的理解和解法。

### 第 1 步：列现象（phenomena）

从结果中找 2–5 个**值得解释**的现象：意外的、反直觉的、跨实验反复出现的、与已发表结论矛盾的。

- `title` ≤ 20 字，是“现象”而不是“结论”：写“思维链拉低精细定位”，不写“我们的方法更好”。
- `evidence` 指向页面上的证据：`ablation:<id>`、`breakdown:<id>`、`curve:<id>`、`chart:<id>`、`case:<id>`、`claim:<id>`、`results`。
- `symptoms` 从 `data/lenses.json` 的 `symptoms` 中选 1–2 个（用于匹配透镜，也用于想法板统计“反复出现的现象”）。
- `surprise` 1–5：5 = 与领域共识相反。

### 第 2 步：广泛调研“历史回声”（echoes）

对每个现象：

1. **先查透镜库**：在 `data/lenses.json` 中找 `triggers` 包含该 symptom 的透镜，读它的 `essence` 和 `questions`。
2. **再跳出透镜库做广泛调研**，问自己：*“这个现象的抽象结构是什么？人类在哪里遇到过同样的结构？”* 逐个领域过一遍：
   - 测量与观测（天文学、测量学、计量学）
   - 心理学与认知科学（知觉、记忆、注意、判断偏差）
   - 统计学与元科学（抽样、偏差、可重复性）
   - 经济学与管理（激励、指标、决策）
   - 生物与生态（觅食、进化、免疫）
   - 物理与工程（相变、信号、控制、可靠性）
   - 军事与运筹（搜索、侦察、资源分配）
   - 教育学（课程、反馈、迁移）
   - 艺术、媒介与历史事件
3. **核实事实**：人物、年份、发生了什么，都要能在可靠来源中查到（维基百科条目、原始论文、权威综述）。不确定的细节就不写。有争议的故事（例如“眼镜蛇效应”的真实性）必须在 `caution` 或 `limit` 中说明。
4. 找到库里没有的好先例时，**优先把它补进 `data/lenses.json`**（填全 `story / essence / dlMirror / questions / moves / triggers / refs`），再在 echo 中用 `lens` 引用；临时性的先例可以直接写在 echo 的 `precedent` 字段。

### 第 3 步：做结构映射，而不只是打比方

每个 echo 必须包含：

- `correspondences`：2–4 对 `[他们的元素, 我们的对应物]`。如果写不出一一对应，说明类比太浅，换一个。
- `borrowedMove`：**他们当时是怎么理解或解决的 → 我们可以具体怎么做**。没有可借用做法的类比只是装饰，删掉。
- `limit`：类比在哪里失效。诚实写出失效点，能防止研究者被漂亮的故事带偏。

### 第 4 步：提出可检验的假设（hypotheses）

每个 echo 至少推出 1 个假设：

- `statement`：可证伪的陈述，最好带数字（“<2s 事件的 R1@0.5 可从 10% 提升到 25% 以上”）。
- `test`：**最小**验证实验，最好能在一天内跑完。
- `falsifiedIf`：出现什么结果就放弃。
- `impact` / `effort`：1–5，页面会画成“影响 × 成本”矩阵，左上角是速赢区。
- `from`：来源 echo 的 id。验证过的假设要更新 `status`（`running / confirmed / refuted`）。

### 第 5 步：汇聚成论文方向（paperAngles）

把假设汇聚成 1–3 个论文方向：

- `type`：`method / analysis / benchmark / dataset / theory / system`。
- `claim`：一句话主张；`novelty`：新在哪；`risk`：最可能被审稿人击中的地方。
- `checkRelated`：用于查重的检索词。**你应该真的去检索**；如果已经有人做过，要在 `risk` 中写明是哪篇工作、差异在哪里。
- `readiness` 0–1：离能投稿还有多远（0.2 = 只有现象；0.5 = 主实验完成；0.8 = 只差写作）。
- `venues`：合适的会议或期刊。

### 第 6 步：用提示卡逼自己换角度（provocations）

从 `data/prompts.json` 选 2–4 张卡作答。**必须包含 `reviewer2`（审稿人 2）或 `simplest`（最无聊的解释）中的至少一张**，先排除无聊的解释，再相信有趣的解释。

### 第 7 步：把决定权交还给人（questionsForYou）

1–3 个只有研究者本人能回答的问题：目标会议、资源取舍、方向优先级。

### 质量门槛

- [ ] 每个现象都有证据指向，每个 echo 都有可借用的做法和失效边界
- [ ] 历史事实可核查，没有编造人物、年份或引文
- [ ] 假设可证伪，并且有最小实验
- [ ] `confidence` 是诚实的（单一实验、单种子时不应高于 0.7）
- [ ] `oneLiner` ≤ 90 字，回答“这对发论文意味着什么”

---

## 5. 文献核查（claims）协议

**触发条件**：我们的结果不支持某篇已发表论文的结论，或者打算以某篇论文为基线。尤其是没有开源代码、影响力不高的论文。

**原则**（页面会显示，详见 `data/audit.json`）：

1. **复现不出 ≠ 造假。**绝大多数差距来自没写明的设置差异或无意的偏差。永远不要在任何字段里使用“造假 / fraud / fake”之类的措辞，只描述可核查的事实：“未能复现”“数字不自洽”“协议未说明”。
2. 先穷举**良性解释**，再用最小实验逐一排除。
3. 评价证据，不评价出处：顶会不是证据，低影响力也不是罪证。
4. **设置时间盒**，快速止损：核查的目的是让研究者少浪费时间，而不是陷进去。

**步骤**：

1. 原样记录对方的声称和报告值（`claim`、`reported`），并注明表格或页码出处（写在 `setting` 中）。
2. **数值自洽检查**：VTG 的单调性和 mIoU 上下界由页面自动完成；其他任务请手工检查必然成立的约束，例如 R@1 ≤ R@5 ≤ R@10、准确率必须是 1/N 的整数倍、同一数字在不同表格中是否一致、消融各项增益之和与总增益是否吻合。不自洽时在 `explanations` 中优先写“笔误或口径不一致”的可能。
3. 在**我们的统一协议**下重测（`ours`），并列出与对方设置的每一处差异。
4. **差距分解**（`gap.steps`）：每一处差异的影响尽量用最小实验测出来（`verified: true`），测不出来的标为估计。剩余部分就是“无法解释的差距”。
5. 良性解释（`explanations`）：按可能性 1–5 排序，每条写验证方法；已排除的设 `ruledOut: true`。
6. 逐项填写核查清单（`checklist`，id 见 `data/audit.json`），不知道的就写 `unknown`，不要猜。
7. 给出 `verdict`、`decision` 和 `timebox`。决策参考：
   - 有代码和权重：先用对方权重在我们的评测脚本上跑（≤ 0.5 天）。能复现就 `build-on`。
   - 无代码，可信度 < 40%，或无法解释的差距 > 种子标准差的 3 倍：`unverified` 或 `ignore`，停止投入。
   - 可能只是笔误或口径问题：`contact-authors`，附上礼貌、具体的问题。
   - 多篇同类论文都无法复现：`publish-negative`，把它变成一个分析或复现方向，并写进 `insights.paperAngles`。

---

## 6. 扩展模板

| 想加的东西 | 改哪里 |
|---|---|
| 新任务 | `data/tasks.json` 的 `tasks[]`：指标、数据集、`caseType`、推荐图表、常见陷阱；`icon` 从 `src/components/ui/TaskIcon.tsx` 中选 |
| 新指标 / 数据集 | `data/tasks.json` 的 `metrics` / `datasets`（注意 `higherIsBetter`） |
| 新历史透镜 | `data/lenses.json` 的 `lenses[]`；新现象类型加到 `symptoms[]` |
| 新思维提示卡 | `data/prompts.json` |
| 新核查项 | `data/audit.json` 的 `checks[]` |
| 新的案例展示方式 | `src/lib/types.ts` + `schema/experiment.schema.json` + `src/components/cases/CaseViewer.tsx` |

修改注册表后同样要运行 `npm run validate`。

---

## 7. 交付前自检

- [ ] `npm run validate` 0 个错误
- [ ] `tldr` 一句话就能让外行知道做了什么、结果如何
- [ ] 至少一个失败案例，并写清失败原因
- [ ] `insights` 走完了第 4 节的 7 步
- [ ] 与已发表结论冲突时填写了 `claims`，且措辞中立
- [ ] `reproduce.commands` 可以直接复制运行
