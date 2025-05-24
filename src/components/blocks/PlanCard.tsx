import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "@/utils/utils";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    price_yearly: number;
    price_monthly: number;
    price_id: string;
    limits: Record<string, string>; // Updated to match Plan type
    is_current_plan: boolean;
    current_period_end: string | null;
  };
  onSelect: (priceId: string, planName: string) => void;
  isUpgrading?: string | null; // For showing loading state
}

export function PlanCard({ plan, onSelect, isUpgrading }: PlanCardProps) {
  const isCurrent = plan.is_current_plan;
  const isUpgradable = !isCurrent && !!plan.price_id;
  const isProcessing = isUpgrading === plan.price_id;
  
  const buttonLabel = isCurrent
    ? "Current Plan"
    : isProcessing
    ? "Processing..."
    : isUpgradable
    ? "Upgrade"
    : "Get";

  // Format the current period end date if available
  let activeUntil = null;
  if (isCurrent && plan.current_period_end) {
    const date = new Date(plan.current_period_end);
    activeUntil = `Active until ${date.toLocaleDateString()}`;
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col justify-between h-full transition-shadow",
        isCurrent && "border-2 border-primary shadow-lg"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
          
          {isCurrent && <Badge variant="default">Current</Badge>}
        </div>
        {activeUntil && (
          <div className="text-sm text-muted-foreground mt-1">{activeUntil}</div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 py-2">
        <div className="text-4xl font-bold">${plan.price_yearly.toFixed(2)}</div>
        <div className="text-muted-foreground text-sm mb-2">yearly</div>
        <div className="flex flex-col gap-2 w-full">
          {Object.entries(plan.limits).map(([feature, value]) => (
            <div key={feature} className="flex items-center gap-2 text-base">
              <span className="text-xl">✅</span>
              <span>
                {value === "Unlimited" ? "Unlimited" : value} {feature.charAt(0).toUpperCase() + feature.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center justify-center">
     <small className="text-xs text-foreground">
      IsCurrent: {String(isCurrent)} | Price ID: {plan.price_id || 'None'} | isProcessing: {String(isProcessing)}
     </small>

        <Button
          className="w-full"
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent || !plan.price_id || isProcessing}
          onClick={() => plan.price_id && onSelect(plan.price_id, plan.name)}
        >
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PlanCard; 


{/* <div key={plan.id} className="border p-4 rounded shadow-sm">
          <h3 className="text-lg font-bold">{plan.name}</h3>
          <p>${plan.price_yearly} / year</p>
          <ul className="mt-2 text-sm">
            {Object.entries(plan.limits).map(([feature, limit]) => (
              <li key={feature}>✅ {limit} {feature}</li>
            ))}
          </ul>
          <button
            className={`mt-4 w-full py-2 text-white ${
              plan.is_current_plan ? 'bg-gray-400 cursor-default' : 'bg-black hover:bg-gray-800'
            }`}
            disabled={plan.is_current_plan}
          >
            {plan.is_current_plan ? 'Current Plan' : 'Upgrade'}
          </button>
        </div> */}