#!/usr/bin/env node
// 生成一个新实验的 JSON 骨架。
// 用法：npm run new -- --task vtg --id vtg-09-my-idea [--title "标题"] [--parent vtg-04-rlvr-thinking]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
)
const tasks = JSON.parse(readFileSync(join(root, 'data/tasks.json'), 'utf8'))
const task = tasks.tasks.find((t) => t.id === args.task)
if (!task || !args.id) {
  console.error('用法：npm run new -- --task <任务id> --id <实验id> [--title 标题] [--parent 上游实验id]')
  console.error('可用任务：' + tasks.tasks.map((t) => t.id).join(', '))
  process.exit(1)
}
if (!/^[a-z0-9][a-z0-9._-]*$/.test(args.id)) {
  console.error('id 只能包含小写字母、数字和 - _ .')
  process.exit(1)
}
const file = join(root, 'data/experiments', `${args.id}.json`)
if (existsSync(file)) {
  console.error(`已存在：data/experiments/${args.id}.json（不会覆盖）`)
  process.exit(1)
}
const ds = task.datasets[0]
const zero = Object.fromEntries(task.primaryMetrics.map((m) => [m, 0]))
const caseExample = {
  temporal: { id: 'c1', type: 'temporal', outcome: 'success', video: { src: `media/${args.id}/case1.mp4`, fps: 25, duration: 30 }, query: '查询句子', gt: [[0, 1]], predictions: [{ method: 'ours', segments: [{ start: 0, end: 1, score: 0.9 }] }] },
  'dense-caption': { id: 'c1', type: 'dense-caption', outcome: 'success', video: { src: `media/${args.id}/case1.mp4`, fps: 25 }, gt: [{ start: 0, end: 1, text: '' }], predictions: [{ method: 'ours', events: [{ start: 0, end: 1, text: '' }] }] },
  videoqa: { id: 'c1', type: 'videoqa', outcome: 'success', video: { src: `media/${args.id}/case1.mp4`, fps: 25 }, question: '', options: ['', '', '', ''], answer: 0, predictions: [{ method: 'ours', answer: 0 }] },
  retrieval: { id: 'c1', type: 'retrieval', outcome: 'success', query: '', candidates: [{ label: '', isGT: true, scores: { ours: 0.9, base: 0.5 } }] },
  'image-grounding': { id: 'c1', type: 'image-grounding', outcome: 'success', image: { src: `media/${args.id}/case1.jpg` }, expression: '', gt: [0.1, 0.1, 0.2, 0.2], predictions: [{ method: 'ours', box: [0.1, 0.1, 0.2, 0.2] }] },
  'image-qa': { id: 'c1', type: 'image-qa', outcome: 'success', image: { src: `media/${args.id}/case1.jpg` }, question: '', answer: '', predictions: [{ method: 'ours', answer: '' }] },
  'image-caption': { id: 'c1', type: 'image-caption', outcome: 'success', image: { src: `media/${args.id}/case1.jpg` }, references: [''], predictions: [{ method: 'ours', text: '' }] },
}[task.caseType]

const e = {
  $schema: '../../schema/experiment.schema.json',
  id: args.id,
  title: args.title ?? '实验标题',
  task: task.id,
  status: 'running',
  date: new Date().toISOString().slice(0, 10),
  ...(args.parent ? { parent: args.parent } : {}),
  author: 'agent:your-name',
  tags: [],
  tldr: '一句话：做了什么 + 结果如何',
  brief: { question: '想回答的问题', change: '相比基线改了什么', conclusion: '结论', verdict: 'inconclusive', pipeline: [{ label: '输入' }, { label: '改动的环节', changed: true, note: '' }, { label: '输出' }] },
  setup: { model: '', evalData: [ds] },
  results: {
    methods: [{ id: 'ours', name: '本实验', role: 'ours' }, { id: 'base', name: '基线', role: 'baseline' }],
    main: [{ method: 'ours', dataset: ds, metrics: zero }, { method: 'base', dataset: ds, metrics: zero }],
  },
  cases: [caseExample],
  reproduce: { commands: [{ label: '训练', cmd: '' }], hyperparams: {} },
}
writeFileSync(file, JSON.stringify(e, null, 2) + '\n')
mkdirSync(join(root, 'public/media', args.id), { recursive: true })
console.log(`已创建 data/experiments/${args.id}.json`)
console.log(`媒体目录 public/media/${args.id}/（视频/图片放这里，JSON 中写 media/${args.id}/xxx.mp4）`)
console.log('结果出来后按 AGENTS.md 第 4 节补写 insights（研究启发），与已发表结论冲突时按第 5 节补写 claims')
console.log('填完后运行：npm run validate -- ' + args.id)
