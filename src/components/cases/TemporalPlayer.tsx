import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import {
  Camera, ChevronFirst, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Keyboard, Maximize2, Pause, Play, Repeat, VideoOff,
} from 'lucide-react'
import type { VideoMedia } from '../../lib/types'
import { mediaUrl } from '../../lib/data'
import { bestIoU, clamp, fmtTime, fmtTimecode } from '../../lib/format'
import { useTheme } from '../../lib/theme'
import { cx, Hint, Segmented, useElementWidth } from '../ui'

export interface TLSegment {
  start: number
  end: number
  score?: number
  text?: string
}
export interface TLTrack {
  id: string
  label: string
  color: string
  kind: 'gt' | 'pred' | 'evidence' | 'event'
  segments: TLSegment[]
}
export interface TLCurve {
  id: string
  label: string
  color: string
  interval: number
  values: number[]
}

interface Props {
  caseId: string
  video: VideoMedia
  tracks: TLTrack[]
  curves?: TLCurve[]
  sampledFrames?: number[]
  /** 用于计算预测 IoU 的 GT */
  gt?: [number, number][]
  onTime?: (t: number) => void
  seekRef?: MutableRefObject<((t: number) => void) | null>
  subtitle?: (t: number) => string | undefined
  footer?: ReactNode
}

// ------------------------------------------------------------ 缩略图提取 ----
class ThumbExtractor {
  private v: HTMLVideoElement
  private ready: Promise<boolean>
  private cache = new Map<string, string>()
  private queue: { t: number; resolve: (s: string | null) => void }[] = []
  private busy = false
  private canvas = document.createElement('canvas')

  constructor(src: string) {
    this.v = document.createElement('video')
    this.v.muted = true
    this.v.preload = 'auto'
    this.v.playsInline = true
    this.v.src = src
    this.ready = new Promise((res) => {
      this.v.addEventListener('loadeddata', () => res(true), { once: true })
      this.v.addEventListener('error', () => res(false), { once: true })
    })
  }

  key(t: number) {
    return t.toFixed(3)
  }

  peek(t: number) {
    return this.cache.get(this.key(t))
  }

  get(t: number, priority = false): Promise<string | null> {
    const hit = this.cache.get(this.key(t))
    if (hit) return Promise.resolve(hit)
    return new Promise((resolve) => {
      const job = { t, resolve }
      if (priority) this.queue.unshift(job)
      else this.queue.push(job)
      this.pump()
    })
  }

  clear() {
    this.queue.forEach((j) => j.resolve(null))
    this.queue = []
  }

  private async pump() {
    if (this.busy) return
    this.busy = true
    const ok = await this.ready
    while (this.queue.length) {
      const job = this.queue.shift()!
      if (!ok) {
        job.resolve(null)
        continue
      }
      const k = this.key(job.t)
      if (this.cache.has(k)) {
        job.resolve(this.cache.get(k)!)
        continue
      }
      const url = await this.capture(job.t)
      if (url) this.cache.set(k, url)
      job.resolve(url)
    }
    this.busy = false
  }

  private capture(t: number): Promise<string | null> {
    const v = this.v
    return new Promise((resolve) => {
      const draw = () => {
        const w = 192
        const h = Math.round((w * (v.videoHeight || 9)) / (v.videoWidth || 16))
        this.canvas.width = w
        this.canvas.height = h
        const ctx = this.canvas.getContext('2d')
        if (!ctx) return resolve(null)
        try {
          ctx.drawImage(v, 0, 0, w, h)
          resolve(this.canvas.toDataURL('image/jpeg', 0.75))
        } catch {
          resolve(null) // 跨域视频无法截帧
        }
      }
      const target = clamp(t, 0, Math.max(0, (v.duration || t) - 0.001))
      if (Math.abs(v.currentTime - target) < 1e-4 && v.readyState >= 2) return draw()
      const timer = setTimeout(() => resolve(null), 4000)
      v.addEventListener(
        'seeked',
        () => {
          clearTimeout(timer)
          draw()
        },
        { once: true },
      )
      v.currentTime = target
    })
  }

