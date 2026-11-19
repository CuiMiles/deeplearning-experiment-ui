import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, BookOpen, Compass, FlaskConical, HelpCircle, History, Lightbulb, MessageCircleQuestion, ScrollText, Sparkle, TriangleAlert } from 'lucide-react'
import type { Echo, Experiment, Hypothesis, Insights, PaperAngle } from '../../lib/types'
import { getLens, getPrompt, getSymptom } from '../../lib/data'
import { useTheme } from '../../lib/theme'
import { EChart } from '../charts/EChart'
import { baseOption, tooltip, valueAxis } from '../charts/options'
import { Badge, Bar, Card, cx, Dots, Hint, ScrollLink, Section } from '../ui'

const NOW = 2026

export const paperTypeLabel: Record<PaperAngle['type'], string> = {
  method: '方法', analysis: '分析', benchmark: '基准', dataset: '数据集', theory: '理论', system: '系统',
}
export const hypStatusLabel: Record<NonNullable<Hypothesis['status']>, string> = {
  todo: '待验证', running: '验证中', confirmed: '已证实', refuted: '已证伪',
}

export function echoSource(x: Echo) {
  const lens = getLens(x.lens)
  return lens
    ? { key: `l:${lens.id}`, name: lens.name, nameEn: lens.nameEn, domain: lens.domain, year: lens.year, people: lens.people, story: lens.story, lensId: lens.id, caution: lens.caution }
    : { key: `l:${x.precedent?.name ?? x.id}`, name: x.precedent?.name ?? '未命名先例', nameEn: '', domain: x.precedent?.domain ?? '', year: x.precedent?.year, people: x.precedent?.people, story: x.precedent?.story ?? '', lensId: undefined, caution: undefined }
}

const evidenceTarget = (ev?: string) => {
  if (!ev) return undefined
  const k = ev.split(':')[0]
  const map: Record<string, string> = { ablation: 'ablations', breakdown: 'breakdowns', case: 'cases', curve: 'curves', chart: 'charts', results: 'results', claim: 'claims' }
  return map[k]
}

