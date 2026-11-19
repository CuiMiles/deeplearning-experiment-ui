import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Boxes, ChartLine, Clapperboard, Cpu, Database, FlaskConical, GitBranch, Lightbulb, ListTree, Microscope, SlidersHorizontal, Target, Terminal, Trophy,
} from 'lucide-react'
import type { Experiment, Method } from '../../lib/types'
import { datasetDef, getExperiment, getTask, metricDef } from '../../lib/data'
import { deltaGood, fmtDelta, fmtMetric } from '../../lib/format'
import { methodColorMap, useTheme } from '../../lib/theme'
import { EChart } from '../charts/EChart'
import { barSeries, baseOption, catAxis, lineSeries, tooltip, valueAxis } from '../charts/options'
import { CaseViewer } from '../cases/CaseViewer'
import { Badge, Card, CodeBlock, Collapsible, CopyButton, cx, Hint, ScrollLink, Section, Segmented, StatusBadge, Takeaway, VerdictBadge } from '../ui'
import { TaskIcon } from '../ui/TaskIcon'

export function useMethodColors(e: Experiment) {
  const [, p] = useTheme()
  return useMemo(() => methodColorMap(e.results.methods, p), [e, p])
}

const roleLabel: Record<Method['role'], string> = { ours: '本实验', baseline: '基线', reference: '参考', ablation: '消融' }

