import { Activity, AudioLines, Captions, CircleHelp, Crosshair, FlaskConical, Image, MessageSquareText, ScanSearch, Search, Sparkles, type LucideIcon } from 'lucide-react'

// tasks.json 中 icon 字段可用的图标；新增任务时从这里挑一个，或在此补充
const icons: Record<string, LucideIcon> = { Activity, AudioLines, Captions, CircleHelp, Crosshair, Image, MessageSquareText, ScanSearch, Search, Sparkles }

export function TaskIcon({ name, size = 16, className }: { name?: string; size?: number; className?: string }) {
  const I = (name && icons[name]) || FlaskConical
  return <I size={size} className={className} />
}
