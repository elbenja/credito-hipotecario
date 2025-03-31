import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { TooltipProps } from "recharts"
import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = Record<string, { 
  label: string
  color: string 
  icon?: React.ComponentType
  theme?: Record<string, string>
}>

export interface ChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
  config?: ChartConfig
  indicator?: "line" | "bar"
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ className, children, config, ...props }, ref) => {
  const style = React.useMemo(() => {
    const variables = Object.entries(config).reduce((acc, [key, value]) => {
      acc[`--color-${key}`] = value.color
      return acc
    }, {} as Record<string, string>)
    return variables
  }, [config])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn("h-full w-full", className)}
        style={style}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

export const ChartTooltip = RechartsPrimitive.Tooltip

export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
  indicator = "line",
}: ChartTooltipContentProps) {
  if (!active || !payload?.length || !config) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground/90">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map(({ value, name }) => (
          <div key={name} className="flex items-center gap-2">
            {indicator === "line" ? (
              <div
                className="h-0.5 w-3"
                style={{ background: config[name]?.color }}
              />
            ) : (
              <div
                className="h-2 w-2"
                style={{ background: config[name]?.color }}
              />
            )}
            <span className="text-sm text-muted-foreground">
              {config[name]?.label}
            </span>
            <span className="ml-auto text-sm font-medium text-foreground">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ChartLegend = RechartsPrimitive.Legend

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = config[key]

          if (!itemConfig) return null

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

// Export the theme-related functionality
export function generateChartStyle(id: string, config: ChartConfig) {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
    )
    .join("\n")
}
