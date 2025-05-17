import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
// import { UserPlanLimits } from "@/components/account/UserPlanLimits"
import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { getUserPlanLimits } from "@/services/planService"
import { useAuth } from "@/context/auth-context"

type PlanLimits = {
  plan_name: string
  current_period_end: string
  limits: Record<string, number>
}

// plan_name: string;
// current_period_end: string;
// limits: Record<string, number>;

export default function Account() {
  const { t } = useTranslation(['global'])
  // const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [plan, setPlan] = useState<PlanLimits | null>(null)

  useEffect(() => {
    const loadPlan = async () => {
      if (!user?.id) return
      const fetchedPlan = await getUserPlanLimits(user.id)
      setPlan(fetchedPlan)
    }
    loadPlan()
  }, [user])

  if (!plan) return null
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-3xl font-bold">{t('account.title')}</h1>,
      }}
    >
      <div className="container py-6 space-y-6">
    

    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Current Plan</CardTitle>
        <CardDescription className="text-muted-foreground">
          {plan.plan_name} – Active until{" "}
          {new Date(plan.current_period_end).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="mt-4 space-y-4">
        {Object.entries(plan.limits).map(([feature, limit]) => (
          <div key={feature} className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {feature.replaceAll('_', ' ')}
            </span>
            <span className="font-medium">
              {limit === -1 ? 'Unlimited' : limit}
            </span>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        {/* <Button>Upgrade Plan</Button> */}
        <Button className="w-full" onClick={() => {

        }}>
              Upgrade Plan
            </Button>
      </CardFooter>
    </Card>

  
      </div>
    </DashboardLayout>
  )
}