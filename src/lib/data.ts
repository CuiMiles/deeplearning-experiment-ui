import type { AuditLibrary, Experiment, Lens, LensLibrary, PromptCard, Registry, TaskDef } from './types'
import registryJson from '../../data/tasks.json'
import lensJson from '../../data/lenses.json'
import promptsJson from '../../data/prompts.json'
import auditJson from '../../data/audit.json'

// 智能体写入 data/experiments/*.json 后，这里会自动收录（开发模式下热更新）
const modules = import.meta.glob('../../data/experiments/*.json', { eager: true, import: 'default' })

export const experiments: (Experiment & { _file: string })[] = Object.entries(modules)
  .map(([path, mod]) => ({ ...(mod as Experiment), _file: path.replace('../../', '') }))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))

export const registry = registryJson as unknown as Registry
export const lensLib = lensJson as unknown as LensLibrary
export const prompts = (promptsJson as unknown as { prompts: PromptCard[] }).prompts
export const audit = auditJson as unknown as AuditLibrary

const taskMap = new Map(registry.tasks.map((t) => [t.id, t]))
const lensMap = new Map(lensLib.lenses.map((l) => [l.id, l]))
const symptomMap = new Map(lensLib.symptoms.map((s) => [s.id, s]))
const promptMap = new Map(prompts.map((p) => [p.id, p]))
const expMap = new Map(experiments.map((e) => [e.id, e]))

export const getTask = (id: string): TaskDef | undefined => taskMap.get(id)
export const getLens = (id?: string): Lens | undefined => (id ? lensMap.get(id) : undefined)
export const getSymptom = (id: string) => symptomMap.get(id)
export const getPrompt = (id: string) => promptMap.get(id)
export const getExperiment = (id?: string) => (id ? expMap.get(id) : undefined)

export function metricDef(key: string) {
  return registry.metrics[key] ?? { name: key, desc: '', unit: '', higherIsBetter: true }
}

export function datasetDef(id: string) {
  return registry.datasets[id] ?? { name: id, desc: '' }
}

/** 相对路径的媒体文件放在 public/ 下，例如 "media/samples/kitchen.mp4" */
export function mediaUrl(src?: string) {
  if (!src) return undefined
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src
  return import.meta.env.BASE_URL + src.replace(/^\.?\//, '')
}

/** 哪些实验引用了某个透镜 */
export function experimentsUsingLens(lensId: string) {
  return experiments.filter((e) => e.insights?.echoes.some((x) => x.lens === lensId))
}
