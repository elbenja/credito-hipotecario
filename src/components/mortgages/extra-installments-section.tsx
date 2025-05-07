import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ExtraInstallmentForm } from "./extra-installment-form"
import { ExtraInstallmentsTable } from "./extra-installments-table"
import { useTranslation } from "react-i18next"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { normalizeDate } from "@/utils/utils"

interface ExtraInstallmentFormValues {
  start_date: Date
  amount: string
  frequency: "monthly" | "one-time"
}

interface ExtraInstallment {
  id: string
  amount: number
  frequency: "monthly" | "one-time"
  start_date: string
}

interface ExtraInstallmentData {
  mortgage_id: string
  amount: number
  frequency: "monthly" | "one-time"
  start_date: string
}

interface ExtraInstallmentsSectionProps {
  mortgageId: string
  currency: "USD" | "PEN"
  loanAmount: number
  onInstallmentsChange: () => void
  firstInstallmentDate?: Date
}

export function ExtraInstallmentsSection({
  mortgageId,
  currency,
  loanAmount,
  onInstallmentsChange,
  firstInstallmentDate
}: ExtraInstallmentsSectionProps) {
  const { toast } = useToast()
  const { t } = useTranslation(['components'])
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  // Debug information for firstInstallmentDate
  useEffect(() => {
    if (firstInstallmentDate) {

      
      // Try to normalize the date to see if that helps
      const normalized = normalizeDate(firstInstallmentDate);

    } else {
     
    }
  }, [firstInstallmentDate]);

  // Use React Query for installments
  const { data: installments = [] } = useQuery({
    queryKey: ["extra-installments", mortgageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_installments")
        .select("id, amount, frequency, start_date")
        .eq("mortgage_id", mortgageId)
        .order("start_date", { ascending: true })

      if (error) throw error

      return data.map(item => ({
        id: item.id,
        amount: item.amount,
        frequency: item.frequency as "monthly" | "one-time",
        start_date: item.start_date
      }))
    },
    staleTime: 0 // Always fetch fresh data
  })

  const handleSubmit = async (values: ExtraInstallmentFormValues) => {
    try {
      setIsLoading(true)
      
      // Log the received date from the form component
      console.log('Extra installments section - Received date from form:', values.start_date);
      
      // IMPROVED APPROACH: Create a date string in YYYY-MM-DD format
      // 1. Extract components from the date object
      const dateObj = values.start_date;
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1; // Convert to 1-based month
      const day = dateObj.getDate();
      
      // 2. Create a properly formatted YYYY-MM-DD string
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Log for debugging
      console.log('Extra installment submission:');
      console.log('- Original date object:', dateObj);
      console.log('- Date components:', { year, month, day });
      console.log('- Formatted date string:', dateString);
      
      const installmentData = {
        mortgage_id: mortgageId,
        start_date: dateString, // Use the YYYY-MM-DD string
        amount: parseFloat(values.amount),
        frequency: values.frequency
      }

      const { data, error } = await supabase
        .from("extra_installments")
        .insert([installmentData])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Extra installment created:', data);

      // Invalidate both queries to trigger recalculation
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["extra-installments", mortgageId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["scenarios", mortgageId]
        })
      ])
      
      onInstallmentsChange()
      toast({
        title: t('extra_installments_section.success.title', 'Success', { ns: 'components' }),
        description: t('extra_installments_section.success.add', 'Extra installment added successfully', { ns: 'components' }),
        variant: "default"
      })
    } catch (error) {
      console.error("Error details:", error)
      toast({
        title: t('extra_installments_section.error.title', 'Error', { ns: 'components' }),
        description: t('extra_installments_section.error.add', 'Error adding extra installment', { ns: 'components' }),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from("extra_installments")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Invalidate both queries to trigger recalculation
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["extra-installments", mortgageId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["scenarios", mortgageId]
        })
      ])

      onInstallmentsChange()
      toast({
        title: t('extra_installments_section.success.title', 'Success', { ns: 'components' }),
        description: t('extra_installments_section.success.delete', 'Extra installment deleted successfully', { ns: 'components' }),
      })
    } catch (error) {
      console.error("Error deleting extra installment:", error)
      toast({
        variant: "destructive",
        title: t('extra_installments_section.error.title', 'Error', { ns: 'components' }),
        description: t('extra_installments_section.error.delete', 'Error deleting extra installment', { ns: 'components' }),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className=" p-2 inline-flex justify-start items-center gap-8">
        <h3 className="text-lg font-medium">{t('extra_installments_section.title', 'Extra Installments', { ns: 'components' })}</h3>
    

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('extra_installments_section.add_button', 'Add Extra Installment', { ns: 'components' })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <ExtraInstallmentForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            loanAmount={loanAmount}
            currency={currency}
            // Make sure we're passing a normalized date to avoid timezone issues
            firstInstallmentDate={firstInstallmentDate ? normalizeDate(firstInstallmentDate) : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>

      <ExtraInstallmentsTable
        installments={installments}
        currency={currency}
        onDelete={handleDelete}
      />
    </div>
  )
} 