import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/utils";
import type { Mortgage } from "@/types";

interface MortgageSelectionSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMortgageId: string | null;
  onMortgageSelect: (id: string) => void;
  properties: any[]; // Replace with proper type if available
  isLoading: boolean;
}

export function MortgageSelectionSheet({
  isOpen,
  onOpenChange,
  selectedMortgageId,
  onMortgageSelect,
  properties,
  isLoading,
}: MortgageSelectionSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Choose a mortgage</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <RadioGroup value={selectedMortgageId || ""} onValueChange={onMortgageSelect}>
              {properties.map((property) => (
                property.mortgages && property.mortgages.length > 0 && (
                  <div key={property.id} className=" mt-4 mb-2 ">
                    <div className="border-b pb-2 ">
                      <h3 className="text-lg font-semibold">{property.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(property.price_cost, property.currency)}
                      </p>
                    </div>
                    <div className=" rounded-lg p-4 ">
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                        <span>Name</span>
                        <span className="text-right">Loan Amount</span>
                      </div>
                      <div className="space-y-3">
                        {property.mortgages.map((mortgage: Mortgage) => (
                          <div key={mortgage.id} className="flex items-center space-x-3">
                            <RadioGroupItem
                              value={mortgage.id}
                              id={mortgage.id}
                              className="flex-shrink-0"
                            />
                            <Label
                              htmlFor={mortgage.id}
                              className="flex-1 flex justify-between items-center cursor-pointer py-1"
                            >
                              <span>{mortgage.name}</span>
                              <span className="font-medium">
                                {formatCurrency(mortgage.loan_amount, property.currency)}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </RadioGroup>
          )}
          {!isLoading && properties.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No properties with mortgages found.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 