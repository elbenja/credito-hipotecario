import { Plus, MoreVertical, Copy, Trash, MoreHorizontal, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
// import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "@/components/mortgages/columns"
import { formatCurrency } from "@/utils/utils"
import { SEO } from "@/components/seo"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/use-toast"
// import {  } from "@tanstack/react-query"
import SVGillustration from "@/components/ui/SVGillustration"
import { PropertyForm } from "@/components/properties/property-form"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useMemo, useCallback } from 'react'
// import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
// import { BonusRule } from "@/types/property"
import type {  Mortgage } from "@/types/mortgage"
// import { useExchangeRate } from "@/hooks/use-exchange-rate"
// import { useSubscriptionLimits, DEFAULT_SUBSCRIPTION_PLANS } from "@/hooks/useSubscriptionLimits"
import { useMortgageCapture } from "@/services/mortgages/mortgage-capture-service"
// import { useMortgageBundle } from "@/hooks/useMortgageBundle"
import { useMortgageDraftStore } from "@/store/mortgage/store"
import { useDeleteMortgage } from "@/hooks/mortgages"
// import { useBonusRules } from "@/hooks/useBonusRules"
import { usePropertiesWithMortgagesAndBonus } from "@/services/propertyService"
import { PlanLimitDialog } from "@/components/common/PlanLimitDialog"
import { useCanCreateFeature } from "@/hooks/usePlanLimits"

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
  // const { data: exchangeRate } = useExchangeRate()
  const { captureMortgage } = useMortgageCapture();
  // const [bonusValues, setBonusValues] = useState<Record<string, number | null>>({});
  const { resetDraft } = useMortgageDraftStore();

  const deleteMortgage = useDeleteMortgage()
  const { canCreate } = useCanCreateFeature()
  const [showDialog, setShowDialog] = useState(false)



  const { data: propertiesWithMortgages, isLoading } = usePropertiesWithMortgagesAndBonus(user?.id);

  const handleNewMortgage = async () => {
    const allowed = await canCreate('mortgages')
    if (!allowed) {
      setShowDialog(true)
    } else {
      resetDraft();
      navigate("/mortgages/new");
    }
  }

  const handleDuplicate = useCallback(async (e: React.MouseEvent, mortgage: Mortgage) => {
    e.stopPropagation()
  
    const allowed = await canCreate('mortgages')
    if (!allowed) {
      setShowDialog(true)
      return
    }
  
    // Proceed with duplication
    await captureMortgage({
      mortgageId: mortgage.id,
      successCallback: () => {
        console.log("captureMortgage successCallback ", mortgage.id)
        queryClient.invalidateQueries({ queryKey: ["properties-mortgages-bonus"] })
       
        queryClient.invalidateQueries({
          queryKey: ["mortgage-bundle", mortgage.id],
          exact: true
        })
      },
      stayOnPage: false
    })
  }, [captureMortgage, canCreate, queryClient])




  const handleDelete = useCallback(
    (e: React.MouseEvent, mortgage: Mortgage) => {
      e.stopPropagation()
      deleteMortgage.mutate(mortgage.id, {
        onSuccess: () => {
          toast({
            title: tGlobal("ui.success"),
            description: tMortgages("messages.success_delete"),
          })
          console.log("handleDelete success", mortgage.id)
          queryClient.invalidateQueries({ queryKey: ["properties-mortgages-bonus"] })
        },
        onError: (err) => {
          console.error("Error deleting mortgage:", err)
          toast({
            variant: "destructive",
            title: tGlobal("ui.error"),
            description: tMortgages("messages.error_delete"),
          })
        },
      })
    },
    [deleteMortgage, queryClient, tGlobal, tMortgages, toast]
  )

  // Memoize the header actions to prevent recreating on every render
  const headerActions = useMemo(() => (
    <Button onClick={handleNewMortgage} disabled={!propertiesWithMortgages || propertiesWithMortgages.length === 0}>
      <Plus className="mr-2 h-4 w-4" />
      {tMortgages('amortization.new')}
    </Button>
  ), [navigate, tMortgages, propertiesWithMortgages])

  const loadProperties = useCallback(() => {
    // Logic to load or refresh properties
    queryClient.invalidateQueries({ queryKey: ["properties-mortgages-bonus"] })
  }, [queryClient])

  // Create a translations object to pass to the columns function - memoize to prevent recreation
  const translations = useMemo(() => ({
    tGlobal,
    tMortgages,
    tComponents
  }), [tGlobal, tMortgages, tComponents]);

  // Memoize the columns to prevent recreation on every render
  const columns = useMemo(() => {
    if (!propertiesWithMortgages) return [];
    return getColumns(propertiesWithMortgages, handleDuplicate, handleDelete, translations);
  }, [propertiesWithMortgages, handleDuplicate, handleDelete, translations]);

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
            <div key={property.id} className="space-y-4 w-full mt-4 mb-8">
              <div className="flex items-center justify-start gap-4 -mb-12">
                <h2 className="text-xl font-semibold">{property.name}</h2>
                <span className="text-xl font-medium">
                  {property.price_cost !== undefined && property.price_cost !== null 
                    ? formatCurrency(property.price_cost, property.currency)
                    : '-'}
                </span>
                {property.is_first_home && (
                  <>
                    
                    <Badge variant="outline" className="ml-4 text-sm font-medium">
                        {t('bonus.amount_short')}: S/ {property.bonus}
                      </Badge>
                     
          
                  </>
                )}
              </div>
              
              <DataTable 
                columns={columns}
                data={property.mortgages}
                onRowClick={(mortgage) => navigate(`/mortgages/${mortgage.id}?tab=${mortgage.saved_scenario || 'regular'}`)}
                className="rounded-xl overflow-hidden"
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
                      {/* TODO: validate a button to add a property */}
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
                  <button className="text-xs h-8 flex gap-2" onClick={() => {
                    // Reset the mortgage draft store before navigating
                    resetDraft();
                    navigate('/mortgages/new');
                  }}>
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
      <PlanLimitDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onUpgrade={() => {
          // TODO: Add navigation or logic to upgrade page
          setShowDialog(false)
        }}
      />
    </DashboardLayout>
  )
} 