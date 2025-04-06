import { formatCurrency } from "@/lib/utils"
import { formatDate } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

interface ExtraInstallment {
  id: string
  amount: number
  frequency: "monthly" | "one-time"
  start_date: string
}

interface ExtraInstallmentsTableProps {
  installments: ExtraInstallment[]
  currency: "USD" | "PEN"
  onDelete: (id: string) => void
}

export function ExtraInstallmentsTable({
  installments,
  currency,
  onDelete
}: ExtraInstallmentsTableProps) {
  const { t } = useTranslation(['components'])

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.number', '#', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.amount', 'Amount', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.frequency', 'Frequency', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.date', 'Date', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium w-[50px] text-xs text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody>
          {installments.map((installment, index) => (
            <tr key={installment.id} className="border-b last:border-none">
              <td className="p-2 text-sm">{index + 1}</td>
              <td className="p-2 text-sm">{formatCurrency(installment.amount, currency)}</td>
              <td className="p-2 capitalize text-sm">
                <span className="text-sm">
                  {installment.frequency === "one-time" 
                  ? t('extra_installments_section.form.frequency_one_time', 'One-time', { ns: 'components' })
                  : t('extra_installments_section.form.frequency_monthly', 'Monthly', { ns: 'components' })}
                </span>
              </td>
              <td className="p-2 text-sm">
                {(() => {
                  // Handle date display in a timezone-safe way
                  // If it's already a YYYY-MM-DD string, parse it correctly
                  try {
                    if (typeof installment.start_date === 'string') {
                      // If it's a simple YYYY-MM-DD format, parse it directly
                      if (/^\d{4}-\d{2}-\d{2}$/.test(installment.start_date)) {
                        const [year, month, day] = installment.start_date.split('-').map(Number);
                        // Create a date with local timezone (months are 0-indexed in JS)
                        const localDate = new Date(year, month - 1, day);
                        return formatDate(localDate);
                      }
                    }
                    // Fallback to regular date parsing if needed
                    return formatDate(new Date(installment.start_date));
                  } catch (e) {
                    console.error('Error formatting date:', e);
                    return installment.start_date; // Fallback to raw string
                  }
                })()}
              </td>
              <td className="p-2">
                <Button
                  className="h-8 w-8"
                  variant="ghost"
                  onClick={() => onDelete(installment.id)}
                  title={t('extra_installments_section.table.delete_tooltip', 'Delete installment', { ns: 'components' })}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </td>
            </tr>
          ))}
          {installments.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4  text-center">
                {t('extra_installments_section.table.no_installments', 'No extra installments added yet', { ns: 'components' })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
} 