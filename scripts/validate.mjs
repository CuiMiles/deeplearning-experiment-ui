#!/usr/bin/env node
// 校验 data/experiments/*.json：JSON Schema + 交叉引用 + 数值自洽。
// 用法：npm run validate [-- 文件名或 id ...]
// 退出码：有 error 时为 1；warning 不影响退出码。
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const schema = read('schema/experiment.schema.json')
const tasks = read('data/tasks.json')
const lenses = read('data/lenses.json')
const prompts = read('data/prompts.json').prompts
const audit = read('data/audit.json')

const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

let errors = 0
let warnings = 0
const out = []
const err = (f, m) => { errors++; out.push(`  ✕ ${f}: ${m}`) }
const warn = (f, m) => { warnings++; out.push(`  ! ${f}: ${m}`) }

// ---------------------------------------------------------------- 注册表自检
const taskIds = new Set(tasks.tasks.map((t) => t.id))
const symptomIds = new Set(lenses.symptoms.map((s) => s.id))
const lensIds = new Set(lenses.lenses.map((l) => l.id))
const promptIds = new Set(prompts.map((p) => p.id))
const checkIds = new Set(audit.checks.map((c) => c.id))
for (const t of tasks.tasks) {
  for (const m of t.metrics) if (!tasks.metrics[m]) err('data/tasks.json', `任务 ${t.id} 引用了未定义的指标 ${m}`)
  for (const d of t.datasets) if (!tasks.datasets[d]) err('data/tasks.json', `任务 ${t.id} 引用了未定义的数据集 ${d}`)
}
for (const l of lenses.lenses) for (const s of l.triggers) if (!symptomIds.has(s)) err('data/lenses.json', `透镜 ${l.id} 的 trigger ${s} 不在 symptoms 中`)

// ---------------------------------------------------------------- 数值自洽（VTG）
function vtgSelfCheck(rows) {
  const issues = []
  for (const r of rows) {
    const m = r.metrics
    for (const [hi, lo] of [['R1@0.3', 'R1@0.5'], ['R1@0.5', 'R1@0.7'], ['R5@0.5', 'R1@0.5'], ['R5@0.7', 'R1@0.7']])
      if (m[hi] !== undefined && m[lo] !== undefined && m[hi] < m[lo]) issues.push(`${r.method}/${r.dataset}: ${hi} < ${lo}`)
    const [a, b, c, u] = [m['R1@0.3'], m['R1@0.5'], m['R1@0.7'], m['mIoU']]
    if ([a, b, c, u].every((x) => x !== undefined)) {
      const A = a / 100, B = b / 100, C = c / 100
      const lo = (0.3 * (A - B) + 0.5 * (B - C) + 0.7 * C) * 100
      const hi = (0.3 * (1 - A) + 0.5 * (A - B) + 0.7 * (B - C) + C) * 100
      if (u < lo - 0.05 || u > hi + 0.05) issues.push(`${r.method}/${r.dataset}: mIoU=${u} 不在 [${lo.toFixed(1)}, ${hi.toFixed(1)}]`)
    }
  }
  return issues
}

// ---------------------------------------------------------------- 逐文件
const dir = join(root, 'data/experiments')
const filter = process.argv.slice(2).map((x) => basename(x).replace(/\.json$/, ''))
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).filter((f) => !filter.length || filter.includes(f.replace(/\.json$/, '')))
const all = new Map()
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  try { all.set(f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, f), 'utf8'))) } catch { /* 下面会报 */ }
}

