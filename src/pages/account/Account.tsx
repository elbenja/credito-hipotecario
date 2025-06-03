import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
import { useQueryClient } from '@tanstack/react-query';
import { AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Alert } from "@/components/ui/alert"
import { Copy, Terminal } from "lucide-react"

// import { testErrorMapping } from "@/utils/test-error-mapping"; // it works

export default function Account() {
  const { t } = useTranslation('account')
  // const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)
  const { data: planLimits, isLoading: isPlanLimitsLoading, error: planLimitsError } = useUserPlanLimits()
  const hasAccess = useSubscriptionAccess(user?.id || null)
  // console.log('planLimits', planLimits)

  const { data: plans, isLoading, error, refetch } = usePlans(user?.id || null)

  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const queryClient = useQueryClient();
  if (isLoading) return <p>{t('loading_plans')}</p>
  if (error || !plans) return <p>{t('error_loading_plans')}</p>

  // Sort plans by yearly price (ascending)
  const sortedPlans = plans.slice().sort((a, b) => a.price_yearly - b.price_yearly);

  const stripeCustomerId = plans.find(p => p.is_current_plan)?.stripe_customer_id

  const hasStripeCustomerId = !!stripeCustomerId

  const handleUpgrade = async (priceId: string, planName: string) => {
    console.log('handleUpgrade stripeCustomerId', priceId, planName, stripeCustomerId);
  
    if (!priceId || isUpgrading || !user) {
      if (!user) {
        toast.error(t('toast.please_login_upgrade'));
      }
      return;
    }
  
    // ✅ Send existing customers to the portal instead of direct checkout
    if (stripeCustomerId) {
      // toast.success(t('toast.redirecting_billing_portal'));
      // await redirectToCustomerPortal(); // You might want to await or just navigate
      console.log('stripeCustomerId', stripeCustomerId)
      handleManageSubscription()
      return;
    }
  
    setIsUpgrading(priceId);
  
    try {
      console.log(`Starting checkout for plan: ${planName} with price_id: ${priceId}`);
      const response = await createCheckoutSession(priceId);
      
      if (response.checkout_url) {
        toast.success(t('toast.redirecting_checkout'));
        redirectToCheckout(response.checkout_url);
      } else if (response.message === 'Subscription updated') {
        toast.success(t('toast.plan_updated'));
        queryClient.invalidateQueries({ queryKey: ['activePlansWithLimits', user?.id] });
        await refetch();
      } else {
        throw new Error('Something went wrong');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(t('toast.checkout_failed', { message: error.message }));
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      toast.error(t('toast.please_login_manage'));
      return;
    }
    setIsLoadingPortal(true);
    try {
      const { url } = await createCustomerPortalSession();
      redirectToCustomerPortal(url);
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      toast.error(t('toast.customer_portal_failed', { message: error.message }));
    } finally {
      setIsLoadingPortal(false);
    }
  };


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
              <p>{t('currently_on_plan')} <span className="font-bold">{planLimits?.plan_name ?? t('free')}</span></p>
            </div>

            
            {hasStripeCustomerId && (
              <Button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  variant="outline"
                >
                  {isLoadingPortal ? t('loading') : t('manage_subscription')} 
                </Button>
              )}
          </div>

            
                <div className="self-stretch inline-flex justify-between items-center">
                  <div className="w-96  flex justify-center items-center gap-2">
                    <div className="flex-1 justify-start  font-medium  leading-none">Actualmente no tienes plan, obten uno para vencer al banco 💪</div>
                  </div>
                  <div className="size- flex justify-start items-center gap-4">
                    <div className="text-center justify-start text-neutral-800 text-base font-medium leading-none">Descuento de lanzamiento</div>
                    <Button variant="outline" className="bg-brand  text-center justify-start text-base font-extrabold uppercase leading-tight border-0">
                    <div className="">20CREDITO</div> <Copy className="w-4 h-4" />
                    </Button>
                   
                  </div>
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
         
        <Alert className="w-full mb-16 mt-12">
          <Terminal className="h-4 w-4" />
         
          <AlertTitle >
            <span className="bg-brand text-black xl:text-lg py-0.5 px-2 rounded-md"> {t('alert.title')}</span> 
            </AlertTitle>
              <AlertDescription>
                {t('alert.description')}
              </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  )
}