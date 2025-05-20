import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/context/auth-context"
import { FeatureCounter } from "@/components/ui/feature-counter"
// import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/utils/utils"
import { FeatureName } from "@/types/subscription"
import { Trash2, Plus } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { PropertyForm } from "@/components/properties/property-form"
import { useState } from "react"
import { useUserPlanLimits } from '@/hooks/usePlanLimits'
import { usePropertyCount } from "@/hooks/properties/useCount"
import { useMortgageCount } from "@/hooks/mortgages/useCount"
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

  const {
    data: planData,
    isLoading: isLoadingPlan,
    error: planError
  } = useUserPlanLimits()
  
  // Fetch properties count
  const { data: propertiesCount = 0 } = usePropertyCount()

  // const { data: propertiesCount = 0, refetch: refetchPropertiesCount } = useQuery({
  //   queryKey: ['properties-count', user?.id],
  //   queryFn: async () => {
  //     const { count, error } = await supabase
  //       .from('properties')
  //       .select('*', { count: 'exact', head: true })
  //       .eq('user_id', user?.id)

  //     if (error) throw error
  //     return count || 0
  //   },
  //   enabled: !!user?.id,
  //   staleTime: 30 * 1000, // 30 seconds
  //   gcTime: 2 * 60 * 1000 // 2 minutes
  // })

  // Fetch mortgages count
  const { data: mortgagesCount = 0 } = useMortgageCount()
  //       .from('amortizations')
  //       .select('*', { count: 'exact', head: true })
  //       .eq('user_id', user?.id)

  //     if (error) throw error
  //     return count || 0
  //   },
  //   enabled: !!user?.id,
  //   staleTime: 30 * 1000, // 30 seconds
  //   gcTime: 2 * 60 * 1000 // 2 minutes
  // })
  
  // Container background and text color based on variant
  const containerStyles = {
    default: "bg-card text-card-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground"
  }

  const propertyLimit = planData?.limits['properties'] ?? 10
  const mortgageLimit = planData?.limits['mortgages'] ?? 10

  const handlePropertyAdded = async () => {
    // Invalidate and refetch to ensure fresh data
    await queryClient.invalidateQueries({ queryKey: ['propertyCount', user?.id] })
    
    // Broadcast property created message
    // const channel = supabase.channel('property-updates');
    // channel.send({
    //   type: 'broadcast',
    //   event: 'property-created',
    //   payload: { action: 'create', userId: user?.id },
    // });
    
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
            {planData?.plan_name || 'Free'}
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
            // bonusRules={[]}
          />
        </div>
      </SheetContent>
    </Sheet>
    </div>
  )
}