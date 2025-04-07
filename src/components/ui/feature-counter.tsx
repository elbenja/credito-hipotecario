import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

export interface FeatureCounterProps {
  /**
   * The count to display
   */
  count: number
  /**
   * The feature label to display
   */
  featureLabel: string
  /**
   * CSS class name for container styling
   */
  className?: string
  /**
   * Custom color variant for the counter
   */
  variant?: "default" | "primary" | "secondary" | "accent"
  /**
   * Maximum limit allowed by the user's plan
   */
  maxLimit?: number
  /**
   * Custom color for the progress indicator
   */
  progressColor?: string
  /**
   * Custom color for the progress background
   */
  progressBgColor?: string
}

/**
 * FeatureCounter component displays a count for a specific feature
 */
export function FeatureCounter({
  count,
  featureLabel,
  className,
  variant = "default",
  maxLimit = 10,
  progressColor = "bg-brand",
  progressBgColor = "bg-slate-300"
}: FeatureCounterProps) {
  const { t } = useTranslation()
  
  // Calculate percentage of usage
  const percentage = maxLimit > 0 ? Math.min(Math.round((count / maxLimit) * 100), 100) : 0
  
  return (
    <div className="space-y-1 w-full">
      <div className={`relative h-1 w-full overflow-hidden rounded-[99px] ${progressBgColor}`}>
        <div 
          className={`h-full flex-1 ${progressColor} transition-all`}
          style={{ 
            width: `${percentage}%`,
            borderRadius: '99px'
          }}
        />
      </div>
      <div className={cn(
        "flex flex-col justify-center items-start gap-0.5",
        className
      )}>
        <div className="text-xl font-semibold leading-tight">
          {count}
        </div>
        <div className="text-xs font-normal leading-none">
          {featureLabel}
        </div>
      </div>
    </div>
  )
} 