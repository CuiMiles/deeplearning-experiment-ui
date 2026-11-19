import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookMarked, Dices, Lightbulb, TriangleAlert, X } from 'lucide-react'
import type { Lens } from '../lib/types'
import { experimentsUsingLens, lensLib, prompts } from '../lib/data'
import { Badge, Card, cx, ScrollLink, Section, Segmented } from '../components/ui'

const NOW = 2026

export default function LensesPage() {
  const [sp, setSp] = useSearchParams()
  const picked = (sp.get('symptom') ?? '').split(',').filter(Boolean)
  const focusLens = sp.get('lens')
  const [domain, setDomain] = useState('all')

  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
    const n = new URLSearchParams()
    if (next.length) n.set('symptom', next.join(','))
    setSp(n, { replace: true })
  }

  const ranked = useMemo(() => {
    return lensLib.lenses
      .map((l) => ({ l, hits: picked.filter((s) => l.triggers.includes(s)).length }))
      .filter((x) => (picked.length ? x.hits > 0 : true))
      .filter((x) => domain === 'all' || x.l.domain === domain)
      .sort((a, b) => b.hits - a.hits || a.l.year - b.l.year)
  }, [picked, domain])

  useEffect(() => {
    if (focusLens) setTimeout(() => document.getElementById(`lens-${focusLens}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }, [focusLens])

  const domains = [...new Set(lensLib.lenses.map((l) => l.domain))]
  const centuries = useMemo(() => {
    const m = new Map<string, Lens[]>()
    ;[...lensLib.lenses].sort((a, b) => a.year - b.year).forEach((l) => {
      const c = l.year < 1800 ? '1800 年以前' : `${Math.floor(l.year / 50) * 50}s`
      m.set(c, [...(m.get(c) ?? []), l])
    })
    return [...m.entries()]
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <BookMarked size={22} className="text-accent" /> 透镜库
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          你在实验里遇到的现象，几乎都在人类历史的其他领域出现过。选中你观察到的现象，看看天文学家、心理学家、经济学家当年是怎么理解和解决它的。智能体撰写"研究启发"时也从这里出发，并可以补充新的透镜。
        </p>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">我在实验中观察到……</span>
          {picked.length > 0 && (
            <button className="btn px-2 py-1 text-xs" onClick={() => setSp(new URLSearchParams(), { replace: true })}>
              <X size={12} /> 清空
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {lensLib.symptoms.map((s) => {
            const on = picked.includes(s.id)
            const n = lensLib.lenses.filter((l) => l.triggers.includes(s.id)).length
            return (
              <button
                key={s.id}
                type="button"
                title={s.desc}
                onClick={() => toggle(s.id)}
                className={cx('rounded-lg border px-2.5 py-1 text-sm transition', on ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-ink2 hover:bg-sunken')}
              >
                {s.name} <span className="text-xs text-muted">{n}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium text-ink">历史长河 <span className="text-xs font-normal text-muted">（{lensLib.lenses.length} 个透镜，点击跳转）</span></div>
        <div className="thin-scroll flex gap-4 overflow-x-auto pb-2">
          {centuries.map(([c, ls]) => (
            <div key={c} className="shrink-0">
              <div className="label mb-1 border-b border-line pb-1">{c}</div>
              <ul className="space-y-0.5">
                {ls.map((l) => {
                  const hit = !picked.length || picked.some((s) => l.triggers.includes(s))
                  return (
                    <li key={l.id}>
                      <ScrollLink to={`lens-${l.id}`} className={cx('flex items-center gap-1.5 text-xs transition hover:text-accent', hit ? 'text-ink2' : 'text-muted opacity-40')}>
                        <span className="w-9 text-right text-muted num">{l.year}</span>
                        <span className={cx('h-1.5 w-1.5 rounded-full', hit && picked.length ? 'bg-accent' : 'bg-line')} />
                        <span className="whitespace-nowrap">{l.name}</span>
                      </ScrollLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Section
        id="lenses"
        title={picked.length ? `匹配的透镜（${ranked.length}）` : '全部透镜'}
        right={
          <select className="input py-1 text-sm" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="学科">
            <option value="all">全部学科</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ l, hits }) => (
            <LensCard key={l.id} l={l} hits={hits} focus={focusLens === l.id} />
          ))}
        </div>
      </Section>

      <PromptDeck />
    </div>
  )
}

function LensCard({ l, hits, focus }: { l: Lens; hits: number; focus: boolean }) {
  const used = experimentsUsingLens(l.id)
  return (
    <Card id={`lens-${l.id}`} className={cx('flex scroll-mt-24 flex-col p-4', focus && 'ring-2 ring-accent')}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Badge tone="accent">{l.domain}</Badge>
        <span className="num">{l.year} · 距今 {NOW - l.year} 年</span>
        {hits > 0 && <span className="ml-auto text-accent">匹配 {hits} 个现象</span>}
      </div>
      <div className="mt-1.5 font-medium text-ink">
        {l.name} <span className="text-xs font-normal text-muted">{l.nameEn}</span>
      </div>
      {l.people && <div className="text-xs text-muted">{l.people}</div>}
      <p className="mt-2 text-sm text-ink2">{l.story}</p>
      <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-sm font-medium text-ink">{l.essence}</p>
      <p className="mt-2 text-sm text-ink2">
        <span className="text-xs text-muted">在深度学习中：</span>
        {l.dlMirror}
      </p>
      <div className="mt-2">
        <div className="label mb-1">拿它来问自己</div>
        <ul className="space-y-1 text-sm text-ink">
          {l.questions.map((q) => (
            <li key={q} className="flex gap-1.5">
              <span className="text-accent">?</span>
              {q}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2">
        <div className="label mb-1">可借用的做法</div>
        <ul className="space-y-1 text-sm text-ink2">
          {l.moves.map((m) => (
            <li key={m} className="flex gap-1.5">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-accent" />
              {m}
            </li>
          ))}
        </ul>
      </div>
      {l.caution && (
        <p className="mt-2 flex gap-1.5 text-xs text-muted">
          <TriangleAlert size={13} className="mt-px shrink-0 text-warn" /> {l.caution}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs">
        {l.refs?.map((r) =>
          r.url ? (
            <a key={r.title} href={r.url} target="_blank" rel="noreferrer" className="link">{r.title} ↗</a>
          ) : (
            <span key={r.title} className="text-muted">{r.title}</span>
          ),
        )}
      </div>
      {used.length > 0 && (
        <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
          被引用：
          {used.map((e) => (
            <Link key={e.id} to={`/exp/${e.id}#insights`} className="link mr-2">{e.title}</Link>
          ))}
        </div>
      )}
    </Card>
  )
}

