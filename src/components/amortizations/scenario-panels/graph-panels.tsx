import React from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartThemeWrapper } from "@/components/ui/chart/theme-wrapper"
import { format } from "date-fns"
import { PaymentRow, ScenarioResult } from "@/services/amortization/types/common"

type Currency = "USD" | "PEN"

// Extend PaymentRow with additional properties we know exist
interface ExtendedPaymentRow extends PaymentRow {
  monthly_interest?: number
  monthly_loan_insurance?: number
  principal?: number
}

interface ScenarioSummaryResult {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

interface ScenarioPanelProps {
  scenario: ScenarioResult | undefined
  regularScenario?: ScenarioResult | undefined
  currency: string
  installmentsPerYear: number
}

const chartConfig = {
  principal: {
    label: "Principal",
 
  },
  interest_insurance: {
    label: "Interest & Insurance",
 
  },
} satisfies ChartConfig

const transformPaymentsToChartData = (payments: ExtendedPaymentRow[]) => {
  return payments.map((payment) => {
    // Calculate total interest and insurances
    const totalInterestAndInsurances = (payment.monthly_interest || payment.interest || 0) + 
                                     (payment.property_insurance || 0) + 
                                     (payment.monthly_loan_insurance || payment.loan_insurance || 0)

    const transformedData = {
      date: payment.payment_date,
      principal: payment.principal || payment.capital || 0,
      interest_insurance: totalInterestAndInsurances,
    }
    
    return transformedData
  })
}

const ScenarioPanel = ({ 
  title,
  scenario,
  regularScenario,
  currency,
  showBaseline = false
}: ScenarioPanelProps & { title: string, showBaseline?: boolean }) => {
  if (!scenario?.summary) return null

  const chartData = React.useMemo(() => {
    if (!scenario.payments?.length) return []
    return transformPaymentsToChartData(scenario.payments)
  }, [scenario.payments])

  if (!chartData.length) return null

  const getDifference = (current: number, base?: number) => {
    if (!base) return null
    const diff = current - base
    // Return null if the difference is 0 to hide the badge
    return diff === 0 ? null : diff
  }

  const getBadgeVariant = (difference: number | null, isMonths = false): "default" | "destructive" | "primary" | "outline" | "blue" | "green" => {
    if (difference === null || showBaseline) return "primary"
    if (isMonths) {
      return difference < 0 ? "blue" : "outline"
    }
    return difference < 0 ? "blue" : "outline"
  }

  const formatDifference = (difference: number | null) => {
    if (difference === null) return ""
    const prefix = difference < 0 ? "-" : "+"
    return `${prefix}${Math.abs(difference)}`
  }

  const sumDifference = getDifference(
    scenario.summary.total_interest_and_insurance,
    regularScenario?.summary?.total_interest_and_insurance
  )

  const monthsDifference = getDifference(
    scenario.summary.total_months,
    regularScenario?.summary?.total_months
  )

  const paymentDifference = getDifference(
    scenario.summary.monthly_payment,
    regularScenario?.summary?.monthly_payment
  )

  return (
    <div className="p-1 sm:p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      
      <div className="space-y-4 ">
        
      <div className="grid  grid-flow-col grid-cols-4 grid-rows-2 auto-rows-min gap-0 "> 
         <div className="col-span-2 px-1 sm:px-3 ">
          <span className=" text-sm text-muted-foreground">Sum Interest & Insurances</span>
        </div>

        <div className="col-span-2 flex items-center gap-2 px-2 sm:px-3 ">
          <span className="text-lg font-medium">{formatCurrency(scenario.summary.total_interest_and_insurance, currency as Currency)}</span>
          {showBaseline ? (
            <Badge variant="primary" className="text-sm">Baseline</Badge>
          ) : sumDifference && (
            <Badge variant={getBadgeVariant(sumDifference)} className="text-sm bg-green-600/10 text-green-600">
              {sumDifference < 0 ? '-' : '+'}{formatCurrency(Math.abs(sumDifference), currency as Currency)}
            </Badge>
          )}
          
        </div>



        <div className="col-span-1 px-1 sm:px-3  ">
          <span className=" text-sm text-muted-foreground">Months</span>
         </div>
          
          <div className="col-span-1 flex items-center gap-2 px-2 sm:px-3 ">
            <span className="text-lg font-medium">{scenario.summary.total_months}</span>
            {monthsDifference && !showBaseline && (
              <Badge variant={getBadgeVariant(monthsDifference, true)} className="text-sm">
                {formatDifference(monthsDifference)}
              </Badge>
            )}
          
        </div>

        <div className="col-span-1 px-1 sm:px-3 ">
          <span className=" text-sm text-muted-foreground">Monthly Payment</span>
        </div>

          <div className="col-span-1 flex items-center gap-2 px-2 sm:px-3 ">
            <span className="text-lg font-medium">{formatCurrency(scenario.summary.monthly_payment, currency as Currency)}</span>
            {paymentDifference && !showBaseline && (
              <Badge variant={getBadgeVariant(paymentDifference)} className="text-sm">
                {paymentDifference < 0 ? '-' : '+'}{formatCurrency(Math.abs(paymentDifference), currency as Currency)}
              </Badge>
            )}
          </div>
        
      </div>


        <div className="h-[300px] w-full mt-6">
          <ChartThemeWrapper    cardBackground="black"
            textColor="white"      >
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="principal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-principal)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-principal)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="interest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-interest_insurance)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-interest_insurance)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'yy')}
                    interval={24}  // Show every 12th tick
                    className="text-muted-foreground text-xs"
                  />
                  {/* <YAxis 
                    tickFormatter={(value) => formatCurrency(Number(value || 0), currency as Currency)}
                    className="text-muted-foreground text-xs"
                  /> */}
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg bg-primary p-2 shadow-sm text-primary-foreground">
                          <div className="text-sm font-medium mb-2">
                            {format(new Date(label), 'MMM yyyy')}
                          </div>
                          {payload.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2 text-sm">
                              <div 
                                className="h-3 w-1 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-primary-foreground">
                                {chartConfig[entry.name as keyof typeof chartConfig].label}:
                              </span>
                              <span className="font-medium">
                                {formatCurrency(Number(entry.value || 0), currency as Currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="principal"
                    stroke="var(--color-principal)"
                    fillOpacity={1}
                    fill="url(#principal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="interest_insurance"
                    stroke="var(--color-interest_insurance)"
                    fillOpacity={1}
                    fill="url(#interest)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartThemeWrapper>
        </div>
      </div>
    </div>
  )
}

export const RegularPanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="Regular Scenario" showBaseline />
)

export const AcceleratedPanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="Accelerated Scenario" />
)

export const LowerPaymentPanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="Lower Payment Scenario" />
)

export const NewRatePanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="New Rate Scenario" />
) 