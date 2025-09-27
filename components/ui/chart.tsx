'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { ChartConfig, ChartContext, useChart } from "./chart-context"

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ config, children, className, ...props }, ref) => {
  const chartConfig = React.useMemo(
    () => ({
      config,
    }),
    [config]
  )

  return (
    <ChartContext.Provider value={chartConfig}>
      <div
        ref={ref}
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-polar-angle-axis_tick_text]:fill-muted-foreground [&_.recharts-polar-grid_line]:stroke-border/50',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = 'ChartContainer'

const ChartTooltip = Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipProps<number, string> & {
    className?: string
    indicator?: 'dot' | 'line' | 'dashed'
    hideLabel?: boolean
    hideIndicator?: boolean
    label?: string
    labelFormatter?: (label: any, payload: any[]) => React.ReactNode
    labelClassName?: string
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload || payload.length === 0) {
        return null
      }

      if (labelFormatter) {
        return labelFormatter(label, payload)
      }

      if (label) {
        return label
      }

      if (payload.length > 1) {
        return payload[0].payload.x
      }

      return null
    }, [label, labelFormatter, payload, hideLabel])

    if (!active || !payload || payload.length === 0) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className
        )}
      >
        {tooltipLabel ? (
          <div className={cn('font-medium', labelClassName)}>{tooltipLabel}</div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = `${item.name}`
            const itemConfig = config[key as keyof typeof config]
            const color = item.color || itemConfig?.color

            return (
              <div
                key={i}
                className="flex w-full items-center justify-between [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  {!hideIndicator && color ? (
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-[2px]', {
                        'border border-background': indicator === 'dot',
                        'w-0 border-[4px] border-l-transparent border-r-transparent border-t-transparent':
                          indicator === 'line',
                        'w-2.5 border-2 border-dashed bg-transparent':
                          indicator === 'dashed',
                      })}
                      style={{ backgroundColor: color }}
                    />
                  ) : null}
                  <p className="text-muted-foreground">
                    {itemConfig?.label || item.name}
                  </p>
                </div>
                {formatter && typeof item.value === "number" && typeof item.name === "string" ? (
                    formatter(item.value, item.name, item, i, payload)
                  ) : (
                    <p className="font-medium text-foreground">
                      {item.value?.toLocaleString()}
                    </p>
                  )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

const ChartLegend = ({ ...props }) => <div {...props} />
ChartLegend.displayName = 'ChartLegend'

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    payload?: any[]
    onMouseEnter?: (data: any) => void
    onMouseLeave?: (data: any) => void
  }
>(({ className, onMouseEnter, onMouseLeave, payload }, ref) => {
  const { config } = useChart()

  if (!payload || !payload.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center gap-4', className)}
    >
      {payload.map((item) => {
        const key = item.dataKey as string
        const itemConfig = config[key as keyof typeof config]

        return (
          <div
            key={item.value}
            onMouseEnter={() => onMouseEnter?.(item)}
            onMouseLeave={() => onMouseLeave?.(item)}
            className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
          >
            {itemConfig?.icon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = 'ChartLegendContent'

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const css = React.useMemo(() => {
    return Object.entries(config)
      .map(([key, itemConfig]) => {
        const color = itemConfig.color
        const theme = itemConfig.theme

        if (color) {
          return `
[data-chart=${id}] .${key} {
  --color: ${color};
}
          `
        }

        if (theme) {
          return `
[data-chart=${id}] .${key} {
  ${Object.entries(theme)
    .map(([variable, value]) => `--${variable}: ${value};`)
    .join('\n')}
}
          `
        }

        return null
      })
      .filter(Boolean)
      .join('\n')
  }, [id, config])

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  // Recharts
  AreaChart,
  BarChart,
  LineChart,
  RadialBarChart,
  Area,
  Bar,
  Line,
  RadialBar,
  CartesianGrid,
  Label,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
}
