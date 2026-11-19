import type { ClaimCheck, ResultRow } from './types'
import { audit } from './data'

export interface AutoCheck {
  id: 'monotonic' | 'miou-bound'
  status: 'pass' | 'fail' | 'unknown'
  detail: string
}

/**
 * VTG 数值自洽检查（类似心理学中的 GRIM 检验）：
 * 1) R1@0.3 ≥ R1@0.5 ≥ R1@0.7，R5@x ≥ R1@x
 * 2) mIoU 的上下界：设 a=R1@0.3, b=R1@0.5, c=R1@0.7（比例），
 *    下界 = 0.3(a−b) + 0.5(b−c) + 0.7c
 *    上界 = 0.3(1−a) + 0.5(a−b) + 0.7(b−c) + 1.0c
 */
export function autoChecks(rows: ResultRow[]): AutoCheck[] {
  const mono: string[] = []
  const bound: string[] = []
  let monoKnown = false
  let boundKnown = false
  for (const r of rows) {
    const m = r.metrics
    const a = m['R1@0.3'], b = m['R1@0.5'], c = m['R1@0.7'], miou = m['mIoU']
    const pairs: [string, string][] = [['R1@0.3', 'R1@0.5'], ['R1@0.5', 'R1@0.7'], ['R5@0.5', 'R1@0.5'], ['R5@0.7', 'R1@0.7'], ['R5@0.5', 'R5@0.7']]
    for (const [hi, lo] of pairs) {
      if (m[hi] !== undefined && m[lo] !== undefined) {
        monoKnown = true
        if (m[hi] + 1e-9 < m[lo]) mono.push(`${r.dataset}: ${hi}=${m[hi]} < ${lo}=${m[lo]}`)
      }
    }
    if ([a, b, c, miou].every((x) => x !== undefined)) {
      boundKnown = true
      const A = a / 100, B = b / 100, C = c / 100
      const lower = (0.3 * (A - B) + 0.5 * (B - C) + 0.7 * C) * 100
      const upper = (0.3 * (1 - A) + 0.5 * (A - B) + 0.7 * (B - C) + 1.0 * C) * 100
      if (miou < lower - 0.05 || miou > upper + 0.05)
        bound.push(`${r.dataset}: mIoU=${miou} 不在 [${lower.toFixed(1)}, ${upper.toFixed(1)}] 内`)
    }
  }
  return [
    { id: 'monotonic', status: !monoKnown ? 'unknown' : mono.length ? 'fail' : 'pass', detail: mono.join('；') || (monoKnown ? '各阈值召回单调' : '缺少可比较的阈值') },
    { id: 'miou-bound', status: !boundKnown ? 'unknown' : bound.length ? 'fail' : 'pass', detail: bound.join('；') || (boundKnown ? 'mIoU 在理论区间内' : '缺少 R1@0.3/0.5/0.7 + mIoU') },
  ]
}

export interface CheckState {
  id: string
  status: 'pass' | 'fail' | 'unknown'
  note?: string
  auto?: boolean
}

/** 合并人工清单与自动检查（自动检查有结论时优先） */
export function mergedChecklist(claim: ClaimCheck): CheckState[] {
  const autos = new Map(autoChecks(claim.reported).map((a) => [a.id, a]))
  const manual = new Map(claim.checklist.map((c) => [c.id, c]))
  return audit.checks.map((def) => {
    const a = autos.get(def.id as AutoCheck['id'])
    if (a && a.status !== 'unknown') return { id: def.id, status: a.status, note: a.detail, auto: true }
    const m = manual.get(def.id)
    return m ? { ...m } : { id: def.id, status: 'unknown' as const }
  })
}

/** 可信度：已知项中通过项的加权占比；完整度：已知项权重占比 */
export function credibility(claim: ClaimCheck) {
  const states = mergedChecklist(claim)
  let pass = 0, fail = 0, total = 0
  for (const s of states) {
    const w = audit.checks.find((c) => c.id === s.id)?.weight ?? 1
    total += w
    if (s.status === 'pass') pass += w
    if (s.status === 'fail') fail += w
  }
  const known = pass + fail
  return { score: known ? pass / known : null, completeness: total ? known / total : 0, states }
}

/** 差距分解：报告值 + Σ已解释 = 预期；实测 − 预期 = 无法解释 */
export function gapSummary(claim: ClaimCheck) {
  if (!claim.gap) return null
  const { dataset, metric, steps } = claim.gap
  const rep = claim.reported.find((r) => r.dataset === dataset)?.metrics[metric]
  const ours = claim.ours.find((r) => r.dataset === dataset)?.metrics[metric]
  if (rep === undefined || ours === undefined) return null
  const explained = steps.reduce((s, x) => s + x.delta, 0)
  return { reported: rep, ours, explained, residual: ours - (rep + explained), steps }
}
