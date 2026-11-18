import { useEffect, useState } from 'react'

// 参考配色（dataviz 技能的已验证默认调色板）。类目色按固定顺序分配，不循环、不按排名重排。
export const palette = {
  light: {
    series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    surface: '#fcfcfb',
    ink: '#0b0b0b',
    ink2: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    gt: '#52514e',
    good: '#0ca30c',
    goodText: '#006300',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
    neutral: '#c3c2b7',
    seq: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
  },
  dark: {
    series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
    surface: '#1a1a19',
    ink: '#f0efec',
    ink2: '#c3c2b7',
    muted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
    gt: '#c3c2b7',
    good: '#0ca30c',
    goodText: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
    neutral: '#5b5a55',
    seq: ['#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'],
  },
}

export type ThemeName = keyof typeof palette
export type Palette = (typeof palette)['light']

function current(): ThemeName {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(t: ThemeName) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  try {
    localStorage.setItem('theme', t)
  } catch {
    /* 隐私模式下忽略 */
  }
}

export function useTheme(): [ThemeName, Palette] {
  const [t, setT] = useState<ThemeName>(current)
  useEffect(() => {
    const obs = new MutationObserver(() => setT(current()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return [t, palette[t]]
}

/** 方法 → 颜色：ours 固定第 1 色，其余按 methods 数组顺序 */
export function methodColorMap(methods: { id: string; role: string }[], p: Palette) {
  const ordered = [...methods.filter((m) => m.role === 'ours'), ...methods.filter((m) => m.role !== 'ours')]
  const map: Record<string, string> = {}
  ordered.forEach((m, i) => (map[m.id] = p.series[i % p.series.length]))
  return map
}
