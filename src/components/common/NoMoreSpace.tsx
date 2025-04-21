import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Define the type of resource that can be limited
export type ResourceType = "property" | "mortgage" | "rental";

// Plan limits interface
export interface PlanLimit {
  name: string;
  properties: number;
  mortgages: number;
  rentals: number;
  price: number;
}

interface NoMoreSpaceProps {
  resourceType: ResourceType;
  currentUsage: number;
  planLimit: number;
  currentPlan: string;
  nextPlan?: PlanLimit;
  onBack: () => void;
}

export function NoMoreSpace({
  resourceType,
  currentUsage,
  planLimit,
  currentPlan,
  nextPlan,
  onBack,
}: NoMoreSpaceProps) {
  const { t } = useTranslation(["global", "components"]);

  // Map resource type to its singular and plural forms
  const resourceLabels = {
    property: {
      singular: t("resources.property", "Property"),
      plural: t("resources.properties", "Properties"),
    },
    mortgage: {
      singular: t("resources.mortgage", "Mortgage"),
      plural: t("resources.mortgages", "Mortgages"),
    },
    rental: {
      singular: t("resources.rental", "Rental"),
      plural: t("resources.rentals", "Rentals"),
    },
  };

  const resourceSingular = resourceLabels[resourceType].singular;
  const resourcePlural = resourceLabels[resourceType].plural;

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
      {/* Image - Using a placeholder icon, replace with your actual image */}
      <div className="w-32 h-32 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 18v.5A2.5 2.5 0 0 0 4.5 21h15a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 19.5 1h-15A2.5 2.5 0 0 0 2 3.5V8" />
          <path d="M8 18h.5a2.5 2.5 0 0 0 2.5-2.5v-8A2.5 2.5 0 0 0 8.5 5H8" />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-foreground">
        {t("no_more_space.title", "Plan Limit Reached")}
      </h2>

      {/* Usage information */}
      <div className="text-muted-foreground">
        <p className="mb-2">
          {t("no_more_space.usage_message", "You're currently using {{current}} of {{limit}} {{resource}} in your {{plan}} plan.", {
            current: currentUsage,
            limit: planLimit,
            resource: resourcePlural.toLowerCase(),
            plan: currentPlan
          })}
        </p>
        <p>
          {t("no_more_space.cannot_create", "You cannot create a new {{resource}} with your current plan.", {
            resource: resourceSingular.toLowerCase()
          })}
        </p>
      </div>

      {/* Next Plan Information */}
      {nextPlan && (
        <div className="bg-muted p-4 rounded-lg w-full">
          <h3 className="font-medium mb-2">
            {t("no_more_space.upgrade_title", "Upgrade to {{plan}}", {
              plan: nextPlan.name
            })}
          </h3>
          <p className="text-sm mb-3">
            {t("no_more_space.upgrade_message", "Get access to:")}
          </p>
          <ul className="text-sm text-left space-y-1 mb-4">
            <li>• {nextPlan.properties} {resourceLabels.property.plural}</li>
            <li>• {nextPlan.mortgages} {resourceLabels.mortgage.plural}</li>
            <li>• {nextPlan.rentals} {resourceLabels.rental.plural}</li>
          </ul>
          <p className="font-medium">
            ${nextPlan.price.toFixed(2)} {t("no_more_space.per_year", "per year")}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full">
        <Button 
          className="w-full" 
          variant="default"
          asChild
        >
          <Link to="/#pricing">
            {t("no_more_space.upgrade_button", "Upgrade My Plan")}
          </Link>
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("ui.back", "Back")}
        </Button>
      </div>
    </div>
  );
} 