# 合帧放大系数复验

已评分 800/800 次推理。差值单位为 mIoU 百分点。每行只比较两组都有预测的视频。

| 模型及数据 | 对比 | 配对视频 | 差值 | 95% 区间 | 胜 / 负 / 平 | 连续时间差值 |
|---|---|---:|---:|---|---|---:|
| q25/charades | flexi_no_norm - flexi | 48 | +1.60 | [-2.24, +5.97] | 7 / 8 / 33 | +1.69 |
| q25/charades | flexi_no_norm - endpoints | 48 | -0.39 | [-3.87, +2.70] | 7 / 7 / 34 | -0.63 |
| q25/charades | endpoints - sparse | 48 | -0.77 | [-2.82, +1.03] | 6 / 6 / 36 | -0.60 |
| q25/charades | flexi_no_norm - sparse | 48 | -1.16 | [-4.67, +1.87] | 8 / 8 / 32 | -1.23 |
| q25/charades | flexi_no_norm - native | 48 | -1.93 | [-5.46, +1.06] | 6 / 7 / 35 | -2.03 |
| q25/activitynet | flexi_no_norm - flexi | 32 | -0.41 | [-1.72, +0.42] | 2 / 1 / 29 | -0.42 |
| q25/activitynet | flexi_no_norm - endpoints | 32 | -0.05 | [-2.26, +2.22] | 2 / 3 / 27 | -0.11 |
| q25/activitynet | endpoints - sparse | 32 | -1.22 | [-6.22, +2.60] | 4 / 5 / 23 | -1.19 |
| q25/activitynet | flexi_no_norm - sparse | 32 | -1.28 | [-6.58, +3.17] | 4 / 7 / 21 | -1.30 |
| q25/activitynet | flexi_no_norm - native | 32 | -3.29 | [-8.63, +1.68] | 3 / 8 / 21 | -3.26 |
| q3/charades | flexi_no_norm - flexi | 48 | +5.79 | [+1.20, +10.93] | 13 / 6 / 29 | +5.60 |
| q3/charades | flexi_no_norm - endpoints | 48 | -1.62 | [-3.25, -0.16] | 1 / 9 / 38 | -1.76 |
| q3/charades | endpoints - sparse | 48 | -0.03 | [-3.37, +3.28] | 10 / 8 / 30 | +0.51 |
| q3/charades | flexi_no_norm - sparse | 48 | -1.65 | [-4.91, +1.62] | 8 / 14 / 26 | -1.25 |
| q3/charades | flexi_no_norm - native | 48 | -0.98 | [-3.38, +1.39] | 5 / 10 / 33 | -0.85 |
| q3/activitynet | flexi_no_norm - flexi | 32 | -3.77 | [-10.40, +0.07] | 1 / 3 / 28 | -3.47 |
| q3/activitynet | flexi_no_norm - endpoints | 32 | -2.00 | [-8.87, +2.39] | 2 / 3 / 27 | -1.62 |
| q3/activitynet | endpoints - sparse | 32 | -1.87 | [-7.73, +3.11] | 6 / 5 / 21 | -0.79 |
| q3/activitynet | flexi_no_norm - sparse | 32 | -3.87 | [-12.75, +3.13] | 7 / 7 / 18 | -2.41 |
| q3/activitynet | flexi_no_norm - native | 32 | -0.53 | [-8.37, +5.77] | 4 / 4 / 24 | -0.15 |

主复验是新 Charades 视频上的 Qwen3 去缩放对原缩放。跨模型与跨数据集分开判断。区间按时长层在源视频内配对重采样，各比较未经多重性校正。逐视频结果见 per_video.csv，首层响应探针见 probes/。
