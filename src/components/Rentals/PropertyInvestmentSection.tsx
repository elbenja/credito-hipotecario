import { Button } from "@/components/ui/button";
import { ChartColumnBig, Eye, TagIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/utils/utils";
import type { Mortgage } from "@/types";
import type { PropertyWithBonus } from "@/types/property";
import { PaymentsSheet } from "@/components/ui/sheets/PaymentsSheet";
import { MortgageSelectionSheet } from "@/components/ui/sheets/MortgageSelectionSheet";
import { PropertySelectionSheet } from "@/components/ui/sheets/PropertySelectionSheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PropertyInvestmentSectionProps {
  properties: PropertyWithBonus[];
  propertiesWithMortgages: any[];
  isLoadingProperties: boolean;
  isLoadingMortgages: boolean;
  selectedPropertyId?: string | null;
  selectedMortgageId?: string | null;
  onPropertySelect?: (propertyId: string) => void;
  onMortgageSelect?: (mortgageId: string) => void;
}

export function PropertyInvestmentSection({
  properties,
  propertiesWithMortgages,
  isLoadingProperties,
  isLoadingMortgages,
  selectedPropertyId = null,
  selectedMortgageId = null,
  onPropertySelect,
  onMortgageSelect,
}: PropertyInvestmentSectionProps) {
  const { t } = useTranslation(['properties', 'global']);
  
  // Internal state for sheet visibility
  const [isPropertySheetOpen, setIsPropertySheetOpen] = useState(false);
  const [isMortgageSheetOpen, setIsMortgageSheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);

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

  // Find the selected property
  const selectedProperty = selectedPropertyId ? properties.find(p => p.id === selectedPropertyId) : null;

  const handlePropertySelect = (propertyId: string) => {
    onPropertySelect?.(propertyId);
    setIsPropertySheetOpen(false);
  };

  const handleMortgageSelect = (mortgageId: string) => {
    onMortgageSelect?.(mortgageId);
    setIsMortgageSheetOpen(false);
  };

  const handleViewPayments = () => {
    if (selectedMortgageId) {
      setIsPaymentsSheetOpen(true);
    } else {
      alert("Please select a mortgage first");
    }
  };

  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className="p-4">Property Investment</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 p-2">
            {/* Property Selection Button */}
            <Button 
              variant="outline" 
              className="p-4 inline-flex justify-start items-start gap-3 h-auto whitespace-normal"
              onClick={() => setIsPropertySheetOpen(true)}
            >
              <TagIcon className="w-4 h-4" />
              <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                <div className="font-medium">
                  {selectedProperty ? selectedProperty.name : "Choose a property"}
                </div>
                <div className="text-muted-foreground text-left justify-start text-sm font-medium leading-tight">
                  {selectedProperty 
                    ? formatCurrency(selectedProperty.price_cost, selectedProperty.currency as "USD" | "PEN")
                    : "One-time property payment includes bonus calculation"}
                </div>
              </div>
            </Button>

            {/* Mortgage Selection Button */}
            <Button 
              variant="outline" 
              className="p-4 inline-flex justify-start items-start gap-3 h-auto whitespace-normal"
              onClick={() => setIsMortgageSheetOpen(true)}
            >
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
                <> 
                  <ChartColumnBig className="w-4 h-4" />
                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                    <div className="font-medium">Choose a mortgage</div>
                    <div className="text-muted-foreground text-left justify-start text-sm font-medium leading-tight">
                      Import a mortgage with its monthly payments
                    </div>
                  </div>
                </>
              )}
            </Button>

            {/* View Payments Button */}
            <Button 
              variant="outline" 
              onClick={handleViewPayments}
              disabled={!selectedMortgageId}
            >
              <Eye className="w-4 h-4" />
              Payments
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Property Selection Sheet */}
      <PropertySelectionSheet
        isOpen={isPropertySheetOpen}
        onOpenChange={setIsPropertySheetOpen}
        selectedPropertyId={selectedPropertyId}
        onPropertySelect={handlePropertySelect}
        properties={properties}
        isLoading={isLoadingProperties}
      />

      {/* Mortgage Selection Sheet */}
      <MortgageSelectionSheet
        isOpen={isMortgageSheetOpen}
        onOpenChange={setIsMortgageSheetOpen}
        selectedMortgageId={selectedMortgageId}
        onMortgageSelect={handleMortgageSelect}
        properties={propertiesWithMortgages}
        isLoading={isLoadingMortgages}
      />

      {/* Payments Sheet */}
      <PaymentsSheet
        isOpen={isPaymentsSheetOpen}
        onOpenChange={setIsPaymentsSheetOpen}
        mortgageId={selectedMortgageId}
        mortgageInfo={selectedMortgageInfo}
      />
    </>
  );
}