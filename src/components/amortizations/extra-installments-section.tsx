import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ExtraInstallmentForm } from "./extra-installment-form"
import { ExtraInstallmentsTable } from "./extra-installments-table"

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
  const [isLoading, setIsLoading] = useState(false)
  const [installments, setInstallments] = useState<ExtraInstallment[]>([])

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

  const handleSubmit = async (values: any) => {
    try {
      setIsLoading(true)
      
      // Parse the amount value, removing any non-numeric characters and converting to float
      const amount = parseFloat(values.amount.replace(/[^0-9.]/g, ""))
      
      // Validate the amount
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount")
      }

      // Validate frequency value
      if (values.frequency !== "monthly" && values.frequency !== "one-time") {
        throw new Error("Invalid frequency value. Must be 'monthly' or 'one-time'")
      }

      const installmentData: ExtraInstallmentData = {
        amortization_id: amortizationId,
        amount: amount,
        frequency: values.frequency as "monthly" | "one-time",
        start_date: values.start_date.toISOString()
      }

      console.log('Sending data to database:', installmentData)

      const { data, error } = await supabase
        .from("extra_installments")
        .insert([installmentData])
        .select("id, amount, frequency, start_date")
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (data) {
        const newInstallment: ExtraInstallment = {
          id: data.id,
          amount: data.amount,
          frequency: data.frequency as "monthly" | "one-time",
          start_date: data.start_date
        }
        setInstallments([...installments, newInstallment])
        onInstallmentsChange()
      }

      toast({
        title: "Success",
        description: "Extra installment added successfully",
      })
    } catch (error) {
      console.error("Error details:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "There was an error adding the extra installment. Please check the console for details.",
      })
    } finally {
      setIsLoading(false)
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
        title: "Success",
        description: "Extra installment deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting extra installment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error deleting the extra installment",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Extra Installments</h3>
 
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