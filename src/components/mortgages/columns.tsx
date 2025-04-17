import { ColumnDef } from "@tanstack/react-table"
import { Car, Clock, CreditCard, Calendar, DollarSign, GripVertical } from "lucide-react"
import type { Mortgage, Property } from "../../types"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Copy, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Function to render a badge with percentage
const PercentageBadge = ({ value }: { value: string }) => (
  <Badge variant="outline" className="px-2 py-1 font-medium">
    {value}%
  </Badge>
)

// Function to render scenario icon based on type
const ScenarioIcon = ({ type }: { type: string | null }) => {
  switch(type) {
    case "regular":
      return <Car className="h-4 w-4 mr-2" />
    case "accelerated":
      return <Clock className="h-4 w-4 mr-2" />
    case "new_rate":
      return <CreditCard className="h-4 w-4 mr-2" />
    case "lower_payment":
      return <Calendar className="h-4 w-4 mr-2" />
    case "a_plazo":
      return <Calendar className="h-4 w-4 mr-2" />
    case "a_cuotas":
      return <DollarSign className="h-4 w-4 mr-2" />
    default:
      return <Car className="h-4 w-4 mr-2" />
  }
}

// Define translation keys for scenario types
const scenarioTranslationKeys: Record<string, string> = {
  "regular": "scenario_graphs.regular.title",
  "accelerated": "scenario_graphs.accelerated.title", 
  "lower_payment": "scenario_graphs.lower_payment.title",
  "new_rate": "scenario_graphs.new_rate.title",
  "a_plazo": "a_plazo", // Custom translation
  "a_cuotas": "a_cuotas" // Custom translation
};

// These functions don't use React hooks, so they're safe to use in any context
const getPropertyCurrency = (properties: Property[], mortgageId: string): "USD" | "PEN" => {
  for (const property of properties) {
    for (const mortgage of property.mortgages) {
      if (mortgage.id === mortgageId) {
        return property.currency;
      }
    }
  }
  return "USD"; // Default fallback
};

const getPropertyPrice = (properties: Property[], mortgageId: string): number => {
  for (const property of properties) {
    for (const mortgage of property.mortgages) {
      if (mortgage.id === mortgageId) {
        return property.price_cost;
      }
    }
  }
  return 0; // Default fallback
};

// Determine if a term is "simple" or "doble" based on the installments per year
const getTermType = (mortgage: Mortgage): "simple" | "doble" => {
  // If installments per year is 14, it's "doble", otherwise "simple"
  return mortgage.installments_per_year === 14 ? "doble" : "simple";
};

// Update this interface to match the actual translation functions
interface Translations {
  tGlobal: Function;
  tMortgages: Function;
  tComponents: Function;
}

// Fallback translations
const fallbackTranslations: Translations = {
  tGlobal: (key: string) => key,
  tMortgages: (key: string) => key,
  tComponents: (key: string) => key
};

