import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";
import { usePropertiesWithMortgagesAndBonus, useProperties } from "@/services/propertyService";
import { PropertyInvestmentSection } from "@/components/rentals/";
import { DynamicInvestmentTable } from "@/components/investment-analysis/DynamicInvestmentTable";

export default function EditRental() {
  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { t } = useTranslation(['properties', 'global']);
  
  const { data: propertiesWithMortgages = [], isLoading: isLoadingMortgages } = usePropertiesWithMortgagesAndBonus(user?.id);
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties(user?.id);

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
            <PropertyInvestmentSection
              properties={properties}
              propertiesWithMortgages={propertiesWithMortgages}
              isLoadingProperties={isLoadingProperties}
              isLoadingMortgages={isLoadingMortgages}
              selectedPropertyId={selectedPropertyId}
              selectedMortgageId={selectedMortgageId}
              onPropertySelect={setSelectedPropertyId}
              onMortgageSelect={setSelectedMortgageId}
            />
          </div>

          {/* Right Container */}  
          <div className="w-screen sm:w-full overflow-hidden flex-1 pt-8 sm:p-0">
                 {/* Dynamic Investment Analysis Table */}
                {(selectedPropertyId || selectedMortgageId) && (
                  <div className="mt-6">
                    <DynamicInvestmentTable />
                  </div>
                )}

          </div> 
        </div>
      </div>
    </DashboardLayout>
  )
}
