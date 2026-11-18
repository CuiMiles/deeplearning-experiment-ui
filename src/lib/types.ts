// ============================================================================
// 数据契约（与 schema/experiment.schema.json 保持一致）
// 智能体只需要按这个结构写 data/experiments/<id>.json，前端自动渲染。
// ============================================================================

export type Verdict = 'positive' | 'negative' | 'mixed' | 'inconclusive'
export type Status = 'completed' | 'running' | 'failed' | 'planned'
export type MethodRole = 'ours' | 'baseline' | 'reference' | 'ablation'
export type Outcome = 'success' | 'failure' | 'partial'

export interface Experiment {
  id: string
  title: string
  /** 任务 id，对应 data/tasks.json 中的 tasks[].id */
  task: string
  status: Status
  /** YYYY-MM-DD */
  date: string
  updated?: string
  /** 研究线名称，同一条研究线的实验会被串起来 */
  series?: string
  /** 上游实验 id，用于绘制实验谱系 */
  parent?: string
  tags?: string[]
  /** 填写者，例如 "agent:claude" */
  author?: string
  /** 示例 / 编造数据标记 */
  demo?: boolean
  /** 一句话：这个实验在干嘛 + 结果如何 */
  tldr: string
  brief: Brief
  setup: Setup
  results: Results
  curves?: Curve[]
  ablations?: Ablation[]
  breakdowns?: Breakdown[]
  charts?: ChartSpec[]
  cases?: Case[]
  insights?: Insights
  /** 文献核查：已发表论文的声称 vs 我们的实测 */
  claims?: ClaimCheck[]
  reproduce?: Reproduce
}

export interface Brief {
  /** 这个实验想回答的问题 */
  question: string
  /** 相比基线改了什么 */
  change: string
  /** 结论 */
  conclusion: string
  verdict: Verdict
  /** 方法流水线，changed=true 的环节会被高亮，一眼看出改了哪里 */
  pipeline?: { label: string; changed?: boolean; note?: string }[]
}

export interface Setup {
  model?: string
  backbone?: string
  params?: string
  /** 训练数据（数据集 id 或自由文本） */
  trainData?: string[]
  /** 评测数据集 id */
  evalData: string[]
  compute?: string
  gpuHours?: number
  /** 输入帧/分辨率等关键设置 */
  frames?: string
  notes?: string
}

export interface Method {
  id: string
  name: string
  role: MethodRole
  note?: string
}

export interface ResultRow {
  method: string
  dataset: string
  metrics: Record<string, number>
}

export interface Results {
  methods: Method[]
  main: ResultRow[]
  /** 置顶展示的关键指标；缺省时取任务 primaryMetrics × 第一个评测集 */
  headline?: { dataset: string; metric: string }[]
}

export interface Curve {
  id: string
  title: string
  xLabel?: string
  yLabel?: string
  series: { name: string; data: [number, number][] }[]
  markers?: { x: number; label: string }[]
  takeaway?: string
}

export interface Ablation {
  id: string
  title: string
  /** 被改变的因素，例如 "输入帧数" */
  factor: string
  kind: 'categorical' | 'numeric'
  metrics: string[]
  rows: { setting: string | number; metrics: Record<string, number>; isDefault?: boolean; note?: string }[]
  takeaway?: string
}

export interface Breakdown {
  id: string
  title: string
  /** 切分维度，例如 "视频时长" */
  dimension: string
  metric: string
  /** 参与对比的方法 id */
  methods: string[]
  buckets: { label: string; count?: number; values: Record<string, number> }[]
  takeaway?: string
}

export interface ChartSpec {
  id: string
  title: string
  type: 'bar' | 'line' | 'scatter' | 'heatmap' | 'radar'
  xLabel?: string
  yLabel?: string
  /** bar/line/radar 的类目；heatmap 的 x 类目 */
  categories?: string[]
  /** heatmap 的 y 类目 */
  yCategories?: string[]
  series: { name: string; data: (number | [number, number] | [number, number, number])[] }[]
  /** scatter 是否画 y=x 对角线 */
  diagonal?: boolean
  takeaway?: string
}

// ---------------------------------------------------------------- 案例 -------

