import { formatCurrency, formatDate } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type PaymentRow = {
  date: Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base?: boolean
}

interface ScenarioTableProps {
  rows: PaymentRow[]
  currency: "USD" | "PEN"
  compareWithBaseScenario?: boolean
}

export function ScenarioTable({
  rows,
  currency,
  compareWithBaseScenario = false
}: ScenarioTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Capital</TableHead>
            <TableHead className="text-right">Interest</TableHead>
            <TableHead className="text-right">Property Insurance</TableHead>
            <TableHead className="text-right">Loan Insurance</TableHead>
            <TableHead className="text-right">Monthly Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow 
              key={index}
              className={row.is_different_from_base ? "bg-muted/50" : undefined}
            >
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.capital, currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.interest, currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.property_insurance, currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.loan_insurance, currency)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(row.monthly_payment, currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 