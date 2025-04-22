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
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useMemo, useCallback } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { BonusRule } from "@/components/properties/types"
import type { Property, Mortgage } from "../types"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useSubscriptionLimits, DEFAULT_SUBSCRIPTION_PLANS } from "@/hooks/useSubscriptionLimits"
import { useMortgageCapture } from "@/services/mortgages/mortgage-capture.service"

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
  const { data: exchangeRate } = useExchangeRate()
  const { captureMortgage } = useMortgageCapture();

  // Add subscription limits hook
  const {
    currentUsage,
    planLimit,
    currentPlan,
    checkLimit
  } = useSubscriptionLimits();

  // Function to check mortgage limits directly from the database
  const checkMortgageLimits = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get current count directly from database for accuracy
      const { count, error } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error counting mortgages:", error);
        return false;
      }
      
      // Get limit from subscription or default
      const limitValue = planLimit > 0 ? planLimit : 
                         (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3);
      
      // True if limit reached
      return (count || 0) >= limitValue;
    } catch (err) {
      console.error("Error checking mortgage limits:", err);
      return false;
    }
  }, [user, planLimit, currentPlan]);

  // Fetch bonus rules
  const { data: bonusRules = [] } = useQuery({
    queryKey: ['bonus-rules'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bonus_rules')
          .select('*')
          .eq('is_active', true)
          .order('min_value', { ascending: true })

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error loading bonus rules:", error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Helper function to convert currency to PEN - memoize to prevent recreation on each render
  const convertToPEN = useCallback((amount: number, currency: string): number => {
    if (currency === 'PEN') return amount
    return amount * (exchangeRate || 3.7167)
  }, [exchangeRate])

  // Helper function to calculate bonus - memoize to prevent recreation on each render
  const calculateBonus = useCallback((property: Property): number | null => {
    if (!property.is_first_home) return null

    const propertyValueInPEN = convertToPEN(property.price_cost, property.currency)
    
    const applicableRule = bonusRules.find(
      rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    )

    if (!applicableRule) return null

    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus
  }, [bonusRules, convertToPEN])

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
    let propertiesChannel: RealtimeChannel | null = null
    
    if (user) {
      propertiesChannel = supabase
        .channel('properties-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'properties' }, 
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Change received!', payload)
            queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] })
          }
        )
        .subscribe()
    }

    return () => {
      if (propertiesChannel) {
        supabase.removeChannel(propertiesChannel)
      }
    }
  }, [queryClient, user])

  const handleDuplicate = useCallback(async (e: React.MouseEvent, mortgage: Mortgage) => {
    e.stopPropagation()
    
    // Use the previously initialized mortgage capture service
    await captureMortgage({
      mortgageId: mortgage.id,
      successCallback: () => {
        // Refresh the data after capture
        queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] })
      },
      stayOnPage: false // Always redirect when duplicating from the mortgages list
    });
    
  }, [captureMortgage, queryClient])

  const handleDelete = useCallback(async (e: React.MouseEvent, mortgage: Mortgage) => {
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
  }, [tGlobal, tMortgages, queryClient, toast])

  // Memoize the header actions to prevent recreating on every render
  const headerActions = useMemo(() => (
    <Button onClick={() => navigate("/mortgages/new")} disabled={!propertiesWithMortgages || propertiesWithMortgages.length === 0}>
      <Plus className="mr-2 h-4 w-4" />
      {tMortgages('amortization.new')}
    </Button>
  ), [navigate, tMortgages, propertiesWithMortgages])

  const loadProperties = useCallback(() => {
    // Logic to load or refresh properties
    queryClient.invalidateQueries({ queryKey: ["properties-with-mortgages"] })
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
                    {calculateBonus(property) && (
                      <Badge variant="outline" className="ml-4 text-sm font-medium">
                        {t('bonus.amount_short')}: S/ {Number(calculateBonus(property)).toLocaleString('en-US')}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              
              <DataTable 
                columns={columns}
                data={property.mortgages}
                onRowClick={(mortgage) => navigate(`/mortgages/${mortgage.id}`)}
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