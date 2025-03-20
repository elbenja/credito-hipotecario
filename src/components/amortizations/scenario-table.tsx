import { formatCurrency, formatDate } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BadgeCheck } from "lucide-react"

type PaymentRow = {
  date: Date
  beginning_balance?: number
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base?: boolean
  is_double_payment?: boolean
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
    <div className="rounded-md ">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs text-right">Beginning Balance</TableHead>
            <TableHead className="text-xs text-right">Capital</TableHead>
            <TableHead className="text-xs text-right">Interest</TableHead>
            <TableHead className="text-xs text-right">Property Insurance</TableHead>
            <TableHead className="text-xs text-right">Loan Insurance</TableHead>
            <TableHead className="text-xs text-right">Monthly Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            // Determine the row styling based on if it's a double payment and/or different from base
            let rowClassName = "text-sm";
            if (row.is_double_payment) {
              rowClassName = "bg-amber-50 text-sm font-medium";
            } else if (row.is_different_from_base) {
              rowClassName = "bg-muted/50 text-sm";
            }
            
            return (
              <TableRow 
                key={index}
                className={rowClassName}
              >
                <TableCell className="text-sm p-2 ">
                  {formatDate(row.date)}
                  {row.is_double_payment && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                      2x
                    </span>
                  )}
                </TableCell>
                <TableCell className="p-2 text-sm text-right">
                  {formatCurrency(row.beginning_balance || 0, currency)}
                </TableCell>
                <TableCell className="p-2 text-sm text-right">
                  {formatCurrency(row.capital, currency)}
                </TableCell>
                <TableCell className="p-2 text-sm text-right">
                  {formatCurrency(row.interest, currency)}
                </TableCell>
                <TableCell className="p-2 text-sm text-right">
                  {formatCurrency(row.property_insurance, currency)}
                </TableCell>
                <TableCell className="p-2 text-sm text-right">
                  {formatCurrency(row.loan_insurance, currency)}
                </TableCell>
                <TableCell className={`p-2 text-sm text-right font-medium ${row.is_double_payment ? "text-amber-900" : ""}`}>
                  {formatCurrency(row.monthly_payment, currency)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
} 