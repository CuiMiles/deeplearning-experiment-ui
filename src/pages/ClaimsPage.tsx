import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { audit, datasetDef, experiments, metricDef } from '../lib/data'
import { credibility } from '../lib/audit'
import { useTheme } from '../lib/theme'
import { EChart } from '../components/charts/EChart'
import { baseOption, tooltip, valueAxis } from '../components/charts/options'
import { claimPoint, credTone, Principles } from '../components/claims/ClaimsSection'
import { Badge, Card, ClaimVerdictBadge, cx, DecisionBadge, Empty, Hint, Stat } from '../components/ui'

export default function ClaimsPage() {
  const [, p] = useTheme()
  const nav = useNavigate()
  const rows = useMemo(
    () => experiments.flatMap((e) => (e.claims ?? []).map((c) => ({ e, c, cred: credibility(c), pt: claimPoint(c) }))),
    [],
  )
  const groups = [
    { key: 'ok', name: '已复现', color: p.good, match: (v: string) => v === 'reproduced' },
    { key: 'partial', name: '部分复现 / 待核查', color: p.warning, match: (v: string) => v === 'partial' || v === 'pending' },
    { key: 'bad', name: '未复现 / 结论相反', color: p.critical, match: (v: string) => v === 'not-reproduced' || v === 'contradicted' },
  ]
  const pts = rows.filter((r) => r.pt)
  const all = pts.flatMap((r) => [r.pt!.rep, r.pt!.ours])
  const lo = Math.floor((Math.min(...all, 100) - 5) / 5) * 5
  const hi = Math.ceil((Math.max(...all, 0) + 5) / 5) * 5
  const option = {
    ...baseOption(p),
    grid: { left: 4, right: 24, top: 40, bottom: 28, containLabel: true },
    tooltip: {
      ...tooltip(p, 'item'),
      formatter: (x: { data: { r: (typeof rows)[number] } }) => {
        const r = x.data.r
        return `<b>${r.c.paper.title}</b><br/>${datasetDef(r.pt!.ds).name} · ${metricDef(r.pt!.metric).name}<br/>报告 ${r.pt!.rep} → 实测 ${r.pt!.ours}`
      },
      extraCssText: 'border-radius:8px;max-width:300px;white-space:normal;',
    },
    xAxis: { ...valueAxis(p, '论文报告值'), min: lo, max: hi, nameLocation: 'middle', nameGap: 24, axisLine: { show: true, lineStyle: { color: p.axis } } },
    yAxis: { ...valueAxis(p, '我们实测值'), min: lo, max: hi },
    series: [
      { type: 'line', name: '完全复现 y = x', data: [[lo, lo], [hi, hi]], symbol: 'none', silent: true, lineStyle: { color: p.axis, width: 1.5 }, tooltip: { show: false }, endLabel: { show: true, formatter: 'y = x', color: p.muted, fontSize: 11 } },
      ...groups.map((g) => ({
      type: 'scatter',
      name: g.name,
      symbolSize: 12,
      itemStyle: { color: g.color, borderColor: p.surface, borderWidth: 2 },
      label: { show: true, position: 'right', color: p.ink2, fontSize: 11, formatter: (x: { data: { r: (typeof rows)[number] } }) => x.data.r.c.paper.title.slice(0, 14) + (x.data.r.c.paper.title.length > 14 ? '…' : '') },
      labelLayout: { hideOverlap: true },
      data: pts.filter((r) => g.match(r.c.verdict)).map((r) => ({ value: [r.pt!.rep, r.pt!.ours], r })),
    })),
    ],
    legend: { ...baseOption(p).legend, data: groups.map((g) => g.name) },
  }

  const scored = rows.filter((r) => r.cred.score !== null)
  const avg = scored.length ? scored.reduce((s, r) => s + r.cred.score!, 0) / scored.length : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <FileSearch size={22} className="text-accent" /> 文献核查
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          把"论文说能涨 X 个点，我们跑不出来"变成结构化的判断：数值是否自洽、差距能被哪些设置差异解释、信息是否透明，然后给出决策和时间盒，避免被低质量论文拖慢。
        </p>
      </div>
      <Principles />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="核查过的论文" value={rows.length} />
        <Stat label="已复现" value={rows.filter((r) => r.c.verdict === 'reproduced').length} />
        <Stat label="未复现 / 相反" value={rows.filter((r) => r.c.verdict === 'not-reproduced' || r.c.verdict === 'contradicted').length} />
        <Stat label="平均可信度" value={avg === null ? '–' : `${Math.round(avg * 100)}%`} hint="核查清单中已知项的加权通过率" />
      </div>

      {rows.length ? (
        <>
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
              声称 vs 实测 <Hint text="对角线上 = 完全复现；越往对角线下方，缩水越严重。点击点打开对应实验的核查详情。" />
            </div>
            <EChart option={option} height={340} onClick={(x: { data: { r: (typeof rows)[number] } }) => x.data?.r && nav(`/exp/${x.data.r.e.id}#claims`)} ariaLabel="声称与实测散点图" />
          </Card>
          <Card className="thin-scroll overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">论文</th>
                  <th className="px-3 py-2 font-medium">报告 → 实测</th>
                  <th className="px-3 py-2 font-medium">可信度</th>
                  <th className="px-3 py-2 font-medium">结论</th>
                  <th className="px-3 py-2 font-medium">决策</th>
                  <th className="px-3 py-2 font-medium">时间盒</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, c, cred, pt }) => {
                  const tone = credTone(cred.score)
                  return (
                    <tr key={`${e.id}-${c.id}`} className="border-b border-line align-top last:border-0">
                      <td className="max-w-[340px] px-4 py-2.5">
                        <Link to={`/exp/${e.id}#claims`} className="font-medium text-ink hover:text-accent">{c.paper.title}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted">
                          {[c.paper.venue, c.paper.year].filter(Boolean).join(' ')}
                          <Badge tone={c.paper.code === 'full' ? 'good' : c.paper.code === 'partial' ? 'warn' : 'bad'}>{c.paper.code === 'full' ? '开源' : c.paper.code === 'partial' ? '部分开源' : '无代码'}</Badge>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">实验：{e.title}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 num">
                        {pt ? (
                          <>
                            <span className="text-ink2">{pt.rep}</span> → <span className={cx('font-medium', pt.ours < pt.rep - 0.5 ? 'text-bad' : 'text-ink')}>{pt.ours}</span>
                            <div className="text-xs text-muted">{metricDef(pt.metric).name}</div>
                          </>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className={cx('whitespace-nowrap px-3 py-2.5 font-medium', tone.cls)}>
                        {cred.score === null ? '–' : `${Math.round(cred.score * 100)}%`} <span className="text-xs font-normal">{tone.label}</span>
                      </td>
                      <td className="px-3 py-2.5"><ClaimVerdictBadge v={c.verdict} label={audit.verdicts[c.verdict].name} /></td>
                      <td className="px-3 py-2.5"><DecisionBadge d={c.decision} label={audit.decisions[c.decision].name} /></td>
                      <td className="px-3 py-2.5 text-xs text-ink2">{c.timebox ?? '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <Empty>还没有文献核查记录。在实验 JSON 中添加 claims 字段即可。</Empty>
      )}
    </div>
  )
}
