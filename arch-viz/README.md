# arch-viz：交互式架构动画讲解

把模型架构做成可以一步一步播放的网页：左边是结构图，中间是数据流动画，右边是新手讲解。每一步都标出张量形状怎么变，每个 token 全程固定一种颜色，方便追踪。

这个文件夹和仓库主体（实验结果看板）互相独立：不参与 `npm run build`、`tsc` 和 `validate`，也不依赖任何 npm 包。

## 目录

| 页面 | 内容 |
|---|---|
| [`transformer-qwen4/`](transformer-qwen4/index.html) | 经典 Transformer（2017，15 步）+ Qwen 4 架构（12 步） |

## 怎么打开

每个页面都是单个 HTML 文件，不需要安装任何东西：

- 下载对应的 `index.html`，双击用浏览器打开；或者
- 在仓库根目录运行 `python3 -m http.server`，然后访问 `http://localhost:8000/arch-viz/transformer-qwen4/`。

操作：`←` `→` 切换步骤，空格自动播放，点结构图里的模块可以跳到对应步骤。地址末尾加 `#qwen4` 直接打开 Qwen 4 部分。

## 数据说明

- **Transformer 部分**：结构按论文《Attention Is All You Need》画，向量缩小到 4 维；权重由固定随机种子生成，每个格子都是真实算出来的。交叉注意力和最终输出概率是示意值。
- **Qwen 4 部分**：结构和尺寸来自官方「Qwen4 架构预览」Qwen3.8-Flash-Next 的模型卡（`model_type: qwen4_exp`）。Qwen4-Max-Preview 已于 2026-11-11 开放预览，但阿里尚未公布它的结构细节，正式版尺寸可能不同。显存对比是按模型卡尺寸做的粗略估算。

## 参考资料

- Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (2017)
- [Qwen3.8-Flash-Next 模型卡](https://huggingface.co/Qwen/Qwen3.8-Flash-Next)
- [Qwen3.8-Flash-Next 技术报告解读](https://www.orcarouter.ai/blog/qwen3-8-flash-next-release)
- [Qwen4-Max-Preview 发布信息](https://ai-tldr.dev/releases/qwen-qwen4-max-preview/)
