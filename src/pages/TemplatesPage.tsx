import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CheckCircle2, FileJson, LayoutTemplate, RefreshCw } from 'lucide-react'
import type { TaskDef } from '../lib/types'
import { datasetDef, experiments, metricDef, registry } from '../lib/data'
import { Card, CodeBlock, CopyButton, cx, Hint, Section } from '../components/ui'
import { TaskIcon } from '../components/ui/TaskIcon'

const caseTypeLabel: Record<string, string> = {
  temporal: '视频 + 时间轴（GT / 预测 / 显著性 / 采样帧 / 逐帧边界）',
  'dense-caption': '视频 + 事件时间轴 + 描述对照',
  videoqa: '视频 + 证据片段 + 选项与各方法选择',
  retrieval: '各方法的排序列表 + 正确结果排名',
  'image-grounding': '图像 + GT / 预测框叠加 + IoU',
  'image-qa': '图像 + 问题 + 各方法答案',
  'image-caption': '图像 + 参考描述 + 各方法描述与得分',
}

/** 生成一份最小可用的实验 JSON 骨架（与 scripts/new-experiment.mjs 保持一致） */
export function skeleton(t: TaskDef) {
  const ds = t.datasets[0]
  const metrics = Object.fromEntries(t.primaryMetrics.map((m) => [m, 0]))
  return JSON.stringify(
    {
      $schema: '../../schema/experiment.schema.json',
      id: `${t.id}-new-experiment`,
      title: '实验标题（≤60 字）',
      task: t.id,
      status: 'completed',
      date: new Date().toISOString().slice(0, 10),
      author: 'agent:your-name',
      tags: [],
      tldr: '一句话：做了什么 + 结果如何',
      brief: { question: '想回答的问题', change: '相比基线改了什么', conclusion: '结论', verdict: 'positive', pipeline: [{ label: '输入' }, { label: '改动的环节', changed: true, note: '改了什么' }, { label: '输出' }] },
      setup: { model: '', evalData: [ds] },
      results: {
        methods: [
          { id: 'base', name: '基线', role: 'baseline' },
          { id: 'ours', name: '本实验', role: 'ours' },
        ],
        main: [
          { method: 'base', dataset: ds, metrics },
          { method: 'ours', dataset: ds, metrics },
        ],
      },
      reproduce: { commands: [{ label: '训练', cmd: '' }] },
    },
    null,
    2,
  )
}

export default function TemplatesPage() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <LayoutTemplate size={22} className="text-accent" /> 任务模板
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">每类多模态任务都有预设的指标、数据集、案例查看器和推荐图表。新任务只需在 data/tasks.json 中加一项。</p>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
          <Bot size={16} className="text-accent" /> 智能体如何填充（详见仓库 AGENTS.md）
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { icon: <FileJson size={16} />, t: '生成骨架', d: 'npm run new -- --task vtg --id my-exp', code: true },
            { icon: <FileJson size={16} />, t: '填写结果与启发', d: '按 schema 写入 data/experiments/<id>.json；媒体放 public/media/<id>/' },
            { icon: <CheckCircle2 size={16} />, t: '校验', d: 'npm run validate', code: true },
            { icon: <RefreshCw size={16} />, t: '查看', d: 'npm run dev，页面自动出现新实验' },
          ].map((s, i) => (
            <div key={s.t} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">{s.t}</div>
                {s.code ? <code className="mt-0.5 block truncate font-mono text-xs text-ink2">{s.d}</code> : <div className="mt-0.5 text-xs text-ink2">{s.d}</div>}
              </div>
              {i < 3 && <ArrowRight size={14} className="mt-1 hidden shrink-0 text-muted md:block" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {registry.tasks.map((t) => {
          const ex = experiments.filter((e) => e.task === t.id)
          return (
            <Card key={t.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <TaskIcon name={t.icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">
                    {t.name} <span className="text-xs font-normal text-muted">{t.nameEn}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {t.modality.map((m) => (
                      <span key={m} className="chip">{m}</span>
                    ))}
                    <span className="chip font-mono">task: {t.id}</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink2">{t.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-sunken px-2 py-1 text-ink2">{t.input}</span>
                <ArrowRight size={14} className="text-muted" />
                <span className="rounded-md bg-sunken px-2 py-1 text-ink2">{t.output}</span>
              </div>
              <div className="mt-3">
                <div className="label mb-1">指标（★ = 主指标）</div>
                <div className="flex flex-wrap gap-1">
                  {t.metrics.map((m) => (
                    <Hint key={m} text={metricDef(m).desc}>
                      <span className={cx('chip', t.primaryMetrics.includes(m) && 'border-accent/40 text-accent')}>
                        {t.primaryMetrics.includes(m) && '★ '}
                        {metricDef(m).name}
                        {!metricDef(m).higherIsBetter && ' ↓'}
                      </span>
                    </Hint>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <div className="label mb-1">常用数据集</div>
                <div className="flex flex-wrap gap-1">
                  {t.datasets.map((d) => (
                    <Hint key={d} text={`${datasetDef(d).source ?? ''}${datasetDef(d).stats ? ' · ' + datasetDef(d).stats : ''} — ${datasetDef(d).desc}`}>
                      <span className="chip">{datasetDef(d).name}</span>
                    </Hint>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="label">案例查看器 </span>
                <span className="text-ink2">{caseTypeLabel[t.caseType]}</span>
              </div>
              <div className="mt-2">
                <div className="label mb-1">推荐图表</div>
                <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink2">
                  {t.charts.map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                {ex.map((e) => (
                  <Link key={e.id} to={`/exp/${e.id}`} className="chip hover:border-accent hover:text-accent">示例：{e.title}</Link>
                ))}
                <button className="btn ml-auto px-2 py-1 text-xs" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <FileJson size={13} /> {open === t.id ? '收起骨架' : 'JSON 骨架'}
                </button>
                <CopyButton text={skeleton(t)} label="复制骨架" />
              </div>
              {open === t.id && (
                <div className="mt-3">
                  <CodeBlock code={skeleton(t)} title={`data/experiments/${t.id}-new-experiment.json`} />
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Section id="glossary" title="指标词典">
        <Card className="thin-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">键名</th>
                <th className="px-3 py-2 font-medium">名称</th>
                <th className="px-3 py-2 font-medium">含义</th>
                <th className="px-3 py-2 font-medium">方向</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(registry.metrics).map(([k, m]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-4 py-1.5 font-mono text-xs text-muted">{k}</td>
                  <td className="px-3 py-1.5 text-ink">{m.name}</td>
                  <td className="px-3 py-1.5 text-ink2">{m.desc}</td>
                  <td className="px-3 py-1.5 text-xs text-muted">{m.higherIsBetter ? '越高越好' : '越低越好'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>
    </div>
  )
}
