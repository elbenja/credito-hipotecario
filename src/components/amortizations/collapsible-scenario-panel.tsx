import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

type TagColor = "primary" | "green" | "blue" | "amber" | "red";

interface CollapsibleScenarioPanelProps {
  title: string;
  tag: string;
  tagColor: TagColor;
  defaultOpen?: boolean;
  summary?: {
    months: number | string;
    payment: string;
    difference?: string;
    isPaymentReduction?: boolean;
  };
  children: React.ReactNode;
}

const getTagStyles = (color: TagColor) => {
  switch (color) {
    case "primary":
      return "bg-primary/20 text-primary";
    case "green":
      return "bg-green-100 text-green-800";
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "amber":
      return "bg-amber-100 text-amber-800";
    case "red":
      return "bg-red-100 text-red-800";
    default:
      return "bg-primary/20 text-primary";
  }
};

export function CollapsibleScenarioPanel({
  title,
  tag,
  tagColor,
  defaultOpen = false,
  summary,
  children
}: CollapsibleScenarioPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-lg overflow-hidden"
    >
      <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex flex-col items-start">
          <h3 className="text-xl font-semibold flex items-center">
            {title}
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getTagStyles(tagColor)}`}>
              {tag}
            </span>
          </h3>
          
          {summary && (
            <div className="mt-2 flex items-center text-sm">
              <div className="mr-4">
                <span className="text-muted-foreground">Months:</span>{" "}
                <span className="font-medium">{summary.months}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Payment:</span>{" "}
                <span className="font-medium">{summary.payment}</span>
                {summary.difference && (
                  <span className={`ml-1 ${summary.isPaymentReduction ? 'text-blue-600' : 'text-red-600'}`}>
                    ({summary.isPaymentReduction ? '-' : '+'}{summary.difference})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-6 pb-6 pt-2">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
} 