import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { FeatureCounter } from "@/components/ui/feature-counter"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FeatureName } from "@/types/subscription"

export interface FeatureCountsProps {
  className?: string
  variant?: "default" | "primary" | "secondary" | "accent"
  progressColor?: string
  progressBgColor?: string
}

export function FeatureCounts({ 
  className,
  variant = "primary",
  progressColor = "bg-brand",
  progressBgColor = "bg-slate-600"
}: FeatureCountsProps) {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  const { user } = useAuth()

  // Fetch user subscription with plan and feature limits
  const { data: subscriptionData } = useQuery({
    queryKey: ['user-subscription-with-features', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plan:subscription_plans(
            name,
            features:plan_features(*)
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })
  
  // Fetch properties count
  const { data: propertiesCount = 0 } = useQuery({
    queryKey: ['properties-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id
  })

  // Fetch mortgages count
  const { data: mortgagesCount = 0 } = useQuery({
    queryKey: ['mortgages-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('amortizations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id
  })
  
  // Container background and text color based on variant
  const containerStyles = {
    default: "bg-card text-card-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground"
  }

  // Helper function to get feature limit
  const getFeatureLimit = (featureName: FeatureName): number => {
    if (!subscriptionData?.subscription_plan?.features) return 10
    
    const feature = subscriptionData.subscription_plan.features.find(
      (f: any) => f.feature_name === featureName
    )
    
    // Return 10 as default if feature not found
    if (!feature) return 10
    
    // -1 means unlimited, return a high number for progress calculation
    return feature.feature_limit === -1 ? 1000 : feature.feature_limit
  }

  // Get limits for each feature
  const propertyLimit = getFeatureLimit('properties')
  const mortgageLimit = getFeatureLimit('mortgages')

  return (
    <div className={cn(
      "w-32 h-80 relative rounded-3xl flex flex-col items-start p-4 gap-6",
      containerStyles[variant],
      className
    )}>
      <Badge variant="plan" className="text-xs">
        {subscriptionData?.subscription_plan?.name || 'Free'}
      </Badge>
      
      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div className="self-stretch flex flex-col justify-start items-start gap-5">
          <FeatureCounter 
            count={propertiesCount} 
            featureLabel={t('properties:title')}
            variant={variant}
            maxLimit={propertyLimit}
            progressColor={progressColor}
            progressBgColor={progressBgColor}
          />
          
          <FeatureCounter 
            count={mortgagesCount} 
            featureLabel={t('mortgages:title')}
            variant={variant}
            maxLimit={mortgageLimit}
            progressColor={progressColor}
            progressBgColor={progressBgColor}
          />
        </div>
      </div>
<button>add</button>

    </div>
  )
} 