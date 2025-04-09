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
import { Plus, Pencil, Bold, Calendar } from "lucide-react";
import { PropertyCards } from "@/components/properties/property-cards";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


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
    <div className="min-h-screen  items-center justify-start bg-background flex gap-4 flex-wrap content-center p-6">
   this is a space to try ideas and prototype and build
          {/* <PropertyCards /> */}
          
          <div className="flex flex-col gap-8 w-full max-w-md">

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Two Buttons Solution</h3>
              <div className="flex items-center gap-4">
                {isButtonOn ? (
                  <button 
                    className="ON p-2 border rounded-lg bg-card"
                    onClick={() => setIsButtonOn(false)}
                  >
                    Content ON <Calendar className="h-4 w-4 inline" />
                  </button>
                ) : (
                  <button 
                    className="OFF p-2 border rounded-lg"
                    onClick={() => setIsButtonOn(true)}
                  >
                    Content OFF <Calendar className="h-4 w-4 inline" />
                  </button>
                )}
              </div>
            </div>

            
          </div>
      {/* <Form {...form}>
        <FormField
          control={form.control}
          name="datePicker"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-md font-normal">
                {t("ui.select")}
              </FormLabel>
              <FormControl>
                <CalendarDatePicker
                  date={field.value}
                  onDateSelect={({ from, to }) => {
                    form.setValue("datePicker", { from, to });
                  }}
                  variant="outline"
                  numberOfMonths={1}
                  yearsRange={yearsRange}
                  fromYear={startYear}
                  disabled={isDateDisabled}
                  locale={locale}
                  classNames={{
                    caption: "text-sm font-medium",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: cn(
                      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                    ),
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: cn(
                      "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                    ),
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle:
                      "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                  className={cn(
                    "w-full justify-start text-left font-normal form-control-focus",
                    !field.value && "text-muted-foreground"
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form> */}

    </div>
  );
}
 