import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  
  return (
    <DashboardLayout
      header={{
        title: <h2 className="text-3xl font-bold tracking-tight">{t("title", { ns: "dashboard" })}</h2>
      }}
    >
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 items-center justify-center">
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

        <div className="p-6  flex flex-col gap-6">

          <div className="flex items-center space-x-4">
            <div className="text-2xl font-black flex w-20 h-20 flex-none rounded-full bg-muted text-primary  items-center justify-center">01</div>   
            <Link to="/properties">
              <p className="text-xl leading-none hover:text-brand">Set up your properties</p>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-2xl font-black flex w-20 h-20 flex-none rounded-full bg-muted text-primary items-center justify-center">02</div>   
            <Link to="/mortgages">
              <p className="text-xl leading-none hover:text-brand">Try different mortgages and scenarios</p>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-2xl font-black flex w-20 h-20 flex-none rounded-full bg-muted text-primary  items-center justify-center">03</div>   
            <p className="text-xl leading-none">Choose the best option and save money</p>
          </div>
          </div>
       </div>
    </DashboardLayout>
  )
}