export const getColumns = (
  properties: Property[],
  handleDuplicate: (e: React.MouseEvent, mortgage: Mortgage) => Promise<void>,
  handleDelete: (e: React.MouseEvent, mortgage: Mortgage) => Promise<void>,
  translations = fallbackTranslations
): ColumnDef<Mortgage>[] => {
  const { tGlobal, tMortgages, tComponents } = translations;
  
  // Use this function without hooks
  const getScenarioTranslation = (scenarioType: string | null): string => {
    if (!scenarioType) return "-";
    
    const key = scenarioTranslationKeys[scenarioType];
    if (key) {
      if (key === "a_plazo") return "A Plazo";
      if (key === "a_cuotas") return "A Cuotas";
      return tComponents(key);
    }
    return scenarioType;
  };

  return [
    {
      id: "drag_handle",
      accessorKey: "drag_handle",
      header: "",
      cell: ({ row }) => {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing h-full w-full px-2 py-2 touch-none"
                  onClick={(e) => {
                    console.log("Drag handle clicked");
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    console.log("Drag handle mouse down");
                    e.stopPropagation();
                  }}
                  draggable="true"
                  onDragStart={(e) => {
                    console.log("Drag started for row:", row.original.id);
                    // Set the drag data - mortgage ID
                    e.dataTransfer.setData('text/plain', row.original.id);
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // Also set a class for visual feedback
                    try {
                      // Add a class to the row being dragged
                      const rowElement = e.currentTarget.closest('tr');
                      if (rowElement) {
                        console.log("Found row element, adding opacity class");
                        rowElement.classList.add('opacity-50');
                      } else {
                        console.log("Could not find row element");
                      }
                    } catch (error) {
                      console.error("Error setting drag visual:", error);
                    }
                  }}
                  onDragEnd={(e) => {
                    console.log("Drag ended");
                    // Remove the drag effect class
                    const rowElement = e.currentTarget.closest('tr');
                    if (rowElement) {
                      rowElement.classList.remove('opacity-50');
                    }
                  }}
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Drag to reorder</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 40,
    },
    {
      accessorKey: "name",
      header: tMortgages('amortization.name'),
      cell: ({ row }) => {
        return <span className="font-medium">{row.original.name}</span>;
      },
      size: 200,
    },
    {
      accessorKey: "loan_amount",
      header: tMortgages('amortization.loan_amount'),
      cell: ({ row }) => {
        const currency = getPropertyCurrency(properties, row.original.id);
        return formatCurrency(row.original.loan_amount, currency);
      },
      size: 150,
    },
    {
      accessorKey: "down_payment_percentage",
      header: tMortgages('amortization.down_payment'),
      cell: ({ row }) => {
        const property = properties.find(p => 
          p.mortgages.some((m: Mortgage) => m.id === row.original.id)
        );
        
        if (!property) return "-%";
        
        const totalPrice = property.price_cost;
        const downPayment = row.original.down_payment;
        
        if (!totalPrice || !downPayment) return "-%";
        
        const percentage = Math.round((downPayment / totalPrice) * 100);
        return <PercentageBadge value={percentage.toString()} />;
      },
      size: 120,
    },
    {
      accessorKey: "interest_rate",
      header: tMortgages('amortization.interest_rate'),
      cell: ({ row }) => `${row.original.interest_rate}%`,
      size: 120,
    },
    {
      accessorKey: "term",
      header: tMortgages('amortization.term'),
      cell: ({ row }) => {
        const termType = getTermType(row.original);
        return (
          <div className="flex items-center gap-1">
            <span>{row.original.term_years} años</span>
            <span className="text-muted-foreground text-sm">{termType}</span>
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "scenario",
      header: "Scenario",
      cell: ({ row }) => {
        const scenarioType = row.original.saved_scenario || "regular";
        return (
          <div className="flex items-center">
            <ScenarioIcon type={scenarioType} />
            <span>{getScenarioTranslation(scenarioType)}</span>
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "total_cost",
      header: "Costo Total",
      cell: ({ row }) => {
        const currency = getPropertyCurrency(properties, row.original.id);
        const propertyPrice = getPropertyPrice(properties, row.original.id);
        
        if (row.original.saved_scenario_total_interest_and_insurance) {
          return formatCurrency(
            propertyPrice + row.original.saved_scenario_total_interest_and_insurance, 
            currency
          );
        }
        return "-";
      },
      size: 150,
    },
    {
      accessorKey: "years",
      header: "Años",
      cell: ({ row }) => {
        if (row.original.saved_scenario_total_months) {
          return (
            <div className="flex items-center justify-start">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{(row.original.saved_scenario_total_months / 12).toFixed(1)}</span>
            </div>
          );
        }
        return "-";
      },
      size: 100,
    },
    {
      accessorKey: "monthly_payment",
      header: "Monthly",
      cell: ({ row }) => {
        const currency = getPropertyCurrency(properties, row.original.id);
        if (row.original.saved_scenario_monthly_payment) {
          return formatCurrency(row.original.saved_scenario_monthly_payment, currency);
        }
        return "-";
      },
      size: 150,
    },
    {
      accessorKey: "breakeven",
      header: "Breakeven",
      cell: ({ row }) => {
        if (row.original.saved_scenario_breakeven_point) {
          return `${parseFloat(row.original.saved_scenario_breakeven_point.toString()).toFixed(1)} ${tMortgages('amortization.years')}`;
        }
        return "-";
      },
      size: 120,
    },
    {
      id: "row_actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted touch-none"
              onClick={(e) => e.stopPropagation()}
              data-touch="true"
              style={{ touchAction: 'none' }}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{tGlobal('ui.open_menu')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={5} className="touch-none">
              <DropdownMenuItem onClick={(e) => handleDuplicate(e, row.original)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>{tGlobal('ui.duplicate')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleDelete(e, row.original)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>{tGlobal('ui.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 50,
    },
  ]
} 