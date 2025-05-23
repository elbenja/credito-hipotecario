import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
// import { getUserPlanLimits } from "@/services/planService"
import { useAuth } from "@/context/auth-context"
import SVGillustration from "@/components/ui/SVGillustration"
import { PlanCard } from "@/components/blocks/PlanCard"
import { usePlans } from "@/hooks/usePlanLimits"

// type PlanLimits = {
//   plan_name: string
//   current_period_end: string
//   limits: Record<string, number>
// }

// plan_name: string;
// current_period_end: string;
// limits: Record<string, number>;

export default function Account() {
  const { t } = useTranslation(['global'])
  // const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  // const [plan, setPlan] = useState<PlanLimits | null>(null)

  const { data: plans, isLoading, error } = usePlans(user?.id || null)

  if (isLoading) return <p>Loading plans...</p>
  if (error || !plans) return <p>Something went wrong</p>
  // useEffect(() => {
  //   const loadPlan = async () => {
  //     if (!user?.id) return
  //     const fetchedPlan = await getUserPlanLimits(user.id)
  //     setPlan(fetchedPlan)
  //   }
  //   loadPlan()
  // }, [user])

  // if (!plan) return null
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-3xl font-bold">{t('account.title')}</h1>,
      }}
    >
      <div className="container py-6 space-y-6">

   
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {plans.map(plan => (
        <div key={plan.id} className="border p-4 rounded">
          <h2 className="text-xl font-semibold">{plan.name}</h2>
          <p>${plan.price_yearly} / year</p>
          <ul className="mt-2">
            {Object.entries(plan.limits).map(([key, value]) => (
              <li key={key}>✔ {value} {key}</li>
            ))}
          </ul>
          <button
            disabled={plan.is_current_plan}
            className={`mt-4 px-4 py-2 w-full ${
              plan.is_current_plan ? 'bg-gray-400' : 'bg-black text-white'
            }`}
          >
            {plan.is_current_plan ? 'Current Plan' : 'Upgrade'}
          </button>
        </div>
      ))}
    </div>


        {/* <div className="flex justify-center">
      <SVGillustration variant="cat" className="size-52 -mb-8" />
        </div> */}

        {/* <Card>
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
           
            <Button className="w-full" onClick={() => {

            }}>
                  Upgrade Plan
                </Button>
          </CardFooter>
        </Card> */}

  
      </div>
    </DashboardLayout>
  )
}