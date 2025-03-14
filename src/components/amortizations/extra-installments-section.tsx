import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ExtraInstallmentForm } from "./extra-installment-form"
import { ExtraInstallmentsTable } from "./extra-installments-table"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"

interface ExtraInstallmentFormValues {
  paymentDate: Date
  amount: number
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
  const [installments, setInstallments] = useState<ExtraInstallment[]>([])
  const queryClient = useQueryClient()

  // Load existing installments when component mounts
  useEffect(() => {
    const loadInstallments = async () => {
      try {
        const { data, error } = await supabase
          .from("extra_installments")
          .select("id, amount, frequency, start_date")
          .eq("amortization_id", amortizationId)
          .order("start_date", { ascending: true })

        if (error) throw error

        if (data) {
          const typedInstallments: ExtraInstallment[] = data.map(item => ({
            id: item.id,
            amount: item.amount,
            frequency: item.frequency as "monthly" | "one-time",
            start_date: item.start_date
          }))
          setInstallments(typedInstallments)
        }
      } catch (error) {
        console.error("Error loading installments:", error)
      }
    }

    if (amortizationId) {
      loadInstallments()
    }
  }, [amortizationId])

  const handleSubmit = async (values: ExtraInstallmentFormValues) => {
    try {
      const installmentData = {
        amortization_id: amortizationId,
        payment_date: values.paymentDate,
        amount: values.amount,
      }

      const { error } = await supabase
        .from("extra_installments")
        .insert([installmentData])

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      await queryClient.invalidateQueries({
        queryKey: ["extra-installments", amortizationId]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", amortizationId]
      })
      
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
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("extra_installments")
        .delete()
        .eq("id", id)

      if (error) throw error

      setInstallments(installments.filter(i => i.id !== id))
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