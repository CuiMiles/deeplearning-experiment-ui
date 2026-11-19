import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GitCompare } from 'lucide-react'
import { datasetDef, experiments, getExperiment, getTask, metricDef, registry } from '../lib/data'
import { useTheme } from '../lib/theme'
import { EChart } from '../components/charts/EChart'
import { barSeries, baseOption, catAxis, lineSeries, valueAxis } from '../components/charts/options'
import { Card, cx, Empty, Section, Segmented, VerdictBadge } from '../components/ui'

export default function ComparePage() {
  const [sp, setSp] = useSearchParams()
  const [, p] = useTheme()
  const ids = (sp.get('ids') ?? '').split(',').filter((x) => getExperiment(x))
  const exps = ids.map((x) => getExperiment(x)!)
  const color = (i: number) => p.series[i % 8]

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-6)
    setSp({ ids: next.join(',') }, { replace: true })
  }

  const oursRow = (e: (typeof exps)[number], ds: string) => {
    const m = e.results.methods.find((x) => x.role === 'ours')?.id
    return e.results.main.find((r) => r.method === m && r.dataset === ds)
  }
  const datasets = useMemo(() => {
    const cnt = new Map<string, number>()
    exps.forEach((e) => new Set(e.results.main.map((r) => r.dataset)).forEach((d) => cnt.set(d, (cnt.get(d) ?? 0) + 1)))
    return [...cnt.entries()].filter(([, n]) => n >= Math.min(2, exps.length)).sort((a, b) => b[1] - a[1]).map(([d]) => d)
  }, [exps])
  const [dsSel, setDs] = useState<string>()
  const ds = dsSel && datasets.includes(dsSel) ? dsSel : datasets[0]
  const metrics = useMemo(() => {
    const keys = new Set<string>()
    exps.forEach((e) => Object.keys(oursRow(e, ds)?.metrics ?? {}).forEach((k) => keys.add(k)))
    const order = registry.tasks.flatMap((t) => t.metrics)
    return [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exps, ds])

  const barOpt = useMemo(
    () => ({
      ...baseOption(p),
      xAxis: catAxis(p, metrics.map((m) => metricDef(m).name)),
      yAxis: valueAxis(p),
      series: exps.map((e, i) => barSeries(e.title, metrics.map((m) => oursRow(e, ds)?.metrics[m] ?? null), color(i))),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, exps, metrics, ds],
  )

  const curveIds = [...new Set(exps.flatMap((e) => (e.curves ?? []).map((c) => c.id)))].filter((cid) => exps.filter((e) => e.curves?.some((c) => c.id === cid)).length >= 2)
  const [cidSel, setCid] = useState<string>()
  const cid = cidSel && curveIds.includes(cidSel) ? cidSel : curveIds[0]
  const curveOpt = useMemo(() => {
    const first = exps.flatMap((e) => e.curves ?? []).find((c) => c.id === cid)
    return {
      ...baseOption(p),
      xAxis: { ...valueAxis(p, first?.xLabel), splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: p.axis } }, min: 'dataMin', max: 'dataMax' },
      yAxis: valueAxis(p, first?.yLabel, { scale: true }),
      series: exps.flatMap((e, i) => {
        const c = e.curves?.find((x) => x.id === cid)
        return c ? [lineSeries(e.title, c.series[0].data, color(i), { showSymbol: false })] : []
      }),
    }
  }, [p, exps, cid])

  const [onlyDiff, setOnlyDiff] = useState(true)
  const hpKeys = [...new Set(exps.flatMap((e) => Object.keys(e.reproduce?.hyperparams ?? {})))]
  const hpRows = hpKeys
    .map((k) => ({ k, vals: exps.map((e) => e.reproduce?.hyperparams?.[k]) }))
    .map((r) => ({ ...r, diff: new Set(r.vals.map((v) => String(v))).size > 1 }))
    .filter((r) => !onlyDiff || r.diff)

  const tasksMixed = new Set(exps.map((e) => e.task)).size > 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <GitCompare size={22} className="text-accent" /> 实验对比
        </h1>
        <p className="mt-1 text-sm text-muted">最多选 6 个；比较的是每个实验里"本实验"方法的结果。</p>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {registry.tasks
            .filter((t) => experiments.some((e) => e.task === t.id))
            .map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-1.5">
                <span className="w-28 shrink-0 text-xs text-muted">{t.name}</span>
                {experiments
                  .filter((e) => e.task === t.id)
                  .map((e) => {
                    const i = ids.indexOf(e.id)
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggle(e.id)}
                        className={cx('flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition', i >= 0 ? 'border-ink2 bg-sunken text-ink' : 'border-line text-ink2 hover:bg-sunken')}
                      >
                        {i >= 0 && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(i) }} />}
                        {e.title}
                      </button>
                    )
                  })}
              </div>
            ))}
        </div>
      </Card>

      {exps.length < 2 ? (
        <Empty>至少选择 2 个实验开始对比</Empty>
      ) : (
        <>
          {tasksMixed && <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">所选实验属于不同任务，只能比较共同的数据集和指标。</div>}
          <div className={cx('grid gap-3', exps.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-6')}>
            {exps.map((e, i) => (
              <Card key={e.id} className="p-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color(i) }} />
                  <Link to={`/exp/${e.id}`} className="truncate text-sm font-medium text-ink hover:text-accent">{e.title}</Link>
                </div>
                <p className="mt-1 line-clamp-3 text-xs text-ink2">{e.brief.change}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                  <VerdictBadge v={e.brief.verdict} short />
                  {getTask(e.task)?.name}
                </div>
              </Card>
            ))}
          </div>

          {ds && metrics.length > 0 && (
            <Section id="cmp-metrics" title="指标对比" right={datasets.length > 1 && <Segmented options={datasets.map((d) => ({ value: d, label: datasetDef(d).name }))} value={ds} onChange={setDs} />}>
              <Card className="p-4">
                <EChart option={barOpt} height={300} ariaLabel="指标对比" />
              </Card>
            </Section>
          )}

          {cid && (
            <Section id="cmp-curves" title="曲线叠加" right={curveIds.length > 1 && <Segmented options={curveIds.map((c) => ({ value: c, label: exps.flatMap((e) => e.curves ?? []).find((x) => x.id === c)?.title ?? c }))} value={cid} onChange={setCid} />}>
              <Card className="p-4">
                <EChart option={curveOpt} height={280} ariaLabel="曲线叠加" />
              </Card>
            </Section>
          )}

          {hpKeys.length > 0 && (
            <Section id="cmp-hp" title="超参数差异" right={<Segmented options={[{ value: 'diff', label: '只看不同' }, { value: 'all', label: '全部' }]} value={onlyDiff ? 'diff' : 'all'} onChange={(v) => setOnlyDiff(v === 'diff')} />}>
              <Card className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="px-4 py-2 font-medium">参数</th>
                      {exps.map((e, i) => (
                        <th key={e.id} className="px-3 py-2 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm" style={{ background: color(i) }} />
                            <span className="max-w-[160px] truncate">{e.title}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hpRows.map((r) => (
                      <tr key={r.k} className={cx('border-b border-line last:border-0', r.diff && 'bg-warn/5')}>
                        <td className="px-4 py-1.5 font-mono text-xs text-muted">{r.k}</td>
                        {r.vals.map((v, i) => (
                          <td key={i} className={cx('px-3 py-1.5 font-mono text-xs num', r.diff ? 'text-ink' : 'text-muted')}>{v === undefined ? '–' : String(v)}</td>
                        ))}
                      </tr>
                    ))}
                    {!hpRows.length && (
                      <tr>
                        <td colSpan={exps.length + 1} className="px-4 py-4 text-center text-sm text-muted">超参数完全相同</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
