import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  
  return (
    <DashboardLayout
      header={{
        title: <h2 className="text-3xl font-bold tracking-tight">{t("title", { ns: "dashboard" })}</h2>
      }}
    >
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("title", { ns: "properties" })}</CardTitle>
              <CardDescription>
                {t("description", { ns: "properties" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add property stats/content here */}
            </CardContent>
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
            </CardContent>
          </Card>

   
        </div>
      </div>
    </DashboardLayout>
  )
}
