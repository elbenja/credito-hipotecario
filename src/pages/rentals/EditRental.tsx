import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ChartColumnBig, ChevronRight, Eye, PencilLine, TagIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";
import { usePropertiesWithMortgagesAndBonus, useProperties } from "@/services/propertyService";
import { formatCurrency } from "@/utils/utils";
import type { Mortgage } from "@/types";
import { PaymentsSheet } from "@/components/ui/sheets/PaymentsSheet";
import { MortgageSelectionSheet } from "@/components/ui/sheets/MortgageSelectionSheet";
import { PropertySelectionSheet } from "@/components/ui/sheets/PropertySelectionSheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function EditRental() {
  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isSelectionSheetOpen, setIsSelectionSheetOpen] = useState(false);
  const [isPropertySheetOpen, setIsPropertySheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);
  
  const { user } = useAuth();
  const { t } = useTranslation(['properties', 'global']);
  
  const { data: propertiesWithMortgages = [], isLoading: isLoadingMortgages } = usePropertiesWithMortgagesAndBonus(user?.id);
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties(user?.id);

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

  return (
    <DashboardLayout
      header={{
        title: (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                hey there
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                Edit Rental
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-col md:flex-row flex-1">
          {/* Left Container */}
          <div className="flex flex-col sm:w-full md:w-[30%] md:min-w-[340px] md:max-w-[520px] relative flex-shrink-0 border-r ">
      
            {/* future component Inherit payments */}
            <div className="flex  gap-1">

            </div>
            <Accordion type="single" collapsible> 
              <AccordionItem value="item-1">
                <AccordionTrigger className="p-4">Property Investment</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 p-2">
            
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

                  <Button variant="outline" className="p-4 inline-flex justify-start items-start gap-3 h-auto  whitespace-normal"
                    onClick={() => setIsSelectionSheetOpen(true)}>
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
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (selectedMortgageId) {
                            setIsPaymentsSheetOpen(true);
                          } else {
                            alert("Please select a mortgage first");
                          }
                        }}
                        disabled={!selectedMortgageId}
                      >
                        <Eye className="w-4 h-4" />
                        Payments
                      </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Right Container */}  
          <div className="w-screen sm:w-full overflow-hidden flex-1 pt-8 sm:p-0">
           
          </div> 
        </div>
      </div>

      <MortgageSelectionSheet
        isOpen={isSelectionSheetOpen}
        onOpenChange={setIsSelectionSheetOpen}
        selectedMortgageId={selectedMortgageId}
        onMortgageSelect={setSelectedMortgageId}
        properties={propertiesWithMortgages}
        isLoading={isLoadingMortgages}
      />

      <PropertySelectionSheet
        isOpen={isPropertySheetOpen}
        onOpenChange={setIsPropertySheetOpen}
        selectedPropertyId={selectedPropertyId}
        onPropertySelect={setSelectedPropertyId}
        properties={properties}
        isLoading={isLoadingProperties}
      />

      <PaymentsSheet
        isOpen={isPaymentsSheetOpen}
        onOpenChange={setIsPaymentsSheetOpen}
        mortgageId={selectedMortgageId}
        mortgageInfo={selectedMortgageInfo}
      />
      
    </DashboardLayout>
  )
}