const mediaOk = (src) => !src || /^(https?:|data:|blob:)/.test(src) || existsSync(join(root, 'public', src.replace(/^\.?\//, '')))

for (const f of files) {
  const file = `data/experiments/${f}`
  let e
  try {
    e = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  } catch (x) {
    err(file, `JSON 解析失败：${x.message}`)
    continue
  }
  if (!validate(e)) {
    for (const x of validate.errors.slice(0, 12)) err(file, `schema ${x.instancePath || '/'} ${x.message}${x.params?.additionalProperty ? `（多余字段 ${x.params.additionalProperty}）` : ''}`)
    continue
  }
  if (e.id !== f.replace(/\.json$/, '')) err(file, `id "${e.id}" 与文件名不一致`)
  if (!taskIds.has(e.task)) err(file, `task "${e.task}" 不在 data/tasks.json 中`)
  if (e.parent && !all.has(e.parent)) warn(file, `parent "${e.parent}" 不存在`)

  const methods = new Set(e.results.methods.map((m) => m.id))
  if (!e.results.methods.some((m) => m.role === 'ours')) warn(file, '没有 role=ours 的方法，关键指标卡将无法显示')
  const datasets = new Set([...e.setup.evalData, ...e.results.main.map((r) => r.dataset)])
  for (const d of datasets) if (!tasks.datasets[d]) warn(file, `数据集 "${d}" 未在 data/tasks.json 注册（将直接显示 id）`)
  for (const r of e.results.main) {
    if (!methods.has(r.method)) err(file, `results.main 引用了不存在的方法 "${r.method}"`)
    for (const k of Object.keys(r.metrics)) if (!tasks.metrics[k]) warn(file, `指标 "${k}" 未在 data/tasks.json 注册`)
  }
  for (const h of e.results.headline ?? [])
    if (!e.results.main.some((r) => r.dataset === h.dataset && r.metrics[h.metric] !== undefined)) err(file, `headline ${h.dataset}/${h.metric} 在 results.main 中找不到`)
  for (const s of vtgSelfCheck(e.results.main)) err(file, `数值不自洽：${s}`)
  for (const b of e.breakdowns ?? []) for (const m of b.methods) if (!methods.has(m)) err(file, `breakdown ${b.id} 引用了不存在的方法 "${m}"`)

  for (const c of e.cases ?? []) {
    const v = c.video
    if (v && !mediaOk(v.src)) warn(file, `case ${c.id} 的视频 ${v.src} 不存在（页面会显示占位，时间轴仍可用）`)
    if (c.image && !mediaOk(c.image.src)) warn(file, `case ${c.id} 的图片 ${c.image.src} 不存在`)
    for (const p of c.predictions ?? []) if (p.method && !methods.has(p.method)) warn(file, `case ${c.id} 引用了不存在的方法 "${p.method}"`)
    const segs = [...(c.gt && Array.isArray(c.gt[0]) ? c.gt : []), ...(c.predictions ?? []).flatMap((p) => (p.segments ?? []).map((s) => [s.start, s.end]))]
    for (const [s, t] of segs) {
      if (s > t) err(file, `case ${c.id} 片段 [${s}, ${t}] 起点大于终点`)
      if (v?.duration && t > v.duration + 0.01) warn(file, `case ${c.id} 片段 [${s}, ${t}] 超出视频时长 ${v.duration}`)
    }
  }

  const ins = e.insights
  if (ins) {
    const ph = new Set(ins.phenomena.map((x) => x.id))
    const ec = new Set(ins.echoes.map((x) => x.id))
    const hy = new Set(ins.hypotheses.map((x) => x.id))
    for (const p of ins.phenomena) for (const s of p.symptoms ?? []) if (!symptomIds.has(s)) err(file, `现象 ${p.id} 的 symptom "${s}" 不在 data/lenses.json`)
    for (const x of ins.echoes) {
      if (!ph.has(x.phenomenon)) err(file, `echo ${x.id} 引用了不存在的现象 "${x.phenomenon}"`)
      if (x.lens && !lensIds.has(x.lens)) err(file, `echo ${x.id} 的 lens "${x.lens}" 不在透镜库；新先例请用 precedent 字段，或先加入 data/lenses.json`)
    }
    for (const h of ins.hypotheses) for (const s of h.from ?? []) if (!ec.has(s) && !ph.has(s)) err(file, `假设 ${h.id} 的 from "${s}" 不是 echo 或现象 id`)
    for (const a of ins.paperAngles) for (const s of a.from ?? []) if (!hy.has(s)) err(file, `论文方向 ${a.id} 的 from "${s}" 不是假设 id`)
    for (const p of ins.provocations ?? []) if (!promptIds.has(p.prompt)) err(file, `provocation 的 prompt "${p.prompt}" 不在 data/prompts.json`)
    if (!ins.echoes.length) warn(file, 'insights 没有任何历史回声：请按 AGENTS.md 的调研流程补充')
    if (!ins.hypotheses.length) warn(file, 'insights 没有可检验的假设')
  }

  for (const k of e.claims ?? []) {
    for (const c of k.checklist) if (!checkIds.has(c.id)) err(file, `claim ${k.id} 的核查项 "${c.id}" 不在 data/audit.json`)
    const bad = vtgSelfCheck(k.reported)
    if (bad.length) out.push(`  i ${file}: claim ${k.id} 的报告值未通过自动自洽检查（这是核查发现，不算错误）：${bad.join('；')}`)
  }
}

console.log(out.join('\n') || '  （无问题）')
console.log(`\n校验 ${files.length} 个实验：${errors} 个错误，${warnings} 个警告`)
process.exit(errors ? 1 : 0)
