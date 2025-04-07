import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { FeatureCounter } from "@/components/ui/feature-counter"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FeatureName } from "@/types/subscription"
import { Trash2, Plus } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { PropertyForm } from "@/components/properties/property-form"
import { useState } from "react"

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
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

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
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
  
  // Fetch properties count
  const { data: propertiesCount = 0, refetch: refetchPropertiesCount } = useQuery({
    queryKey: ['properties-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000 // 2 minutes
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
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000 // 2 minutes
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

  const handlePropertyAdded = async () => {
    // Invalidate and refetch to ensure fresh data
    await queryClient.invalidateQueries({ queryKey: ['properties-count', user?.id] })
    // Close the sheet after successful property creation
    setOpen(false)
  }

  return (
    <div className={cn(
      "w-32 h-80 relative rounded-3xl flex flex-col justify-between items-start p-4 gap-6",
   
      containerStyles[variant],
      className
    )}>
       <div className="self-stretch flex flex-col justify-start items-start gap-6">
          <Badge variant="plan" className="text-xs">
            {subscriptionData?.subscription_plan?.name || 'Free'}
          </Badge>
      
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
    
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="text-xs h-8 flex gap-2">  
          <div className="flex-1 text-right text-sm font-medium leading-none">
            {t('actions.add_property', { ns: 'properties' })}
          </div>
          <div className="size-8 bg-card text-card-foreground rounded-[99px] flex justify-center items-center">
            <Plus className="h-4 w-4" />
          </div>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {t('actions.add_property', { ns: 'properties' })}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          <PropertyForm
            onSuccess={handlePropertyAdded}
            onClose={() => setOpen(false)}
            selectedProperty={null}
            bonusRules={[]}
          />
        </div>
      </SheetContent>
    </Sheet>
    </div>
  )
} 