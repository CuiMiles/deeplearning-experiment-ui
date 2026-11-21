# 合帧放大系数复验

已评分 49/800 次推理。差值单位为 mIoU 百分点。每行只比较两组都有预测的视频。

| 模型及数据 | 对比 | 配对视频 | 差值 | 95% 区间 | 胜 / 负 / 平 | 连续时间差值 |
|---|---|---:|---:|---|---|---:|
| q25/charades | flexi_no_norm - flexi | 5 | -8.34 | [-26.68, +10.00] | 2 / 2 / 1 | -8.45 |
| q25/charades | flexi_no_norm - endpoints | 5 | -10.66 | [-28.00, +6.69] | 2 / 2 / 1 | -11.60 |
| q25/charades | endpoints - sparse | 5 | -0.13 | [-0.38, +0.00] | 0 / 1 / 4 | +0.34 |
| q25/charades | flexi_no_norm - sparse | 5 | -10.78 | [-28.00, +6.43] | 2 / 2 / 1 | -11.26 |
| q25/charades | flexi_no_norm - native | 4 | -13.50 | [-30.00, +3.00] | 2 / 1 / 1 | -14.17 |
| q25/activitynet | flexi_no_norm - flexi | 4 | +0.00 | [+0.00, +0.00] | 0 / 0 / 4 | +0.00 |
| q25/activitynet | flexi_no_norm - endpoints | 4 | +0.00 | [+0.00, +0.00] | 0 / 0 / 4 | +0.00 |
| q25/activitynet | endpoints - sparse | 4 | -2.03 | [-4.05, +0.00] | 0 / 1 / 3 | -1.96 |
| q25/activitynet | flexi_no_norm - sparse | 4 | -2.03 | [-4.05, +0.00] | 0 / 1 / 3 | -1.96 |
| q25/activitynet | flexi_no_norm - native | 4 | -8.12 | [-12.20, -4.05] | 0 / 2 / 2 | -7.81 |
| q3/charades | flexi_no_norm - flexi | 1 | -10.53 | [-10.53, -10.53] | 0 / 1 / 0 | -10.53 |
| q3/charades | flexi_no_norm - endpoints | 1 | +0.00 | [+0.00, +0.00] | 0 / 0 / 1 | +0.00 |
| q3/charades | endpoints - sparse | 1 | -10.00 | [-10.00, -10.00] | 0 / 1 / 0 | -10.00 |
| q3/charades | flexi_no_norm - sparse | 1 | -10.00 | [-10.00, -10.00] | 0 / 1 / 0 | -10.00 |
| q3/charades | flexi_no_norm - native | 1 | -10.00 | [-10.00, -10.00] | 0 / 1 / 0 | -10.00 |

主复验是新 Charades 视频上的 Qwen3 去缩放对原缩放。跨模型与跨数据集分开判断。区间按时长层在源视频内配对重采样，各比较未经多重性校正。逐视频结果见 per_video.csv，首层响应探针见 probes/。
