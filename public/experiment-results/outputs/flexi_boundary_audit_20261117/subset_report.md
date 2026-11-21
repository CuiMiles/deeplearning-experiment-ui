# FlexiVideo ATS 边界存活率与实例间隔合并审计（纯 CPU）

- 已校验对照 `004` 原版缓存：**49** 组完全一致。
- 就绪视频数：`{'charades': 207, 'activitynet': 154, 'qvhighlights': 492, 'omtg': 287}`，总耗时 12037.6s。

## 1. 视频级压缩率与分组长度分布

| 数据集 / FPS | 视频数 | 原生组数 (2帧) | 自适应组数 | 压缩比 | >2帧组占比 | 6帧组占比 |
|---|---:|---:|---:|---:|---:|---:|
| activitynet/fps2 | 154 | 142.7 | 116.0 | 81.5% | 23.8% | 8.6% |
| activitynet/fps6 | 154 | 428.3 | 307.0 | 72.0% | 36.7% | 16.5% |
| charades/fps2 | 207 | 30.6 | 20.2 | 66.2% | 48.3% | 24.6% |
| charades/fps6 | 207 | 91.6 | 51.0 | 55.8% | 63.2% | 38.5% |
| omtg/fps2 | 287 | 175.4 | 135.4 | 76.7% | 30.1% | 11.7% |
| omtg/fps6 | 287 | 483.4 | 330.8 | 67.5% | 42.2% | 21.3% |
| qvhighlights/fps2 | 492 | 149.6 | 127.4 | 85.1% | 19.3% | 6.0% |
| qvhighlights/fps6 | 492 | 448.9 | 344.5 | 76.7% | 30.2% | 12.5% |

## 2. 边界跨组、短事件吞并与 Oracle 可行性（同 token 预算）

| 数据集 / FPS / 方法 | 查询数 | 边界落入>2帧跨界组 | 边界组均宽(s) | 事件吞入单组(<=2s事件) | 事件零纯内部组(全量) |
|---|---:|---:|---:|---:|---:|
| activitynet/fps2/adaptive | 500 | 20.7% | 1.37 | 7.6% | 8.8% |
| activitynet/fps2/native | 500 | 0.0% | 0.97 | 0.0% | 1.4% |
| activitynet/fps2/oracle | 500 | 6.0% | 1.20 | 0.0% | 4.6% |
| activitynet/fps2/uniform | 500 | 34.7% | 1.35 | 15.1% | 8.8% |
| activitynet/fps6/adaptive | 500 | 31.5% | 0.54 | 0.0% | 1.0% |
| activitynet/fps6/native | 500 | 0.0% | 0.33 | 0.0% | 0.0% |
| activitynet/fps6/oracle | 500 | 13.8% | 0.49 | 0.0% | 0.0% |
| activitynet/fps6/uniform | 500 | 27.1% | 0.52 | 0.0% | 0.0% |
| charades/fps2/adaptive | 502 | 36.5% | 1.67 | 15.6% | 20.7% |
| charades/fps2/native | 502 | 0.0% | 0.98 | 1.1% | 2.2% |
| charades/fps2/oracle | 502 | 15.2% | 1.52 | 3.3% | 8.6% |
| charades/fps2/uniform | 502 | 46.9% | 1.63 | 19.4% | 22.7% |
| charades/fps6/adaptive | 502 | 47.9% | 0.67 | 0.0% | 4.2% |
| charades/fps6/native | 502 | 0.0% | 0.33 | 0.0% | 0.0% |
| charades/fps6/oracle | 502 | 22.1% | 0.64 | 0.0% | 1.0% |
| charades/fps6/uniform | 502 | 44.6% | 0.65 | 0.0% | 2.4% |
| omtg/fps2/adaptive | 320 | 29.2% | 1.79 | 22.9% | 12.3% |
| omtg/fps2/native | 320 | 0.0% | 1.19 | 3.7% | 2.3% |
| omtg/fps2/oracle | 320 | 12.4% | 1.64 | 6.4% | 8.3% |
| omtg/fps2/uniform | 320 | 40.8% | 1.74 | 17.0% | 11.8% |
| omtg/fps6/adaptive | 320 | 39.6% | 0.77 | 2.7% | 3.1% |
| omtg/fps6/native | 320 | 0.0% | 0.44 | 0.0% | 0.3% |
| omtg/fps6/oracle | 320 | 17.7% | 0.72 | 0.0% | 1.2% |
| omtg/fps6/uniform | 320 | 41.7% | 0.75 | 2.1% | 2.6% |
| qvhighlights/fps2/adaptive | 503 | 14.6% | 1.23 | 15.6% | 5.0% |
| qvhighlights/fps2/native | 503 | 0.0% | 0.96 | 0.0% | 0.0% |
| qvhighlights/fps2/oracle | 503 | 5.5% | 1.15 | 1.3% | 3.6% |
| qvhighlights/fps2/uniform | 503 | 22.2% | 1.24 | 10.4% | 4.2% |
| qvhighlights/fps6/adaptive | 503 | 22.4% | 0.49 | 0.0% | 0.4% |
| qvhighlights/fps6/native | 503 | 0.0% | 0.32 | 0.0% | 0.0% |
| qvhighlights/fps6/oracle | 503 | 9.7% | 0.45 | 0.0% | 0.2% |
| qvhighlights/fps6/uniform | 503 | 11.8% | 0.47 | 0.0% | 0.2% |

## 3. OMTG-Bench 多实例间隔合并率（相邻实例落入同一组）

| FPS / 方法 | 查询数 | 相邻间隔数 | 相邻实例共享同一组(Voronoi) | 含>2帧合并跨间隔 | 共享采样帧组 | 整条查询至少1个间隔合并 |
|---|---:|---:|---:|---:|---:|---:|
| fps2/adaptive | 320 | 853 | 1.1% | 1.1% | 0.4% | 2.2% |
| fps2/native | 320 | 853 | 0.1% | 0.0% | 0.1% | 0.3% |
| fps2/oracle | 320 | 853 | 0.1% | 0.1% | 0.1% | 0.3% |
| fps2/uniform | 320 | 853 | 0.9% | 0.9% | 0.4% | 1.9% |
| fps6/adaptive | 320 | 853 | 0.1% | 0.1% | 0.2% | 0.3% |
| fps6/native | 320 | 853 | 0.1% | 0.0% | 0.1% | 0.3% |
| fps6/oracle | 320 | 853 | 0.1% | 0.1% | 0.1% | 0.3% |
| fps6/uniform | 320 | 853 | 0.1% | 0.1% | 0.1% | 0.3% |
