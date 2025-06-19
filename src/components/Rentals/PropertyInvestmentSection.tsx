import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {  ChartColumnBig, Eye, TagIcon, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/utils/utils";
import type { Mortgage } from "@/types";
import type { PropertyWithBonus } from "@/types/property";
import { PaymentsSheet } from "@/components/ui/sheets/PaymentsSheet";
import { MortgageSelectionSheet } from "@/components/ui/sheets/MortgageSelectionSheet";
import { PropertySelectionSheet } from "@/components/ui/sheets/PropertySelectionSheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PropertyInvestmentDebug } from "@/components/rentals/PropertyInvestmentDebug";
import { useCalculationEngine } from "@/hooks/calculations/useCalculationEngine";
import { useInvestmentAnalysisStore } from "@/store/investmentAnalysis";
import { DynamicInvestmentTable } from "@/components/investment-analysis/DynamicInvestmentTable";

interface PropertyInvestmentSectionProps {
  properties: PropertyWithBonus[];
  propertiesWithMortgages: any[];
  isLoadingProperties: boolean;
  isLoadingMortgages: boolean;
  selectedPropertyId?: string | null;
  selectedMortgageId?: string | null;
  propertyAnnualAppreciation?: number;
  onPropertySelect?: (propertyId: string | null) => void;
  onMortgageSelect?: (mortgageId: string | null) => void;
  onPropertyAnnualAppreciationChange?: (value: number) => void;
}

export function PropertyInvestmentSection({
  properties,
  propertiesWithMortgages,
  isLoadingProperties,
  isLoadingMortgages,
  selectedPropertyId = null,
  selectedMortgageId = null,
  propertyAnnualAppreciation = 2,
  onPropertySelect,
  onMortgageSelect,
  onPropertyAnnualAppreciationChange,
}: PropertyInvestmentSectionProps) {
  const { t } = useTranslation(['properties', 'global']);
  
  // Internal state for sheet visibility and property appreciation
  const [isPropertySheetOpen, setIsPropertySheetOpen] = useState(false);
  const [isMortgageSheetOpen, setIsMortgageSheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);
  const [internalAppreciation, setInternalAppreciation] = useState(propertyAnnualAppreciation);

  // Get appreciation rate from store or use internal value
  const { propertyAnnualAppreciation: storeAppreciation, setPropertyAnnualAppreciation } = useInvestmentAnalysisStore();

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

  // Initialize calculation engine
  const calculationEngine = useCalculationEngine({
    selectedProperty: selectedProperty || null,
    selectedMortgageId,
    mortgageData: selectedMortgageInfo?.mortgage
  });

  const handlePropertySelect = (propertyId: string) => {
    onPropertySelect?.(propertyId);
    setIsPropertySheetOpen(false);
  };

  const handleMortgageSelect = (mortgageId: string) => {
    onMortgageSelect?.(mortgageId);
    setIsMortgageSheetOpen(false);
  };

  const handlePropertyClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPropertySelect?.(null);
  };

  const handleMortgageClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMortgageSelect?.(null);
  };

  const handleAppreciationChange = (value: number) => {
    setInternalAppreciation(value);
    onPropertyAnnualAppreciationChange?.(value);
  };

  const validateAppreciation = (value: number): boolean => {
    return value >= 0 && value <= 20;
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
            {/* Enhanced Property Selection Button - Show when no mortgage is selected */}
            {!selectedMortgageInfo && (
              <Button 
                variant="outline" 
                className="p-4 inline-flex justify-between items-start gap-3 h-auto whitespace-normal"
                onClick={() => setIsPropertySheetOpen(true)}
              >
                {selectedProperty ? (
                  <>
                    <div className="flex items-start gap-3 flex-1">
                      <TagIcon className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div className="flex flex-col items-start gap-1">
                        <div className="font-medium">{selectedProperty.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {formatCurrency(selectedProperty.price_cost, selectedProperty.currency as "USD" | "PEN")}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                      onClick={handlePropertyClear}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <TagIcon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                      <div className="font-medium">Choose a Property</div>
                      <div className="text-muted-foreground text-left justify-start text-sm font-medium leading-tight">
                        Pago único de la propiedad incluyendo el bono
                      </div>
                    </div>
                  </>
                )}
              </Button>
            )}

            {/* Enhanced Mortgage Selection Button - Show when no property is selected */}
            {!selectedProperty && (
              <Button 
                variant="outline" 
                className="p-4 inline-flex justify-between items-start gap-3 h-auto whitespace-normal"
                onClick={() => setIsMortgageSheetOpen(true)}
              >
                {selectedMortgageInfo ? (
                  <>
                    <div className="flex items-start gap-3 flex-1">
                      <ChartColumnBig className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div className="flex flex-col items-start gap-1">
                        <div className="font-medium">{selectedMortgageInfo.mortgage.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {selectedMortgageInfo.mortgage.term_years * 12} months
                        </div>
                        {/* <div className=" px-2 py-1 rounded text-sm font-medium">
                          {formatCurrency(selectedMortgageInfo.mortgage.down_payment || 0, selectedMortgageInfo.property.currency)} Down Payment
                        </div> */}
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(selectedMortgageInfo.mortgage.down_payment || 0, selectedMortgageInfo.property.currency)} Down Payment
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                      onClick={handleMortgageClear}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <ChartColumnBig className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                      <div className="font-medium">Choose a Mortgage</div>
                      <div className="text-muted-foreground text-left justify-start text-sm font-medium leading-tight">
                        Importa una hipoteca con sus pago mensuales
                      </div>
                    </div>
                  </>
                )}
              </Button>
            )}

            {/* Property Annual Appreciation Input - Shows when either property or mortgage is selected */}
            {(selectedProperty || selectedMortgageInfo) && (
              <div className="space-y-2 p-4 rounded-lg  ">
                <Label className="text-sm font-medium">Property Annual Appreciation</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={internalAppreciation}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (validateAppreciation(value)) {
                        handleAppreciationChange(value);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (!validateAppreciation(value)) {
                        // Reset to valid range if invalid
                        const safeValue = Math.max(0, Math.min(20, value));
                        handleAppreciationChange(safeValue);
                        e.target.value = safeValue.toString();
                      }
                    }}
                    className="pr-8"
                    placeholder="2"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                    %
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for property value analysis calculations (0-20% range)
                </p>
              </div>
            )}

            {/* View Payments Button */}
            {/* <Button 
              variant="outline" 
              onClick={handleViewPayments}
              disabled={!selectedMortgageId}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Payments
            </Button> */}

            {/* Property Investment Analysis Debug */}
            {(selectedProperty || selectedMortgageInfo) && (
              <PropertyInvestmentDebug
                selectedProperty={selectedProperty || null}
                propertyAnnualAppreciation={internalAppreciation}
                mortgageData={selectedMortgageInfo?.mortgage}
              />
            )}

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