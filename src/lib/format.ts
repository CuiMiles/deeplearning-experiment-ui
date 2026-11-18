import { metricDef } from './data'

export function fmtMetric(v: number | undefined, key?: string) {
  if (v === undefined || v === null || Number.isNaN(v)) return '–'
  const unit = key ? metricDef(key).unit : ''
  const abs = Math.abs(v)
  const digits = abs >= 100 && unit !== '%' ? 1 : abs < 1 && unit !== '%' ? 3 : 1
  return v.toFixed(digits)
}

export function fmtDelta(d: number | undefined, key?: string) {
  if (d === undefined || Number.isNaN(d)) return '–'
  const s = fmtMetric(Math.abs(d), key)
  return (d > 0 ? '+' : d < 0 ? '−' : '±') + s
}

/** 对"越小越好"的指标，delta 方向取反后判断好坏 */
export function deltaGood(d: number, key: string) {
  return metricDef(key).higherIsBetter ? d > 0 : d < 0
}

export function fmtTime(sec: number, withMs = true) {
  if (!Number.isFinite(sec)) return '–'
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${withMs ? r.toFixed(1).padStart(4, '0') : Math.floor(r).toString().padStart(2, '0')}`
}

export function fmtTimecode(sec: number, fps: number) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  const ff = Math.floor((s - Math.floor(s)) * fps + 1e-6)
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`
}

export function tIoU(a: [number, number], b: [number, number]) {
  const inter = Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]))
  const uni = Math.max(a[1], b[1]) - Math.min(a[0], b[0])
  return uni > 0 ? inter / uni : 0
}

export function bestIoU(seg: [number, number], gts: [number, number][]) {
  return gts.reduce((m, g) => Math.max(m, tIoU(seg, g)), 0)
}

export function boxIoU(a: number[], b: number[]) {
  const [ax, ay, aw, ah] = a
  const [bx, by, bw, bh] = b
  const iw = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx))
  const ih = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by))
  const inter = iw * ih
  const uni = aw * ah + bw * bh - inter
  return uni > 0 ? inter / uni : 0
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
