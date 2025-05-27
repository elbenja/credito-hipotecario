//benjamin + chatGPT component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { format, isValid, parse, setMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import { enUS , es } from "date-fns/locale";
 

// dynamically select the locale


export function MonthYearPicker({
  field,
  form,
  minDate,
  maxDate,
  labelKey = "labelKey",
  ns = "global",
}: {
  field: any,
  form: any,
  minDate?: Date;
  maxDate?: Date;
  labelKey?: string;
  ns?: string;
}) {
  const { t } = useTranslation((ns as any));

  const selectedDate = field.value || new Date();
  const { i18n } = useTranslation();
  const currentLocale = i18n.language === "es" ? es : enUS;

  const monthLabels = Array.from({ length: 12 }, (_, i) => {
    const label = format(setMonth(new Date(), i), "MMM", { locale: currentLocale });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  const selectedMonth = format(selectedDate, "MMM", { locale: currentLocale });
  const selectedMonthCapitalized = selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1);
  const selectedYear = format(selectedDate, "yyyy");

  
  const isMonthDisabled = (month: string) => {
    const monthIndex = monthLabels.indexOf(month);
    const year = parseInt(selectedYear);
    const date = new Date(year, monthIndex, 1);
    return (
      (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) ||
      (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1))
    );
  };

  const isYearDisabled = (year: number) => {
    const monthIndex = selectedDate.getMonth();
    const date = new Date(year, monthIndex, 1);
    return (
      (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) ||
      (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1))
    );
  };

  return (
    <FormItem>
      <FormLabel>{t(labelKey)}</FormLabel>
      <FormControl>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={selectedMonthCapitalized}
            onValueChange={(month) => {
              const monthIndex = monthLabels.indexOf(month);
              const newDate = new Date(parseInt(selectedYear), monthIndex, 1);
              if (isValid(newDate)) {
                console.log("Selected date:", newDate.toISOString().split("T")[0]);
                field.onChange(newDate);
                form.trigger(field.name);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthLabels.map((month) => (
                <SelectItem key={month} value={month} disabled={isMonthDisabled(month)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear}
            onValueChange={(yearStr) => {
              const year = parseInt(yearStr);
              const monthIndex = selectedDate.getMonth();
              const newDate = new Date(year, monthIndex, 1);
              if (isValid(newDate)) {
                console.log("Selected date:", newDate.toISOString().split("T")[0]);
                field.onChange(newDate);
                form.trigger(field.name);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - 15 + i).map((year) => (
                <SelectItem key={year} value={year.toString()} disabled={isYearDisabled(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
