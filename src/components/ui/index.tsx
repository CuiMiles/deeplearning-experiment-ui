import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Copy, Info } from 'lucide-react'
import type { ClaimDecision, ClaimVerdict, Outcome, Status, Verdict } from '../../lib/types'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <div id={id} className={cx('card', className)}>
      {children}
    </div>
  )
}

type Tone = 'neutral' | 'good' | 'bad' | 'warn' | 'accent'
const toneCls: Record<Tone, string> = {
  neutral: 'border-line bg-sunken text-ink2',
  good: 'border-good/30 bg-good/10 text-good',
  bad: 'border-bad/30 bg-bad/10 text-bad',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  accent: 'border-accent/30 bg-accent/10 text-accent',
}

export function Badge({ tone = 'neutral', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', toneCls[tone], className)}>
      {children}
    </span>
  )
}

const verdictMeta: Record<Verdict, { tone: Tone; label: string; icon: string }> = {
  positive: { tone: 'good', label: '结论：有效', icon: '▲' },
  negative: { tone: 'bad', label: '结论：无效', icon: '▼' },
  mixed: { tone: 'warn', label: '结论：有得有失', icon: '◆' },
  inconclusive: { tone: 'neutral', label: '结论：不确定', icon: '?' },
}
export function VerdictBadge({ v, short }: { v: Verdict; short?: boolean }) {
  const m = verdictMeta[v]
  return (
    <Badge tone={m.tone}>
      <span aria-hidden>{m.icon}</span>
      {short ? m.label.replace('结论：', '') : m.label}
    </Badge>
  )
}

const statusMeta: Record<Status, { tone: Tone; label: string }> = {
  completed: { tone: 'neutral', label: '已完成' },
  running: { tone: 'accent', label: '运行中' },
  failed: { tone: 'bad', label: '失败' },
  planned: { tone: 'neutral', label: '计划中' },
}
export function StatusBadge({ s }: { s: Status }) {
  const m = statusMeta[s]
  return (
    <Badge tone={m.tone}>
      {s === 'running' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
      {m.label}
    </Badge>
  )
}

const outcomeMeta: Record<Outcome, { tone: Tone; label: string; icon: string }> = {
  success: { tone: 'good', label: '成功', icon: '✓' },
  failure: { tone: 'bad', label: '失败', icon: '✕' },
  partial: { tone: 'warn', label: '部分', icon: '◐' },
}
export function OutcomeBadge({ o }: { o: Outcome }) {
  const m = outcomeMeta[o]
  return (
    <Badge tone={m.tone}>
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </Badge>
  )
}

const claimVerdictMeta: Record<ClaimVerdict, { tone: Tone; icon: string }> = {
  reproduced: { tone: 'good', icon: '✓' },
  partial: { tone: 'warn', icon: '◐' },
  'not-reproduced': { tone: 'bad', icon: '✕' },
  contradicted: { tone: 'bad', icon: '⇄' },
  pending: { tone: 'neutral', icon: '…' },
}
export function ClaimVerdictBadge({ v, label }: { v: ClaimVerdict; label: string }) {
  const m = claimVerdictMeta[v]
  return (
    <Badge tone={m.tone}>
      <span aria-hidden>{m.icon}</span>
      {label}
    </Badge>
  )
}
const decisionTone: Record<ClaimDecision, Tone> = {
  'build-on': 'good',
  unverified: 'warn',
  ignore: 'neutral',
  'contact-authors': 'accent',
  'publish-negative': 'accent',
}
export function DecisionBadge({ d, label }: { d: ClaimDecision; label: string }) {
  return <Badge tone={decisionTone[d]}>决策：{label}</Badge>
}

export function CopyButton({ text, label = '复制', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1400)
  }
  return (
    <button type="button" onClick={copy} className={cx('btn px-2 py-1 text-xs', className)} aria-label={label}>
      {done ? <Check size={13} className="text-good" /> : <Copy size={13} />}
      {done ? '已复制' : label}
    </button>
  )
}

export function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-sunken">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="truncate font-mono text-xs text-muted">{title ?? lang ?? 'shell'}</span>
        <CopyButton text={code} />
      </div>
      <pre className="thin-scroll overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function Collapsible({ title, children, defaultOpen = false, right, icon }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; right?: ReactNode; icon?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <ChevronDown size={16} className={cx('shrink-0 text-muted transition', !open && '-rotate-90')} />
          {icon}
          <span className="truncate font-medium text-ink">{title}</span>
        </button>
        {right}
      </div>
      {open && <div className="border-t border-line p-4">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, size = 'sm' }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'xs' }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'whitespace-nowrap rounded-md transition',
            size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Section({ id, title, icon, subtitle, right, children }: { id: string; title: string; icon?: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} data-section={title} className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="h-section flex items-center gap-2">
            {icon && <span className="text-accent">{icon}</span>}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {right && <div className="min-w-0 max-w-full">{right}</div>}
      </div>
      {children}
    </section>
  )
}

export function Hint({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children ?? <Info size={13} className="text-muted" />}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-max max-w-[min(260px,80vw)] -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-normal leading-snug text-page shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  )
}

export function Dots({ value, max = 5, label }: { value: number; max?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={label ? `${label} ${value}/${max}` : `${value}/${max}`} aria-label={`${label ?? ''} ${value}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cx('h-1.5 w-1.5 rounded-full', i < value ? 'bg-accent' : 'bg-line')} />
      ))}
    </span>
  )
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cx('relative block h-1.5 w-full overflow-hidden rounded-full bg-line', className)}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </span>
  )
}

export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-sm text-ink2">
      <span className="mt-0.5 text-accent" aria-hidden>
        ➜
      </span>
      <span>{children}</span>
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function Stat({ label, value, sub, hint }: { label: string; value: ReactNode; sub?: ReactNode; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-1 text-xs text-muted">
        {label}
        {hint && <Hint text={hint} />}
      </div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

/** HashRouter 下不能用 href="#id" 做页内跳转，用这个组件平滑滚动到元素 */
export function ScrollLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={`${window.location.hash.split('#').slice(0, 2).join('#')}#${to}`}
      onClick={(e) => {
        e.preventDefault()
        document.getElementById(to)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      className={className}
    >
      {children}
    </a>
  )
}
