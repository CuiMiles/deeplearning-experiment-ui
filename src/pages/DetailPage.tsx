import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileJson, GitCompare } from 'lucide-react'
import { getExperiment, experiments } from '../lib/data'
import { Ablations, Breakdowns, Cases, Curves, ExtraCharts, HeadlineMetrics, Hero, MainResults, Reproduce, Toc } from '../components/experiment/sections'
import { InsightsSection } from '../components/insights/InsightsSection'
import { ClaimsSection } from '../components/claims/ClaimsSection'
import { CopyButton, Empty } from '../components/ui'

export default function DetailPage() {
  const { id } = useParams()
  const e = getExperiment(id)
  const toc = useMemo(() => {
    if (!e) return []
    const t = [{ id: 'overview', label: '概览' }, { id: 'results', label: '主结果' }]
    if (e.curves?.length) t.push({ id: 'curves', label: '训练过程' })
    if (e.ablations?.length) t.push({ id: 'ablations', label: '消融' })
    if (e.breakdowns?.length) t.push({ id: 'breakdowns', label: '细分' })
    if (e.charts?.length) t.push({ id: 'charts', label: '更多分析' })
    if (e.cases?.length) t.push({ id: 'cases', label: '案例' })
    if (e.insights) t.push({ id: 'insights', label: '研究启发' })
    if (e.claims?.length) t.push({ id: 'claims', label: '文献核查' })
    if (e.reproduce) t.push({ id: 'reproduce', label: '复现' })
    return t
  }, [e])

  if (!e) return <Empty>找不到实验 “{id}”。<Link to="/" className="link">返回列表</Link></Empty>

  const children = experiments.filter((x) => x.parent === e.id)
  const file = (e as { _file?: string })._file ?? `data/experiments/${e.id}.json`

  return (
    <div className="flex gap-8">
      <Toc items={toc} />
      <div className="min-w-0 flex-1 space-y-8">
        <div id="overview" className="scroll-mt-20 space-y-4">
          <Hero e={e} />
          <HeadlineMetrics e={e} />
        </div>
        <MainResults e={e} />
        <Curves e={e} />
        <Ablations e={e} />
        <Breakdowns e={e} />
        <ExtraCharts e={e} />
        <Cases e={e} />
        <InsightsSection e={e} />
        <ClaimsSection e={e} />
        <Reproduce e={e} />

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-muted">
          <FileJson size={14} /> 数据文件 <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-xs text-ink2">{file}</code>
          <CopyButton text={file} label="复制路径" />
          {e.author && <span className="ml-2">填写者：{e.author}</span>}
          {e.updated && <span>更新于 {e.updated}</span>}
          <Link to={`/compare?ids=${[e.parent, e.id].filter(Boolean).join(',')}`} className="btn ml-auto">
            <GitCompare size={14} /> {e.parent ? '与上游对比' : '加入对比'}
          </Link>
        </div>
        {children.length > 0 && (
          <div className="text-sm">
            <span className="text-muted">下游实验：</span>
            {children.map((c) => (
              <Link key={c.id} to={`/exp/${c.id}`} className="link mr-3">{c.title}</Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