// ------------------------------------------------------------------ 头部 ----
export function Hero({ e }: { e: Experiment }) {
  const task = getTask(e.task)
  const parent = getExperiment(e.parent)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link to="/" className="hover:text-ink">实验</Link>
        <span>/</span>
        <Link to={`/?task=${e.task}`} className="inline-flex items-center gap-1 hover:text-ink">
          <TaskIcon name={task?.icon} size={14} />
          {task?.name ?? e.task}
        </Link>
        {e.series && (
          <>
            <span>/</span>
            <Link to={`/?series=${encodeURIComponent(e.series)}`} className="hover:text-ink">{e.series}</Link>
          </>
        )}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge s={e.status} />
          <VerdictBadge v={e.brief.verdict} />
          {e.demo && <Badge tone="warn" title="数据为编造，仅用于展示模板">示例数据</Badge>}
          {e.tags?.map((t) => (
            <span key={t} className="chip">#{t}</span>
          ))}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{e.title}</h1>
        <p className="mt-2 text-lg leading-snug text-ink2">{e.tldr}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: <Target size={16} />, label: '想回答的问题', text: e.brief.question },
          { icon: <SlidersHorizontal size={16} />, label: '相比基线改了什么', text: e.brief.change },
          { icon: <Trophy size={16} />, label: '结论', text: e.brief.conclusion },
        ].map((x) => (
          <Card key={x.label} className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="text-accent">{x.icon}</span>
              {x.label}
            </div>
            <p className="mt-1.5 text-[15px] leading-snug text-ink">{x.text}</p>
          </Card>
        ))}
      </div>

      {e.brief.pipeline && e.brief.pipeline.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted">
            <ListTree size={14} className="text-accent" /> 方法流水线（高亮 = 本实验改动的环节）
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {e.brief.pipeline.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  title={s.note}
                  className={cx(
                    'rounded-lg border px-2.5 py-1.5 text-sm',
                    s.changed ? 'border-accent bg-accent/10 font-medium text-accent' : 'border-line bg-sunken text-ink2',
                  )}
                >
                  {s.label}
                  {s.changed && <span className="ml-1 text-[10px]">改</span>}
                </span>
                {i < e.brief.pipeline!.length - 1 && <ArrowRight size={14} className="text-muted" />}
              </span>
            ))}
          </div>
          {e.brief.pipeline.some((s) => s.changed && s.note) && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {e.brief.pipeline.filter((s) => s.changed && s.note).map((s) => (
                <li key={s.label}>
                  <b className="text-ink2">{s.label}</b>：{s.note}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink2">
        <span className="inline-flex items-center gap-1.5"><FlaskConical size={14} className="text-muted" />{e.date}</span>
        {e.setup.model && <span className="inline-flex items-center gap-1.5"><Boxes size={14} className="text-muted" />{e.setup.model}{e.setup.params && ` · ${e.setup.params}`}</span>}
        {e.setup.compute && <span className="inline-flex items-center gap-1.5"><Cpu size={14} className="text-muted" />{e.setup.compute}</span>}
        {e.setup.frames && <span className="inline-flex items-center gap-1.5"><Clapperboard size={14} className="text-muted" />{e.setup.frames}</span>}
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Database size={14} className="text-muted" />
          {e.setup.evalData.map((d) => (
            <span key={d} className="chip" title={datasetDef(d).desc}>{datasetDef(d).name}</span>
          ))}
        </span>
        {parent && (
          <Link to={`/exp/${parent.id}`} className="inline-flex items-center gap-1.5 hover:text-ink">
            <GitBranch size={14} className="text-muted" />上游：{parent.title}
          </Link>
        )}
      </div>

      {e.insights?.oneLiner && (
        <ScrollLink to="insights" className="block rounded-xl border border-accent/30 bg-accent/5 p-4 transition hover:bg-accent/10">
          <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <Lightbulb size={14} /> 对发论文意味着什么
          </div>
          <p className="mt-1 text-[15px] leading-snug text-ink">{e.insights.oneLiner}</p>
        </ScrollLink>
      )}
    </div>
  )
}

// ------------------------------------------------------------ 关键指标 ----
export function headlineItems(e: Experiment) {
  const task = getTask(e.task)
  const list = e.results.headline ?? (task?.primaryMetrics ?? []).map((m) => ({ dataset: e.setup.evalData[0], metric: m }))
  const ours = e.results.methods.find((m) => m.role === 'ours')
  const base = e.results.methods.find((m) => m.role === 'baseline')
  const ref = e.results.methods.find((m) => m.role === 'reference')
  const val = (mid: string | undefined, d: string, k: string) => (mid ? e.results.main.find((r) => r.method === mid && r.dataset === d)?.metrics[k] : undefined)
  return list
    .map(({ dataset, metric }) => ({
      dataset,
      metric,
      ours: val(ours?.id, dataset, metric),
      base: val(base?.id, dataset, metric),
      ref: val(ref?.id, dataset, metric),
      baseName: base?.name,
      refName: ref?.name,
    }))
    .filter((x) => x.ours !== undefined)
}

export function HeadlineMetrics({ e }: { e: Experiment }) {
  const items = headlineItems(e)
  if (!items.length) return null
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((x) => {
        const def = metricDef(x.metric)
        const d = x.base !== undefined ? x.ours! - x.base : undefined
        const max = def.range?.[1] ?? Math.max(x.ours!, x.base ?? 0, x.ref ?? 0) * 1.15
        const pos = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
        return (
          <Card key={`${x.dataset}-${x.metric}`} className="p-4">
            <div className="flex items-center gap-1 text-xs text-muted">
              <span className="font-medium text-ink2">{def.name}</span>
              <Hint text={def.desc} />
              <span className="ml-auto truncate">{datasetDef(x.dataset).name}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-ink">{fmtMetric(x.ours, x.metric)}</span>
              {d !== undefined && (
                <span className={cx('text-sm font-medium', d === 0 ? 'text-muted' : deltaGood(d, x.metric) ? 'text-good' : 'text-bad')}>
                  {d === 0 ? '' : deltaGood(d, x.metric) ? '▲' : '▼'} {fmtDelta(d, x.metric)}
                </span>
              )}
            </div>
            <div className="relative mt-3 h-2 rounded-full bg-line">
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pos(x.ours!) }} />
              {x.base !== undefined && <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink2" style={{ left: pos(x.base) }} title={`基线 ${x.base}`} />}
              {x.ref !== undefined && <div className="absolute -top-1 h-4 w-0.5 rounded bg-warn" style={{ left: pos(x.ref) }} title={`参考 ${x.ref}`} />}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
              {x.base !== undefined && (
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-0.5 bg-ink2" />基线 {fmtMetric(x.base, x.metric)}</span>
              )}
              {x.ref !== undefined && (
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-0.5 bg-warn" />参考 {fmtMetric(x.ref, x.metric)}</span>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------ 主结果 ----
export function MainResults({ e }: { e: Experiment }) {
  const [, p] = useTheme()
  const colors = useMethodColors(e)
  const task = getTask(e.task)
  const datasets = [...new Set(e.results.main.map((r) => r.dataset))]
  const [ds, setDs] = useState(datasets[0])
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const rows = e.results.main.filter((r) => r.dataset === ds)
  const present = new Set(rows.flatMap((r) => Object.keys(r.metrics)))
  const metrics = [...(task?.metrics ?? []).filter((m) => present.has(m)), ...[...present].filter((m) => !(task?.metrics ?? []).includes(m))]
  const methods = e.results.methods.filter((m) => rows.some((r) => r.method === m.id))

  const option = useMemo(
    () => ({
      ...baseOption(p),
      xAxis: catAxis(p, metrics.map((m) => metricDef(m).name)),
      yAxis: valueAxis(p),
      series: methods.map((m) =>
        barSeries(m.name, metrics.map((k) => rows.find((r) => r.method === m.id)?.metrics[k] ?? null), colors[m.id], {
          label: m.role === 'ours' ? { show: true, position: 'top', color: p.ink2, fontSize: 10, formatter: (x: { value: number }) => x.value?.toFixed(1) } : undefined,
        }),
      ),
    }),
    [p, metrics, methods, rows, colors],
  )

  const iouKeys = ['R1@0.3', 'R1@0.5', 'R1@0.7'].filter((k) => present.has(k))
  const iouOption = useMemo(
    () => ({
      ...baseOption(p),
      tooltip: tooltip(p),
      xAxis: catAxis(p, iouKeys.map((k) => k.replace('R1@', 'IoU ≥ ')), { boundaryGap: false }),
      yAxis: valueAxis(p),
      legend: { ...baseOption(p).legend, type: 'scroll' },
      grid: { left: 4, right: 40, top: 40, bottom: 4, containLabel: true },
      series: methods.map((m) => lineSeries(m.name, iouKeys.map((k) => rows.find((r) => r.method === m.id)?.metrics[k] ?? null), colors[m.id])),
    }),
    [p, iouKeys, methods, rows, colors],
  )

  const best = (k: string) => {
    const vals = rows.map((r) => r.metrics[k]).filter((v) => v !== undefined)
    return metricDef(k).higherIsBetter ? Math.max(...vals) : Math.min(...vals)
  }

  return (
    <Section
      id="results"
      title="主结果"
      icon={<ChartLine size={18} />}
      right={
        <div className="flex max-w-full flex-wrap gap-2">
          {datasets.length > 1 && <Segmented options={datasets.map((d) => ({ value: d, label: datasetDef(d).name }))} value={ds} onChange={setDs} />}
          <Segmented options={[{ value: 'chart', label: '图' }, { value: 'table', label: '表' }]} value={view} onChange={setView} />
        </div>
      }
    >
      {view === 'chart' ? (
        <div className={cx('grid gap-3', iouKeys.length >= 3 && 'lg:grid-cols-[3fr_2fr]')}>
          <Card className="p-4">
            <EChart option={option} height={300} ariaLabel="主结果柱状图" />
          </Card>
          {iouKeys.length >= 3 && (
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
                IoU 阈值 – 召回 <Hint text="阈值越高要求定位越精确。曲线下降越陡，说明预测边界越粗糙。" />
              </div>
              <EChart option={iouOption} height={276} ariaLabel="IoU 阈值召回曲线" />
            </Card>
          )}
        </div>
      ) : (
        <Card className="thin-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">方法</th>
                {metrics.map((k) => (
                  <th key={k} className="px-3 py-2 text-right font-medium" title={metricDef(k).desc}>
                    {metricDef(k).name}
                    {!metricDef(k).higherIsBetter && ' ↓'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => {
                const r = rows.find((x) => x.method === m.id)
                return (
                  <tr key={m.id} className={cx('border-b border-line last:border-0', m.role === 'ours' && 'bg-accent/5')}>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colors[m.id] }} />
                        <span className="text-ink">{m.name}</span>
                        <span className="text-xs text-muted">{roleLabel[m.role]}</span>
                      </span>
                      {m.note && <span className="ml-[18px] block text-xs text-muted">{m.note}</span>}
                    </td>
                    {metrics.map((k) => (
                      <td key={k} className={cx('px-3 py-2 text-right num', r?.metrics[k] === best(k) ? 'font-semibold text-ink' : 'text-ink2')}>
                        {fmtMetric(r?.metrics[k], k)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
      {task?.pitfalls && task.pitfalls.length > 0 && (
        <details className="mt-2 text-sm text-muted">
          <summary className="cursor-pointer select-none">读这类结果时的常见陷阱</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {task.pitfalls.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
      )}
    </Section>
  )
}

// ------------------------------------------------------------ 训练曲线 ----
export function Curves({ e }: { e: Experiment }) {
  const [, p] = useTheme()
  const curves = e.curves ?? []
  const [id, setId] = useState(curves[0]?.id)
  const c = curves.find((x) => x.id === id) ?? curves[0]
  const option = useMemo(() => {
    if (!c) return {}
    return {
      ...baseOption(p, { legend: c.series.length > 1 }),
      tooltip: { ...tooltip(p), valueFormatter: (v: number) => (typeof v === 'number' ? v.toFixed(3) : v) },
      xAxis: { ...valueAxis(p, c.xLabel), splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: p.axis } }, nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: p.muted, fontSize: 11 }, min: 'dataMin', max: 'dataMax' },
      yAxis: valueAxis(p, c.yLabel, { scale: true }),
      grid: { left: 4, right: 24, top: 56, bottom: 24, containLabel: true },
      series: c.series.map((s, i) =>
        lineSeries(s.name, s.data, p.series[i % 8], {
          showSymbol: false,
          markLine:
            i === 0 && c.markers?.length
              ? { symbol: 'none', silent: true, lineStyle: { color: p.muted, type: 'solid', width: 1 }, label: { color: p.ink2, fontSize: 11, formatter: '{b}' }, data: c.markers.map((m) => ({ xAxis: m.x, name: m.label })) }
              : undefined,
        }),
      ),
    }
  }, [c, p])
  if (!c) return null
  return (
    <Section id="curves" title="训练过程" icon={<ChartLine size={18} />} right={curves.length > 1 && <Segmented options={curves.map((x) => ({ value: x.id, label: x.title }))} value={c.id} onChange={setId} />}>
      <Card className="p-4">
        {curves.length === 1 && <div className="mb-1 text-sm font-medium text-ink">{c.title}</div>}
        <EChart option={option} height={280} ariaLabel={c.title} />
        {c.takeaway && <Takeaway>{c.takeaway}</Takeaway>}
      </Card>
    </Section>
  )
}

// ------------------------------------------------------------ 消融 ----
export function Ablations({ e }: { e: Experiment }) {
  const list = e.ablations ?? []
  if (!list.length) return null
  return (
    <Section id="ablations" title="消融实验" icon={<Microscope size={18} />} subtitle="每次只改一个因素，看它单独贡献多少（默认显示相对默认设置 ★ 的变化）">
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((a) => (
          <AblationCard key={a.id} a={a} />
        ))}
      </div>
    </Section>
  )
}

function AblationCard({ a }: { a: NonNullable<Experiment['ablations']>[number] }) {
  const [, p] = useTheme()
  const def = a.rows.find((r) => r.isDefault)
  const [mode, setMode] = useState<'delta' | 'abs'>(def ? 'delta' : 'abs')
  const labels = a.rows.map((r) => `${r.setting}${r.isDefault ? ' ★' : ''}`)
  const val = (r: (typeof a.rows)[number], m: string) => {
    const v = r.metrics[m]
    if (v === undefined) return null
    return mode === 'delta' && def ? +(v - (def.metrics[m] ?? 0)).toFixed(2) : v
  }
  const option = useMemo(
    () => ({
      ...baseOption(p, { legend: a.metrics.length > 1 }),
      tooltip: {
        ...tooltip(p),
        valueFormatter: (v: number) => (typeof v === 'number' ? (mode === 'delta' ? (v > 0 ? '+' : '') + v.toFixed(1) : v.toFixed(1)) : '–'),
      },
      xAxis: catAxis(p, labels, { name: a.factor, nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: p.muted, fontSize: 11 }, boundaryGap: a.kind === 'categorical' }),
      yAxis: valueAxis(p, mode === 'delta' ? 'Δ vs ★' : undefined, { scale: true }),
      grid: { left: 4, right: 16, top: a.metrics.length > 1 || mode === 'delta' ? 52 : 24, bottom: 24, containLabel: true },
      series: a.metrics.map((m, i) => {
        const data = a.rows.map((r) => val(r, m))
        const common = {
          markLine: mode === 'delta' && i === 0 ? { symbol: 'none', silent: true, lineStyle: { color: p.axis, type: 'solid', width: 1 }, label: { show: false }, data: [{ yAxis: 0 }] } : undefined,
        }
        // 类别型用点图（不要求零基线，避免截断柱子误导）；数值型用折线
        return a.kind === 'categorical'
          ? { type: 'scatter', name: metricDef(m).name, data, symbolSize: 12, itemStyle: { color: p.series[i], borderColor: p.surface, borderWidth: 2 }, label: { show: a.metrics.length === 1, position: 'top', color: p.ink2, fontSize: 10, formatter: (x: { value: number }) => (mode === 'delta' && x.value > 0 ? '+' : '') + x.value }, ...common }
          : lineSeries(metricDef(m).name, data, p.series[i], { showSymbol: true, ...common })
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, a, mode],
  )
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{a.title}</span>
        {def && <Segmented size="xs" options={[{ value: 'delta', label: 'Δ 变化' }, { value: 'abs', label: '绝对值' }]} value={mode} onChange={setMode} />}
      </div>
      <EChart option={option} height={240} ariaLabel={a.title} />
      {a.takeaway && <Takeaway>{a.takeaway}</Takeaway>}
    </Card>
  )
}

// ------------------------------------------------------------ 细分分析 ----
export function Breakdowns({ e }: { e: Experiment }) {
  const [, p] = useTheme()
  const colors = useMethodColors(e)
  const list = e.breakdowns ?? []
  if (!list.length) return null
  return (
    <Section id="breakdowns" title="细分分析" icon={<Microscope size={18} />} subtitle="在哪些情况下赢、在哪些情况下输">
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((b) => {
          const option = {
            ...baseOption(p),
            tooltip: {
              ...tooltip(p),
              formatter: (ps: { axisValue: string; dataIndex: number; seriesName: string; value: number; color: string }[]) => {
                const bk = b.buckets[ps[0].dataIndex]
                return `<b>${ps[0].axisValue}</b>${bk.count ? ` <span style="opacity:.6">n=${bk.count}</span>` : ''}<br/>${ps
                  .map((x) => `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${x.color};margin-right:6px"></span>${x.seriesName}：${x.value ?? '–'}`)
                  .join('<br/>')}`
              },
            },
            xAxis: catAxis(p, b.buckets.map((x) => x.label), { name: b.dimension, nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: p.muted, fontSize: 11 } }),
            yAxis: valueAxis(p, metricDef(b.metric).name),
            grid: { left: 4, right: 16, top: 40, bottom: 24, containLabel: true },
            series: b.methods.map((mid) => barSeries(e.results.methods.find((m) => m.id === mid)?.name ?? mid, b.buckets.map((x) => x.values[mid] ?? null), colors[mid])),
          }
          return (
            <Card key={b.id} className="p-4">
              <div className="mb-1 text-sm font-medium text-ink">{b.title}</div>
              <EChart option={option} height={250} ariaLabel={b.title} />
              {b.takeaway && <Takeaway>{b.takeaway}</Takeaway>}
            </Card>
          )
        })}
      </div>
    </Section>
  )
}

// ------------------------------------------------------------ 自定义图表 ----
export function ExtraCharts({ e }: { e: Experiment }) {
  const [theme, p] = useTheme()
  const list = e.charts ?? []
  if (!list.length) return null
  return (
    <Section id="charts" title="更多分析" icon={<ChartLine size={18} />}>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((c) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let option: any
          if (c.type === 'scatter') {
            const pts = c.series.flatMap((s) => s.data as number[][])
            const lo = Math.min(...pts.flatMap((q) => [q[0], q[1]]))
            const hi = Math.max(...pts.flatMap((q) => [q[0], q[1]]))
            option = {
              ...baseOption(p, { legend: c.series.length > 1 }),
              tooltip: { ...tooltip(p, 'item'), formatter: (x: { seriesName: string; value: number[] }) => `${x.seriesName}<br/>${c.xLabel ?? 'x'}：${x.value[0]}<br/>${c.yLabel ?? 'y'}：${x.value[1]}` },
              xAxis: { ...valueAxis(p, c.xLabel), nameLocation: 'middle', nameGap: 24, axisLine: { show: true, lineStyle: { color: p.axis } } },
              yAxis: valueAxis(p, c.yLabel),
              grid: { left: 4, right: 48, top: c.series.length > 1 ? 56 : 32, bottom: 24, containLabel: true },
              series: [
                ...(c.diagonal
                  ? [{ type: 'line', name: 'y = x', data: [[lo, lo], [hi, hi]], symbol: 'none', silent: true, lineStyle: { color: p.axis, width: 1.5 }, tooltip: { show: false }, endLabel: { show: true, formatter: 'y = x', color: p.muted, fontSize: 11 }, z: 1 }]
                  : []),
                ...c.series.map((s, i) => ({
                  type: 'scatter',
                  name: s.name,
                  data: s.data,
                  symbolSize: 8,
                  z: 2,
                  itemStyle: { color: p.series[i], opacity: 0.8, borderColor: p.surface, borderWidth: 1 },
                })),
              ],
              legend: { ...baseOption(p).legend, show: c.series.length > 1, data: c.series.map((s) => s.name) },
            }
          } else if (c.type === 'heatmap') {
            const vals = c.series[0].data.map((d) => (d as number[])[2])
            const vmin = Math.min(...vals)
            const vmax = Math.max(...vals)
            // 深色格子用白字、浅色格子用深色字，保证对比度
            const dark = (v: number) => (theme === 'dark' ? (v - vmin) / (vmax - vmin || 1) < 0.55 : (v - vmin) / (vmax - vmin || 1) > 0.45)
            option = {
              ...baseOption(p, { legend: false }),
              tooltip: { ...tooltip(p, 'item'), formatter: (x: { value: number[] }) => `${c.categories?.[x.value[0]]} × ${c.yCategories?.[x.value[1]]}：${x.value[2]}` },
              xAxis: catAxis(p, c.categories ?? [], { name: c.xLabel, nameLocation: 'middle', nameGap: 24, splitArea: { show: false } }),
              yAxis: catAxis(p, c.yCategories ?? []),
              grid: { left: 4, right: 16, top: 16, bottom: 56, containLabel: true },
              visualMap: { min: vmin, max: vmax, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, itemWidth: 10, text: [String(vmax), String(vmin)], textGap: 6, calculable: false, textStyle: { color: p.muted, fontSize: 11 }, inRange: { color: p.seq } },
              series: [
                {
                  type: 'heatmap',
                  data: (c.series[0].data as number[][]).map((d) => ({ value: d, label: { color: dark(d[2]) ? '#ffffff' : '#0b0b0b' } })),
                  itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 3 },
                  label: { show: (c.categories?.length ?? 0) * (c.yCategories?.length ?? 0) <= 42, fontSize: 11 },
                },
              ],
            }
          } else if (c.type === 'radar') {
            const max = Math.max(...c.series.flatMap((s) => s.data as number[])) * 1.1
            option = {
              ...baseOption(p),
              tooltip: tooltip(p, 'item'),
              radar: { indicator: (c.categories ?? []).map((n) => ({ name: n, max })), axisName: { color: p.ink2, fontSize: 11 }, splitLine: { lineStyle: { color: p.grid } }, splitArea: { show: false }, axisLine: { lineStyle: { color: p.grid } }, radius: '62%', center: ['50%', '58%'] },
              series: [{ type: 'radar', symbolSize: 6, data: c.series.map((s, i) => ({ name: s.name, value: s.data, lineStyle: { color: p.series[i], width: 2 }, itemStyle: { color: p.series[i] }, areaStyle: { color: p.series[i], opacity: 0.08 } })) }],
            }
          } else {
            option = {
              ...baseOption(p, { legend: c.series.length > 1 }),
              xAxis: catAxis(p, c.categories ?? [], { name: c.xLabel, nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: p.muted, fontSize: 11 }, boundaryGap: c.type === 'bar' }),
              yAxis: valueAxis(p, c.yLabel),
              grid: { left: 4, right: 16, top: c.series.length > 1 ? 40 : 24, bottom: c.xLabel ? 24 : 4, containLabel: true },
              series: c.series.map((s, i) => (c.type === 'bar' ? barSeries(s.name, s.data as number[], p.series[i]) : lineSeries(s.name, s.data, p.series[i]))),
            }
          }
          return (
            <Card key={c.id} className="p-4">
              <div className="mb-1 text-sm font-medium text-ink">{c.title}</div>
              {c.type === 'heatmap' && c.yLabel && <div className="text-[11px] text-muted">纵轴：{c.yLabel}</div>}
              <EChart option={option} height={c.type === 'heatmap' ? 300 : 260} ariaLabel={c.title} />
              {c.takeaway && <Takeaway>{c.takeaway}</Takeaway>}
            </Card>
          )
        })}
      </div>
    </Section>
  )
}

// ------------------------------------------------------------ 案例 ----
export function Cases({ e }: { e: Experiment }) {
  const colors = useMethodColors(e)
  const all = e.cases ?? []
  const [filter, setFilter] = useState<'all' | 'success' | 'failure' | 'partial'>('all')
  const list = all.filter((c) => filter === 'all' || c.outcome === filter)
  const [sel, setSel] = useState(all[0]?.id)
  const cur = list.find((c) => c.id === sel) ?? list[0]
  if (!all.length) return null
  const count = (o: string) => all.filter((c) => c.outcome === o).length
  const short = (c: (typeof all)[number]) => c.title ?? ('query' in c ? c.query : 'question' in c ? c.question : 'expression' in c ? c.expression : c.id)
  return (
    <Section
      id="cases"
      title="案例"
      icon={<Clapperboard size={18} />}
      subtitle="点开一个样本，直接看模型对在哪、错在哪"
      right={
        <Segmented
          options={[
            { value: 'all', label: `全部 ${all.length}` },
            { value: 'success', label: `成功 ${count('success')}` },
            { value: 'failure', label: `失败 ${count('failure')}` },
            { value: 'partial', label: `部分 ${count('partial')}` },
          ].filter((o) => o.value === 'all' || count(o.value) > 0) as { value: typeof filter; label: string }[]}
          value={filter}
          onChange={setFilter}
        />
      }
    >
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSel(c.id)}
            className={cx('max-w-[260px] shrink-0 truncate rounded-lg border px-3 py-1.5 text-left text-sm transition', cur?.id === c.id ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-surface text-ink2 hover:bg-sunken')}
          >
            <span className={cx('mr-1', c.outcome === 'success' ? 'text-good' : c.outcome === 'failure' ? 'text-bad' : 'text-warn')}>{c.outcome === 'success' ? '✓' : c.outcome === 'failure' ? '✕' : '◐'}</span>
            {short(c)}
          </button>
        ))}
      </div>
      {cur && (
        <Card className="p-4">
          <CaseViewer key={cur.id} c={cur} ctx={{ methods: e.results.methods, colors }} />
        </Card>
      )}
    </Section>
  )
}

// ------------------------------------------------------------ 复现 ----
export function Reproduce({ e }: { e: Experiment }) {
  const r = e.reproduce
  const [q, setQ] = useState('')
  if (!r) return null
  const hp = Object.entries(r.hyperparams ?? {}).filter(([k, v]) => !q || k.toLowerCase().includes(q.toLowerCase()) || String(v).toLowerCase().includes(q.toLowerCase()))
  const allCmds = r.commands.map((c) => `# ${c.label}\n${c.cmd}`).join('\n\n')
  const yaml = Object.entries(r.hyperparams ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n')
  return (
    <section id="reproduce" data-section="复现" className="scroll-mt-20">
      <Collapsible title="复现：训练命令与参数（想自己跑再展开）" icon={<Terminal size={16} className="text-accent" />} right={<CopyButton text={allCmds} label="复制全部命令" />}>
        <div className="space-y-4">
          {(r.repo || r.commit || r.hardware) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {r.repo && <span className="chip">仓库 {r.repo}</span>}
              {r.branch && <span className="chip">分支 {r.branch}</span>}
              {r.commit && <span className="chip font-mono">commit {r.commit}</span>}
              {r.hardware && <span className="chip">{r.hardware}</span>}
              {Object.entries(r.env ?? {}).map(([k, v]) => (
                <span key={k} className="chip">{k} {v}</span>
              ))}
            </div>
          )}
          {r.commands.map((c) => (
            <div key={c.label}>
              <div className="mb-1 text-sm font-medium text-ink">{c.label}</div>
              {c.note && <div className="mb-1 text-xs text-muted">{c.note}</div>}
              <CodeBlock code={c.cmd} title={c.label} />
            </div>
          ))}
          {r.hyperparams && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">超参数（{Object.keys(r.hyperparams).length}）</span>
                <span className="flex gap-2">
                  <input className="input w-40 py-1 text-xs" placeholder="搜索参数…" value={q} onChange={(ev) => setQ(ev.target.value)} />
                  <CopyButton text={yaml} label="复制为 YAML" />
                </span>
              </div>
              <div className="grid gap-x-6 rounded-lg border border-line sm:grid-cols-2">
                {hp.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-line px-3 py-1.5 text-sm">
                    <span className="font-mono text-xs text-muted">{k}</span>
                    <span className="font-mono text-xs text-ink num">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.configFile && <CodeBlock code={r.configFile.content} title={r.configFile.name} lang={r.configFile.lang} />}
          {r.artifacts && r.artifacts.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-medium text-ink">产物路径</div>
              <ul className="space-y-1">
                {r.artifacts.map((a) => (
                  <li key={a.label} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-24 text-muted">{a.label}</span>
                    <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-xs text-ink">{a.path}</code>
                    <CopyButton text={a.path} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Collapsible>
    </section>
  )
}

// ------------------------------------------------------------ 目录 ----
export function Toc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    items.forEach((i) => {
      const el = document.getElementById(i.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [items])
  return (
    <nav className="sticky top-20 hidden w-40 shrink-0 self-start xl:block" aria-label="本页目录">
      <div className="label mb-2">本页</div>
      <ul className="space-y-0.5 border-l border-line">
        {items.map((i) => (
          <li key={i.id}>
            <ScrollLink to={i.id} className={cx('-ml-px block border-l-2 py-1 pl-3 text-sm transition', active === i.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink')}>
              {i.label}
            </ScrollLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
