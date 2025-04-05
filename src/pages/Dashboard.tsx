import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import SVGillustration from '@/components/ui/SVGillustration'

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold tracking-tight">{t("sections.dashboard")}</h1>
      }}
    >
   
         {/*<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("title", { ns: "properties" })}</CardTitle>
              <CardDescription>
                {t("description", { ns: "properties" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add property stats/content here */}
            {/* </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("title", { ns: "mortgages" })}</CardTitle>
              <CardDescription>
                {t("description", { ns: "mortgages" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add mortgage stats/content here */}
            {/* </CardContent>
          </Card>

        </div> */} 



<div className="min-h-svh p-2 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 overflow-hidden">
  <div className="w-full max-w-sm inline-flex flex-col justify-start items-start gap-1 sm:gap-4">
      <div className="flex items-center space-x-4">
        <div className="text-2xl font-black flex size-16 sm:size-20 flex-none rounded-full bg-muted text-primary  items-center justify-center">01</div>   
        <Link to="/properties">
          <p className="text-md sm:text-xl leading-none hover:text-brand">Set up your properties</p>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
          <div className="text-2xl font-black flex size-16 sm:size-20 flex-none rounded-full bg-muted text-primary items-center justify-center">02</div>   
          <Link to="/mortgages">
            <p className="text-md sm:text-xl leading-none hover:text-brand">Try different mortgages and scenarios</p>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-black flex size-16 sm:size-20 flex-none rounded-full bg-muted text-primary  items-center justify-center">03
          </div>   
          <p className="text-md sm:text-xl leading-none">Choose the best option and save money</p>
        </div>

  </div>

  <div className="w-full  max-w-xs  flex-col justify-center items-center gap-4"> 
    <SVGillustration variant="ladyDog" className = 'size-100 sm:h-200 sm:w-160'/> 
  </div>

</div>



    </DashboardLayout>
  )
}
