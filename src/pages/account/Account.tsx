import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
// import { getUserPlanLimits } from "@/services/planService"
import { useAuth } from "@/context/auth-context"
// import SVGillustration from "@/components/ui/SVGillustration"
import { PlanCard } from "@/components/blocks/PlanCard"
import { usePlans, useSubscriptionAccess, useUserPlanLimits } from "@/hooks/usePlanLimits"
import { createCheckoutSession, redirectToCheckout, createCustomerPortalSession, redirectToCustomerPortal } from "@/services/stripeService"
import { toast } from "sonner"

export default function Account() {
  const { t } = useTranslation('account')
  // const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)
  const { data: planLimits, isLoading: isPlanLimitsLoading, error: planLimitsError } = useUserPlanLimits()
  const hasAccess = useSubscriptionAccess(user?.id || null)
  // console.log('planLimits', planLimits)

  const { data: plans, isLoading, error } = usePlans(user?.id || null)

  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleUpgrade = async (priceId: string, planName: string) => {
    console.log('handleUpgrade', priceId, planName)
    if (!priceId || isUpgrading || !user) {
      if (!user) {
        toast.error('Please log in to upgrade your plan');
      }
      return;
    }
    
    setIsUpgrading(priceId);
    
    try {
      console.log(`Starting checkout for plan: ${planName} with price_id: ${priceId}`);
      const { checkout_url } = await createCheckoutSession(priceId);
      
      if (checkout_url) {
        toast.success('Redirecting to checkout...');
        // Redirect to Stripe Checkout
        redirectToCheckout(checkout_url);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(`Failed to start checkout: ${error.message}`);
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      toast.error('Please log in to manage your subscription');
      return;
    }
    setIsLoadingPortal(true);
    try {
      const { url } = await createCustomerPortalSession();
      redirectToCustomerPortal(url);
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      toast.error(`Failed to open customer portal: ${error.message}`);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (isLoading) return <p>{t('loading_plans')}</p>
  if (error || !plans) return <p>{t('error_loading_plans')}</p>

  // Sort plans by yearly price (ascending)
  const sortedPlans = plans.slice().sort((a, b) => a.price_yearly - b.price_yearly);

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t('title')}</h1>,
      }}
    >
      <div className="container py-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p>{t('currently_on_plan')}: <span className="font-bold">{planLimits?.plan_name ?? t('free')}</span></p>
            </div>
            <Button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              variant="outline"
            >
              {isLoadingPortal ? t('loading') : t('manage_subscription')}
            </Button>
          </div>
          <Separator />
          <p className="text-muted-foreground">{t('change_plan_below')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sortedPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={handleUpgrade}
                isUpgrading={isUpgrading}
                hasAccess={hasAccess.hasAccess}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}