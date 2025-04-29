import React, { useMemo, useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, ReferenceDot, Label } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartThemeWrapper } from "@/components/ui/chart/theme-wrapper"
import { format } from "date-fns"
import { PaymentRow, ScenarioResult } from "@/services/mortgages/types/common"
import { useTranslation } from "react-i18next"
import { Calendar, Landmark, MousePointerClick, ChevronRight as ChevronRightIcon, Heart, Camera } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { SVGfixed } from "@/components/ui/svg-fixed"
import { useMortgageCapture } from "@/services/mortgages/mortgage-capture.service"
import { useParams, useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"

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
  breakeven_point?: number | null
}

// Update ScenarioPanelProps to include form values
interface ScenarioPanelProps {
  scenario: ScenarioResult | undefined
  regularScenario?: ScenarioResult | undefined
  currency: string
  installmentsPerYear: number
  propertyCost?: number
  scenarioType?: string
  isThisScenarioSaved?: boolean
  onSaveScenario?: (scenarioType: string) => void
  formValues?: MortgageFormValues
  extraInstallments?: Array<{
    id: string;
    mortgage_id: string;
    amount: number;
    frequency: string;
    start_date: string;
    end_date: string | null;
  }>
  newRates?: Array<{
    id: string;
    mortgage_id: string;
    interest_rate: number;
    effective_date: string;
  }>
}

// Update the MortgageFormValues interface around line 40
export interface MortgageFormValues {
  loan_amount: number;
  down_payment: number;
  interest_rate: number;
  term_years: number;
  installments_per_year: number;
  loan_protection_type: "individual" | "joint" | "none" | "custom";
  loan_protection_insurance: number;
  first_installment_date: string | Date;
}

