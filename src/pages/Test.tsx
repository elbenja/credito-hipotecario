import { cn, normalizeDate } from "@/lib/utils";

import { es } from 'date-fns/locale';
import { useTranslation } from "react-i18next";
import { SVGfixed } from "@/components/ui/svg-fixed";
import { Button } from "@/components/ui/button";
import SVGillustration from "@/components/ui/SVGillustration";
import { Input } from "@/components/ui/input";
import { isBefore } from "date-fns";
import { isAfter } from "date-fns";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";
import { isSameDay } from "date-fns";
import { addYears } from "date-fns";
import { subYears } from "date-fns";
import { startOfDay } from "date-fns";





export default function Test() {
  const { i18n, t } = useTranslation();
  


  




  // Get the locale based on current language
  const locale = i18n.language === 'es' ? es : undefined;

  return (
    <div className="min-h-screen items-center justify-center bg-background flex gap-4 flex-col content-center p-6">
      <h1 className="text-2xl font-bold w-full">This is a space to try ideas and prototype and build</h1>



<div className="flex flex-col items-center justify-center w-72">

  <div className="flex flex-col items-center justify-center size-120 ">
  <SVGillustration variant="keyhole" className="size-120" />

  <SVGillustration variant="astroGirl" className="size-120" />
  </div>

  <h2 className="text-2xl font-bold text-center">You need more space</h2>

  <p className="text-center text-xl">Upgrade your plan to unlock more properties and mortgages!</p>

  <Button variant="default" size="lg" className="border-none mt-8">
  Upgrade Plan
  </Button>

</div>

<Input type="date" name="begin" 
           placeholder="dd-mm-yyyy" value="" 
           min="2000-01-01" max="2030-12-31"  />
      {/* <FeatureCounts /> */}
      {/* <PropertyCards /> */}
      {/* {isThisScenarioSaved ? (
                 <Button variant="outline" className="" >             
                        Saved scenario
                        <Heart className="size-4 text-brand" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="border"
                    onClick={() => setIsButtonOn(true)}>
                        Save scenario
                        <Heart className="size-4 " />
                  </Button>
                )} */}

<CalendarDatePicker
                      date={{
                        from: new Date(),
                        to: new Date()
                      }}
                      onDateSelect={({ from }) => {
                        if (from) {
                    
                        }
                      }}
                      variant="outline"
                      numberOfMonths={1}
                      yearsRange={35} // 15 years back + 20 years forward
                      fromYear={new Date().getFullYear() - 15}
                      disabled={(date) => {
                        const startOfDate = startOfDay(date)
                        const fifteenYearsAgo = startOfDay(subYears(new Date(), 15))
                        const twentyYearsFromNow = startOfDay(addYears(new Date(), 20))
                        
                        return (
                          isBefore(startOfDate, fifteenYearsAgo) || 
                          isAfter(startOfDate, twentyYearsFromNow) ||
                          isSameDay(startOfDate, fifteenYearsAgo) || 
                          isSameDay(startOfDate, twentyYearsFromNow)
                        )
                      }}
                      className={cn(
                        "w-full justify-start text-left font-normal form-control-focus",
                    
                      )}
                    />

                    

<Button variant="outline" className="border-none">
  <SVGfixed name="heartFilled" strokeClassName="text-brand" fillClassName="fill-brand" /> 
 
</Button>
<SVGfixed name="girlLuna" size={200}  strokeClassName="text-transparent"  fillClassName="fill-slate-500" />
<SVGfixed name="heartFilled" strokeClassName="text-transparent" size={200}  fillClassName="fill-green-500" />

    </div>
  );
} 