export interface VideoMedia {
  src?: string
  poster?: string
  fps?: number
  /** 秒 */
  duration?: number
}

export interface ImageMedia {
  src: string
  width?: number
  height?: number
}

interface CaseBase {
  id: string
  title?: string
  outcome: Outcome
  note?: string
  tags?: string[]
}

export interface Segment {
  start: number
  end: number
  score?: number
}

export interface TemporalCase extends CaseBase {
  type: 'temporal'
  video: VideoMedia
  query: string
  gt: [number, number][]
  predictions: { method: string; segments: Segment[] }[]
  /** 逐 clip 显著性分数（高光检测） */
  saliency?: { interval: number; values: number[]; gt?: number[] }
  /** 模型实际采样/输入的帧时间点（秒） */
  sampledFrames?: number[]
}

export interface DenseCaptionCase extends CaseBase {
  type: 'dense-caption'
  video: VideoMedia
  gt: { start: number; end: number; text: string }[]
  predictions: { method: string; events: { start: number; end: number; text: string }[] }[]
  sampledFrames?: number[]
}

export interface VideoQACase extends CaseBase {
  type: 'videoqa'
  video: VideoMedia
  question: string
  options?: string[]
  /** 正确答案：选项下标或文本 */
  answer: number | string
  predictions: { method: string; answer: number | string; rationale?: string }[]
  /** 回答问题所需的证据片段 */
  evidence?: [number, number][]
  sampledFrames?: number[]
}

export interface RetrievalCase extends CaseBase {
  type: 'retrieval'
  query: string
  candidates: { label: string; image?: string; isGT?: boolean; scores: Record<string, number> }[]
}

export interface ImageGroundingCase extends CaseBase {
  type: 'image-grounding'
  image: ImageMedia
  expression: string
  /** 归一化 [x, y, w, h]，0-1 */
  gt: [number, number, number, number]
  predictions: { method: string; box: [number, number, number, number]; score?: number }[]
}

export interface ImageQACase extends CaseBase {
  type: 'image-qa'
  image: ImageMedia
  question: string
  answer: string
  predictions: { method: string; answer: string; correct?: boolean }[]
}

export interface ImageCaptionCase extends CaseBase {
  type: 'image-caption'
  image: ImageMedia
  references: string[]
  predictions: { method: string; text: string; scores?: Record<string, number> }[]
}

export type Case =
  | TemporalCase
  | DenseCaptionCase
  | VideoQACase
  | RetrievalCase
  | ImageGroundingCase
  | ImageQACase
  | ImageCaptionCase

// ---------------------------------------------------------- 研究启发 -------

export interface Phenomenon {
  id: string
  /** 短标题（≤16 字），也用于启发链路图 */
  title: string
  detail?: string
  /** 证据指向，如 "ablation:frames" / "breakdown:duration" / "case:c2" */
  evidence?: string
  /** 现象类型 id，对应 data/lenses.json symptoms[].id */
  symptoms?: string[]
  /** 意外程度 1-5 */
  surprise: number
}

export interface Precedent {
  name: string
  domain: string
  year?: number
  people?: string
  story: string
  ref?: string
}

export interface Echo {
  id: string
  phenomenon: string
  /** 透镜库 lens id；如果是库里没有的新先例，用 precedent 字段 */
  lens?: string
  precedent?: Precedent
  /** 结构映射：[他域中的元素, 我们实验中的对应物] */
  correspondences?: [string, string][]
  /** 借来的解法：他们怎么处理 → 我们可以怎么做 */
  borrowedMove: string
  /** 类比在哪里失效 */
  limit?: string
}

export interface Hypothesis {
  id: string
  title: string
  statement: string
  /** 来源 echo id */
  from?: string[]
  /** 最小验证实验 */
  test: string
  falsifiedIf?: string
  /** 1-5 */
  impact: number
  /** 1-5 */
  effort: number
  status?: 'todo' | 'running' | 'confirmed' | 'refuted'
}

export interface PaperAngle {
  id: string
  title: string
  type: 'method' | 'analysis' | 'benchmark' | 'dataset' | 'theory' | 'system'
  claim: string
  /** 来源 hypothesis id */
  from?: string[]
  novelty?: string
  risk?: string
  venues?: string[]
  /** 0-1，离能投稿还有多远 */
  readiness?: number
  checkRelated?: string[]
}

