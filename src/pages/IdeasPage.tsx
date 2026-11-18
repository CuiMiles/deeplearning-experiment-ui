import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import type { Hypothesis, PaperAngle } from '../lib/types'
import { experiments, getLens, getSymptom } from '../lib/data'
import { useTheme } from '../lib/theme'
import { EChart } from '../components/charts/EChart'
import { barSeries, baseOption, catAxis, tooltip, valueAxis } from '../components/charts/options'
import { hypothesisMatrixOption, PaperCard, paperTypeLabel } from '../components/insights/InsightsSection'
import { Card, Empty, Hint, Section, Segmented, Stat } from '../components/ui'

export default function IdeasPage() {
  const [, p] = useTheme()
  const nav = useNavigate()
  const hyps = useMemo(
    () => experiments.flatMap((e) => (e.insights?.hypotheses ?? []).map((h) => ({ ...h, expId: e.id, expTitle: e.title }))),
    [],
  ) as (Hypothesis & { expId: string; expTitle: string })[]
  const angles = useMemo(() => experiments.flatMap((e) => (e.insights?.paperAngles ?? []).map((a) => ({ a, e }))), [])
  const [type, setType] = useState<'all' | PaperAngle['type']>('all')

  const matrix = useMemo(() => hypothesisMatrixOption(p, hyps), [p, hyps])

  const symptomCount = useMemo(() => {
    const m = new Map<string, number>()
    experiments.forEach((e) => new Set((e.insights?.phenomena ?? []).flatMap((x) => x.symptoms ?? [])).forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [])
  const symOpt = useMemo(
    () => ({
      ...baseOption(p, { legend: false }),
      tooltip: { ...tooltip(p), formatter: (ps: { name: string; value: number }[]) => `${ps[0].name}：出现在 ${ps[0].value} 个实验中` },
      grid: { left: 4, right: 24, top: 8, bottom: 4, containLabel: true },
      xAxis: valueAxis(p, undefined, { minInterval: 1 }),
      yAxis: catAxis(p, symptomCount.map(([s]) => getSymptom(s)?.name ?? s).reverse(), { axisLabel: { color: p.ink2, fontSize: 11, width: 150, overflow: 'truncate' } }),
      series: [barSeries('实验数', symptomCount.map(([, n]) => n).reverse(), p.series[0], { itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 })],
    }),
    [p, symptomCount],
  )

  const lensCount = useMemo(() => {
    const m = new Map<string, number>()
    experiments.forEach((e) => (e.insights?.echoes ?? []).forEach((x) => x.lens && m.set(x.lens, (m.get(x.lens) ?? 0) + 1)))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [])

  const shown = angles.filter((x) => type === 'all' || x.a.type === type).sort((a, b) => (b.a.readiness ?? 0) - (a.a.readiness ?? 0))
  const types = [...new Set(angles.map((x) => x.a.type))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <Compass size={22} className="text-accent" /> 想法板
        </h1>
        <p className="mt-1 text-sm text-muted">汇总所有实验的假设和论文方向：先做左上角的速赢假设，再看哪个论文方向最接近成熟。</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="假设" value={hyps.length} sub={`待验证 ${hyps.filter((h) => (h.status ?? 'todo') === 'todo').length}`} />
        <Stat label="已证实" value={hyps.filter((h) => h.status === 'confirmed').length} sub={`已证伪 ${hyps.filter((h) => h.status === 'refuted').length}`} />
        <Stat label="论文方向" value={angles.length} sub={`成熟度 ≥ 50%：${angles.filter((x) => (x.a.readiness ?? 0) >= 0.5).length}`} />
        <Stat label="用到的历史透镜" value={lensCount.length} sub="来自透镜库" />
      </div>

      {hyps.length ? (
        <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
              全部假设：影响 × 成本 <Hint text="点击点打开对应实验" />
            </div>
            <EChart option={matrix} height={380} onClick={(x: { data: { h: { expId: string } } }) => x.data?.h?.expId && nav(`/exp/${x.data.h.expId}#insights`)} ariaLabel="全部假设影响成本矩阵" />
          </Card>
          <div className="space-y-3">
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
                反复出现的现象 <Hint text="同一种现象在多个实验中出现，往往就是值得写成分析型论文的规律" />
              </div>
              <EChart option={symOpt} height={Math.max(160, symptomCount.length * 26)} ariaLabel="现象频次" />
            </Card>
            <Card className="p-4">
              <div className="mb-2 text-sm font-medium text-ink">被借用最多的历史透镜</div>
              <ul className="space-y-1">
                {lensCount.slice(0, 8).map(([id, n]) => (
                  <li key={id} className="flex items-center justify-between text-sm">
                    <Link to={`/lenses?lens=${id}`} className="truncate text-ink2 hover:text-accent">
                      {getLens(id)?.name ?? id} <span className="text-xs text-muted">{getLens(id)?.domain}</span>
                    </Link>
                    <span className="text-xs text-muted num">×{n}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        <Empty>还没有实验填写"研究启发"</Empty>
      )}

      <Section
        id="angles"
        title="论文方向"
        right={<Segmented options={[{ value: 'all', label: '全部' }, ...types.map((t) => ({ value: t, label: paperTypeLabel[t] }))]} value={type} onChange={(v) => setType(v as typeof type)} />}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ a, e }) => (
            <PaperCard key={`${e.id}-${a.id}`} a={a} expLink={{ id: e.id, title: e.title }} />
          ))}
        </div>
      </Section>
    </div>
  )
}
