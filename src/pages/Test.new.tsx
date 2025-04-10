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
import { Label } from "@/components/ui/label";
import { CartesianGrid, LabelList, Line, LineChart } from "recharts";

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

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-2))",
  },
  chrome: {
    label: "Chrome",
    color: "hsl(var(--chart-1))",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
  firefox: {
    label: "Firefox",
    color: "hsl(var(--chart-3))",
  },
  edge: {
    label: "Edge",
    color: "hsl(var(--chart-4))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
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
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 24,
                left: 24,
                right: 24,
              }}
            >
              <CartesianGrid vertical={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Line
                dataKey="visitors"
                type="natural"
                stroke="var(--color-visitors)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-visitors)",
                }}
                activeDot={{
                  r: 6,
                }}
              >
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                  dataKey="browser"
                  formatter={(value: keyof typeof chartConfig) =>
                    chartConfig[value]?.label
                  }
                />
              </Line>
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
    <div className="min-h-screen items-center justify-start bg-background flex gap-4 flex-wrap content-center p-6">
      <h2>This is a space to try ideas and prototype and build</h2>
      {/* <PropertyCards /> */}
      
      <div className="flex flex-col gap-8 w-full max-w-md">
        <LineChartComponent />
      </div>
    </div>
  );
} 