import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface PaymentChartProps {
  loanAmount: number
  annualInterestRate: number
  termYears: number
  currency: "USD" | "PEN"
}

const chartConfig = {
  principal: {
    label: "Principal",
    theme: {
      light: "hsl(220, 13%, 91%)", // Gray-200
      dark: "hsl(215, 25%, 27%)",  // Gray-600 for dark mode
    },
  },
  interest: {
    label: "Interest",
    theme: {
      light: "hsl(217, 19%, 27%)", // Gray-700
      dark: "hsl(215, 20%, 65%)",  // Gray-400 for dark mode
    },
  },
} satisfies ChartConfig

function calculateAmortizationData(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number
) {
  // Validate inputs
  if (!loanAmount || !annualInterestRate || !termYears || 
      isNaN(loanAmount) || isNaN(annualInterestRate) || isNaN(termYears)) {
    console.warn('Invalid inputs for payment chart:', { loanAmount, annualInterestRate, termYears })
    return []
  }

  const monthlyRate = annualInterestRate / 12 / 100
  const totalMonths = termYears * 12
  const monthlyPayment =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)

  if (isNaN(monthlyPayment)) {
    console.warn('Invalid monthly payment calculation:', { monthlyRate, totalMonths, loanAmount })
    return []
  }

  const semiAnnualData = []
  let remainingPrincipal = loanAmount

  // Calculate one point every 6 months
  for (let month = 0; month <= totalMonths; month += 6) {
    const monthlyInterest = remainingPrincipal * monthlyRate
    const monthlyPrincipal = monthlyPayment - monthlyInterest

    semiAnnualData.push({
      period: month / 6, // This will represent the half-year periods
      monthlyPayment,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      total: monthlyPayment,
    })

    // Update remaining principal for next iteration (6 months of payments)
    if (month < totalMonths) {
      remainingPrincipal = Math.max(0, remainingPrincipal - (monthlyPrincipal * 6))
    }
  }

  return semiAnnualData
}

export function PaymentChart({ loanAmount, annualInterestRate, termYears, currency }: PaymentChartProps) {
  // Validate inputs before calculation
  if (!loanAmount || !annualInterestRate || !termYears || 
      isNaN(loanAmount) || isNaN(annualInterestRate) || isNaN(termYears)) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Payment Breakdown Over Time</h3>
          <p className="text-sm text-muted-foreground">
            No data available. Please check the loan parameters.
          </p>
        </div>
      </div>
    )
  }

  const chartData = calculateAmortizationData(loanAmount, annualInterestRate, termYears)

  return (
    <div className="space-y-4">
      {/* <div className="space-y-1">
        <h3 className="text-sm font-medium">Payment Breakdown Over Time</h3>
        <p className="text-sm text-muted-foreground">
          Shows how your monthly payment is split between principal and interest
        </p>
      </div> */}

      <div className="relative aspect-[2/1] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 10,
              bottom: 20,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              ticks={[0, 10, 20, 30, 40, 50, 60]}
              tick={{ fill: 'currentColor' }}
              className="text-sm text-gray-900 fill-gray-900"
              tickFormatter={(value) => `${value / 2}y`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0].payload

                return (
                  <div className="rounded-md border bg-background px-3 py-1 shadow-sm">
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Monthly Pay</span>
                        <span className="text-sm font-medium">{formatCurrency(data.monthlyPayment, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Principal</span>
                        <span className="text-sm font-medium">{formatCurrency(data.principal, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Interest</span>
                        <span className="text-sm font-medium">{formatCurrency(data.interest, currency)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            <Area
              dataKey="interest"
              type="monotone"
              stackId="1"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.6}
              className="[--color-interest:var(--color-interest)]"
            />
            <Area
              dataKey="principal"
              type="monotone"
              stackId="1"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.4}
              className="[--color-principal:var(--color-principal)]"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-start gap-4 text-sm">
        <div className="grid gap-1">
          <div className="font-medium">Total Interest</div>
          <div className="text-muted-foreground">
            {formatCurrency(
              chartData.reduce((sum, data) => sum + data.interest, 0) * 12,
              currency
            )}
          </div>
        </div>
        <div className="grid gap-1">
          <div className="font-medium">Average Principal Payment</div>
          <div className="text-muted-foreground">
            {formatCurrency(
              chartData.reduce((sum, data) => sum + data.principal, 0) / chartData.length,
              currency
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 