import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { formatCurrency, formatDate } from "@/utils/utils"

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
  onRowClick?: (installment: ExtraInstallment) => void
}

export function ExtraInstallmentsTable({
  installments,
  currency,
  onDelete,
  onRowClick
}: ExtraInstallmentsTableProps) {
  const { t } = useTranslation(['components'])

  // Sort installments by date
  const sortedInstallments = [...installments].sort((a, b) => {
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  })

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.number', '#', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.date', 'Date', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.amount', 'Amount', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('extra_installments_section.table.frequency', 'Frequency', { ns: 'components' })}</th>
            <th className="p-2 text-left font-medium w-[50px] text-xs text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody>
          {sortedInstallments.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-4 text-center ">
                {t('extra_installments_section.table.no_installments', 'No extra installments added yet', { ns: 'components' })}
              </td>
            </tr>
          ) : (
            sortedInstallments.map((installment, index) => (
              <tr
                key={installment.id}
                className="border-b last:border-0 cursor-pointer"
                onClick={() => onRowClick && onRowClick(installment)}
              >
                <td className="p-2 text-sm">{index + 1}</td>
                <td className="p-2 text-sm">{formatDate(new Date(installment.start_date))}</td>
                <td className="p-2 text-sm">{formatCurrency(installment.amount, currency)}</td>
                <td className="p-2 text-sm">
                  {installment.frequency === "monthly" 
                    ? t('extra_installments_section.monthly', 'Monthly', { ns: 'components' })
                    : t('extra_installments_section.one_time', 'One-time', { ns: 'components' })}
                </td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(installment.id)
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title={t('extra_installments_section.table.delete_tooltip', 'Delete installment', { ns: 'components' })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
} 