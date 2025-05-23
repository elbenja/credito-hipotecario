import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "@/utils/utils";

interface PlanCardProps {
  plan: {
    name: string;
    price_yearly: number;
    limits: Record<string, number | 'Unlimited'>;
    is_current_plan?: boolean | null;
    price_id?: string | null;
    current_period_end?: string | null;
  };
  onSelect: (priceId: string) => void;
}

export function PlanCard({ plan, onSelect }: PlanCardProps) {
  const isCurrent = !!plan.is_current_plan;
  const isUpgradable = !isCurrent && !!plan.price_id;
  const buttonLabel = isCurrent
    ? "Current Plan"
    : isUpgradable
    ? "Upgrade"
    : "Get";

  // Format the current period end date if available
  let activeUntil = null;
  if (isCurrent && plan.current_period_end) {
    const date = new Date(plan.current_period_end);
    activeUntil = `Active until ${date.toISOString().split("T")[0]}`;
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
          {isCurrent && <Badge variant="primary">Current</Badge>}
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
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent || !plan.price_id}
          onClick={() => plan.price_id && onSelect(plan.price_id)}
        >
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PlanCard; 