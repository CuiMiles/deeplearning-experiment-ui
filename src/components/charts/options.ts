import type { Palette } from '../../lib/theme'

const FONT = 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

export function baseOption(p: Palette, opts: { legend?: boolean; top?: number } = {}) {
  return {
    color: p.series,
    textStyle: { fontFamily: FONT, color: p.ink2 },
    animationDuration: 350,
    grid: { left: 4, right: 24, top: opts.top ?? (opts.legend === false ? 24 : 56), bottom: 4, containLabel: true },
    legend:
      opts.legend === false
        ? { show: false }
        : { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 14, textStyle: { color: p.ink2, fontSize: 12 } },
    tooltip: tooltip(p),
  }
}

export function tooltip(p: Palette, trigger: 'axis' | 'item' = 'axis') {
  return {
    trigger,
    confine: true,
    backgroundColor: p.surface,
    borderColor: p.grid,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: p.ink, fontSize: 12, fontFamily: FONT },
    extraCssText: 'border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);',
    axisPointer: { type: trigger === 'axis' ? 'line' : 'none', lineStyle: { color: p.axis, width: 1 } },
  }
}

export function valueAxis(p: Palette, name?: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'value',
    name,
    nameTextStyle: { color: p.muted, fontSize: 11, align: 'left' },
    nameGap: 10,
    splitLine: { lineStyle: { color: p.grid } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: p.muted, fontSize: 11 },
    scale: false,
    ...extra,
  }
}

export function catAxis(p: Palette, data: (string | number)[], extra: Record<string, unknown> = {}) {
  return {
    type: 'category',
    data,
    axisLine: { lineStyle: { color: p.axis } },
    axisTick: { show: false },
    axisLabel: { color: p.ink2, fontSize: 11, hideOverlap: true },
    ...extra,
  }
}

export function barSeries(name: string, data: (number | null | Record<string, unknown>)[], color: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'bar',
    name,
    data,
    barMaxWidth: 26,
    barGap: '15%',
    itemStyle: { color, borderRadius: [4, 4, 0, 0] },
    emphasis: { focus: 'series' },
    ...extra,
  }
}

export function lineSeries(name: string, data: unknown[], color: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'line',
    name,
    data,
    showSymbol: data.length <= 12,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { width: 2, color },
    itemStyle: { color, borderColor: 'transparent' },
    emphasis: { focus: 'series' },
    ...extra,
  }
}
