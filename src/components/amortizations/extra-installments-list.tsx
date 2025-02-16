
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { ExtraInstallmentForm } from "./extra-installment-form"
import type { ExtraInstallment } from "./types"
import type { ExtraInstallmentFormValues } from "./extra-installment-schema"

type ExtraInstallmentsListProps = {
  amortizationId: string
}

export function ExtraInstallmentsList({ amortizationId }: ExtraInstallmentsListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)

  const { data: extraInstallments, isLoading } = useQuery({
    queryKey: ["extra-installments", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_installments")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("start_date", { ascending: true })

      if (error) throw error
      return data as ExtraInstallment[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async (values: ExtraInstallmentFormValues) => {
      const { error } = await supabase.from("extra_installments").insert({
        amortization_id: amortizationId,
        amount: parseFloat(values.amount),
        frequency: values.frequency,
        start_date: format(values.start_date, "yyyy-MM-dd"),
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extra-installments", amortizationId] })
      toast({
        title: "Success",
        description: "Extra installment added successfully",
      })
      setIsAdding(false)
    },
    onError: (error) => {
      console.error("Error adding extra installment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add extra installment",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("extra_installments")
        .delete()
        .eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extra-installments", amortizationId] })
      toast({
        title: "Success",
        description: "Extra installment deleted successfully",
      })
    },
    onError: (error) => {
      console.error("Error deleting extra installment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete extra installment",
      })
    },
  })

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    addMutation.mutate(values)
  }

  if (isLoading) {
    return <div>Loading extra installments...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Extra Installments</h3>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "Cancel" : "Add Extra Installment"}
        </Button>
      </div>

      {isAdding && (
        <ExtraInstallmentForm
          onSubmit={handleSubmit}
          isLoading={addMutation.isPending}
        />
      )}

      {extraInstallments && extraInstallments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {extraInstallments.map((installment) => (
              <TableRow key={installment.id}>
                <TableCell>{installment.amount}</TableCell>
                <TableCell className="capitalize">{installment.frequency}</TableCell>
                <TableCell>{format(new Date(installment.start_date), "PPP")}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(installment.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )) : (
          <p className="text-sm text-muted-foreground">No extra installments added yet.</p>
        )}
    </div>
  )
}
