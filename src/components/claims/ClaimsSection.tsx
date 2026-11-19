import { useMemo } from 'react'
import { Check, CircleHelp, Clock, FileSearch, Scale, X } from 'lucide-react'
import type { ClaimCheck, Experiment } from '../../lib/types'
import { audit, datasetDef, metricDef } from '../../lib/data'
import { credibility, gapSummary } from '../../lib/audit'
import { fmtDelta, fmtMetric } from '../../lib/format'
import { useTheme } from '../../lib/theme'
import { EChart } from '../charts/EChart'
import { barSeries, baseOption, catAxis, tooltip, valueAxis } from '../charts/options'
import { Badge, Card, ClaimVerdictBadge, cx, DecisionBadge, Dots, Hint, Section } from '../ui'

export function credTone(score: number | null) {
  if (score === null) return { cls: 'text-muted', label: '信息不足' }
  if (score >= 0.7) return { cls: 'text-good', label: '较可信' }
  if (score >= 0.4) return { cls: 'text-warn', label: '存疑' }
  return { cls: 'text-bad', label: '低可信' }
}

export function Principles() {
  return (
    <details className="card px-4 py-3 text-sm">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium text-ink">
        <Scale size={15} className="text-accent" /> 核查原则：快速止损，不被低质量论文拖慢
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink2">
        {audit.principles.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
    </details>
  )
}

export function ClaimsSection({ e }: { e: Experiment }) {
  if (!e.claims?.length) return null
  return (
    <Section id="claims" title="文献核查" icon={<FileSearch size={18} />} subtitle="已发表论文的声称 vs 我们的实测。复现不出 ≠ 造假：先排除良性解释，再决定信任多少。">
      <div className="space-y-3">
        <Principles />
        {e.claims.map((c) => (
          <ClaimCard key={c.id} c={c} />
        ))}
      </div>
    </Section>
  )
}

export function ClaimCard({ c }: { c: ClaimCheck }) {
  const [, p] = useTheme()
  const cred = useMemo(() => credibility(c), [c])
  const gap = useMemo(() => gapSummary(c), [c])
  const tone = credTone(cred.score)
  const ds = c.gap?.dataset ?? c.reported[0]?.dataset
  const rep = c.reported.find((r) => r.dataset === ds)
  const ours = c.ours.find((r) => r.dataset === ds)
  const metrics = rep ? Object.keys(rep.metrics).filter((k) => ours?.metrics[k] !== undefined) : []

  const cmpOption = useMemo(
    () => ({
      ...baseOption(p),
      xAxis: catAxis(p, metrics.map((m) => metricDef(m).name)),
      yAxis: valueAxis(p),
      series: [
        barSeries('论文报告', metrics.map((m) => rep?.metrics[m] ?? null), p.series[1]),
        barSeries('我们实测', metrics.map((m) => ours?.metrics[m] ?? null), p.series[0]),
      ],
    }),
    [p, metrics, rep, ours],
  )

  const gapOption = useMemo(() => {
    if (!gap) return null
    const cats = ['论文报告', ...gap.steps.map((s) => s.label), '无法解释', '我们实测']
    const base: (number | null)[] = []
    const vals: { value: number; itemStyle: { color: string }; label?: unknown }[] = []
    let cur = gap.reported
    base.push(0)
    vals.push({ value: gap.reported, itemStyle: { color: p.series[1] } })
    const pushDelta = (d: number, color: string) => {
      const next = cur + d
      base.push(Math.min(cur, next))
      vals.push({ value: Math.abs(d), itemStyle: { color }, label: { show: true, position: 'top', color: p.ink2, fontSize: 10, formatter: fmtDelta(d, c.gap!.metric) } })
      cur = next
    }
    gap.steps.forEach((s) => pushDelta(s.delta, s.verified ? p.ink2 : p.neutral))
    pushDelta(gap.residual, Math.abs(gap.residual) >= 0.5 ? p.critical : p.neutral)
    base.push(0)
    vals.push({ value: gap.ours, itemStyle: { color: p.series[0] } })
    const lo = Math.min(gap.ours, gap.reported, ...base.filter((b): b is number => b !== null && b > 0))
    return {
      ...baseOption(p, { legend: false }),
      tooltip: {
        ...tooltip(p),
        formatter: (ps: { dataIndex: number }[]) => {
          const i = ps[0].dataIndex
          if (i === 0) return `论文报告：${gap.reported}`
          if (i === cats.length - 1) return `我们实测：${gap.ours}`
          if (i === cats.length - 2) return `无法解释的差距：${fmtDelta(gap.residual)}`
          const s = gap.steps[i - 1]
          return `${s.label}：${fmtDelta(s.delta)}${s.verified ? '（已用实验验证）' : '（估计值）'}`
        },
      },
      xAxis: catAxis(p, cats, { axisLabel: { color: p.ink2, fontSize: 10, interval: 0, width: 64, overflow: 'break' } }),
      yAxis: valueAxis(p, metricDef(c.gap!.metric).name, { min: Math.floor(lo - 4) }),
      series: [
        { type: 'bar', stack: 'w', data: base, itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, tooltip: { show: false } },
        { type: 'bar', stack: 'w', data: vals, barMaxWidth: 34, itemStyle: { borderRadius: 4 } },
      ],
    }
  }, [gap, p, c.gap])

  const byCat = audit.checks.reduce<Record<string, typeof audit.checks>>((acc, x) => {
    ;(acc[x.category] ??= []).push(x)
    return acc
  }, {})

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-snug text-ink">
            {c.paper.url ? (
              <a href={c.paper.url} target="_blank" rel="noreferrer" className="hover:underline">{c.paper.title} ↗</a>
            ) : (
              c.paper.title
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {(c.paper.venue || c.paper.year) && <span>{[c.paper.venue, c.paper.year].filter(Boolean).join(' ')}</span>}
            <Badge tone={c.paper.code === 'full' ? 'good' : c.paper.code === 'partial' ? 'warn' : 'bad'}>{c.paper.code === 'full' ? '代码开源' : c.paper.code === 'partial' ? '代码部分开源' : '无代码'}</Badge>
            <Badge tone={c.paper.checkpoint ? 'good' : 'neutral'}>{c.paper.checkpoint ? '有权重/预测' : '无权重'}</Badge>
            {c.paper.citations !== undefined && <span>被引 {c.paper.citations}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ClaimVerdictBadge v={c.verdict} label={audit.verdicts[c.verdict].name} />
          <DecisionBadge d={c.decision} label={audit.decisions[c.decision].name} />
        </div>
      </div>
      <p className="mt-3 text-[15px] text-ink">
        <span className="text-muted">他们声称：</span>
        {c.claim}
      </p>
      {c.setting && (
        <p className="mt-1 text-sm text-ink2">
          <span className="text-muted">与我们设置的差异：</span>
          {c.setting}
        </p>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {metrics.length > 0 && (
          <div className="rounded-lg border border-line p-3">
            <div className="mb-1 text-sm font-medium text-ink">报告值 vs 实测值 · {datasetDef(ds).name}</div>
            <EChart option={cmpOption} height={220} ariaLabel="报告值与实测值对比" />
          </div>
        )}
        {gapOption && gap && (
          <div className="rounded-lg border border-line p-3">
            <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
              差距分解 · {metricDef(c.gap!.metric).name}
              <Hint text="从论文报告值出发，逐项扣除已知的设置差异（深灰=已用实验验证，浅灰=估计），剩下的红色部分是无法解释的差距。" />
            </div>
            <EChart option={gapOption} height={220} ariaLabel="差距分解瀑布图" />
            <p className="mt-1 text-xs text-muted">
              已解释 {fmtDelta(gap.explained)}，无法解释{' '}
              <b className={cx(Math.abs(gap.residual) >= 0.5 ? 'text-bad' : 'text-ink2')}>{fmtDelta(gap.residual)}</b>
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-line p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-ink">可信度清单</span>
            <span className="text-right">
              <span className={cx('text-2xl font-semibold', tone.cls)}>{cred.score === null ? '–' : `${Math.round(cred.score * 100)}%`}</span>
              <span className={cx('ml-1.5 text-xs', tone.cls)}>{tone.label}</span>
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted">已知项中通过的加权比例 · 信息完整度 {Math.round(cred.completeness * 100)}%</div>
          <div className="mt-2 space-y-2">
            {Object.entries(byCat).map(([cat, defs]) => (
              <div key={cat}>
                <div className="label mb-0.5">{cat}</div>
                <ul className="space-y-0.5">
                  {defs.map((d) => {
                    const s = cred.states.find((x) => x.id === d.id)!
                    return (
                      <li key={d.id} className="flex items-start gap-1.5 text-sm" title={`${d.question} — ${d.why}`}>
                        <span className="mt-0.5">
                          {s.status === 'pass' ? <Check size={14} className="text-good" /> : s.status === 'fail' ? <X size={14} className="text-bad" /> : <CircleHelp size={14} className="text-muted" />}
                        </span>
                        <span className={cx(s.status === 'unknown' ? 'text-muted' : 'text-ink2')}>
                          {d.name}
                          {s.auto && <span className="ml-1 rounded bg-accent/10 px-1 text-[10px] text-accent">自动</span>}
                          {s.note && <span className="block text-xs text-muted">{s.note}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {c.explanations && c.explanations.length > 0 && (
            <div className="rounded-lg border border-line p-3">
              <div className="mb-1 text-sm font-medium text-ink">良性解释（不是造假的可能原因）</div>
              <ul className="space-y-2">
                {[...c.explanations].sort((a, b) => Number(a.ruledOut ?? false) - Number(b.ruledOut ?? false) || b.likelihood - a.likelihood).map((x) => (
                  <li key={x.text} className="text-sm">
                    <div className="flex items-start gap-2">
                      <Dots value={x.likelihood} label="可能性" />
                      <span className={cx('flex-1', x.ruledOut ? 'text-muted line-through' : 'text-ink')}>{x.text}</span>
                      {x.ruledOut && <Badge>已排除</Badge>}
                    </div>
                    {x.test && <div className="ml-[42px] text-xs text-muted">验证方法：{x.test}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(c.timebox || c.action) && (
            <div className="rounded-lg bg-accent/5 p-3 text-sm">
              {c.timebox && (
                <div className="flex items-center gap-1.5 font-medium text-accent">
                  <Clock size={14} /> 时间盒：{c.timebox}
                </div>
              )}
              {c.action && <p className="mt-1 text-ink">{c.action}</p>}
              <p className="mt-1 text-xs text-muted">{audit.decisions[c.decision].desc}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/** 报告值 → 实测值，用于全局散点 */
export function claimPoint(c: ClaimCheck) {
  const ds = c.gap?.dataset ?? c.reported[0]?.dataset
  const metric = c.gap?.metric ?? Object.keys(c.reported[0]?.metrics ?? {})[0]
  const rep = c.reported.find((r) => r.dataset === ds)?.metrics[metric]
  const ours = c.ours.find((r) => r.dataset === ds)?.metrics[metric]
  return rep !== undefined && ours !== undefined ? { ds, metric, rep, ours, label: `${fmtMetric(rep, metric)} → ${fmtMetric(ours, metric)}` } : null
}
