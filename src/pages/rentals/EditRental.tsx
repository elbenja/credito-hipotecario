import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ChevronRight, Eye } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";
import { usePropertiesWithMortgagesAndBonus } from "@/services/propertyService";
import { formatCurrency } from "@/utils/utils";
import type { Mortgage } from "@/types";
import { PaymentsSheet } from "@/components/ui/sheets/PaymentsSheet";
import { MortgageSelectionSheet } from "@/components/ui/sheets/MortgageSelectionSheet";




export default function EditRental() {



  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const [isSelectionSheetOpen, setIsSelectionSheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);
  


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
          <div className="sm:w-full md:w-[30%] md:min-w-[340px] md:max-w-[520px] relative flex-shrink-0 border-r ">
      
            {/* future component Inherit payments */}
            <div className="flex  gap-1">
              <Button onClick={() => setIsSelectionSheetOpen(true)}>
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
            </div>
            
         
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
        isLoading={isLoading}
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
