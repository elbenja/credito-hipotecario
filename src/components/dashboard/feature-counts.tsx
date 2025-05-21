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
  onOpenEmptyPropertyForm?: () => void
}

export function FeatureCounts({ 
  className,
  variant = "primary",
  progressColor = "bg-brand",
  progressBgColor = "bg-slate-600",
  onOpenEmptyPropertyForm
}: FeatureCountsProps) {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  const { user } = useAuth()
  // const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: planData,
    isLoading: isLoadingPlan,
    error: planError
  } = useUserPlanLimits()
  
  // Fetch properties count
  const { data: propertiesCount = 0 } = usePropertyCount()


  // Fetch mortgages count
  const { data: mortgagesCount = 0 } = useMortgageCount()

  
  // Container background and text color based on variant
  const containerStyles = {
    default: "bg-card text-card-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground"
  }

  const propertyLimit = planData?.limits['properties'] ?? 10
  const mortgageLimit = planData?.limits['mortgages'] ?? 10

  if (propertiesCount < 1 ) {
    return null;
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
               <button 
                type="button"
                onClick={onOpenEmptyPropertyForm} 
                className="text-xs h-8 flex gap-2">  
                  <div className="flex-1 text-right text-sm font-medium leading-none">
                    {t('actions.add_property', { ns: 'properties' })}
                  </div>
                  <div className="size-8 bg-card text-card-foreground rounded-[99px] flex justify-center items-center">
                    <Plus className="h-4 w-4" />
                  </div>
              </button>


    </div>
  )
}