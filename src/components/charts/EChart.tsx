import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, ScatterChart, HeatmapChart, RadarChart, SankeyChart, TreeChart, CustomChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, VisualMapComponent, DataZoomComponent, RadarComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([
  BarChart, LineChart, ScatterChart, HeatmapChart, RadarChart, SankeyChart, TreeChart, CustomChart,
  GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, VisualMapComponent, DataZoomComponent, RadarComponent,
  CanvasRenderer,
])

export type ChartOption = EChartsCoreOption

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClickHandler = (params: any) => void

export function EChart({ option, height = 280, onClick, className, ariaLabel }: { option: ChartOption; height?: number; onClick?: ClickHandler; className?: string; ariaLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)
  const clickRef = useRef<ClickHandler | undefined>(onClick)
  clickRef.current = onClick

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    inst.current = chart
    chart.on('click', (p) => clickRef.current?.(p))
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      inst.current = null
    }
  }, [])

  useEffect(() => {
    inst.current?.setOption(option, true)
  }, [option])

  return <div ref={ref} role="img" aria-label={ariaLabel} className={className} style={{ height, width: '100%', cursor: onClick ? 'pointer' : undefined }} />
}