function PromptDeck() {
  const cats = [...new Set(prompts.map((p) => p.category))]
  const [cat, setCat] = useState('all')
  const [drawn, setDrawn] = useState<string | null>(null)
  const list = prompts.filter((p) => cat === 'all' || p.category === cat)
  const draw = () => setDrawn(list[Math.floor(Math.random() * list.length)]?.id ?? null)
  const card = prompts.find((p) => p.id === drawn)
  return (
    <Section
      id="prompts"
      title="思维提示卡"
      subtitle="卡住的时候抽一张：反转、极限、审稿人 2、TRIZ 发明原理……"
      right={
        <div className="flex flex-wrap gap-2">
          <Segmented size="xs" options={[{ value: 'all', label: '全部' }, ...cats.map((c) => ({ value: c, label: c }))]} value={cat} onChange={setCat} />
          <button className="btn-primary" onClick={draw}>
            <Dices size={14} /> 抽一张
          </button>
        </div>
      }
    >
      {card && (
        <Card className="mb-3 border-accent p-5 ring-2 ring-accent/40">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Badge tone="accent">{card.category}</Badge>
            {card.origin}
          </div>
          <div className="mt-2 text-lg font-medium text-ink">{card.title}</div>
          <p className="mt-1 text-[15px] text-ink">{card.question}</p>
          {card.hint && <p className="mt-2 text-sm text-muted">提示：{card.hint}</p>}
        </Card>
      )}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((p) => (
          <Card key={p.id} className={cx('p-3', drawn === p.id && 'ring-2 ring-accent')}>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Badge>{p.category}</Badge>
              <span className="font-medium text-ink2">{p.title}</span>
            </div>
            <p className="mt-1.5 text-sm text-ink">{p.question}</p>
            <p className="mt-1 text-[11px] text-muted">{p.origin}</p>
          </Card>
        ))}
      </div>
    </Section>
  )
}
