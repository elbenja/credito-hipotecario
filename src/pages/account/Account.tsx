import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

export default function Account() {
  const { t } = useTranslation('account')

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t('title')}</h1>,
      }}
    >
      <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center px-4 py-6 md:px-6">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle>Ya lanzamos la V2</CardTitle>
            <CardDescription>Descubre la nueva V2 con mejoras 🚀</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href="https://app.creditohipotecar.io/signin">Entra aquí</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
