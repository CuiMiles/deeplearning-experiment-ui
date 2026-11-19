import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BookMarked, Compass, FileSearch, FlaskConical, GitCompare, LayoutTemplate, Moon, Sun } from 'lucide-react'
import { setTheme, useTheme } from '../lib/theme'
import { cx } from './ui'

const nav = [
  { to: '/', label: '实验', icon: FlaskConical, end: true },
  { to: '/compare', label: '对比', icon: GitCompare },
  { to: '/ideas', label: '想法板', icon: Compass },
  { to: '/claims', label: '文献核查', icon: FileSearch },
  { to: '/lenses', label: '透镜库', icon: BookMarked },
  { to: '/templates', label: '任务模板', icon: LayoutTemplate },
]

export function Layout({ children }: { children: ReactNode }) {
  const [theme] = useTheme()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
              <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden>
                <path d="M6 22l6-8 5 5 8-11" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="hidden sm:inline">实验看板</span>
          </NavLink>
          <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx('flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition', isActive ? 'bg-sunken font-medium text-ink' : 'text-muted hover:text-ink')
                }
              >
                <n.icon size={15} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button type="button" className="btn shrink-0 px-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="切换明暗主题" title="切换明暗主题">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6">{children}</main>
    </div>
  )
}