export interface Insights {
  /** 这个实验对发论文意味着什么（一句话） */
  oneLiner: string
  /** 0-1 */
  confidence?: number
  phenomena: Phenomenon[]
  echoes: Echo[]
  hypotheses: Hypothesis[]
  paperAngles: PaperAngle[]
  /** 思维提示卡的回答，prompt 为 data/prompts.json 中的 id */
  provocations?: { prompt: string; answer: string }[]
  /** 智能体反问研究者的问题 */
  questionsForYou?: string[]
  readingList?: { title: string; url?: string; why?: string }[]
}

// --------------------------------------------------------- 文献核查 -------

export type ClaimVerdict = 'reproduced' | 'partial' | 'not-reproduced' | 'contradicted' | 'pending'
export type ClaimDecision = 'build-on' | 'unverified' | 'ignore' | 'contact-authors' | 'publish-negative'

export interface ClaimCheck {
  id: string
  paper: {
    title: string
    venue?: string
    year?: number
    url?: string
    /** 代码开放程度 */
    code: 'none' | 'partial' | 'full'
    /** 是否放出权重或预测文件 */
    checkpoint?: boolean
    citations?: number
  }
  /** 他们声称了什么（一句话） */
  claim: string
  /** 他们的设置（与我们不同之处） */
  setting?: string
  reported: ResultRow[]
  ours: ResultRow[]
  /** 差距分解：从报告值出发，逐项减去可解释的设置差异，剩余即无法解释的差距 */
  gap?: {
    dataset: string
    metric: string
    steps: { label: string; delta: number; verified?: boolean }[]
  }
  /** 核查清单，id 对应 data/audit.json checks[].id */
  checklist: { id: string; status: 'pass' | 'fail' | 'unknown'; note?: string }[]
  /** 良性解释（不是造假的可能原因） */
  explanations?: { text: string; likelihood: number; test?: string; ruledOut?: boolean }[]
  verdict: ClaimVerdict
  decision: ClaimDecision
  /** 时间盒：最多再投入多少 */
  timebox?: string
  action?: string
}

export interface AuditCheck {
  id: string
  category: string
  name: string
  question: string
  weight: number
  why: string
}

export interface AuditLibrary {
  principles: string[]
  checks: AuditCheck[]
  verdicts: Record<ClaimVerdict, { name: string; desc: string }>
  decisions: Record<ClaimDecision, { name: string; desc: string }>
}

// ------------------------------------------------------------- 复现 -------

export interface Reproduce {
  repo?: string
  commit?: string
  branch?: string
  env?: Record<string, string>
  hardware?: string
  commands: { label: string; cmd: string; note?: string }[]
  hyperparams?: Record<string, string | number | boolean>
  configFile?: { name: string; lang?: string; content: string }
  artifacts?: { label: string; path: string }[]
}

// ============================================================== 注册表 ======

export interface MetricDef {
  name: string
  full?: string
  desc: string
  unit?: string
  higherIsBetter: boolean
  range?: [number, number]
}

export interface DatasetDef {
  name: string
  domain?: string
  year?: number
  source?: string
  stats?: string
  desc: string
  url?: string
}

export interface TaskDef {
  id: string
  name: string
  nameEn: string
  modality: string[]
  icon: string
  summary: string
  input: string
  output: string
  metrics: string[]
  primaryMetrics: string[]
  datasets: string[]
  caseType: Case['type']
  charts: string[]
  pitfalls?: string[]
}

export interface Registry {
  metrics: Record<string, MetricDef>
  datasets: Record<string, DatasetDef>
  tasks: TaskDef[]
}

export interface Symptom {
  id: string
  name: string
  desc: string
}

export interface Lens {
  id: string
  name: string
  nameEn: string
  domain: string
  year: number
  people?: string
  story: string
  essence: string
  dlMirror: string
  questions: string[]
  moves: string[]
  triggers: string[]
  refs?: { title: string; url?: string }[]
  caution?: string
}

export interface LensLibrary {
  symptoms: Symptom[]
  lenses: Lens[]
}

export interface PromptCard {
  id: string
  category: string
  title: string
  question: string
  origin: string
  hint?: string
}
