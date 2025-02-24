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
import { addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay } from "date-fns";

type FormValues = {
  datePicker: DateRange;
};

export default function Test() {
  const form = useForm<FormValues>({
    defaultValues: {
      datePicker: {
        from: new Date(),
        to: new Date(),
      },
    },
  });

  // Calculate years range to reach 30 years from now
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + 30;
  const yearsRange = (targetYear - currentYear) * 2; // Multiply by 2 to account for past years as well

  // Get the date boundaries
  const lastWeek = startOfDay(subWeeks(new Date(), 1));
  const thirtyYearsFromNow = startOfDay(addYears(new Date(), 30));

  // Function to determine if a date should be disabled
  const isDateDisabled = (date: Date) => {
    const startOfDate = startOfDay(date);
    return (
      isBefore(startOfDate, lastWeek) || 
      isAfter(startOfDate, thirtyYearsFromNow) ||
      isSameDay(startOfDate, lastWeek) || 
      isSameDay(startOfDate, thirtyYearsFromNow)
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Form {...form}>
        <FormField
          control={form.control}
          name="datePicker"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-md font-normal">
                Single Date
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
                  disabled={isDateDisabled}
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
      </Form>
    </div>
  );
}
 