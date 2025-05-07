import { ColumnDef } from "@tanstack/react-table"
import { Car, Clock, CreditCard, Calendar, DollarSign, Compass, Armchair, TrendingDown, Wallet, Axe, ArrowUpDown } from "lucide-react"
import type { Mortgage, Property } from "../../types"
import { formatCurrency } from "@/utils/utils"
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
      return <Armchair className="h-4 w-4 mr-2" />
    case "accelerated":
      return <TrendingDown className="h-4 w-4 mr-2" />
    case "new_rate":
      return <Wallet className="h-4 w-4 mr-2" />
    case "lower_payment":
      return <Axe className="h-4 w-4 mr-2" />
    // case "a_plazo":
    //   return <Calendar className="h-4 w-4 mr-2" />
    // case "a_cuotas":
    //   return <DollarSign className="h-4 w-4 mr-2" />
    default:
      return <Armchair className="h-4 w-4 mr-2" />
  }
}

// Define translation keys for scenario types
const scenarioTranslationKeys: Record<string, string> = {
  "regular": "scenario_graphs.regular.short_title",
  "accelerated": "scenario_graphs.accelerated.short_title", 
  "lower_payment": "scenario_graphs.lower_payment.short_title",
  "new_rate": "scenario_graphs.new_rate.short_title",
    // "a_plazo": "a_plazo", // Custom translation
    // "a_cuotas": "a_cuotas" // Custom translation
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
const getTermType = (mortgage: Mortgage): "regular" | "double" => {
  // If installments per year is 14, it's "doble", otherwise "simple"
  return mortgage.installments_per_year === 14 ? "double" : "regular";
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

// Helper function to create sortable column header
const SortableHeader = ({ column, children }: { column: any, children: React.ReactNode }) => {
  return (
    <div className="flex items-center space-x-1 cursor-pointer" onClick={() => column.toggleSorting()}>
      {children}
      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
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
      // if (key === "a_plazo") return "A Plazo";
      // if (key === "a_cuotas") return "A Cuotas";
      return tComponents(key);
    }
    return scenarioType;
  };

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.name')}</div>
      ),
      enableHiding: false,
      cell: ({ row }) => {
        return <span className="font-medium line-clamp-1">{row.original.name}</span>;
      },
      size: 200,
    },
   
    {
      accessorKey: "down_payment_percentage",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.short_down_payment')}</div>
      ),
      enableHiding: true,
      cell: ({ row }) => {
        const property = properties.find(p => 
          p.mortgages.some((m: Mortgage) => m.id === row.original.id)
        );
        
        if (!property) return <PercentageBadge value="0" />;
        
        const totalPrice = property.price_cost;
        const downPayment = row.original.down_payment;
        
        if (!totalPrice || !downPayment) return <PercentageBadge value="0" />;
        
        const percentage = Math.round((downPayment / totalPrice) * 100);
        return <PercentageBadge value={percentage.toString()} />;
      },
      size: 120,
    },
    {
      accessorKey: "loan_amount",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.short_loan_amount')}</div>
      ),
      enableHiding: true,
      cell: ({ row }) => {
        const currency = getPropertyCurrency(properties, row.original.id);
        return <div className="text-nowrap">{formatCurrency(row.original.loan_amount, currency)}</div>;
      },
      size: 150,
    },
    {
      accessorKey: "interest_rate",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.short_interest_rate')}</div>
      ),
      enableHiding: true,
      cell: ({ row }) => `${row.original.interest_rate}%`,
      size: 120,
    },
    {
      accessorKey: "term",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.term')}</div>
      ),
      enableHiding: true,
      cell: ({ row }) => {
        const termType = getTermType(row.original);
        return (
          <div className="flex items-center gap-1">
            <span className="text-nowrap">{row.original.term_years}{tGlobal('ui.short_year')}</span>
            <span className="text-muted-foreground text-sm">{tGlobal(`ui.term_type.${termType}`)}</span>
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "scenario",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.scenario')}</div>
      ),
      enableHiding: true,
      cell: ({ row }) => {
        const scenarioType = row.original.saved_scenario || "regular";
        return (
          <Badge variant="outline" className="px-2 py-1 inline-flex items-center font-medium">
            <ScenarioIcon type={scenarioType} />
            <span className="line-clamp-1">{getScenarioTranslation(scenarioType)}</span>
          </Badge>
        );
      },
      size: 180,
    },
    {
      accessorKey: "total_cost",
      header: ({ column }) => (
        <SortableHeader column={column}>
          <div className="line-clamp-1">{tMortgages('amortization.total_cost')}</div>
        </SortableHeader>
      ),
      enableHiding: true,
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const propertyPriceA = getPropertyPrice(properties, rowA.original.id);
        const propertyPriceB = getPropertyPrice(properties, rowB.original.id);
        
        const totalCostA = rowA.original.saved_scenario_total_interest_and_insurance 
          ? propertyPriceA + rowA.original.saved_scenario_total_interest_and_insurance 
          : 0;
          
        const totalCostB = rowB.original.saved_scenario_total_interest_and_insurance 
          ? propertyPriceB + rowB.original.saved_scenario_total_interest_and_insurance 
          : 0;
          
        return totalCostA > totalCostB ? 1 : totalCostA < totalCostB ? -1 : 0;
      },
      cell: ({ row }) => {
        const currency = getPropertyCurrency(properties, row.original.id);
        const propertyPrice = getPropertyPrice(properties, row.original.id);
        
        if (row.original.saved_scenario_total_interest_and_insurance) {
          return (
            <div className="text-nowrap">
              {formatCurrency(
                propertyPrice + row.original.saved_scenario_total_interest_and_insurance, 
                currency
              )}
            </div>
          );
        }
        return "-";
      },
      size: 150,
    },
    {
      accessorKey: "years",
      header: ({ column }) => (
        <SortableHeader column={column}>
          <div className="line-clamp-1">{tMortgages('amortization.years')}</div>
        </SortableHeader>
      ),
      enableHiding: true,
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const valueA = rowA.original.saved_scenario_total_months ? rowA.original.saved_scenario_total_months / 12 : 0;
        const valueB = rowB.original.saved_scenario_total_months ? rowB.original.saved_scenario_total_months / 12 : 0;
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      },
      cell: ({ row }) => {
        if (row.original.saved_scenario_total_months) {
          return (
            <div className="flex items-center justify-start">
              <Compass className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{(row.original.saved_scenario_total_months / 12).toFixed(1)}</span>
            </div>
          );
        }
        return "-";
      },
      size: 100,
    },
    {
      accessorKey: "months",
      header: ({ column }) => (
        <SortableHeader column={column}>
          <div className="line-clamp-1">{tMortgages('amortization.months')}</div>
        </SortableHeader>
      ),
      enableHiding: true,
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const valueA = rowA.original.saved_scenario_total_months || 0;
        const valueB = rowB.original.saved_scenario_total_months || 0;
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      },
      cell: ({ row }) => {
        if (row.original.saved_scenario_total_months) {
          return (
            <div className="flex items-center justify-start">
              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{row.original.saved_scenario_total_months}</span>
            </div>
          );
        }
        return "-";
      },
      size: 100,
    },
    {
      accessorKey: "monthly_payment",
      header: ({ column }) => (
        <SortableHeader column={column}>
          <div className="line-clamp-1">{tMortgages('amortization.short_monthly_payment')}</div>
        </SortableHeader>
      ),
      enableHiding: true,
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const valueA = rowA.original.saved_scenario_monthly_payment || 0;
        const valueB = rowB.original.saved_scenario_monthly_payment || 0;
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      },
      cell: ({ row }) => {
        const currency = getPropertyCurrency(properties, row.original.id);
        if (row.original.saved_scenario_monthly_payment) {
          return (
            <div className="text-nowrap">
              {formatCurrency(row.original.saved_scenario_monthly_payment, currency)}
            </div>
          );
        }
        return "-";
      },
      size: 150,
    },
    {
      accessorKey: "breakeven",
      header: ({ column }) => (
        <div className="line-clamp-1">{tMortgages('amortization.short_breakeven')}</div>
      ),
      enableHiding: true,
      cell: ({ row }) => {
        if (row.original.saved_scenario_breakeven_point) {
          return (
            <div className="text-nowrap">
              {`${parseFloat(row.original.saved_scenario_breakeven_point.toString()).toFixed(1)}${tGlobal('ui.short_year')}`}
            </div>
          );
        }
        return "-";
      },
      size: 120,
    },
    // Hidden timestamp column for default sorting - uses IDs since they should be sequential
    {
      accessorKey: "timestamp",
      header: () => null,
      enableHiding: true,
      enableSorting: true,
      cell: ({ row }) => null,
      size: 0,
      meta: {
        isHidden: true
      },
      // Ensure this column is never visible in the UI
      maxSize: 0,
      minSize: 0
    },
    {
      id: "row_actions",
      enableHiding: false,
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