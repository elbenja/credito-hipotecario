import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ChevronRight, Eye, Plus, TableProperties } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { usePropertiesWithMortgagesAndBonus } from "@/services/propertyService";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/utils";
import { useTranslation } from "react-i18next";
import type { Mortgage } from "@/types";
import useSavedScenarioPayments from "@/hooks/useSavedScenarioPayments";
import { SavedScenarioExample } from "@/components/examples/SavedScenarioExample";

export default function TestExtraInstallments() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);
  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation(['properties', 'global']);
  
  const { data: propertiesWithMortgages = [], isLoading } = usePropertiesWithMortgagesAndBonus(user?.id);

  // Find the selected mortgage and its property
  const selectedMortgageInfo = selectedMortgageId ? (() => {
    for (const property of propertiesWithMortgages) {
      const mortgage = property.mortgages?.find((m: Mortgage) => m.id === selectedMortgageId);
      if (mortgage) {
        return { mortgage, property };
      }
    }
    return null;
  })() : null;

  const handleConfirm = () => {
    if (selectedMortgageId) {
      console.log("Selected mortgage ID:", selectedMortgageId);
      // Handle the selected mortgage here
      setIsSheetOpen(false);
      setSelectedMortgageId(null);
    }
  };
  const { payments, summary, savedScenarioType } = useSavedScenarioPayments(selectedMortgageId);

  
  return (
    <DashboardLayout header={{ title: "Test Extra Installments" }}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center justify-center gap-1">
          <Button onClick={() => setIsSheetOpen(true)}>
           

            {selectedMortgageInfo ? (
                <div className="flex justify-between w-full">
                  <span className="truncate mr-2">
                    {selectedMortgageInfo.mortgage.name.length > 15 
                      ? `${selectedMortgageInfo.mortgage.name.substring(0, 15)}...` 
                      : selectedMortgageInfo.mortgage.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(selectedMortgageInfo.mortgage.loan_amount, selectedMortgageInfo.property.currency)}
                  </span>
                </div>
              ) : (
                <> Choose mortgage <ChevronRight className="w-4 h-4" /></>
              )}
          </Button>
          <Button variant="outline" onClick={() => {
            if (selectedMortgageId) {
              setIsPaymentsSheetOpen(true);
              console.log("Payments sheet opened", payments, summary, savedScenarioType);
            } else {
              alert("Please select a mortgage first");
            }
          }}>
            <Eye   className="w-4 h-4" />
            Payments
          </Button>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Choose a mortgage</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <RadioGroup value={selectedMortgageId || ""} onValueChange={setSelectedMortgageId}>
                {propertiesWithMortgages.map((property) => (
                  property.mortgages && property.mortgages.length > 0 && (
                    <div key={property.id} className="space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="text-lg font-semibold">{property.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(property.price_cost, property.currency)}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
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
            
            {!isLoading && propertiesWithMortgages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No properties with mortgages found.
              </div>
            )}
          </div>
          
          <div className="mt-8 flex justify-end">

          </div>
        </SheetContent>
      </Sheet>

      {/* Payments Sheet */}
      <Sheet open={isPaymentsSheetOpen} onOpenChange={setIsPaymentsSheetOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Saved Scenario Payments
              {selectedMortgageInfo && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - {selectedMortgageInfo.mortgage.name}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6">
            {selectedMortgageId ? (
              <SavedScenarioExample mortgageId={selectedMortgageId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No mortgage selected
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </DashboardLayout>
  );
}