// Memoize the data transformation function to avoid recalculating on every render
const transformPaymentsToChartData = (payments: ExtendedPaymentRow[], totalMonths: number, installmentsPerYear: number = 12) => {
  if (!payments?.length) return [];
  
  type ChartDataPoint = {
    date: string;
    principal: number;
    interest_insurance: number;
    isJulyOrDecember?: boolean;
  };
  
  // Create an array of the full payment period
  const result: ChartDataPoint[] = Array(totalMonths).fill(null).map((_, index) => ({
    date: "",  // Use empty string instead of null
    principal: 0,
    interest_insurance: 0,
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
  
  return result;
}

const ScenarioPanel = ({ 
  title,
  scenario,
  regularScenario,
  currency,
  installmentsPerYear = 12,
  showBaseline = false,
  propertyCost = 0,
  scenarioType = "regular",
  isThisScenarioSaved = false,
  onSaveScenario,
  formValues,
  extraInstallments,
  newRates
}: ScenarioPanelProps & { title: string, showBaseline?: boolean }) => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { captureMortgage, captureCurrentScenario } = useMortgageCapture()
  const { toast } = useToast()
  
  // Add a ref for caching chart data to avoid unnecessary transformations
  const chartDataCache = useRef<Record<string, any[]>>({});

  // Update localStorage operations by batching state
  const [uiState, setUiState] = useState(() => {
    // Read all localStorage values at once
    return {
      isButtonOn: JSON.parse(localStorage.getItem('isButtonOn') || 'false'),
      isTotalViewOn: JSON.parse(localStorage.getItem('isTotalViewOn') || 'true')
    };
  });

  // Batch update function for UI states
  const updateUiState = (updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }));
  };

  // Debounced localStorage writes
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('isButtonOn', JSON.stringify(uiState.isButtonOn));
      localStorage.setItem('isTotalViewOn', JSON.stringify(uiState.isTotalViewOn));
    }, 300);
    
    return () => clearTimeout(handler);
  }, [uiState]);
  
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
    monthly_payment = 0,
    breakeven_point = null
  } = scenario.summary || {};

  // Determine the total months to display
  // For regular scenario (showBaseline=true), use its own length
  // For other scenarios, use regular scenario length or fallback to 360
  const totalMonthsToDisplay = showBaseline
    ? total_months
    : (regularScenario?.summary?.total_months || 360);

  // Optimize chart data transformation with better memoization and caching
  const chartData = useMemo(() => {
    if (!scenario?.payments?.length) return [];
    
    // Create a unique cache key without relying on scenario.id property
    const cacheKey = `${scenarioType}-${totalMonthsToDisplay}-${installmentsPerYear}`;
    
    // Check if we already have this cached
    if (chartDataCache.current[cacheKey]) {
      return chartDataCache.current[cacheKey];
    }
    
    try {
      // Calculate and cache the result
      const result = transformPaymentsToChartData(
        scenario.payments, 
        totalMonthsToDisplay, 
        installmentsPerYear
      );
      
      // Store in cache with a maximum of 10 cache entries
      const cacheKeys = Object.keys(chartDataCache.current);
      if (cacheKeys.length >= 10) {
        delete chartDataCache.current[cacheKeys[0]];
      }
      
      chartDataCache.current[cacheKey] = result;
      return result;
    } catch (error) {
      console.error("Error transforming chart data:", error);
      return [];
    }
  }, [scenario?.payments, totalMonthsToDisplay, installmentsPerYear, scenarioType]);

  // Bail early if we don't have chart data
  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2 bg-muted/10 rounded-md">
        <p className="text-muted-foreground">{t('scenario_graphs.common.no_chart_data', 'Chart data could not be generated', { ns: 'components' })}</p>
      </div>
    );
  }

  // Calculate total cost (property cost + interest and insurances)
  const totalCost = useMemo(() => {
    return propertyCost + total_interest_and_insurance;
  }, [propertyCost, total_interest_and_insurance]);

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
      totalCost: getDifference(
        totalCost,
        regularScenario ? (propertyCost + (regularScenario.summary?.total_interest_and_insurance || 0)) : undefined
      ),
      months: getDifference(
        total_months,
        regularScenario?.summary?.total_months
      ),
      payment: getDifference(
        monthly_payment,
        regularScenario?.summary?.monthly_payment
      ),
      breakeven: getDifference(
        breakeven_point || 0,
        regularScenario?.summary?.breakeven_point || 0
      )
    };
  }, [
    total_interest_and_insurance,
    totalCost,
    propertyCost,
    total_months,
    monthly_payment,
    breakeven_point,
    regularScenario?.summary?.total_interest_and_insurance,
    regularScenario?.summary?.total_months,
    regularScenario?.summary?.monthly_payment,
    regularScenario?.summary?.breakeven_point
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

  // Find approximate chart point for breakeven
  const breakEvenChartPoint = useMemo(() => {
    if (!breakeven_point || !chartData.length) return null;
    
    // Calculate the month index based on years
    const breakEvenMonthIndex = Math.round(breakeven_point * 12) - 1;
    
    // Ensure the index is within range
    if (breakEvenMonthIndex < 0 || breakEvenMonthIndex >= chartData.length) return null;
    
    // Make sure we skip July/December for double payment option
    if (installmentsPerYear === 14) {
      // Find closest point that isn't in July/December
      let indexToUse = breakEvenMonthIndex;
      let found = false;
      
      // Try to find a point near the calculated index
      for (let offset = 0; offset < 5; offset++) {
        // Try points before and after the calculated index
        for (const direction of [-1, 1]) {
          const tryIndex = breakEvenMonthIndex + (offset * direction);
          
          // Skip if out of range
          if (tryIndex < 0 || tryIndex >= chartData.length) continue;
          
          const point = chartData[tryIndex];
          if (!point.date) continue;
          
          const date = new Date(point.date);
          const month = date.getMonth();
          
          // Skip July and December for double payment option
          if (month !== 6 && month !== 11) {
            indexToUse = tryIndex;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      return chartData[indexToUse];
    }
    
    return chartData[breakEvenMonthIndex];
  }, [breakeven_point, chartData, installmentsPerYear]);

  const yearsLabel = t('scenario_graphs.common.years', 'years', { ns: 'components' });
  
  // Get actual month and year for the break-even point
  const breakEvenMonthYear = useMemo(() => {
    if (!breakEvenChartPoint || !breakEvenChartPoint.date) return '';
    
    try {
      const date = new Date(breakEvenChartPoint.date);
      return format(date, 'MMM yyyy');
    } catch (error) {
      return '';
    }
  }, [breakEvenChartPoint]);

  // Update the handler function for capturing scenarios
  const handleCaptureScenario = async () => {
    // Remove debug logging
    if (!id) {
      console.error("No mortgage ID available for capture");
      toast({
        variant: "destructive",
        title: t('scenario_graphs.common.error', 'Error', { ns: 'components' }),
        description: t('scenario_graphs.common.error_no_id', 'Cannot capture scenario: No mortgage ID available', { ns: 'components' })
      });
      return;
    }
    
    if (!scenario?.summary) {
      console.error("No scenario summary available for capture");
      toast({
        variant: "destructive",
        title: t('scenario_graphs.common.error', 'Error', { ns: 'components' }),
        description: t('scenario_graphs.common.error_no_scenario', 'Cannot capture scenario: No scenario data available', { ns: 'components' })
      });
      return;
    }
    
    if (!formValues) {
      console.error("No form values provided for capture");
      toast({
        variant: "destructive",
        title: t('scenario_graphs.common.error', 'Error', { ns: 'components' }),
        description: t('scenario_graphs.common.error_no_form_values', 'Cannot capture scenario: No form values available', { ns: 'components' })
      });
      return;
    }
    
    try {
      // Create a properly formatted object for capture
      const captureData = {
        mortgageId: id,
        currentValues: {
          loan_amount: formValues.loan_amount,
          down_payment: formValues.down_payment,
          interest_rate: formValues.interest_rate,
          term_years: formValues.term_years,
          installments_per_year: formValues.installments_per_year,
          loan_protection_type: formValues.loan_protection_type,
          loan_protection_insurance: formValues.loan_protection_insurance,
          first_installment_date: formValues.first_installment_date
        },
        scenarioType: scenarioType,
        scenarioSummary: {
          total_interest_and_insurance: scenario.summary.total_interest_and_insurance,
          total_months: scenario.summary.total_months,
          monthly_payment: scenario.summary.monthly_payment,
          breakeven_point: scenario.summary.breakeven_point
        },
        stayOnPage: true
      };
      
      // Use the formValues from parent component
      await captureCurrentScenario(captureData);
      
      // Update the URL to include the tab parameter without causing a full page reload
      const url = new URL(window.location.href);
      url.searchParams.set('tab', scenarioType);
      window.history.pushState({}, '', url);
      
      // Call the onSaveScenario handler to update the parent component's state
      if (onSaveScenario) {
        onSaveScenario(scenarioType);
      }
    } catch (error) {
      console.error("Error capturing scenario:", error);
      toast({
        variant: "destructive",
        title: t('scenario_graphs.common.error', 'Error', { ns: 'components' }),
        description: t('scenario_graphs.common.error_during_capture', 'Error capturing scenario', { ns: 'components' })
      });
    }
  };

  return (
    
    <div className="">
      
      <div className="flex items-center p-2">
        <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger className="flex items-center gap-2 px-4 h-10 rounded-md text-sm border border-input hover:bg-accent hover:text-accent-foreground mr-auto">
         
          {t('scenario_graphs.tooltip.break_even_point_title', 'Punto de Equilibrio', { ns: 'components' })}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="mb-2">
              {t('scenario_graphs.tooltip.break_even_point_title', 'Punto de Equilibrio', { ns: 'components' })}

              </DialogTitle>
              <DialogDescription>
              <p className="mb-2">{t('scenario_graphs.tooltip.investment_advice', 'Sin embargo, si puedes invertir ese dinero y obtener un rendimiento mayor que el ahorro en intereses, te conviene más invertir.', { ns: 'components' })}</p>
              <p>{t('scenario_graphs.tooltip.investment_advice_2', 'Por eso recomendamos amortizar lo antes posible y no pasar del punto de equilibrio.', { ns: 'components' })}</p>

              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>


        </div>
        <div className="ml-auto flex items-center gap-2">




        <Button 
          variant="outline" 
          onClick={handleCaptureScenario}
        >
          {t('scenario_graphs.common.capture_scenario', 'Capture scenario', { ns: 'components' })}
          <Camera className="size-4 ml-2" />
        </Button>

          {isThisScenarioSaved ? (
            <Button variant="secondary" className="border border-input">             
              {t('scenario_graphs.common.favorite', 'Favorite', { ns: 'components' })}
              <span className="ml-2"> <SVGfixed name="heartFilled" strokeClassName="text-brand" fillClassName="fill-brand" />  </span>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className=""
              onClick={() => onSaveScenario && onSaveScenario(scenarioType)}
            >
              {t('scenario_graphs.common.favorite', 'Favorite', { ns: 'components' })}
              <Heart className="size-4 ml-2" />
            </Button>
          )}
            
        </div>

      </div>

<div className="flex flex-col items-stretch space-y-0 border-t border-b p-0 sm:flex-row">

  {uiState.isTotalViewOn ? (
    <button className="flex flex-1 text-left justify-top gap-2 hover:bg-card/50 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6"
      onClick={() => updateUiState({ isTotalViewOn: !uiState.isTotalViewOn })}
    >
      <div className="flex flex-col justify-start items-start gap-2">
        <span className="text-xs text-muted-foreground">
          {t('scenario_graphs.common.total_cost', 'Total: Property + Interest + Insurances', { ns: 'components' })}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xl  xl:text-2xl 2xl:text-3xl font-bold leading-none whitespace-nowrap"> 
            {formatCurrency(totalCost, currency as Currency)}
          </span>
          {showBaseline ? (
            <Badge variant="primary" className="text-xs xl:text-sm whitespace-nowrap">
              {t('scenario_graphs.regular.baseline', 'Baseline', { ns: 'components' })}
            </Badge>
          ) : (
            differences.totalCost && (
              <Badge 
                variant={getBadgeVariant(differences.totalCost)} 
                className="text-xs xl:text-sm whitespace-nowrap"
              >
                {differences.totalCost < 0 ? '-' : '+'}
                {formatCurrency(Math.abs(differences.totalCost), currency as Currency)}
              </Badge>
            )
          )}
        </div>
      </div>
      <div className="self-stretch pt-4 flex justify-center items-center">
        <MousePointerClick className="size-8 text-muted-foreground p-2 bg-card rounded-full" />
      </div>
    </button>
  ) : (
    <button className="flex flex-1 text-left justify-top gap-2 hover:bg-card/50 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6"
      onClick={() => updateUiState({ isTotalViewOn: !uiState.isTotalViewOn })}
    >
      <div className="flex flex-col justify-start items-start gap-2">
        <span className="text-xs text-muted-foreground">
          {t('scenario_graphs.common.sum_interest_insurance', 'Sum Interest & Insurances', { ns: 'components' })}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xl  xl:text-2xl 2xl:text-3xl font-bold leading-none whitespace-nowrap"> 
            {formatCurrency(total_interest_and_insurance, currency as Currency)}
          </span>
          {showBaseline ? (
            <Badge variant="primary" className="text-xs xl:text-sm whitespace-nowrap">
              {t('scenario_graphs.regular.baseline', 'Baseline', { ns: 'components' })}
            </Badge>
          ) : (
            differences.sum && (
              <Badge 
                variant={getBadgeVariant(differences.sum)} 
                className="text-xs xl:text-sm whitespace-nowrap"
              >
                {differences.sum < 0 ? '-' : '+'}
                {formatCurrency(Math.abs(differences.sum), currency as Currency)}
              </Badge>
            )
          )}
        </div>
      </div>
      <div className="self-stretch pt-4 flex justify-center items-center">
        <MousePointerClick className="size-8 text-muted-foreground p-2 bg-card rounded-full" />
      </div>
    </button>
  )}

  <div className="flex">
               {uiState.isButtonOn ? (
                 <button className="flex justify-top gap-2 border-t  text-left even:border-l sm:border-l sm:border-t-0 hover:bg-card/50 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6 "
                   onClick={() => updateUiState({ isButtonOn: !uiState.isButtonOn })}
                 >
                 <div className="flex flex-col justify-start items-start gap-2">
                   <span className="text-xs text-muted-foreground">
                     {t('scenario_graphs.common.months', 'Months', { ns: 'components' })}
                     </span>
                       <div className="flex items-center gap-2"> 
                       <span className="text-xl xl:text-2xl 2xl:text-3xl font-bold leading-none ">
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
                   <div className="self-stretch pt-4 flex justify-center items-center">
                    <MousePointerClick className="size-8 text-muted-foreground p-2 bg-card rounded-full" />
                 </div>
                 </button>
                ) : (
                  <button className="flex justify-top gap-2 border-t  text-left even:border-l sm:border-l sm:border-t-0 hover:bg-card/50 px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6"
                    onClick={() => updateUiState({ isButtonOn: !uiState.isButtonOn })}
                  >
                 
                 <div className="flex flex-col justify-start items-start gap-2">
                   <span className="text-xs text-muted-foreground">
                     {t('scenario_graphs.common.years', 'Years', { ns: 'components' })}
                       
                     </span>
                       <div className="flex items-center gap-2"> 
                       <span className="text-xl xl:text-2xl 2xl:text-3xl font-bold leading-none">
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
                   <div className="self-stretch pt-4 flex justify-center items-center ">
                     <MousePointerClick className="size-8 text-muted-foreground p-2 bg-card rounded-full" />
                 </div>
                 </button>
                )}

    <div className="flex flex-1  justify-top gap-1 border-t  text-left even:border-l  sm:border-l sm:border-t-0  px-4 xl:px-6 2xl:px-8
py-4 xl:py-5 2xl:py-6">
      
      <div className="flex flex-col justify-start items-start gap-2">

      
      <span className="text-xs text-muted-foreground whitespace-nowrap">
      {t('scenario_graphs.common.monthly_payment', 'Monthly Payment', { ns: 'components' })}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xl  xl:text-2xl 2xl:text-3xl whitespace-nowrap font-bold leading-none ">
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
                  {breakeven_point && breakEvenChartPoint && (
                    <ReferenceDot
                      x={breakEvenChartPoint.date}
                      y={(breakEvenChartPoint.principal + breakEvenChartPoint.interest_insurance) / 2}
                      r={6}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <Label
                        value={`${breakeven_point?.toFixed(1)} ${yearsLabel}: ${t('scenario_graphs.common.break_even_point', 'Break-even point', { ns: 'components' })}`}
                        position="top"
                        offset={20}
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
          
        


         
        </div>
      </div>
    </div>
  )
}

export const RegularPanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel 
    {...props} 
    title={t('scenario_graphs.regular.title', 'Regular Scenario', { ns: 'components' })} 
    showBaseline
    scenarioType="regular" 
  />
}

export const AcceleratedPanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel 
    {...props} 
    title={t('scenario_graphs.accelerated.title', 'Accelerated Scenario', { ns: 'components' })} 
    scenarioType="accelerated"
  />
}

export const LowerPaymentPanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel 
    {...props} 
    title={t('scenario_graphs.lower_payment.title', 'Lower Payment Scenario', { ns: 'components' })} 
    scenarioType="lower_payment"
  />
}

export const NewRatePanelGraph = (props: ScenarioPanelProps) => {
  const { t } = useTranslation()
  return <ScenarioPanel 
    {...props} 
    title={t('scenario_graphs.new_rate.title', 'New Rate Scenario', { ns: 'components' })} 
    scenarioType="new_rate"
  />
} 