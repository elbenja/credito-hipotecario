
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { supabase } from "@/integrations/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RefinancingOptionForm } from "./refinancing-option-form"

interface RefinancingOptionsListProps {
  amortizationId: string
}

export function RefinancingOptionsList({ amortizationId }: RefinancingOptionsListProps) {
  const { data: refinancingOptions, refetch } = useQuery({
    queryKey: ["refinancing-options", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refinancing_options")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("effective_date", { ascending: true })

      if (error) throw error
      return data
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Refinancing Options</h2>
        <RefinancingOptionForm 
          amortizationId={amortizationId} 
          onSuccess={refetch}
        />
      </div>

      {refinancingOptions && refinancingOptions.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>New Interest Rate</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>New Term (Years)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refinancingOptions.map((option) => (
              <TableRow key={option.id}>
                <TableCell>{option.new_interest_rate}%</TableCell>
                <TableCell>{format(new Date(option.effective_date), "PPP")}</TableCell>
                <TableCell>{option.new_term_years || "Original term"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
