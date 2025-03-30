import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"

export default function Dashboard() {
  const { t } = useTranslation()
  
  return (
    <DashboardLayout
      header={{
        title: <h2 className="text-3xl font-bold tracking-tight">{t("dashboard.title", "Dashboard")}</h2>
      }}
    >
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("dashboard.properties.title", "Properties")}</CardTitle>
              <CardDescription>
                {t("dashboard.properties.description", "Manage your real estate portfolio")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add property stats/content here */}
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("dashboard.mortgages.title", "Mortgages")}</CardTitle>
              <CardDescription>
                {t("dashboard.mortgages.description", "Track your mortgage calculations")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add mortgage stats/content here */}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("dashboard.analytics.title", "Analytics")}</CardTitle>
              <CardDescription>
                {t("dashboard.analytics.description", "View your financial insights")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add analytics stats/content here */}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
