import { cn } from "@/lib/utils";

import { es } from 'date-fns/locale';
import { useTranslation } from "react-i18next";
import { SVGfixed } from "@/components/ui/svg-fixed";
import { Button } from "@/components/ui/button";
import SVGillustration from "@/components/ui/SVGillustration";


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
  


  




  // Get the locale based on current language
  const locale = i18n.language === 'es' ? es : undefined;

  return (
    <div className="min-h-screen items-center justify-center bg-background flex gap-4 flex-col content-center p-6">
      <h1 className="text-2xl font-bold w-full">This is a space to try ideas and prototype and build</h1>



<div className="flex flex-col items-center justify-center w-72">

  <div className="flex flex-col items-center justify-center size-120 ">
  <SVGillustration variant="astroGirl" className="size-120" />
  </div>

  <h2 className="text-2xl font-bold text-center">You need more space</h2>

  <p className="text-center text-xl">Upgrade your plan to unlock more properties and mortgages!</p>

  <Button variant="default" size="lg" className="border-none mt-8">
  Upgrade Plan
  </Button>

</div>

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
<Button variant="outline" className="border-none">
  <SVGfixed name="heartFilled" strokeClassName="text-brand" fillClassName="fill-brand" /> 
 
</Button>
<SVGfixed name="girlLuna" size={200}  strokeClassName="text-transparent"  fillClassName="fill-slate-500" />
<SVGfixed name="heartFilled" strokeClassName="text-transparent" size={200}  fillClassName="fill-green-500" />

    </div>
  );
} 