# Oracle 边界切分上界与 OMTG 补充评测（已暂停，保留断点）

- 进度：**1,054 / 11,365** (9.3%)，核验状态：`passed`（errors=0, parser_disagreements=0）。

## 1. TimeLens-Bench 分层子集（500 条/库 @ 2 FPS）

| 数据集 / 方法 | n | mIoU | R1@0.3 | R1@0.5 | R1@0.7 | 视觉 token |
|---|---:|---:|---:|---:|---:|---:|
| charades / native_time | 63 | 33.61% | 52.38% | 30.16% | 11.11% | 11126 |
| charades / flexi_time | 63 | 28.48% | 44.44% | 26.98% | 11.11% | 7823 |
| charades / oracle_split_same_tokens | 64 | 31.40% | 46.88% | 31.25% | 12.50% | 7771 |
| charades / uniform_same_tokens | 63 | 32.83% | 47.62% | 30.16% | 14.29% | 7823 |
| charades / sparse_same_tokens | 63 | 33.21% | 52.38% | 31.75% | 12.70% | 7823 |
| activitynet / native_time | 62 | 17.15% | 24.19% | 17.74% | 9.68% | 13106 |
| activitynet / flexi_time | 61 | 16.11% | 21.31% | 18.03% | 8.20% | 10189 |
| activitynet / oracle_split_same_tokens | 60 | 15.95% | 20.00% | 18.33% | 8.33% | 10198 |
| activitynet / uniform_same_tokens | 61 | 16.48% | 21.31% | 18.03% | 9.84% | 10189 |
| activitynet / sparse_same_tokens | 60 | 16.76% | 21.67% | 18.33% | 10.00% | 10183 |
| qvhighlights / native_time | 22 | 29.49% | 36.36% | 27.27% | 22.73% | 13580 |
| qvhighlights / flexi_time | 22 | 25.30% | 27.27% | 22.73% | 22.73% | 11019 |
| qvhighlights / oracle_split_same_tokens | 22 | 24.59% | 31.82% | 22.73% | 22.73% | 11019 |
| qvhighlights / uniform_same_tokens | 22 | 20.63% | 22.73% | 18.18% | 18.18% | 11019 |
| qvhighlights / sparse_same_tokens | 22 | 21.22% | 27.27% | 18.18% | 18.18% | 11019 |

## 2. OMTG-Bench 全量 320 条（多实例，EtF1 / C-Acc / tIoU / tF1@0.5）

| FPS / 方法 | n | EtF1 | C-Acc | tIoU | tF1@0.5 | 预测段数(均) | 视觉 token |
|---|---:|---:|---:|---:|---:|---:|---:|
| fps2 / native_time | 27 | 0.82% | 14.81% | 21.18% | 15.93% | 2.52 | 14872 |
| fps2 / flexi_time | 27 | 0.00% | 7.41% | 16.02% | 16.86% | 2.00 | 11183 |
| fps2 / flexi_budget_time | 27 | 0.00% | 3.70% | 17.04% | 15.62% | 2.11 | 11835 |
| fps2 / oracle_split_same_tokens | 27 | 0.00% | 11.11% | 16.23% | 9.19% | 2.37 | 11183 |
| fps2 / uniform_same_tokens | 27 | 1.23% | 11.11% | 16.25% | 11.63% | 3.11 | 11183 |
| fps2 / sparse_same_tokens | 27 | 0.00% | 14.81% | 19.62% | 12.77% | 2.81 | 11183 |
| fps6 / native_time | 27 | 2.88% | 18.52% | 20.76% | 20.90% | 2.56 | 12925 |
| fps6 / flexi_time | 27 | 2.16% | 3.70% | 16.52% | 15.00% | 2.30 | 8486 |
| fps6 / flexi_budget_time | 27 | 0.00% | 3.70% | 22.11% | 21.60% | 1.67 | 11659 |
| fps6 / oracle_split_same_tokens | 27 | 0.00% | 7.41% | 16.42% | 9.75% | 1.96 | 8486 |
| fps6 / uniform_same_tokens | 27 | 0.00% | 14.81% | 14.64% | 9.26% | 1.93 | 8486 |
| fps6 / sparse_same_tokens | 27 | 0.93% | 14.81% | 18.57% | 15.83% | 2.56 | 8486 |

## 3. 核心配对差值：Oracle vs FlexiTime（同 token 预算，源视频聚类 Bootstrap 95% CI）

| 数据集 / FPS / 指标 | n | Δ (Oracle − Flexi) | 95% CI | W / L / T |
|---|---:|---:|---|---|
| charades/fps2/iou | 63 | +2.22% | pending | 10/7/46 |
| activitynet/fps2/iou | 60 | -0.43% | pending | 5/3/52 |
| qvhighlights/fps2/iou | 22 | -0.71% | pending | 2/4/16 |
| omtg/fps2/EtF1 | 27 | +0.00% | pending | 0/0/27 |
| omtg/fps2/tF1@0.5 | 27 | -7.67% | pending | 2/5/20 |
| omtg/fps6/EtF1 | 27 | -2.16% | pending | 0/1/26 |
| omtg/fps6/tF1@0.5 | 27 | -5.25% | pending | 0/2/25 |
