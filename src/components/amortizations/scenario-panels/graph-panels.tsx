import React, { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartThemeWrapper } from "@/components/ui/chart/theme-wrapper"
import { format } from "date-fns"
import { PaymentRow, ScenarioResult } from "@/services/amortization/types/common"
import { useTranslation } from "react-i18next"

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


// Memoize the data transformation function to avoid recalculating on every render
const transformPaymentsToChartData = (payments: ExtendedPaymentRow[]) => {
  if (!payments?.length) return [];
  
  return payments.map((payment) => {
    // Calculate total interest and insurances
    const totalInterestAndInsurances = (payment.monthly_interest || payment.interest || 0) + 
                                     (payment.property_insurance || 0) + 
                                     (payment.monthly_loan_insurance || payment.loan_insurance || 0)

    return {
      date: payment.payment_date,
      principal: payment.principal || payment.capital || 0,
      interest_insurance: totalInterestAndInsurances,
    }
  })
}

const ScenarioPanel = ({ 
  title,
  scenario,
  regularScenario,
  currency,
  showBaseline = false
}: ScenarioPanelProps & { title: string, showBaseline?: boolean }) => {
  const { t } = useTranslation()
  
  if (!scenario?.summary) return null;

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!scenario?.payments?.length) return [];
    return transformPaymentsToChartData(scenario.payments);
  }, [scenario.payments]);

  // Bail early if we don't have chart data
  if (!chartData.length) return null;

  // Memoize the difference calculations
  const differences = useMemo(() => {
    const getDifference = (current: number, base?: number) => {
      if (!base) return null;
      const diff = current - base;
      // Return null if the difference is 0 to hide the badge
      return diff === 0 ? null : diff;
    };

    return {
      sum: getDifference(
        scenario.summary.total_interest_and_insurance,
        regularScenario?.summary?.total_interest_and_insurance
      ),
      months: getDifference(
        scenario.summary.total_months,
        regularScenario?.summary?.total_months
      ),
      payment: getDifference(
        scenario.summary.monthly_payment,
        regularScenario?.summary?.monthly_payment
      )
    };
  }, [
    scenario.summary.total_interest_and_insurance,
    scenario.summary.total_months,
    scenario.summary.monthly_payment,
    regularScenario?.summary?.total_interest_and_insurance,
    regularScenario?.summary?.total_months,
    regularScenario?.summary?.monthly_payment
  ]);

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

  // Create translated chart config
  const translatedChartConfig = {
    principal: {
      label: t('scenario_graphs.common.principal', 'Principal', { ns: 'components' }),
      // color: 'var(--color-principal)'
    },
    interest_insurance: {
      label: t('scenario_graphs.common.interest_insurance', 'Interest & Insurance', { ns: 'components' }),
      // color: 'var(--color-interest_insurance)'
    }
  } satisfies ChartConfig

  return (
    
    <div className="">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {/* start */}

<div className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
  <div className="flex flex-1 flex-col justify-top gap-2 px-6 py-5 sm:py-6">
    <span className="text-xs text-muted-foreground">{t('scenario_graphs.common.sum_interest_insurance', 'Sum Interest & Insurances', { ns: 'components' })}</span>
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold leading-none sm:text-3xl"> {formatCurrency(scenario.summary.total_interest_and_insurance, currency as Currency)}
      </span>
            {showBaseline ? (
              <Badge variant="primary" className="text-sm">
                {t('scenario_graphs.regular.baseline', 'Baseline', { ns: 'components' })}
              </Badge>
            ) : differences.sum && (
              <Badge variant={getBadgeVariant(differences.sum)} className="text-sm bg-green-600/10 text-green-600">
                {differences.sum < 0 ? '-' : '+'}{formatCurrency(Math.abs(differences.sum), currency as Currency)}
              </Badge>
            )}
  </div>

  </div>
  <div className="flex">
    <div className="relative z-30 flex flex-1 flex-col justify-top gap-1 border-t px-6 py-4 text-left even:border-l  sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
      <span className="text-xs text-muted-foreground">
      {t('scenario_graphs.common.months', 'Months', { ns: 'components' })}
      </span>
        <div className="flex items-center gap-2"> 
        <span className="text-lg font-bold leading-none sm:text-3xl">
         {scenario.summary.total_months}
        </span>
             {differences.months && !showBaseline && (
              <Badge variant={getBadgeVariant(differences.months, true)} className="text-sm">
                {formatDifference(differences.months)}
              </Badge>
            )}
      </div>
    </div>

    <div className="flex flex-1 flex-col justify-top gap-1 border-t px-6 py-4 text-left even:border-l  sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
      <span className="text-xs text-muted-foreground">
      {t('scenario_graphs.common.monthly_payment', 'Monthly Payment', { ns: 'components' })}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold leading-none sm:text-3xl">
        {formatCurrency(scenario.summary.monthly_payment, currency as Currency)}
          </span>

          {differences.payment && !showBaseline && (
              <Badge variant={getBadgeVariant(differences.payment)} className="text-sm">
                {differences.payment < 0 ? '-' : '+'}{formatCurrency(Math.abs(differences.payment), currency as Currency)}
              </Badge>
            )}
      </div>
    </div>
  </div>
</div>
      {/* end */}
      <div className="space-y-4 ">
        <div className="h-[300px] w-full mt-6">
          <ChartThemeWrapper >
            <ChartContainer config={translatedChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
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
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg bg-black p-2 shadow-sm text-white">
                          <div className="text-sm font-medium mb-2">
                            {format(new Date(label), 'MMM yyyy')}
                          </div>
                          {payload.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2 text-sm">
                              <div 
                                className="h-3 w-1 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-gray-300">
                                {translatedChartConfig[entry.name as keyof typeof translatedChartConfig].label}:
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

export const RegularPanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel {...props} title={t('scenario_graphs.regular.title', 'Regular Scenario', { ns: 'components' })} showBaseline />
}

export const AcceleratedPanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel {...props} title={t('scenario_graphs.accelerated.title', 'Accelerated Scenario', { ns: 'components' })} />
}

export const LowerPaymentPanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel {...props} title={t('scenario_graphs.lower_payment.title', 'Lower Payment Scenario', { ns: 'components' })} />
}

export const NewRatePanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel {...props} title={t('scenario_graphs.new_rate.title', 'New Rate Scenario', { ns: 'components' })} />
} 