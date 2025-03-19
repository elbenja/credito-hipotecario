import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ExtraInstallmentForm } from "./extra-installment-form"
import { ExtraInstallmentsTable } from "./extra-installments-table"
import { useTranslation } from "react-i18next"
import { useQueryClient, useQuery } from "@tanstack/react-query"

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
  amortization_id: string
  amount: number
  frequency: "monthly" | "one-time"
  start_date: string
}

interface ExtraInstallmentsSectionProps {
  amortizationId: string
  currency: "USD" | "PEN"
  loanAmount: number
  onInstallmentsChange: () => void
}

export function ExtraInstallmentsSection({
  amortizationId,
  currency,
  loanAmount,
  onInstallmentsChange
}: ExtraInstallmentsSectionProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  // Use React Query for installments
  const { data: installments = [] } = useQuery({
    queryKey: ["extra-installments", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_installments")
        .select("id, amount, frequency, start_date")
        .eq("amortization_id", amortizationId)
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
      const installmentData = {
        amortization_id: amortizationId,
        start_date: values.start_date,
        amount: parseFloat(values.amount),
        frequency: values.frequency
      }

      const { error } = await supabase
        .from("extra_installments")
        .insert([installmentData])

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Invalidate both queries to trigger recalculation
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["extra-installments", amortizationId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["scenarios", amortizationId]
        })
      ])
      
      onInstallmentsChange()
      toast({
        title: t("success"),
        description: t("extra_installment_added"),
        variant: "default"
      })
    } catch (error) {
      console.error("Error details:", error)
      toast({
        title: t("error"),
        description: t("error_adding_extra_installment"),
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
          queryKey: ["extra-installments", amortizationId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["scenarios", amortizationId]
        })
      ])

      onInstallmentsChange()
      toast({
        title: t("extra_installments_section.success.delete"),
        description: t("extra_installments_section.success.delete"),
      })
    } catch (error) {
      console.error("Error deleting extra installment:", error)
      toast({
        variant: "destructive",
        title: t("extra_installments_section.error.title"),
        description: t("extra_installments_section.error.delete"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("extra_installments_section.title")}</h3>
      </div>

      <ExtraInstallmentForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        loanAmount={loanAmount}
        currency={currency}
      />

      <ExtraInstallmentsTable
        installments={installments}
        currency={currency}
        onDelete={handleDelete}
      />
    </div>
  )
} 