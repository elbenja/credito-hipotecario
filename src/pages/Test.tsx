import { useState } from "react";
import { DateRange } from "react-day-picker";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { addYears, subYears, startOfDay, isBefore, isAfter, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { useTranslation } from "react-i18next";
import SVGillustration from "@/components/ui/SVGillustration";
import { Plus, Pencil, Bold, Calendar, TrendingUp } from "lucide-react";
import { PropertyCards } from "@/components/properties/property-cards";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label as UILabel } from "@/components/ui/label";
import { CartesianGrid, Label, LabelList, Line, LineChart, ReferenceDot, ReferenceLine, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const chartData = [
  { name: "Jan", visitors: 275 },
  { name: "Feb", visitors: 200 },
  { name: "Mar", visitors: 187 },
  { name: "Apr", visitors: 230, breakEven: true },
  { name: "May", visitors: 120 },
  { name: "Jun", visitors: 190 },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

type FormValues = {
  datePicker: DateRange;
};

export default function Test() {
  const { i18n, t } = useTranslation();
  const form = useForm<FormValues>({
    defaultValues: {
      datePicker: {
        from: new Date(),
        to: new Date(),
      },
    },
  });

  function LineChartComponent() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Line Chart - Custom Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="absolute top-1/3 left-1/2 -translate-x-6 -translate-y-8 text-xs">
            Break-even point
          </div>
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 70,
                left: 24,
                right: 24,
                bottom: 24
              }}
              width={500}
              height={350}
            >
              <CartesianGrid vertical={false} />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  
                  return (
                    <div className="rounded-md bg-black text-white px-3 py-2 shadow-md">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">{data.browser.charAt(0).toUpperCase() + data.browser.slice(1)}</span>
                        <span className="text-sm font-medium">{data.visitors}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                dataKey="visitors"
                type="monotone"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{
                  fill: "hsl(var(--primary))",
                  r: 4
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing total visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
    );
  }
  
  // Add a state for the button toggle
  const [isButtonOn, setIsButtonOn] = useState(false);

  // Get the date boundaries
  const fifteenYearsAgo = startOfDay(subYears(new Date(), 15));
  const twentyYearsFromNow = startOfDay(addYears(new Date(), 20));

  // Calculate years range
  const startYear = fifteenYearsAgo.getFullYear();
  const endYear = twentyYearsFromNow.getFullYear();
  const yearsRange = endYear - startYear + 1;

  // Function to determine if a date should be disabled
  const isDateDisabled = (date: Date) => {
    const startOfDate = startOfDay(date);
    return (
      isBefore(startOfDate, fifteenYearsAgo) || 
      isAfter(startOfDate, twentyYearsFromNow) ||
      isSameDay(startOfDate, fifteenYearsAgo) || 
      isSameDay(startOfDate, twentyYearsFromNow)
    );
  };

  // Get the locale based on current language
  const locale = i18n.language === 'es' ? es : undefined;

  return (
    <div className="min-h-screen items-center justify-center bg-background flex gap-4 flex-wrap content-center p-6">
      <h2 className="text-2xl font-bold w-full">This is a space to try ideas and prototype and build</h2>
      {/* <PropertyCards /> */}
      
      {/* <TooltipProvider>
  <Tooltip>
    <TooltipTrigger className="flex items-center gap-2 bg-card px-2 py-1 rounded-md text-sm "><div className=" size-2.5 rounded-full border-2 border-brand"></div> Punto de Equilibrio</TooltipTrigger>
    <TooltipContent className="w-80">
      <p> Pasando el punto de equilibrio, amortizar a genera ahorro real. </p>
      <p> Sin embargo, si puedes invertir ese dinero y obtener un rendimiento mayor que el ahorro en intereses, te conviene más <strong>invertir.</strong></p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider> */}



<Dialog>
  <DialogTrigger className="flex items-center gap-2 bg-card px-2 py-1 rounded-md text-sm "><div className=" size-2.5 rounded-full border-2 border-brand"></div> Punto de Equilibrio</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Punto de Equilibrio</DialogTitle>
      <DialogDescription>
      Después del punto de equilibrio, te sale más a cuenta invertir que seguir amortizando
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>


    </div>
  );
} 