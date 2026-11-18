import { useCallback, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type {
  Case, DenseCaptionCase, ImageCaptionCase, ImageGroundingCase, ImageQACase, Method, RetrievalCase, TemporalCase, VideoQACase,
} from '../../lib/types'
import { mediaUrl } from '../../lib/data'
import { boxIoU, fmtTime } from '../../lib/format'
import { useTheme } from '../../lib/theme'
import { cx, OutcomeBadge } from '../ui'
import { TemporalPlayer, type TLCurve, type TLTrack } from './TemporalPlayer'

interface Ctx {
  methods: Method[]
  colors: Record<string, string>
}

const nameOf = (ctx: Ctx, id: string) => ctx.methods.find((m) => m.id === id)?.name ?? id
const colorOf = (ctx: Ctx, id: string, fallback: string) => ctx.colors[id] ?? fallback

export function CaseViewer({ c, ctx }: { c: Case; ctx: Ctx }) {
  return (
    <div>
      <CaseHeader c={c} />
      {c.type === 'temporal' && <TemporalView c={c} ctx={ctx} />}
      {c.type === 'dense-caption' && <DenseView c={c} ctx={ctx} />}
      {c.type === 'videoqa' && <VideoQAView c={c} ctx={ctx} />}
      {c.type === 'retrieval' && <RetrievalView c={c} ctx={ctx} />}
      {c.type === 'image-grounding' && <GroundingView c={c} ctx={ctx} />}
      {c.type === 'image-qa' && <ImageQAView c={c} ctx={ctx} />}
      {c.type === 'image-caption' && <CaptionView c={c} ctx={ctx} />}
    </div>
  )
}

function CaseHeader({ c }: { c: Case }) {
  const main =
    c.type === 'temporal' ? c.query : c.type === 'videoqa' || c.type === 'image-qa' ? c.question : c.type === 'retrieval' ? c.query : c.type === 'image-grounding' ? c.expression : c.title
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <OutcomeBadge o={c.outcome} />
        {c.tags?.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
      {main && <p className="mt-2 text-base font-medium leading-snug text-ink">“{main}”</p>}
      {c.note && <p className="mt-1 text-sm text-ink2">{c.note}</p>}
    </div>
  )
}

// ------------------------------------------------------------ 时序定位 ----
function TemporalView({ c, ctx }: { c: TemporalCase; ctx: Ctx }) {
  const [, p] = useTheme()
  const tracks: TLTrack[] = [
    { id: 'gt', label: 'GT', color: p.gt, kind: 'gt', segments: c.gt.map(([s, e]) => ({ start: s, end: e })) },
    ...c.predictions.map((pr) => ({ id: pr.method, label: nameOf(ctx, pr.method), color: colorOf(ctx, pr.method, p.series[0]), kind: 'pred' as const, segments: pr.segments })),
  ]
  const curves: TLCurve[] = []
  if (c.saliency) {
    const first = c.predictions[0]?.method
    curves.push({ id: 'sal', label: '显著性·预测', color: colorOf(ctx, first, p.series[0]), interval: c.saliency.interval, values: c.saliency.values })
    if (c.saliency.gt) curves.push({ id: 'salgt', label: '显著性·GT', color: p.gt, interval: c.saliency.interval, values: c.saliency.gt })
  }
  return <TemporalPlayer caseId={c.id} video={c.video} tracks={tracks} curves={curves} sampledFrames={c.sampledFrames} gt={c.gt} />
}

// ------------------------------------------------------------ 密集描述 ----
function DenseView({ c, ctx }: { c: DenseCaptionCase; ctx: Ctx }) {
  const [, p] = useTheme()
  const [t, setT] = useState(0)
  const seekRef = useRef<((t: number) => void) | null>(null)
  const onTime = useCallback((x: number) => setT(x), [])
  const tracks: TLTrack[] = [
    { id: 'gt', label: 'GT 事件', color: p.gt, kind: 'event', segments: c.gt.map((e) => ({ start: e.start, end: e.end, text: e.text })) },
    ...c.predictions.map((pr) => ({ id: pr.method, label: nameOf(ctx, pr.method), color: colorOf(ctx, pr.method, p.series[0]), kind: 'event' as const, segments: pr.events.map((e) => ({ start: e.start, end: e.end, text: e.text })) })),
  ]
  const cols = [{ id: 'gt', name: 'GT', color: p.gt, events: c.gt }, ...c.predictions.map((pr) => ({ id: pr.method, name: nameOf(ctx, pr.method), color: colorOf(ctx, pr.method, p.series[0]), events: pr.events }))]
  return (
    <div>
      <TemporalPlayer
        caseId={c.id}
        video={c.video}
        tracks={tracks}
        sampledFrames={c.sampledFrames}
        onTime={onTime}
        seekRef={seekRef}
        subtitle={(x) => c.gt.find((e) => x >= e.start && x <= e.end)?.text}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {cols.map((col) => (
          <div key={col.id} className="rounded-lg border border-line">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm font-medium text-ink">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: col.color }} />
              {col.name}
              <span className="text-xs font-normal text-muted">{col.events.length} 个事件</span>
            </div>
            <ul className="divide-y divide-line">
              {col.events.map((e, i) => {
                const active = t >= e.start && t <= e.end
                return (
                  <li key={i}>
                    <button type="button" onClick={() => seekRef.current?.(e.start)} className={cx('flex w-full gap-3 px-3 py-2 text-left text-sm transition hover:bg-sunken', active && 'bg-accent/10')}>
                      <span className="w-[86px] shrink-0 font-mono text-xs text-muted num">
                        {fmtTime(e.start)}–{fmtTime(e.end)}
                      </span>
                      <span className="text-ink2">{e.text}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ 视频问答 ----
function VideoQAView({ c, ctx }: { c: VideoQACase; ctx: Ctx }) {
  const [, p] = useTheme()
  const tracks: TLTrack[] = c.evidence?.length ? [{ id: 'ev', label: '证据片段', color: p.gt, kind: 'evidence', segments: c.evidence.map(([s, e]) => ({ start: s, end: e })) }] : []
  const isCorrect = (a: number | string) => String(a) === String(c.answer)
  const letter = (i: number) => String.fromCharCode(65 + i)
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
      <TemporalPlayer caseId={c.id} video={c.video} tracks={tracks} sampledFrames={c.sampledFrames} gt={c.evidence} />
      <div>
        {c.options ? (
          <ul className="space-y-1.5">
            {c.options.map((o, i) => {
              const right = isCorrect(i)
              const pickers = c.predictions.filter((pr) => String(pr.answer) === String(i))
              return (
                <li key={i} className={cx('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', right ? 'border-good/40 bg-good/5' : 'border-line')}>
                  <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-semibold', right ? 'bg-good text-white' : 'bg-sunken text-ink2')}>{letter(i)}</span>
                  <span className="flex-1 text-ink">{o}</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {pickers.map((pr) => (
                      <span key={pr.method} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-1 text-[11px] text-ink2">
                        <span className="h-2 w-2 rounded-sm" style={{ background: colorOf(ctx, pr.method, p.series[0]) }} />
                        {nameOf(ctx, pr.method)}
                        {right ? <Check size={11} className="text-good" /> : <X size={11} className="text-bad" />}
                      </span>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-sm">
            <div className="label">参考答案</div>
            <p className="mt-1 text-ink">{String(c.answer)}</p>
          </div>
        )}
        <div className="mt-3 space-y-2">
          {c.predictions
            .filter((pr) => pr.rationale)
            .map((pr) => (
              <div key={pr.method} className="rounded-lg bg-sunken px-3 py-2 text-sm">
                <div className="mb-0.5 flex items-center gap-1 text-xs text-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: colorOf(ctx, pr.method, p.series[0]) }} />
                  {nameOf(ctx, pr.method)} 的理由
                </div>
                <p className="text-ink2">{pr.rationale}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ 检索 ----
function RetrievalView({ c, ctx }: { c: RetrievalCase; ctx: Ctx }) {
  const [, p] = useTheme()
  const methods = Object.keys(c.candidates[0]?.scores ?? {})
  return (
    <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
      {methods.map((m) => {
        const ranked = [...c.candidates].sort((a, b) => (b.scores[m] ?? 0) - (a.scores[m] ?? 0))
        const gtRank = ranked.findIndex((x) => x.isGT) + 1
        const max = Math.max(...ranked.map((x) => x.scores[m] ?? 0), 1e-6)
        return (
          <div key={m} className="rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(ctx, m, p.series[0]) }} />
                {nameOf(ctx, m)}
              </span>
              <span className={cx('text-xs font-medium', gtRank === 1 ? 'text-good' : 'text-bad')}>正确结果排第 {gtRank} 位</span>
            </div>
            <ol className="divide-y divide-line">
              {ranked.map((x, i) => (
                <li key={x.label} className={cx('flex items-center gap-3 px-3 py-2', x.isGT && 'bg-good/5')}>
                  <span className="w-5 text-right text-xs text-muted num">{i + 1}</span>
                  {x.image ? <img src={mediaUrl(x.image)} alt="" className="h-10 w-16 shrink-0 rounded object-cover" /> : <span className="h-10 w-16 shrink-0 rounded bg-sunken" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {x.label} {x.isGT && <span className="text-xs text-good">✓ 正确</span>}
                    </span>
                    <span className="mt-1 block h-1.5 rounded-full bg-line">
                      <span className="block h-full rounded-full" style={{ width: `${((x.scores[m] ?? 0) / max) * 100}%`, background: colorOf(ctx, m, p.series[0]) }} />
                    </span>
                  </span>
                  <span className="w-10 text-right font-mono text-xs text-muted num">{(x.scores[m] ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------ 图像定位 ----
function GroundingView({ c, ctx }: { c: ImageGroundingCase; ctx: Ctx }) {
  const [, p] = useTheme()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const boxes = useMemo(
    () => [
      { id: 'gt', name: 'GT', color: p.gt, box: c.gt, iou: undefined as number | undefined },
      ...c.predictions.map((pr) => ({ id: pr.method, name: nameOf(ctx, pr.method), color: colorOf(ctx, pr.method, p.series[0]), box: pr.box, iou: boxIoU(pr.box, c.gt) })),
    ],
    [c, ctx, p],
  )
  const toggle = (id: string) => setHidden((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))))
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <img src={mediaUrl(c.image.src)} alt="" className="block w-full" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          {boxes
            .filter((b) => !hidden.has(b.id))
            .map((b) => (
              <rect key={b.id} x={b.box[0]} y={b.box[1]} width={b.box[2]} height={b.box[3]} fill={b.color} fillOpacity={0.08} stroke={b.color} strokeWidth={3} vectorEffect="non-scaling-stroke" />
            ))}
        </svg>
      </div>
      <ul className="space-y-1.5">
        {boxes.map((b) => (
          <li key={b.id}>
            <button type="button" onClick={() => toggle(b.id)} className={cx('flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm transition hover:bg-sunken', hidden.has(b.id) && 'opacity-40')}>
              <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: b.color }} />
              <span className="flex-1 text-ink">{b.name}</span>
              {b.iou !== undefined && <span className={cx('font-mono text-xs num', b.iou >= 0.5 ? 'text-good' : 'text-bad')}>IoU {b.iou.toFixed(2)} {b.iou >= 0.5 ? '✓' : '✕'}</span>}
            </button>
          </li>
        ))}
        <li className="pt-1 text-xs text-muted">点击可隐藏/显示对应框；IoU ≥ 0.5 记为正确</li>
      </ul>
    </div>
  )
}

// ------------------------------------------------------------ 图像问答 ----
function ImageQAView({ c, ctx }: { c: ImageQACase; ctx: Ctx }) {
  const [, p] = useTheme()
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
      <img src={mediaUrl(c.image.src)} alt="" className="w-full rounded-lg" />
      <div className="space-y-2">
        <div className="rounded-lg border border-good/40 bg-good/5 px-3 py-2 text-sm">
          <div className="label">参考答案</div>
          <div className="mt-0.5 text-ink">{c.answer}</div>
        </div>
        {c.predictions.map((pr) => {
          const ok = pr.correct ?? pr.answer.trim().toLowerCase() === c.answer.trim().toLowerCase()
          return (
            <div key={pr.method} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(ctx, pr.method, p.series[0]) }} />
              <span className="w-28 shrink-0 truncate text-xs text-muted">{nameOf(ctx, pr.method)}</span>
              <span className="flex-1 text-ink">{pr.answer}</span>
              {ok ? <Check size={15} className="text-good" /> : <X size={15} className="text-bad" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ 图像描述 ----
function CaptionView({ c, ctx }: { c: ImageCaptionCase; ctx: Ctx }) {
  const [, p] = useTheme()
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
      <img src={mediaUrl(c.image.src)} alt="" className="w-full rounded-lg" />
      <div className="space-y-3">
        {c.predictions.map((pr) => (
          <div key={pr.method} className="rounded-lg border border-line px-3 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(ctx, pr.method, p.series[0]) }} />
              {nameOf(ctx, pr.method)}
            </div>
            <p className="text-sm text-ink">{pr.text}</p>
            {pr.scores && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {Object.entries(pr.scores).map(([k, v]) => (
                  <span key={k} className="chip num">
                    {k} {v.toFixed(1)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div>
          <div className="label mb-1">参考描述</div>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink2">
            {c.references.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
