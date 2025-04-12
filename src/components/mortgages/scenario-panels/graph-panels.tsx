import React, { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, ReferenceDot, Label } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartThemeWrapper } from "@/components/ui/chart/theme-wrapper"
import { format } from "date-fns"
import { PaymentRow, ScenarioResult } from "@/services/amortization/types/common"
import { useTranslation } from "react-i18next"
import { Calendar } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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
const transformPaymentsToChartData = (payments: ExtendedPaymentRow[], totalMonths: number, installmentsPerYear: number = 12) => {
  if (!payments?.length) return [];
  
  type ChartDataPoint = {
    date: string;
    principal: number;
    interest_insurance: number;
    breakEven?: boolean;
    isJulyOrDecember?: boolean;
  };
  
  // Create an array of the full payment period
  const result: ChartDataPoint[] = Array(totalMonths).fill(null).map((_, index) => ({
    date: "",  // Use empty string instead of null
    principal: 0,
    interest_insurance: 0,
    breakEven: false, // Initialize all points as not break-even
  }));
  
  // Fill in actual payment data where available
  payments.forEach((payment, index) => {
    if (index < totalMonths && payment.payment_date) {
      // Calculate total interest and insurances
      const totalInterestAndInsurances = (payment.monthly_interest || payment.interest || 0) + 
                                       (payment.property_insurance || 0) + 
                                       (payment.monthly_loan_insurance || payment.loan_insurance || 0);

      const paymentDate = typeof payment.payment_date === 'string' 
        ? payment.payment_date 
        : payment.payment_date.toISOString();
        
      // Check if this is July or December for the Double option
      const date = new Date(paymentDate);
      const month = date.getMonth();
      
      // Only mark July/December for double payment scheme (14 installments)
      const isJulyOrDecember = installmentsPerYear === 14 && (month === 6 || month === 11);

      result[index] = {
        date: paymentDate,
        principal: payment.principal || payment.capital || 0,
        interest_insurance: totalInterestAndInsurances,
        isJulyOrDecember: isJulyOrDecember,
      };
    }
  });
  
  // Ensure all dates are set, extrapolating from existing dates if needed
  if (result.length > 0) {
    // Find the first date with a value
    const itemWithDate = result.find(item => item.date);
    
    if (itemWithDate && itemWithDate.date) {
      const firstDate = new Date(itemWithDate.date);
      
      // Estimate payment frequency (in milliseconds)
      let paymentFrequency = 0;
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i].date && result[i+1].date) {
          paymentFrequency = new Date(result[i+1].date).getTime() - new Date(result[i].date).getTime();
          break;
        }
      }
      
      // If we couldn't detect frequency from data, assume monthly (30 days)
      if (paymentFrequency <= 0) {
        paymentFrequency = 30 * 24 * 60 * 60 * 1000;
      }
      
      // Fill in missing dates
      for (let i = 0; i < result.length; i++) {
        if (!result[i].date) {
          const newDate = new Date(firstDate.getTime() + i * paymentFrequency);
          result[i].date = newDate.toISOString();
        }
      }
    }
  }
  
  // Important: We no longer calculate break-even point here
  // That is now handled by the useMemo hook in the component
  // This ensures break-even is recalculated when installmentsPerYear changes
  
  return result;
}

