import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useTranslation } from "react-i18next"

export default function Settings() {
  const { t } = useTranslation(['global'])
  const { theme, setTheme } = useTheme()

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-3xl font-bold">{t('settings.title')}</h1>,
      }}
    >
      <div className="container py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
            <CardDescription>
              {t('settings.appearance_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t('settings.theme')}</Label>
              <div className="flex gap-4">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" />
                  {t('settings.light')}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t('settings.dark')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>
              {t('settings.language_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t('settings.language')}</Label>
              <div>
                <LanguageSwitcher />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 