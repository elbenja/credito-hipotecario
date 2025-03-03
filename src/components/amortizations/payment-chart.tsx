import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"
import { amortizationDataService } from "@/services/amortization/calculations/amortizationData"
import type { Property } from "@/services/amortization/types/common"

interface PaymentChartProps {
  property: Property
  downPayment: number
  annualInterestRate: number
  termYears: number
  installmentsPerYear: 12 | 14
  firstInstallmentDate: Date
  propertyInsurance: number
  loanProtection: number
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
  insurance: {
    label: "Insurance",
    theme: {
      light: "hsl(217, 91%, 60%)", // Blue-500
      dark: "hsl(217, 91%, 60%)",  // Blue-500 for dark mode
    },
  },
} satisfies ChartConfig

export function PaymentChart({ 
  property,
  downPayment,
  annualInterestRate,
  termYears,
  installmentsPerYear,
  firstInstallmentDate,
  propertyInsurance,
  loanProtection
}: PaymentChartProps) {
  // Validate inputs before calculation
  if (!property?.cost || !annualInterestRate || !termYears || 
      isNaN(property.cost) || isNaN(annualInterestRate) || isNaN(termYears)) {
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

  // Calculate amortization schedule using the centralized service
  const schedule = amortizationDataService.calculateAmortizationSchedule({
    property,
    downPayment,
    interestRate: annualInterestRate,
    termYears,
    installmentsPerYear,
    firstInstallmentDate,
    propertyInsurance,
    loanProtection
  });

  // Get chart data from the schedule and add insurance values
  const chartData = amortizationDataService.getChartData(schedule).map(data => ({
    ...data,
    insurances: propertyInsurance + loanProtection,
    interestAndInsurances: data.interest + propertyInsurance + loanProtection
  }));

  return (
    <div className="space-y-4">
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
                        <span className="text-sm font-medium">Monthly Payment</span>
                        <span className="text-sm font-medium">{formatCurrency(data.monthlyPayment, property.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Principal</span>
                        <span className="text-sm font-medium">{formatCurrency(data.principal, property.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Interest & Insurances</span>
                        <span className="text-sm font-medium">{formatCurrency(data.interestAndInsurances, property.currency)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            <Area
              dataKey="insurances"
              type="monotone"
              stackId="1"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.6}
              className="[--color-insurance:var(--color-insurance)]"
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
              schedule.reduce((sum, data) => sum + data.interest, 0),
              property.currency
            )}
          </div>
        </div>
        <div className="grid gap-1">
          <div className="font-medium">Total Insurance</div>
          <div className="text-muted-foreground">
            {formatCurrency(
              (propertyInsurance + loanProtection) * schedule.length,
              property.currency
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 