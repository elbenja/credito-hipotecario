import { Plus, MoreVertical, Copy, Trash, MoreHorizontal, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "@/components/mortgages/columns"
import { formatCurrency } from "@/lib/utils"
import { SEO } from "@/components/seo"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import SVGillustration from "@/components/ui/SVGillustration"
import { PropertyForm } from "@/components/properties/property-form"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState, useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { BonusRule } from "@/components/properties/types"
import type { Property, Mortgage } from "../types"

export default function Mortgages() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t: tGlobal } = useTranslation('global')
  const { t: tMortgages } = useTranslation('mortgages')
  const { t: tComponents } = useTranslation('components')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { t } = useTranslation('properties')
  const [open, setOpen] = useState(false)

  const { data: propertiesWithMortgages, isLoading } = useQuery({
    queryKey: ["properties-with-mortgages", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select(`
          *,
          mortgages(
            id, name, loan_amount, down_payment, interest_rate, term_years,
            installments_per_year, loan_protection_type, loan_protection_insurance,
            first_installment_date, saved_scenario, saved_scenario_total_interest_and_insurance,
            saved_scenario_total_months, saved_scenario_monthly_payment, saved_scenario_breakeven_point, property_id
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError)
        return []
      }

      return properties as Property[]
    },
    enabled: !!user,
  })

  useEffect(() => {
    const propertiesChannel: RealtimeChannel = supabase
      .channel('properties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, (payload) => {
        console.log('Change received!', payload)
        queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(propertiesChannel)
    }
  }, [queryClient])

  // Add function to handle row reordering
  const handleReorderMortgages = async (propertyId: string, reorderedMortgages: Mortgage[]) => {
    try {
      console.log("handleReorderMortgages called with propertyId:", propertyId);
      console.log("Reordered mortgages:", reorderedMortgages.map(m => m.id));
      
      // Create a local updated copy of propertiesWithMortgages
      if (propertiesWithMortgages) {
        // Find the property to update
        const updatedProperties = propertiesWithMortgages.map(property => {
          // Only update the property that contains the reordered mortgages
          if (property.id === propertyId) {
            return {
              ...property,
              mortgages: reorderedMortgages
            };
          }
          return property;
        });
        
        // Force a refresh of the component by updating the query cache
        queryClient.setQueryData(
          ["properties-with-mortgages", user?.id], 
          updatedProperties
        );
      }
      
      // Show success message
      toast({
        title: tGlobal('ui.success'),
        description: "Mortgage order updated successfully",
      });
      
      // In a real application, you would also update the database
      // For example:
      /*
      console.log("Creating updates for mortgages...");
      // Create an array of updates, one for each reordered mortgage
      const updates = reorderedMortgages.map((mortgage, index) => {
        console.log(`Setting order ${index} for mortgage ${mortgage.id}`);
        return supabase
          .from("mortgages")
          .update({ display_order: index })
          .eq('id', mortgage.id)
      });
      
      // Execute all updates in parallel
      const results = await Promise.all(updates);
      console.log("Update results:", results);
      
      // Refresh the data from server
      queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] });
      */
    } catch (error) {
      console.error("Error reordering mortgages:", error);
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: "Error updating mortgage order",
      });
    }
  }

  const handleDuplicate = async (e: React.MouseEvent, mortgage: Mortgage) => {
    e.stopPropagation()
    try {
      if (!mortgage.property_id) {
        console.error("Missing property_id in mortgage:", mortgage)
        throw new Error("Property ID is missing")
      }

      // Create duplicate with only the fields needed for the amortizations table
      const duplicatedMortgage = {
        name: `${mortgage.name} (${tGlobal('ui.copy')})`,
        property_id: mortgage.property_id,
        user_id: user?.id,
        loan_amount: mortgage.loan_amount,
        down_payment: mortgage.down_payment,
        interest_rate: mortgage.interest_rate,
        term_years: mortgage.term_years,
        installments_per_year: mortgage.installments_per_year,
        loan_protection_type: mortgage.loan_protection_type,
        loan_protection_insurance: mortgage.loan_protection_insurance,
        first_installment_date: mortgage.first_installment_date,
        saved_scenario: mortgage.saved_scenario || "regular",
        saved_scenario_total_interest_and_insurance: mortgage.saved_scenario_total_interest_and_insurance,
        saved_scenario_total_months: mortgage.saved_scenario_total_months,
        saved_scenario_monthly_payment: mortgage.saved_scenario_monthly_payment,
        saved_scenario_breakeven_point: mortgage.saved_scenario_breakeven_point
      }

      // Explicitly use the amortizations table instead of the mortgages view
      // until the migration is complete
      const { data, error } = await supabase
        .from("amortizations")
        .insert(duplicatedMortgage)
        .select()
        .single()

      if (error) throw error

      toast({
        title: tGlobal('ui.success'),
        description: tMortgages('messages.amortization_duplicated'),
      })

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] })
    } catch (error) {
      console.error("Error duplicating mortgage:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tMortgages('messages.error_duplicating_amortization'),
      })
    }
  }

  const handleDelete = async (e: React.MouseEvent, mortgage: Mortgage) => {
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from("mortgages")
        .delete()
        .eq('id', mortgage.id)

      if (error) throw error

      toast({
        title: tGlobal('ui.success'),
        description: tMortgages('messages.success_delete'),
      })

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] })
    } catch (error) {
      console.error("Error deleting mortgage:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tMortgages('messages.error_delete'),
      })
    }
  }

  const headerActions = (
    <Button onClick={() => navigate("/mortgages/new")} disabled={!propertiesWithMortgages || propertiesWithMortgages.length === 0}>
      <Plus className="mr-2 h-4 w-4" />
      {tMortgages('amortization.new')}
    </Button>
  )

  const loadProperties = () => {
    // Logic to load or refresh properties
  }

  // Create a translations object to pass to the columns function
  const translations = {
    tGlobal,
    tMortgages,
    tComponents
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>{tGlobal('ui.loading')}</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{tMortgages('title')}</h1>,
        actions: headerActions
      }}
    >
      <SEO 
        title={`${tMortgages('title')} - CreditoHipotecar.io`}
        description={tMortgages('description')}
      />
      <div className="p-6 flex flex-col h-full w-full items-center">

        {propertiesWithMortgages?.map((property) => (
          property.mortgages.length > 0 && (
            <div key={property.id} className="space-y-4 w-full mt-4 mb-6">
              <div className="flex items-center justify-start gap-8">
                <h2 className="text-xl font-semibold">{property.name}</h2>
                <span className="text-xl font-medium">
                  {property.price_cost !== undefined && property.price_cost !== null 
                    ? formatCurrency(property.price_cost, property.currency)
                    : '-'}
                </span>
              </div>
              
              <DataTable 
                columns={getColumns(propertiesWithMortgages, handleDuplicate, handleDelete, translations)}
                data={property.mortgages}
                onRowClick={(mortgage) => navigate(`/mortgages/${mortgage.id}`)}
                onReorder={(reorderedData) => handleReorderMortgages(property.id, reorderedData as Mortgage[])}
              />
            </div>
          )
        ))}

        {(!propertiesWithMortgages || propertiesWithMortgages.length === 0) && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="w-60 rounded-3xl flex flex-col items-center justify-center p-0 gap-4">
                <div className="rounded-3xl flex flex-col justify-center items-center gap-1">
                  <SVGillustration variant="dog" className="w-60 h-60" />
                  <p className="text-sm text-center w-40">
                    {t('messages.no_properties', { ns: 'properties' })}
                  </p>
                </div>

                <div className="w-40 h-19 bg-primary text-primary-foreground rounded-3xl flex flex-col justify-center items-center p-4">
                  <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                      <button className="text-xs h-8 flex gap-2">  
                        <div className="flex-1 text-right text-sm font-medium leading-none">
                          {t('actions.add_property', { ns: 'properties' })}
                        </div>
                        <div className="size-8 bg-card text-card-foreground rounded-[99px] flex justify-center items-center">
                          <Plus className="h-4 w-4" />
                        </div>
                      </button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>
                          {t('actions.add_property', { ns: 'properties' })}
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-8">
                        <PropertyForm
                          onSuccess={loadProperties}
                          onClose={() => setOpen(false)}
                          selectedProperty={null}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
            </div>
          </div>
        )}

        {propertiesWithMortgages && propertiesWithMortgages.length > 0 && propertiesWithMortgages.every(property => property.mortgages.length === 0) && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="w-60 rounded-3xl flex flex-col items-center justify-center p-0 gap-4">
                <div className="rounded-3xl flex flex-col justify-center items-center gap-1">
                  <SVGillustration variant="beanBag" className="w-60 h-60" />
                  <p className="text-sm text-center w-40">
                    {t('messages.no_mortgages', { ns: 'properties' })}
                  </p>
                </div>

                <div className="w-40 h-19 bg-primary text-primary-foreground rounded-3xl flex flex-col justify-center items-center p-4">
                  <button className="text-xs h-8 flex gap-2" onClick={() => navigate('/mortgages/new')}>
                    <div className="flex-1 text-right text-sm font-medium leading-none">
                      {tMortgages('amortization.new')}
                    </div>
                    <div className="size-8 bg-card text-card-foreground rounded-[99px] flex justify-center items-center">
                      <Plus className="h-4 w-4" />
                    </div>
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 