export function InsightsSection({ e }: { e: Experiment }) {
  const ins = e.insights
  if (!ins) return null
  return (
    <Section
      id="insights"
      title="研究启发"
      icon={<Compass size={18} />}
      subtitle="现象 → 历史回声 → 可检验的假设 → 论文方向（由智能体调研后撰写，供你判断）"
      right={
        ins.confidence !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted">
            智能体信心
            <span className="w-20">
              <Bar value={ins.confidence} />
            </span>
            <span className="text-ink2 num">{Math.round(ins.confidence * 100)}%</span>
          </span>
        )
      }
    >
      <div className="space-y-5">
        <ChainChart ins={ins} />
        <Phenomena ins={ins} />
        <Echoes ins={ins} />
        <Hypotheses ins={ins} />
        <PaperAngles ins={ins} />
        <Provocations ins={ins} />
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------- 链路 ----
function ChainChart({ ins }: { ins: Insights }) {
  const [, p] = useTheme()
  const option = useMemo(() => {
    const nodes = new Map<string, { name: string; label: string; depth: number; color: string; desc?: string }>()
    const links = new Map<string, { source: string; target: string; value: number }>()
    const addLink = (s: string, t: string) => {
      const k = `${s}→${t}`
      links.set(k, { source: s, target: t, value: (links.get(k)?.value ?? 0) + 1 })
    }
    const col = [p.series[0], p.series[1], p.series[2], p.series[6]]
    const echoLens = new Map<string, string>()
    ins.echoes.forEach((x) => {
      const src = echoSource(x)
      const ph = ins.phenomena.find((q) => q.id === x.phenomenon)
      if (!ph) return
      nodes.set(`p:${ph.id}`, { name: `p:${ph.id}`, label: ph.title, depth: 0, color: col[0], desc: ph.detail })
      nodes.set(src.key, { name: src.key, label: `${src.name}${src.year ? `（${src.year < 0 ? `前${-src.year}` : src.year}）` : ''}`, depth: 1, color: col[1], desc: src.domain })
      echoLens.set(x.id, src.key)
      addLink(`p:${ph.id}`, src.key)
    })
    ins.hypotheses.forEach((h) => {
      const sources = (h.from ?? []).map((id) => echoLens.get(id) ?? (ins.phenomena.some((q) => q.id === id) ? `p:${id}` : undefined)).filter(Boolean) as string[]
      if (!sources.length) return
      nodes.set(`h:${h.id}`, { name: `h:${h.id}`, label: h.title, depth: 2, color: col[2], desc: h.statement })
      sources.forEach((s) => addLink(s, `h:${h.id}`))
    })
    ins.paperAngles.forEach((a) => {
      const sources = (a.from ?? []).filter((id) => nodes.has(`h:${id}`)).map((id) => `h:${id}`)
      if (!sources.length) return
      nodes.set(`a:${a.id}`, { name: `a:${a.id}`, label: a.title, depth: 3, color: col[3], desc: a.claim })
      sources.forEach((s) => addLink(s, `a:${a.id}`))
    })
    const nodeArr = [...nodes.values()]
    return {
      nodes: nodeArr.length,
      option: {
        ...baseOption(p, { legend: false }),
        tooltip: {
          ...tooltip(p, 'item'),
          formatter: (x: { dataType: string; data: { name: string; source?: string; target?: string } }) => {
            if (x.dataType === 'edge') return `${nodes.get(x.data.source!)?.label} → ${nodes.get(x.data.target!)?.label}`
            const n = nodes.get(x.data.name)
            return `<b>${n?.label}</b>${n?.desc ? `<br/><span style="opacity:.75">${n.desc}</span>` : ''}`
          },
          extraCssText: 'border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-width:280px;white-space:normal;',
        },
        series: [
          {
            type: 'sankey',
            left: 8,
            right: 170,
            top: 28,
            bottom: 8,
            nodeWidth: 10,
            nodeGap: 14,
            draggable: false,
            layoutIterations: 64,
            emphasis: { focus: 'adjacency' },
            lineStyle: { color: 'gradient', opacity: 0.25, curveness: 0.5 },
            label: { color: p.ink, fontSize: 12, formatter: (x: { name: string }) => nodes.get(x.name)?.label ?? x.name, overflow: 'truncate', width: 150 },
            data: nodeArr.map((n) => ({ name: n.name, depth: n.depth, itemStyle: { color: n.color, borderWidth: 0 } })),
            links: [...links.values()],
          },
        ],
      },
    }
  }, [ins, p])
  if (option.nodes < 3) return null
  const heads = ['观察到的现象', '历史回声', '可检验的假设', '论文方向']
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
        启发链路 <Hint text="从左到右：实验中的现象 → 其他领域/历史中的同构现象 → 由此推出的假设 → 可能的论文。悬停查看详情。" />
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden text-[11px] text-muted sm:block">
          {heads.map((h, i) => (
            <span key={h} className="absolute whitespace-nowrap" style={{ left: `calc(8px + ${i} * (100% - 188px) / 3)` }}>
              {h}
            </span>
          ))}
        </div>
        <EChart option={option.option} height={Math.max(260, option.nodes * 26)} ariaLabel="启发链路图" />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- 现象 ----
function Phenomena({ ins }: { ins: Insights }) {
  return (
    <div>
      <SubHead icon={<FlaskConical size={15} />} title="观察到的现象" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ins.phenomena.map((ph) => (
          <Card key={ph.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-ink">{ph.title}</span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                意外 <Dots value={ph.surprise} label="意外程度" />
              </span>
            </div>
            {ph.detail && <p className="mt-1 text-sm text-ink2">{ph.detail}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {ph.symptoms?.map((s) => (
                <Link key={s} to={`/lenses?symptom=${s}`} className="chip hover:border-accent hover:text-accent">
                  {getSymptom(s)?.name ?? s}
                </Link>
              ))}
              {evidenceTarget(ph.evidence) && (
                <ScrollLink to={evidenceTarget(ph.evidence)!} className="text-xs text-accent hover:underline">
                  看证据 ↑
                </ScrollLink>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 回声 ----
function Echoes({ ins }: { ins: Insights }) {
  const items = ins.echoes.map((x) => ({ x, src: echoSource(x), ph: ins.phenomena.find((q) => q.id === x.phenomenon) }))
  const dated = [...new Map(items.filter((i) => i.src.year !== undefined).map((i) => [i.src.key, i])).values()].sort((a, b) => a.src.year! - b.src.year!)
  if (!items.length) return null
  return (
    <div>
      <SubHead icon={<History size={15} />} title="历史回声" hint="同样结构的现象，在其他学科或历史上早已出现过；看看他们是怎么理解和解决的。" />
      {dated.length >= 2 && (
        <Card className="mb-3 px-4 py-3">
          <div className="text-xs text-muted">这些现象最早在多少年前就被人类注意到</div>
          <div className="thin-scroll mt-3 overflow-x-auto pb-1">
            <ol className="relative flex min-w-max items-start">
              <span className="absolute left-0 right-0 top-[5px] h-px bg-line" aria-hidden />
              {dated.map(({ src }) => (
                <li key={src.key} className="relative w-[132px] shrink-0 pr-3">
                  <span className="relative z-10 block h-[11px] w-[11px] rounded-full border-2 border-surface bg-accent" />
                  <div className="mt-1.5 text-sm font-semibold text-ink num">{src.year}</div>
                  <div className="text-xs text-ink2">{src.name}</div>
                  <div className="text-[11px] text-muted">{src.domain} · 距今 {NOW - src.year!} 年</div>
                </li>
              ))}
              <li className="relative w-[120px] shrink-0">
                <span className="relative z-10 block h-[11px] w-[11px] rounded-full border-2 border-surface bg-ink" />
                <div className="mt-1.5 text-sm font-semibold text-ink num">{NOW}</div>
                <div className="text-xs text-ink2">本实验</div>
              </li>
            </ol>
          </div>
        </Card>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map(({ x, src, ph }) => (
          <EchoCard key={x.id} x={x} src={src} phTitle={ph?.title} />
        ))}
      </div>
    </div>
  )
}

function EchoCard({ x, src, phTitle }: { x: Echo; src: ReturnType<typeof echoSource>; phTitle?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="flex flex-col p-4">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {src.domain && <Badge tone="accent">{src.domain}</Badge>}
        {src.year !== undefined && (
          <span className="num">
            {src.year} 年 · 距今 {NOW - src.year} 年
          </span>
        )}
        {phTitle && <span className="ml-auto truncate">对应现象：{phTitle}</span>}
      </div>
      <div className="mt-1.5 font-medium text-ink">
        {src.name}
        {src.nameEn && <span className="ml-1.5 text-xs font-normal text-muted">{src.nameEn}</span>}
      </div>
      {src.people && <div className="text-xs text-muted">{src.people}</div>}
      <p className={cx('mt-1.5 text-sm text-ink2', !open && 'line-clamp-3')}>{src.story}</p>
      {src.story.length > 90 && (
        <button type="button" onClick={() => setOpen(!open)} className="self-start text-xs text-accent hover:underline">
          {open ? '收起' : '展开故事'}
        </button>
      )}
      {x.correspondences && x.correspondences.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <div className="grid grid-cols-[1fr_auto_1fr] bg-sunken px-3 py-1 text-[11px] text-muted">
            <span>他们</span>
            <span />
            <span className="text-right">我们</span>
          </div>
          {x.correspondences.map(([a, b], i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-line px-3 py-1.5 text-sm">
              <span className="text-ink2">{a}</span>
              <ArrowLeftRight size={13} className="text-muted" />
              <span className="text-right text-ink">{b}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-sm">
        <div className="mb-0.5 flex items-center gap-1 text-xs font-medium text-accent">
          <Lightbulb size={13} /> 借来的解法
        </div>
        <p className="text-ink">{x.borrowedMove}</p>
      </div>
      {(x.limit || src.caution) && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
          <TriangleAlert size={13} className="mt-px shrink-0 text-warn" />
          <span>
            类比边界：{x.limit}
            {x.limit && src.caution ? ' ' : ''}
            {src.caution}
          </span>
        </p>
      )}
      {src.lensId && (
        <Link to={`/lenses?lens=${src.lensId}`} className="mt-2 self-start text-xs text-accent hover:underline">
          在透镜库中查看更多提问 →
        </Link>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- 假设 ----
export function hypothesisMatrixOption(
  p: ReturnType<typeof useTheme>[1],
  hs: (Hypothesis & { expTitle?: string; expId?: string })[],
) {
  const statusColor: Record<string, string> = { todo: p.neutral, running: p.series[0], confirmed: p.good, refuted: p.critical }
  const groups = (['todo', 'running', 'confirmed', 'refuted'] as const).filter((s) => hs.some((h) => (h.status ?? 'todo') === s))
  const seen = new Map<string, number>()
  const jit = (h: Hypothesis) => {
    const k = `${h.effort}-${h.impact}`
    const n = seen.get(k) ?? 0
    seen.set(k, n + 1)
    const ang = n * 2.4
    const r = n ? 0.18 + 0.06 * n : 0
    return [h.effort + Math.cos(ang) * r, h.impact + Math.sin(ang) * r]
  }
  return {
    ...baseOption(p),
    legend: { ...baseOption(p).legend, data: groups.map((g) => hypStatusLabel[g]) },
    grid: { left: 8, right: 16, top: 40, bottom: 28, containLabel: true },
    tooltip: {
      ...tooltip(p, 'item'),
      formatter: (q: { data: { h: Hypothesis & { expTitle?: string } } }) =>
        `<b>${q.data.h.title}</b><br/><span style="opacity:.8">${q.data.h.statement}</span><br/>影响 ${q.data.h.impact} · 成本 ${q.data.h.effort}${q.data.h.expTitle ? `<br/><span style="opacity:.6">${q.data.h.expTitle}</span>` : ''}`,
      extraCssText: 'border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-width:280px;white-space:normal;',
    },
    xAxis: { ...valueAxis(p, '成本 →'), min: 0, max: 6, interval: 1, nameLocation: 'middle', nameGap: 22, splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: p.axis } }, axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => (v >= 1 && v <= 5 ? String(v) : '') } },
    yAxis: { ...valueAxis(p, '影响 ↑'), min: 0, max: 6, interval: 1, splitLine: { show: false }, axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => (v >= 1 && v <= 5 ? String(v) : '') } },
    series: groups.map((g, gi) => ({
      type: 'scatter',
      name: hypStatusLabel[g],
      symbolSize: 12,
      itemStyle: { color: statusColor[g], borderColor: p.surface, borderWidth: 2 },
      label: { show: hs.length <= 14, position: 'right', color: p.ink2, fontSize: 11, width: 96, overflow: 'truncate', formatter: (q: { data: { h: Hypothesis } }) => q.data.h.title },
      labelLayout: { hideOverlap: true },
      data: hs.filter((h) => (h.status ?? 'todo') === g).map((h) => ({ value: jit(h), h })),
      markArea:
        gi === 0
          ? {
              silent: true,
              itemStyle: { color: p.good, opacity: 0.06 },
              label: { color: p.muted, fontSize: 11, position: 'insideTopLeft' },
              data: [[{ name: '速赢区：影响大、成本低', coord: [0, 3.5] }, { coord: [3, 6] }]],
            }
          : undefined,
    })),
  }
}

function Hypotheses({ ins }: { ins: Insights }) {
  const [, p] = useTheme()
  const option = useMemo(() => hypothesisMatrixOption(p, ins.hypotheses), [p, ins.hypotheses])
  if (!ins.hypotheses.length) return null
  const sorted = [...ins.hypotheses].sort((a, b) => b.impact - b.effort - (a.impact - a.effort))
  return (
    <div>
      <SubHead icon={<Sparkle size={15} />} title="可检验的假设" hint="每个假设都配一个最小验证实验和证伪条件。按'影响 − 成本'排序，左上角优先做。" />
      <div className="grid gap-3 lg:grid-cols-[2fr_3fr]">
        <Card className="p-4">
          <EChart option={option} height={300} ariaLabel="假设影响-成本矩阵" />
        </Card>
        <div className="space-y-2">
          {sorted.map((h) => (
            <Card key={h.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{h.title}</span>
                <Badge tone={h.status === 'confirmed' ? 'good' : h.status === 'refuted' ? 'bad' : h.status === 'running' ? 'accent' : 'neutral'}>{hypStatusLabel[h.status ?? 'todo']}</Badge>
                <span className="ml-auto flex items-center gap-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1">影响 <Dots value={h.impact} /></span>
                  <span className="flex items-center gap-1">成本 <Dots value={h.effort} /></span>
                </span>
              </div>
              <p className="mt-1 text-sm text-ink2">{h.statement}</p>
              <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                <div className="rounded-md bg-sunken px-2 py-1.5">
                  <span className="text-muted">最小实验：</span>
                  <span className="text-ink">{h.test}</span>
                </div>
                {h.falsifiedIf && (
                  <div className="rounded-md bg-sunken px-2 py-1.5">
                    <span className="text-muted">如果出现这种情况就放弃：</span>
                    <span className="text-ink">{h.falsifiedIf}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 论文 ----
export function PaperCard({ a, expLink }: { a: PaperAngle; expLink?: { id: string; title: string } }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{paperTypeLabel[a.type]}</Badge>
        {a.venues?.map((v) => (
          <span key={v} className="chip">{v}</span>
        ))}
      </div>
      <div className="mt-2 font-medium leading-snug text-ink">{a.title}</div>
      <p className="mt-1 text-sm text-ink2">{a.claim}</p>
      <dl className="mt-2 space-y-1 text-xs">
        {a.novelty && (
          <div>
            <dt className="inline text-muted">新意：</dt>
            <dd className="inline text-ink2">{a.novelty}</dd>
          </div>
        )}
        {a.risk && (
          <div>
            <dt className="inline text-muted">风险：</dt>
            <dd className="inline text-ink2">{a.risk}</dd>
          </div>
        )}
      </dl>
      {a.checkRelated && a.checkRelated.length > 0 && (
        <div className="mt-2 text-xs">
          <div className="text-muted">投稿前先查这些是否已被做过：</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {a.checkRelated.map((q) => (
              <a key={q} href={`https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer" className="chip hover:border-accent hover:text-accent">
                {q} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto pt-3">
        {a.readiness !== undefined && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            成熟度 <Bar value={a.readiness} className="flex-1" /> <span className="num">{Math.round(a.readiness * 100)}%</span>
          </div>
        )}
        {expLink && (
          <Link to={`/exp/${expLink.id}`} className="mt-2 block truncate text-xs text-accent hover:underline">
            来自：{expLink.title}
          </Link>
        )}
      </div>
    </Card>
  )
}

function PaperAngles({ ins }: { ins: Insights }) {
  if (!ins.paperAngles.length) return null
  return (
    <div>
      <SubHead icon={<ScrollText size={15} />} title="可能的论文方向" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ins.paperAngles.map((a) => (
          <PaperCard key={a.id} a={a} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 提问 ----
function Provocations({ ins }: { ins: Insights }) {
  const has = (ins.provocations?.length ?? 0) + (ins.questionsForYou?.length ?? 0) + (ins.readingList?.length ?? 0)
  if (!has) return null
  return (
    <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
      {ins.provocations && ins.provocations.length > 0 && (
        <div>
          <SubHead icon={<HelpCircle size={15} />} title="思维提示卡" hint="智能体用提示卡库中的问题逼自己换角度思考后的回答" />
          <div className="grid gap-2 sm:grid-cols-2">
            {ins.provocations.map((x) => {
              const pr = getPrompt(x.prompt)
              return (
                <Card key={x.prompt} className="p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    {pr && <Badge>{pr.category}</Badge>}
                    <span className="font-medium text-ink2">{pr?.title ?? x.prompt}</span>
                  </div>
                  {pr && <p className="mt-1 text-xs text-muted">{pr.question}</p>}
                  <p className="mt-1.5 text-sm text-ink">{x.answer}</p>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {ins.questionsForYou && ins.questionsForYou.length > 0 && (
          <div>
            <SubHead icon={<MessageCircleQuestion size={15} />} title="智能体想问你" />
            <Card className="divide-y divide-line">
              {ins.questionsForYou.map((q, i) => (
                <p key={i} className="flex gap-2 px-3 py-2.5 text-sm text-ink">
                  <span className="font-semibold text-accent">?</span>
                  {q}
                </p>
              ))}
            </Card>
          </div>
        )}
        {ins.readingList && ins.readingList.length > 0 && (
          <div>
            <SubHead icon={<BookOpen size={15} />} title="延伸阅读" />
            <Card className="divide-y divide-line">
              {ins.readingList.map((r) => (
                <div key={r.title} className="px-3 py-2 text-sm">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="link">{r.title} ↗</a>
                  ) : (
                    <span className="text-ink">{r.title}</span>
                  )}
                  {r.why && <div className="text-xs text-muted">{r.why}</div>}
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export function SubHead({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
      <span className="text-accent">{icon}</span>
      {title}
      {hint && <Hint text={hint} />}
    </div>
  )
}
