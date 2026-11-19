import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileSearch, GitCompare, Lightbulb, Search, X } from 'lucide-react'
import type { Experiment, Verdict } from '../lib/types'
import { datasetDef, experiments, getTask, metricDef, registry } from '../lib/data'
import { deltaGood, fmtDelta, fmtMetric } from '../lib/format'
import { useTheme } from '../lib/theme'
import { headlineItems } from '../components/experiment/sections'
import { EChart } from '../components/charts/EChart'
import { baseOption, catAxis, tooltip, valueAxis } from '../components/charts/options'
import { Badge, Card, cx, Empty, Hint, Segmented, Stat, StatusBadge, VerdictBadge } from '../components/ui'
import { TaskIcon } from '../components/ui/TaskIcon'

export default function ListPage() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState('')
  const task = sp.get('task') ?? ''
  const series = sp.get('series') ?? ''
  const [verdict, setVerdict] = useState<'all' | Verdict>('all')
  const [sel, setSel] = useState<string[]>([])

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    setSp(n, { replace: true })
  }

  const list = experiments.filter(
    (e) =>
      (!task || e.task === task) &&
      (!series || e.series === series) &&
      (verdict === 'all' || e.brief.verdict === verdict) &&
      (!q || [e.title, e.tldr, e.id, ...(e.tags ?? [])].join(' ').toLowerCase().includes(q.toLowerCase())),
  )

  const tasksUsed = registry.tasks.filter((t) => experiments.some((e) => e.task === t.id))
  const seriesUsed = [...new Set(experiments.map((e) => e.series).filter(Boolean))] as string[]
  const hyps = experiments.flatMap((e) => e.insights?.hypotheses ?? [])
  const claims = experiments.flatMap((e) => e.claims ?? [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">实验看板</h1>
        <p className="mt-1 text-sm text-muted">不看代码和日志，也能知道每个实验做了什么、结果如何、对下一篇论文意味着什么。</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="实验" value={experiments.length} sub={`${tasksUsed.length} 类任务`} />
        <Stat label="已完成" value={experiments.filter((e) => e.status === 'completed').length} sub={`运行中 ${experiments.filter((e) => e.status === 'running').length}`} />
        <Stat label="结论有效" value={experiments.filter((e) => e.brief.verdict === 'positive').length} sub={`无效 ${experiments.filter((e) => e.brief.verdict === 'negative').length} · 有得有失 ${experiments.filter((e) => e.brief.verdict === 'mixed').length}`} />
        <Stat label="待验证假设" value={hyps.filter((h) => (h.status ?? 'todo') === 'todo').length} sub={`共 ${hyps.length} 个`} hint="来自各实验'研究启发'的假设，详见想法板" />
        <Stat label="文献核查" value={claims.length} sub={`未复现 ${claims.filter((c) => c.verdict === 'not-reproduced' || c.verdict === 'contradicted').length}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ProgressChart />
        <LineageChart />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input w-56 pl-8" placeholder="搜索标题、标签…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input" value={task} onChange={(e) => setParam('task', e.target.value)} aria-label="任务">
          <option value="">全部任务</option>
          {tasksUsed.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {seriesUsed.length > 0 && (
          <select className="input" value={series} onChange={(e) => setParam('series', e.target.value)} aria-label="研究线">
            <option value="">全部研究线</option>
            {seriesUsed.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <Segmented
          options={[
            { value: 'all', label: '全部' },
            { value: 'positive', label: '有效' },
            { value: 'mixed', label: '有得有失' },
            { value: 'negative', label: '无效' },
            { value: 'inconclusive', label: '不确定' },
          ]}
          value={verdict}
          onChange={setVerdict}
        />
        <span className="ml-auto text-sm text-muted">{list.length} 个实验</span>
      </div>

      {list.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <ExpCard key={e.id} e={e} selected={sel.includes(e.id)} onToggle={() => setSel((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id].slice(-6)))} />
          ))}
        </div>
      ) : (
        <Empty>没有符合条件的实验</Empty>
      )}

      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="card flex items-center gap-3 px-4 py-2 shadow-lg">
            <span className="text-sm text-ink2">已选 {sel.length} 个实验</span>
            <button className="btn" onClick={() => setSel([])}>
              <X size={14} /> 清空
            </button>
            <Link to={`/compare?ids=${sel.join(',')}`} className="btn-primary">
              <GitCompare size={14} /> 对比
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpCard({ e, selected, onToggle }: { e: Experiment; selected: boolean; onToggle: () => void }) {
  const task = getTask(e.task)
  const h = headlineItems(e)[0]
  const d = h && h.base !== undefined ? h.ours! - h.base : undefined
  return (
    <Card className={cx('group relative flex flex-col p-4 transition hover:shadow-lg', selected && 'ring-2 ring-accent')}>
      <div className="flex items-center gap-2 text-xs text-muted">
        <TaskIcon name={task?.icon} size={14} className="text-accent" />
        <span className="truncate">{task?.name ?? e.task}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusBadge s={e.status} />
          <label className="flex cursor-pointer items-center gap-1" title="加入对比">
            <input type="checkbox" checked={selected} onChange={onToggle} className="accent-[rgb(var(--accent))]" />
            <span className="sr-only">加入对比</span>
          </label>
        </span>
      </div>
      <Link to={`/exp/${e.id}`} className="mt-2 block">
        <span className="absolute inset-0" aria-hidden />
        <h3 className="font-medium leading-snug text-ink group-hover:text-accent">{e.title}</h3>
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-ink2">{e.tldr}</p>
      {h && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-ink">{fmtMetric(h.ours, h.metric)}</span>
          {d !== undefined && d !== 0 && <span className={cx('text-sm font-medium', deltaGood(d, h.metric) ? 'text-good' : 'text-bad')}>{deltaGood(d, h.metric) ? '▲' : '▼'} {fmtDelta(d, h.metric)}</span>}
          <span className="truncate text-xs text-muted">
            {metricDef(h.metric).name} · {datasetDef(h.dataset).name}
          </span>
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs text-muted">
        <VerdictBadge v={e.brief.verdict} short />
        {e.demo && <Badge tone="warn">示例</Badge>}
        {e.insights && (
          <span className="inline-flex items-center gap-0.5" title="研究启发">
            <Lightbulb size={12} className="text-accent" />
            {e.insights.hypotheses.length} 假设 · {e.insights.paperAngles.length} 方向
          </span>
        )}
        {e.claims?.length ? (
          <span className="inline-flex items-center gap-0.5">
            <FileSearch size={12} className="text-accent" />
            {e.claims.length} 核查
          </span>
        ) : null}
        <span className="ml-auto">{e.date}</span>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------ 研究进展 ----
function ProgressChart() {
  const [, p] = useTheme()
  const nav = useNavigate()
  const tasks = registry.tasks.filter((t) => experiments.filter((e) => e.task === t.id).length >= 2)
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '')
  const task = tasks.find((t) => t.id === taskId)
  const exps = experiments.filter((e) => e.task === taskId)
  const combos = useMemo(() => {
    const m = new Map<string, number>()
    exps.forEach((e) => {
      const ours = e.results.methods.find((x) => x.role === 'ours')?.id
      e.results.main.filter((r) => r.method === ours).forEach((r) => Object.keys(r.metrics).forEach((k) => m.set(`${r.dataset}|${k}`, (m.get(`${r.dataset}|${k}`) ?? 0) + 1)))
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  }, [exps])
  const preferred = combos.find((c) => task?.primaryMetrics.includes(c.split('|')[1])) ?? combos[0]
  const [combo, setCombo] = useState<string | undefined>(undefined)
  const cur = combo && combos.includes(combo) ? combo : preferred
  const [ds, metric] = (cur ?? '|').split('|')

  const points = exps
    .map((e) => {
      const ours = e.results.methods.find((x) => x.role === 'ours')?.id
      const v = e.results.main.find((r) => r.method === ours && r.dataset === ds)?.metrics[metric]
      return v === undefined ? null : { e, v }
    })
    .filter(Boolean)
    .sort((a, b) => (a!.e.date < b!.e.date ? -1 : 1)) as { e: Experiment; v: number }[]

  const hib = metricDef(metric).higherIsBetter
  let best = hib ? -Infinity : Infinity
  const bestLine = points.map((x) => {
    best = hib ? Math.max(best, x.v) : Math.min(best, x.v)
    return best
  })

  const option = {
    ...baseOption(p),
    tooltip: {
      ...tooltip(p),
      formatter: (ps: { dataIndex: number }[]) => {
        const x = points[ps[0].dataIndex]
        return `<b>${x.e.title}</b><br/>${x.e.date}<br/>${metricDef(metric).name}：${x.v}`
      },
    },
    xAxis: catAxis(p, points.map((x) => x.e.date.slice(5))),
    yAxis: valueAxis(p, undefined, { scale: true }),
    series: [
      { type: 'line', name: '最佳纪录', step: 'end', data: bestLine, symbol: 'none', lineStyle: { width: 2, color: p.series[1] }, itemStyle: { color: p.series[1] } },
      { type: 'scatter', name: '每个实验', data: points.map((x) => x.v), symbolSize: 10, itemStyle: { color: p.series[0], borderColor: p.surface, borderWidth: 2 } },
    ],
  }
  if (!tasks.length) return null
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink">研究进展</span>
        <Hint text="每个点是一个实验中'本实验'方法的结果；橙色阶梯是截至当时的最佳纪录。点击点打开实验。" />
        <span className="ml-auto flex flex-wrap gap-1.5">
          {tasks.length > 1 && (
            <select className="input py-1 text-xs" value={taskId} onChange={(e) => { setTaskId(e.target.value); setCombo(undefined) }}>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <select className="input max-w-[220px] py-1 text-xs" value={cur} onChange={(e) => setCombo(e.target.value)}>
            {combos.map((c) => {
              const [d, m] = c.split('|')
              return (
                <option key={c} value={c}>{datasetDef(d).name} · {metricDef(m).name}</option>
              )
            })}
          </select>
        </span>
      </div>
      <EChart option={option} height={240} onClick={(x: { dataIndex: number }) => points[x.dataIndex] && nav(`/exp/${points[x.dataIndex].e.id}`)} ariaLabel="研究进展" />
    </Card>
  )
}

// ------------------------------------------------------------ 实验谱系 ----
type TreeNode = { e: Experiment; children: TreeNode[] }

function LineageChart() {
  const [, p] = useTheme()
  const color: Record<Verdict, string> = { positive: p.good, negative: p.critical, mixed: p.warning, inconclusive: p.neutral }
  const { forests, singles } = useMemo(() => {
    const ids = new Set(experiments.map((e) => e.id))
    const nodes = new Map<string, TreeNode>(experiments.map((e) => [e.id, { e, children: [] }]))
    const roots: TreeNode[] = []
    ;[...experiments].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((e) => {
      const n = nodes.get(e.id)!
      if (e.parent && ids.has(e.parent)) nodes.get(e.parent)!.children.push(n)
      else roots.push(n)
    })
    return { forests: roots.filter((r) => r.children.length), singles: roots.filter((r) => !r.children.length) }
  }, [])

  const Row = ({ n, child }: { n: TreeNode; child?: boolean }) => {
    const h = headlineItems(n.e)[0]
    const d = h && h.base !== undefined ? h.ours! - h.base : undefined
    return (
      <li className="relative">
        {child && <span className="absolute -left-3 top-[13px] w-2.5 border-t border-line" aria-hidden />}
        <div className="flex items-center gap-2 py-[3px] text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color[n.e.brief.verdict] }} />
          <Link to={`/exp/${n.e.id}`} className="min-w-0 truncate text-ink2 hover:text-accent" title={n.e.tldr}>
            {n.e.title}
          </Link>
          {d !== undefined && d !== 0 && h && <span className={cx('shrink-0 text-xs num', deltaGood(d, h.metric) ? 'text-good' : 'text-bad')}>{fmtDelta(d, h.metric)}</span>}
          <span className="ml-auto shrink-0 text-xs text-muted num">{n.e.date.slice(5)}</span>
        </div>
        {n.children.length > 0 && (
          <ul className="ml-[4.5px] border-l border-line pl-3">
            {n.children.map((c) => (
              <Row key={c.e.id} n={c} child />
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-ink">实验谱系</span>
        <Hint text="按 parent 字段连接：一条线就是一个想法的演化。数字是相对该实验基线的主指标变化。" />
        <span className="ml-auto flex flex-wrap gap-2 text-[11px] text-muted">
          {(['positive', 'mixed', 'negative', 'inconclusive'] as Verdict[]).map((v) => (
            <span key={v} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: color[v] }} />
              {{ positive: '有效', mixed: '有得有失', negative: '无效', inconclusive: '不确定' }[v]}
            </span>
          ))}
        </span>
      </div>
      <div className="thin-scroll max-h-[260px] overflow-y-auto pr-1">
        {forests.map((r) => (
          <div key={r.e.id} className="mb-2">
            {r.e.series && <div className="label mb-1">{r.e.series}</div>}
            <ul>
              <Row n={r} />
            </ul>
          </div>
        ))}
        {singles.length > 0 && (
          <details className="mt-1 text-sm">
            <summary className="cursor-pointer select-none text-muted">其余 {singles.length} 个独立实验</summary>
            <ul className="mt-1">
              {singles.map((n) => (
                <Row key={n.e.id} n={n} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  )
}