  dispose() {
    this.clear()
    this.v.removeAttribute('src')
    this.v.load()
  }
}

function useThumb(ex: ThumbExtractor | null, t: number | null, priority = false) {
  const [url, setUrl] = useState<string | null>(() => (ex && t !== null ? ex.peek(t) ?? null : null))
  useEffect(() => {
    if (!ex || t === null) return setUrl(null)
    let alive = true
    const hit = ex.peek(t)
    if (hit) setUrl(hit)
    else {
      setUrl(null)
      ex.get(t, priority).then((u) => alive && setUrl(u))
    }
    return () => {
      alive = false
    }
  }, [ex, t, priority])
  return url
}

// ------------------------------------------------------------------ 主组件 ----
export function TemporalPlayer({ caseId, video, tracks, curves = [], sampledFrames, gt = [], onTime, seekRef, subtitle, footer }: Props) {
  const [, p] = useTheme()
  const src = mediaUrl(video.src)
  const fps = video.fps ?? 25
  const vref = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(video.duration ?? 0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [err, setErr] = useState(!src)
  const [loop, setLoop] = useState<{ start: number; end: number; label: string } | null>(null)
  const [showKeys, setShowKeys] = useState(false)
  const simulated = err
  const tRef = useRef(0)
  tRef.current = t

  const [extractor, setExtractor] = useState<ThumbExtractor | null>(null)
  useEffect(() => {
    if (!src || err) return
    const ex = new ThumbExtractor(src)
    setExtractor(ex)
    return () => ex.dispose()
  }, [src, err])

  useEffect(() => {
    setErr(!src)
    setT(0)
    setLoop(null)
    setPlaying(false)
    setDur(video.duration ?? 0)
  }, [src, video.duration, caseId])

  useEffect(() => onTime?.(t), [t, onTime])

  const seek = useCallback(
    (time: number) => {
      const d = dur || video.duration || 0
      const nt = clamp(time, 0, d > 0 ? d - 0.001 : time)
      if (!simulated && vref.current) vref.current.currentTime = nt
      setT(nt)
    },
    [dur, video.duration, simulated],
  )

  useEffect(() => {
    if (seekRef) seekRef.current = seek
  }, [seek, seekRef])

  // 播放循环：真实视频读 currentTime；无视频时模拟推进
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      let nt: number
      if (!simulated && vref.current) nt = vref.current.currentTime
      else {
        nt = tRef.current + ((now - last) / 1000) * rate
        if (nt >= dur) {
          nt = dur
          setPlaying(false)
        }
      }
      last = now
      if (loop && nt >= loop.end) {
        nt = loop.start
        if (!simulated && vref.current) vref.current.currentTime = nt
      }
      setT(nt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, simulated, rate, dur, loop])

  useEffect(() => {
    if (vref.current) vref.current.playbackRate = rate
  }, [rate])

  const toggle = useCallback(() => {
    if (simulated) {
      if (t >= dur - 0.01) seek(loop?.start ?? 0)
      setPlaying((x) => !x)
      return
    }
    const v = vref.current
    if (!v) return
    if (v.paused) {
      if (loop && (v.currentTime < loop.start || v.currentTime >= loop.end)) v.currentTime = loop.start
      v.play().catch(() => setErr(true))
    } else v.pause()
  }, [simulated, t, dur, seek, loop])

  const pause = () => {
    if (simulated) setPlaying(false)
    else vref.current?.pause()
  }

  const stepFrames = (n: number) => {
    pause()
    const k = Math.round(tRef.current * fps) + n
    seek((k + 0.01) / fps)
  }
  const stepSec = (s: number) => seek(tRef.current + s)

  const firstGT = tracks.find((x) => x.kind === 'gt' || x.kind === 'evidence')?.segments[0]

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'SELECT') return
    if (e.key === ' ') {
      e.preventDefault()
      toggle()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      e.shiftKey ? stepSec(-1) : stepFrames(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      e.shiftKey ? stepSec(1) : stepFrames(1)
    } else if (e.key.toLowerCase() === 'g' && firstGT) {
      seek(firstGT.start)
    } else if (e.key.toLowerCase() === 'l') {
      if (loop) setLoop(null)
      else if (firstGT) setLoop({ start: firstGT.start, end: firstGT.end, label: 'GT' })
    }
  }

  const capture = () => {
    const v = vref.current
    if (!v || simulated) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (!ctx) return
    try {
      ctx.drawImage(v, 0, 0)
      const a = document.createElement('a')
      a.download = `${caseId}_${t.toFixed(2)}s_f${Math.floor(t * fps)}.png`
      a.href = c.toDataURL('image/png')
      a.click()
    } catch {
      /* 跨域视频无法截帧 */
    }
  }

  const fullscreen = () => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  const inside = (segs: TLSegment[]) => segs.some((s) => t >= s.start && t <= s.end)
  const indicators = tracks.filter((x) => x.kind !== 'event' && inside(x.segments.slice(0, x.kind === 'pred' ? 1 : undefined)))
  const sub = subtitle?.(t)

  return (
    <div ref={wrapRef} tabIndex={0} onKeyDown={onKey} className="group/player rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [&:fullscreen]:bg-page [&:fullscreen]:p-4">
      {/* 视频区 */}
      <div className="relative mx-auto overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9', width: 'min(100%, calc(60vh * 16 / 9))' }}>
        {!err && src ? (
          <video
            ref={vref}
            src={src}
            poster={mediaUrl(video.poster)}
            preload="auto"
            playsInline
            className="h-full w-full object-contain"
            onClick={toggle}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (Number.isFinite(d) && d > 0) setDur(d)
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onSeeked={(e) => !playing && setT(e.currentTarget.currentTime)}
            onError={() => setErr(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-sm text-white/70">
            <VideoOff size={28} />
            <div>视频不可用{video.src ? `（${video.src}）` : ''}</div>
            <div className="text-xs text-white/50">时间轴仍可交互；把视频放到 public/ 下并填写 video.src 即可播放</div>
          </div>
        )}
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white num">
          {fmtTimecode(t, fps)} · 帧 {Math.floor(t * fps + 1e-6)}
        </div>
        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1">
          {indicators.map((x) => (
            <span key={x.id} className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
              <span className="h-2 w-2 rounded-sm" style={{ background: x.color }} />
              {x.kind === 'pred' ? `${x.label} 预测内` : `${x.label} 内`}
            </span>
          ))}
        </div>
        {sub && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-6">
            <span className="rounded bg-black/70 px-2 py-1 text-center text-sm text-white">{sub}</span>
          </div>
        )}
        {loop && (
          <div className="pointer-events-none absolute left-2 top-8 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
            <Repeat size={11} /> 循环 {loop.label} {fmtTime(loop.start)}–{fmtTime(loop.end)}
          </div>
        )}
      </div>

      {/* 控制条 */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {firstGT && (
          <button className="btn px-2" onClick={() => seek(firstGT.start)} title="跳到 GT 起点 (G)">
            <ChevronFirst size={15} /> <span className="hidden sm:inline">GT</span>
          </button>
        )}
        <button className="btn px-2" onClick={() => stepSec(-1)} title="后退 1 秒 (Shift+←)">
          <ChevronsLeft size={15} />
        </button>
        <button className="btn px-2" onClick={() => stepFrames(-1)} title="上一帧 (←)">
          <ChevronLeft size={15} />
        </button>
        <button className="btn-primary px-3" onClick={toggle} title="播放 / 暂停 (空格)">
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button className="btn px-2" onClick={() => stepFrames(1)} title="下一帧 (→)">
          <ChevronRight size={15} />
        </button>
        <button className="btn px-2" onClick={() => stepSec(1)} title="前进 1 秒 (Shift+→)">
          <ChevronsRight size={15} />
        </button>
        <span className="mx-1 font-mono text-xs text-muted num">
          {fmtTime(t)} / {fmtTime(dur)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <select className="input px-1.5 py-1 text-xs" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="播放速度">
            {[0.25, 0.5, 1, 1.5, 2].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
          <button className={cx('btn px-2', loop && 'border-accent text-accent')} onClick={() => (loop ? setLoop(null) : firstGT && setLoop({ start: firstGT.start, end: firstGT.end, label: 'GT' }))} title="循环播放选中片段 (L)；点击时间轴上的片段可切换">
            <Repeat size={15} />
          </button>
          <button className="btn px-2" onClick={capture} disabled={simulated} title="下载当前帧 PNG">
            <Camera size={15} />
          </button>
          <button className="btn px-2" onClick={fullscreen} title="全屏">
            <Maximize2 size={15} />
          </button>
          <button className={cx('btn px-2', showKeys && 'text-accent')} onClick={() => setShowKeys(!showKeys)} title="快捷键">
            <Keyboard size={15} />
          </button>
        </div>
      </div>
      {showKeys && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span><kbd className="chip">空格</kbd> 播放/暂停</span>
          <span><kbd className="chip">← →</kbd> 逐帧</span>
          <span><kbd className="chip">Shift + ← →</kbd> ±1 秒</span>
          <span><kbd className="chip">G</kbd> 跳到 GT</span>
          <span><kbd className="chip">L</kbd> 循环 GT</span>
          <span>点击播放器后生效 · 点击时间轴片段可循环该片段</span>
        </div>
      )}

      <Timeline
        dur={dur || video.duration || 1}
        t={t}
        tracks={tracks}
        curves={curves}
        sampledFrames={sampledFrames}
        gt={gt}
        loop={loop}
        onSeek={(x) => {
          seek(x)
        }}
        onSelect={(seg, label) => {
          if (loop && loop.start === seg.start && loop.end === seg.end) setLoop(null)
          else setLoop({ start: seg.start, end: seg.end, label })
          seek(seg.start)
        }}
        extractor={extractor}
        gridColor={p.grid}
        inkColor={p.ink}
        mutedColor={p.muted}
      />

      <FrameStrip
        extractor={extractor}
        dur={dur || video.duration || 1}
        fps={fps}
        t={t}
        sampledFrames={sampledFrames}
        focus={loop ?? (firstGT ? { start: firstGT.start, end: firstGT.end, label: 'GT' } : null)}
        tracks={tracks}
        onSeek={(x) => {
          pause()
          seek(x)
        }}
        unavailable={err}
      />
      {footer}
    </div>
  )
}

// ------------------------------------------------------------------ 时间轴 ----
function Timeline({
  dur, t, tracks, curves, sampledFrames, gt, loop, onSeek, onSelect, extractor, gridColor, inkColor, mutedColor,
}: {
  dur: number
  t: number
  tracks: TLTrack[]
  curves: TLCurve[]
  sampledFrames?: number[]
  gt: [number, number][]
  loop: { start: number; end: number } | null
  onSeek: (t: number) => void
  onSelect: (s: TLSegment, label: string) => void
  extractor: ThumbExtractor | null
  gridColor: string
  inkColor: string
  mutedColor: string
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const labelW = width < 480 ? 64 : 128
  const W = Math.max(10, width - labelW)
  const x = (s: number) => (s / dur) * W
  const [hover, setHover] = useState<number | null>(null)
  const [hoverSeg, setHoverSeg] = useState<{ track: TLTrack; seg: TLSegment; i: number } | null>(null)
  const dragging = useRef(false)

  const RULER = 20
  const ROW = 22
  const CURVE = 40
  const SAMP = sampledFrames?.length ? 24 : 0
  const rows: { y: number; h: number; label: string; sub?: string; kind: 'track' | 'curve' | 'samp'; idx: number }[] = []
  let y = RULER + 4
  tracks.forEach((tr, i) => {
    const iou = tr.kind === 'pred' && gt.length && tr.segments[0] ? bestIoU([tr.segments[0].start, tr.segments[0].end], gt) : undefined
    rows.push({ y, h: ROW, label: tr.label, sub: iou !== undefined ? `IoU ${iou.toFixed(2)}` : undefined, kind: 'track', idx: i })
    y += ROW + 6
  })
  curves.forEach((c, i) => {
    rows.push({ y, h: CURVE, label: c.label, kind: 'curve', idx: i })
    y += CURVE + 6
  })
  if (SAMP) {
    rows.push({ y, h: SAMP, label: '模型输入帧', sub: `${sampledFrames!.length} 帧`, kind: 'samp', idx: 0 })
    y += SAMP + 4
  }
  const H = y

  const ticks = useMemo(() => {
    const target = Math.max(2, Math.floor(W / 70))
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
    const step = steps.find((s) => dur / s <= target) ?? 600
    const out: number[] = []
    for (let s = 0; s <= dur + 1e-6; s += step) out.push(s)
    return out
  }, [W, dur])

  const toT = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    return clamp(((clientX - rect.left - labelW) / W) * dur, 0, dur)
  }

  const hoverThumbT = hover !== null ? Math.round(hover * 2) / 2 : null
  const thumb = useThumb(extractor, hoverThumbT, true)

  return (
    <div ref={ref} className="relative mt-3 select-none" style={{ height: H }}>
      {/* 行标签 */}
      {rows.map((r) => (
        <div key={`${r.kind}-${r.idx}`} className="absolute left-0 flex flex-col justify-center overflow-hidden pr-2 text-right" style={{ top: r.y, height: r.h, width: labelW }}>
          <span className="truncate text-[11px] leading-tight text-ink2">{r.label}</span>
          {r.sub && <span className="truncate text-[10px] leading-tight text-muted num">{r.sub}</span>}
        </div>
      ))}
      <svg
        width={W}
        height={H}
        className="absolute top-0 touch-none"
        style={{ left: labelW, cursor: 'pointer' }}
        onPointerDown={(e) => {
          dragging.current = true
          ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
          onSeek(toT(e.clientX))
        }}
        onPointerMove={(e) => {
          const tt = toT(e.clientX)
          setHover(tt)
          if (dragging.current) onSeek(tt)
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => {
          setHover(null)
          setHoverSeg(null)
        }}
      >
        {/* 刻度 */}
        {ticks.map((s) => (
          <g key={s}>
            <line x1={x(s)} x2={x(s)} y1={RULER - 4} y2={H} stroke={gridColor} strokeWidth={1} />
            <text x={Math.min(x(s) + 2, W - 24)} y={11} fontSize={10} fill={mutedColor} className="num">
              {fmtTime(s, false)}
            </text>
          </g>
        ))}
        {rows.map((r) => {
          if (r.kind === 'track') {
            const tr = tracks[r.idx]
            return (
              <g key={`t${r.idx}`}>
                <rect x={0} y={r.y} width={W} height={r.h} rx={4} fill={gridColor} opacity={0.35} />
                {tr.segments.map((s, i) => {
                  const sel = loop && loop.start === s.start && loop.end === s.end
                  const top1 = tr.kind !== 'pred' || i === 0
                  const op = tr.kind === 'pred' ? (top1 ? 0.95 : 0.25 + 0.45 * (s.score ?? 0.5)) : tr.kind === 'evidence' ? 0.55 : 0.9
                  const h = tr.kind === 'pred' && !top1 ? r.h - 10 : r.h - 4
                  return (
                    <rect
                      key={i}
                      x={x(s.start)}
                      y={r.y + (r.h - h) / 2}
                      width={Math.max(2, x(s.end) - x(s.start))}
                      height={h}
                      rx={4}
                      fill={tr.color}
                      opacity={op}
                      stroke={sel ? inkColor : 'none'}
                      strokeWidth={sel ? 2 : 0}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        onSelect(s, `${tr.label}${tr.kind === 'pred' ? ` #${i + 1}` : ''}`)
                      }}
                      onPointerEnter={() => setHoverSeg({ track: tr, seg: s, i })}
                      onPointerLeave={() => setHoverSeg(null)}
                    />
                  )
                })}
              </g>
            )
          }
          if (r.kind === 'curve') {
            const c = curves[r.idx]
            const max = Math.max(1e-6, ...c.values)
            const pts = c.values.map((v, i) => [x((i + 0.5) * c.interval), r.y + r.h - (v / max) * (r.h - 2)] as const)
            const line = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('')
            const area = pts.length ? `${line}L${pts[pts.length - 1][0].toFixed(1)},${r.y + r.h}L${pts[0][0].toFixed(1)},${r.y + r.h}Z` : ''
            return (
              <g key={`c${r.idx}`}>
                <rect x={0} y={r.y} width={W} height={r.h} rx={4} fill={gridColor} opacity={0.2} />
                <path d={area} fill={c.color} opacity={0.18} />
                <path d={line} fill="none" stroke={c.color} strokeWidth={2} strokeLinejoin="round" />
              </g>
            )
          }
          return (
            <g key="samp">
              {sampledFrames!.map((s, i) => (
                <line key={i} x1={x(s)} x2={x(s)} y1={r.y + 2} y2={r.y + r.h - 2} stroke={mutedColor} strokeWidth={1.5} />
              ))}
            </g>
          )
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={RULER - 4} y2={H} stroke={mutedColor} strokeWidth={1} />}
        <line x1={x(t)} x2={x(t)} y1={RULER - 6} y2={H} stroke={inkColor} strokeWidth={2} />
        <circle cx={x(t)} cy={RULER - 6} r={4} fill={inkColor} />
      </svg>

      {/* 悬停预览 */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface p-1 shadow-lg"
          style={{ left: clamp(labelW + x(hover), 70, Math.max(70, width - 70)), top: -4 }}
        >
          {thumb && <img src={thumb} alt="" className="mb-1 h-[68px] w-[120px] rounded object-cover" />}
          <div className="px-1 text-center text-[11px] text-ink num">{fmtTime(hover)}</div>
          {hoverSeg && (
            <div className="max-w-[200px] px-1 text-[11px] leading-snug text-ink2">
              <b>
                {hoverSeg.track.label}
                {hoverSeg.track.kind === 'pred' ? ` #${hoverSeg.i + 1}` : ''}
              </b>{' '}
              {fmtTime(hoverSeg.seg.start)}–{fmtTime(hoverSeg.seg.end)}
              {hoverSeg.seg.score !== undefined && ` · 置信 ${hoverSeg.seg.score.toFixed(2)}`}
              {hoverSeg.track.kind === 'pred' && gt.length > 0 && ` · IoU ${bestIoU([hoverSeg.seg.start, hoverSeg.seg.end], gt).toFixed(2)}`}
              {hoverSeg.seg.text && <div className="mt-0.5">{hoverSeg.seg.text}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ 帧条 ----
type StripMode = 'uniform' | 'sampled' | 'boundary'

function FrameStrip({
  extractor, dur, fps, t, sampledFrames, focus, tracks, onSeek, unavailable,
}: {
  extractor: ThumbExtractor | null
  dur: number
  fps: number
  t: number
  sampledFrames?: number[]
  focus: { start: number; end: number; label: string } | null
  tracks: TLTrack[]
  onSeek: (t: number) => void
  unavailable: boolean
}) {
  const [mode, setMode] = useState<StripMode>('uniform')
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const n = Math.max(4, Math.min(16, Math.floor(width / 104)))

  const groups = useMemo((): { label: string; times: number[]; center?: number }[] => {
    if (mode === 'uniform') return [{ label: `均匀 ${n} 帧`, times: Array.from({ length: n }, (_, i) => ((i + 0.5) * dur) / n) }]
    if (mode === 'sampled') return [{ label: `模型输入的 ${sampledFrames?.length ?? 0} 帧`, times: sampledFrames ?? [] }]
    if (!focus) return []
    const around = (s: number) => {
      const k0 = Math.round(s * fps)
      return Array.from({ length: 9 }, (_, i) => clamp((k0 + i - 4 + 0.01) / fps, 0, dur))
    }
    return [
      { label: `${focus.label} 起点 ±4 帧`, times: around(focus.start), center: focus.start },
      { label: `${focus.label} 终点 ±4 帧`, times: around(focus.end), center: focus.end },
    ]
  }, [mode, n, dur, fps, sampledFrames, focus])

  useEffect(() => () => extractor?.clear(), [extractor, mode])

  const gtTrack = tracks.find((x) => x.kind === 'gt' || x.kind === 'evidence')
  const predTrack = tracks.find((x) => x.kind === 'pred')

  const opts: { value: StripMode; label: string }[] = [
    { value: 'uniform', label: '均匀抽帧' },
    ...(sampledFrames?.length ? [{ value: 'sampled' as const, label: '模型输入帧' }] : []),
    { value: 'boundary', label: '边界逐帧' },
  ]

  return (
    <div ref={ref} className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Segmented size="xs" options={opts} value={mode} onChange={setMode} />
        <Hint text="帧下方色条：灰=在 GT 内，彩色=在 Top-1 预测内。'边界逐帧'用于检查起止边界是否标准，点击任意帧跳转。" />
      </div>
      {unavailable ? (
        <div className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-muted">视频不可用，无法抽帧</div>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="mb-1 text-[11px] text-muted">{g.label}</div>
            <div className="thin-scroll flex gap-1.5 overflow-x-auto pb-1">
              {g.times.map((tt, i) => (
                <Thumb
                  key={`${g.label}-${i}-${tt.toFixed(3)}`}
                  extractor={extractor}
                  time={tt}
                  fps={fps}
                  active={Math.abs(tt - t) < 0.5 / fps}
                  center={g.center !== undefined && i === 4}
                  inGT={!!gtTrack?.segments.some((s) => tt >= s.start && tt <= s.end)}
                  inPred={!!predTrack?.segments[0] && tt >= predTrack.segments[0].start && tt <= predTrack.segments[0].end}
                  predColor={predTrack?.color}
                  gtColor={gtTrack?.color}
                  onClick={() => onSeek(tt)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function Thumb({ extractor, time, fps, active, center, inGT, inPred, predColor, gtColor, onClick }: {
  extractor: ThumbExtractor | null
  time: number
  fps: number
  active: boolean
  center?: boolean
  inGT: boolean
  inPred: boolean
  predColor?: string
  gtColor?: string
  onClick: () => void
}) {
  const url = useThumb(extractor, time)
  return (
    <button type="button" onClick={onClick} className={cx('w-[96px] shrink-0 overflow-hidden rounded-md border text-left transition', active ? 'border-accent ring-2 ring-accent/40' : center ? 'border-ink2' : 'border-line hover:border-ink2')}>
      <div className="aspect-video w-full bg-sunken">{url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-line/50" />}</div>
      <div className="flex h-1">
        <span className="flex-1" style={{ background: inGT ? gtColor : 'transparent' }} />
        <span className="flex-1" style={{ background: inPred ? predColor : 'transparent' }} />
      </div>
      <div className="flex justify-between px-1 py-0.5 text-[10px] text-muted num">
        <span>{time.toFixed(2)}s</span>
        <span>#{Math.floor(time * fps + 1e-6)}</span>
      </div>
    </button>
  )
}