const ScenarioPanel = ({ 
  title,
  scenario,
  regularScenario,
  currency,
  installmentsPerYear = 12,
  showBaseline = false
}: ScenarioPanelProps & { title: string, showBaseline?: boolean }) => {
  const { t } = useTranslation()
  // Add state for the toggle button inside the component
  const [isButtonOn, setIsButtonOn] = useState(() => {
    // Initialize state from localStorage
    const savedState = localStorage.getItem('isButtonOn');
    return savedState ? JSON.parse(savedState) : false;
  });

  // Update localStorage whenever isButtonOn changes
  useEffect(() => {
    localStorage.setItem('isButtonOn', JSON.stringify(isButtonOn));
  }, [isButtonOn]);
  
  // Handle null or undefined scenario gracefully
  if (!scenario?.summary) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2 bg-muted/10 rounded-md">
        <p className="text-muted-foreground">{t('scenario_graphs.common.no_data', 'No scenario data available', { ns: 'components' })}</p>
      </div>
    );
  }

  // Safely handle missing values in summary
  const {
    total_interest_and_insurance = 0,
    total_months = 0,
    monthly_payment = 0
  } = scenario.summary || {};

  // Determine the total months to display
  // For regular scenario (showBaseline=true), use its own length
  // For other scenarios, use regular scenario length or fallback to 360
  const totalMonthsToDisplay = showBaseline
    ? total_months
    : (regularScenario?.summary?.total_months || 360);

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!scenario?.payments?.length) return [];
    try {
      // Force recalculation when installmentsPerYear changes
      // by adding it explicitly to the dependency array
      console.log(`Recalculating chart data with ${installmentsPerYear} installments per year`);
      return transformPaymentsToChartData(scenario.payments, totalMonthsToDisplay, installmentsPerYear);
    } catch (error) {
      console.error("Error transforming payments data:", error);
      return [];
    }
  }, [scenario.payments, totalMonthsToDisplay, installmentsPerYear]);

  // Bail early if we don't have chart data
  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2 bg-muted/10 rounded-md">
        <p className="text-muted-foreground">{t('scenario_graphs.common.no_chart_data', 'Chart data could not be generated', { ns: 'components' })}</p>
      </div>
    );
  }

  // Memoize the difference calculations to avoid recalculation on each render
  const differences = useMemo(() => {
    const getDifference = (current: number, base?: number) => {
      if (!base) return null;
      const diff = current - base;
      // Return null if the difference is 0 to hide the badge
      return diff === 0 ? null : diff;
    };

    return {
      sum: getDifference(
        total_interest_and_insurance,
        regularScenario?.summary?.total_interest_and_insurance
      ),
      months: getDifference(
        total_months,
        regularScenario?.summary?.total_months
      ),
      payment: getDifference(
        monthly_payment,
        regularScenario?.summary?.monthly_payment
      )
    };
  }, [
    total_interest_and_insurance,
    total_months,
    monthly_payment,
    regularScenario?.summary?.total_interest_and_insurance,
    regularScenario?.summary?.total_months,
    regularScenario?.summary?.monthly_payment
  ]);

  const getBadgeVariant = (difference: number | null, isMonths = false): "default" | "destructive" | "primary" | "outline" | "blue" | "green" => {
    if (difference === null || showBaseline) return "primary"

    return difference < 0 ? "green" : "outline"
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
      color: 'hsl(41 89% 61%)'
    },
    interest_insurance: {
      label: t('scenario_graphs.common.interest_insurance', 'Interest & Insurance', { ns: 'components' }),
      color: `hsl('light' ? '215.3 19.3% 7%' : '215.4 16.3% 46.9%'})`
    }
  } satisfies ChartConfig

  // Find the break-even data point
  const breakEvenPoint = useMemo(() => {
    // When installmentsPerYear changes, we need to force a recalculation of the break-even point
    // Log for debugging purposes
    console.log(`Finding break-even point with ${installmentsPerYear} installments per year`);
    
    // If we don't have chart data, return undefined
    if (!chartData.length) return undefined;
    
    // Clear any existing break-even flags (important when switching payment schemas)
    const resetData = chartData.map(point => ({...point, breakEven: false}));
    
    // Find the first valid break-even point (ignoring July/December for Double)
    let breakEvenIdx = -1;
    
    for (let i = 0; i < resetData.length - 1; i++) {
      const current = resetData[i];
      if (!current.date) continue;
      
      const currentDate = new Date(current.date);
      const currentMonth = currentDate.getMonth();
      
      // Skip July and December for Double option
      if (installmentsPerYear === 14 && (currentMonth === 6 || currentMonth === 11)) {
        continue;
      }
      
      // Check for crossover point
      if (i + 1 < resetData.length) {
        const next = resetData[i + 1];
        if (!next.date) continue;
        
        const nextDate = new Date(next.date);
        const nextMonth = nextDate.getMonth();
        
        // Skip if next month is July/December for Double option
        if (installmentsPerYear === 14 && (nextMonth === 6 || nextMonth === 11)) {
          continue;
        }
        
        // Found the crossover point
        if (current.principal <= current.interest_insurance && 
            next.principal > next.interest_insurance) {
          breakEvenIdx = i + 1;
          break;
        }
      }
      
      // Alternatively, check for equality/already crossed over
      if (current.principal >= current.interest_insurance) {
        breakEvenIdx = i;
        break;
      }
    }
    
    // Mark the break-even point if found
    if (breakEvenIdx >= 0 && breakEvenIdx < resetData.length) {
      resetData[breakEvenIdx].breakEven = true;
    }
    
    // Return the new break-even point
    return resetData.find(point => point.breakEven);
  }, [chartData, installmentsPerYear]);

  // Calculate the month-index for the break-even point
  const breakEvenIndex = useMemo(() => {
    if (!breakEvenPoint) return -1;
    return chartData.findIndex(point => point === breakEvenPoint || 
      (point.date === breakEvenPoint.date && 
       point.principal === breakEvenPoint.principal && 
       point.interest_insurance === breakEvenPoint.interest_insurance));
  }, [chartData, breakEvenPoint]);
  
  // Calculate break-even year correctly based on point index
  const breakEvenYear = useMemo(() => {
    if (breakEvenIndex === -1) return "0.0";
    
    // For Double payment option (14 installments), adjust the calculation
    // to account for the extra payments in July and December
    if (installmentsPerYear === 14) {
      // Count how many July/December months come before the break-even point
      let specialMonthsCount = 0;
      for (let i = 0; i < breakEvenIndex; i++) {
        if (!chartData[i].date) continue;
        
        const date = new Date(chartData[i].date);
        const month = date.getMonth();
        if (month === 6 || month === 11) { // July or December
          specialMonthsCount++;
        }
      }
      
      // Calculate the effective month index considering 12 regular months per year
      const effectiveMonthIndex = breakEvenIndex - specialMonthsCount;
      return (effectiveMonthIndex / 12).toFixed(1);
    }
    
    // Regular payment option (12 installments)
    return (breakEvenIndex / 12).toFixed(1);
  }, [breakEvenIndex, chartData, installmentsPerYear]);

  const yearsLabel = t('scenario_graphs.common.years', 'years', { ns: 'components' });
  
  // Get actual month and year for the break-even point
  const breakEvenMonthYear = useMemo(() => {
    if (!breakEvenPoint || !breakEvenPoint.date) return '';
    
    try {
      const date = new Date(breakEvenPoint.date);
      
      // Validate the break-even point isn't in July/December for Double payment option
      if (installmentsPerYear === 14) {
        const month = date.getMonth();
        
        // This should never happen with our new calculation approach, but keep the check for safety
        if (month === 6 || month === 11) {
          console.warn('Critical error: Break-even point is in July or December with Double payment option');
          
          // Try to find the next non-July/December month with principal > interest
          for (let i = 0; i < chartData.length; i++) {
            const point = chartData[i];
            if (!point.date) continue;
            
            const pointDate = new Date(point.date);
            const pointMonth = pointDate.getMonth();
            
            if (pointMonth !== 6 && pointMonth !== 11 && point.principal > point.interest_insurance) {
              // Found a valid alternative break-even point
              return format(pointDate, 'MMM yyyy');
            }
          }
        }
      }
      
      return format(date, 'MMM yyyy');
    } catch (error) {
      console.error("Error formatting break-even date:", error);
      return '';
    }
  }, [breakEvenPoint, installmentsPerYear, chartData]);

  return (
    
    <div className="">
      


<div className="flex flex-col items-stretch space-y-0 border-t border-b p-0 sm:flex-row">
  <div className="flex flex-1 flex-col justify-top gap-2 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6">
    <span className="text-xs text-muted-foreground">{t('scenario_graphs.common.sum_interest_insurance', 'Sum Interest & Insurances', { ns: 'components' })}</span>
    <div className="flex items-center gap-2">
      <span className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold leading-none whitespace-nowrap"> 
        {/* Sum01 */}
        {formatCurrency(total_interest_and_insurance, currency as Currency)}
      </span>
            {showBaseline ? (
              <Badge variant="primary" className="text-xs xl:text-sm whitespace-nowrap">
                {t('scenario_graphs.regular.baseline', 'Baseline', { ns: 'components' })}
              </Badge>
            ) : differences.sum && (
              <Badge variant={getBadgeVariant(differences.sum)} className="text-xs xl:text-sm whitespace-nowrap">
                {differences.sum < 0 ? '-' : '+'}{formatCurrency(Math.abs(differences.sum), currency as Currency)}
              </Badge>
            )}
  </div>
  </div>

  <div className="flex">
               {isButtonOn ? (
                 <button className="flex justify-top gap-2 border-t  text-left even:border-l sm:border-l sm:border-t-0 hover:bg-card/50 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6 "
                   onClick={() => setIsButtonOn(false)}
                 >
                 <div className="flex-col justify-start items-start gap-1">
                   <span className="text-xs text-muted-foreground">
                     {t('scenario_graphs.common.months', 'Months', { ns: 'components' })}
                     </span>
                       <div className="flex items-center gap-2"> 
                       <span className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold leading-none ">
                       {total_months}
                         {/* Sum02 */}
                       </span>
                           {differences.months && !showBaseline && (
                             <Badge variant={getBadgeVariant(differences.months, true)} className="text-xs xl:text-sm">
                               {formatDifference(differences.months)}
                             </Badge>
                           )}
                     </div>
                  </div>
                   <div className="self-stretch pt-5 flex justify-center items-center">
                    <Calendar className="size-8 text-muted-foreground p-2 bg-card rounded-full" />
                 </div>
                 </button>
                ) : (
                  <button className="flex justify-top gap-2 border-t  text-left even:border-l sm:border-l sm:border-t-0 hover:bg-card/50 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6"
                    onClick={() => setIsButtonOn(true)}
                  >
                 
                 <div className="flex-col justify-start items-start gap-1">
                   <span className="text-xs text-muted-foreground">
                     {t('scenario_graphs.common.years', 'Years', { ns: 'components' })}
                       
                     </span>
                       <div className="flex items-center gap-2"> 
                       <span className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold leading-none">
                           {(total_months / 12).toFixed(1)}
                           {/* Sum02 */}
                       </span>
                           {differences.months && !showBaseline && (
                             <Badge variant={getBadgeVariant(differences.months, true)} className="text-xs xl:text-sm">
                               {differences.months ? `${differences.months < 0 ? '-' : '+'}${(Math.abs(differences.months/12)).toFixed(1)}` : ''}
                             </Badge>
                           )}
                     </div>
                   </div>
                   <div className="self-stretch pt-5 flex justify-center items-center ">
                     <Calendar className="size-8 text-muted-foreground p-2 bg-card rounded-full" />
                 </div>
                 </button>
                )}

    <div className="flex flex-1 flex-col justify-top gap-1 border-t  text-left even:border-l  sm:border-l sm:border-t-0  px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
      {t('scenario_graphs.common.monthly_payment', 'Monthly Payment', { ns: 'components' })}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl whitespace-nowrap font-bold leading-none ">
        {formatCurrency(monthly_payment, currency as Currency)}
          </span>
          {/* Sum03 */}
          {differences.payment && !showBaseline && (
              <Badge variant={getBadgeVariant(differences.payment)} className="text-xs xl:text-sm whitespace-nowrap ">
                {differences.payment < 0 ? '-' : '+'}{formatCurrency(Math.abs(differences.payment), currency as Currency)}
              </Badge>
            )}
      </div>
    </div>

  </div>
</div>
 
      <div className="space-y-4 ">
        <div className="h-[200px] lg:h-[300px] w-full mt-6 relative">
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
                    tickFormatter={(value) => {
                      // Get the payment month index from the chart data
                      const valueIndex = chartData.findIndex(item => item.date === value);
                      if (valueIndex === -1) return '';
                      
                      // Calculate year position (0-based)
                      const yearPosition = Math.floor(valueIndex / 12);
                      
                      // Only show even year numbers
                      return yearPosition % 2 === 0 ? yearPosition.toString() : '';
                    }}
                    interval={12}  // Show tick for each year
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
                  
                  {/* Break-even point marker with integrated label */}
                  {breakEvenPoint && (
                    <ReferenceDot
                      x={breakEvenPoint.date}
                      y={(breakEvenPoint.principal + breakEvenPoint.interest_insurance) / 2}
                      r={6}
                      // fill={installmentsPerYear === 14 ? "#000" : "#fff"} 
                      // stroke={installmentsPerYear === 14 ? "#10b981" : "var(--color-principal)"}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <Label
                        value={`${breakEvenYear} ${yearsLabel}: ${t('scenario_graphs.common.break_even_point', 'Break-even point', { ns: 'components' })}`}
                        position="top"
                        offset={20}
                        // fill={installmentsPerYear === 14 ? "#10b981" : "currentColor"}
                        fill="currentColor" 
                        fontSize={13}
                        fontWeight="500"
                        width={100}
                      />
                    </ReferenceDot>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartThemeWrapper>
        </div>
        <div className="flex w-full items-center justify-center">
          
        

          <Dialog>
          <DialogTrigger className="flex items-center gap-2 bg-card px-2 py-1 rounded-md text-sm "><div className=" size-2.5 rounded-full border-2 border-brand"></div> 
          {t('scenario_graphs.tooltip.break_even_point_title', 'Punto de Equilibrio', { ns: 'components' })}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
              {t('scenario_graphs.tooltip.break_even_point_title', 'Punto de Equilibrio', { ns: 'components' })}

              </DialogTitle>
              <DialogDescription>
              <p>{t('scenario_graphs.tooltip.investment_advice', 'Sin embargo, si puedes invertir ese dinero y obtener un rendimiento mayor que el ahorro en intereses, te conviene más invertir.', { ns: 'components' })}</p>


              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
         
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