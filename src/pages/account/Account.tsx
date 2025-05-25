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
import { createCheckoutSession, redirectToCheckout } from "@/services/stripeService"
import { toast } from "sonner"

export default function Account() {
  const { t } = useTranslation(['global'])
  // const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)
  // const [plan, setPlan] = useState<PlanLimits | null>(null)

  const { data: plans, isLoading, error } = usePlans(user?.id || null)

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

//   if (isLoading) return <p>Loading plans...</p>
//   if (error || !plans) return <p>Something went wrong</p>

//   return (
//     <DashboardLayout
//       header={{
//         title: <h1 className="text-3xl font-bold">Account</h1>,
//       }}
//     >
//       <div className="container py-6 space-y-6">

   
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           {plans.map(plan => (
//             <PlanCard
//               key={plan.id}
//               plan={plan}
//               onSelect={handleUpgrade}
//               isUpgrading={isUpgrading}
//             />
//           ))}
//         </div>

//       </div>
//     </DashboardLayout>
//   )
// }
// ... existing code ...

if (isLoading) return <p>Loading plans...</p>
if (error || !plans) return <p>Something went wrong</p>

// Sort plans by yearly price (ascending)
const sortedPlans = plans.slice().sort((a, b) => a.price_yearly - b.price_yearly);

return (
  <DashboardLayout
    header={{
      title: <h1 className="text-3xl font-bold">Account</h1>,
    }}
  >
    <div className="container py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sortedPlans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleUpgrade}
            isUpgrading={isUpgrading}
          />
        ))}
      </div>
    </div>
  </DashboardLayout>
)
}

// ... existing code ...