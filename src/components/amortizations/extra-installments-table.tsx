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
  const { t } = useTranslation()

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("extra_installments_section.table.number")}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("extra_installments_section.table.amount")}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("extra_installments_section.table.frequency")}</th>
            <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("extra_installments_section.table.date")}</th>
            <th className="p-2 text-left font-medium w-[50px] text-xs text-muted-foreground">{t("extra_installments_section.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((installment, index) => (
            <tr key={installment.id} className="border-b last:border-none">
              <td className="p-2 text-sm">{index + 1}</td>
              <td className="p-2 text-sm">{formatCurrency(installment.amount, currency)}</td>
              <td className="p-2 capitalize text-sm">
                {installment.frequency === "one-time" 
                  ? t("extra_installments_section.table.frequency_once") 
                  : t("extra_installments_section.table.frequency_monthly")}
              </td>
              <td className="p-2 text-sm">{formatDate(new Date(installment.start_date))}</td>
              <td className="p-2">
                <Button
                  className="h-8 w-8"
                  variant="ghost"
                  onClick={() => onDelete(installment.id)}
                  title={t("extra_installments_section.table.delete_tooltip")}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </td>
            </tr>
          ))}
          {installments.length === 0 && (
            <tr>
              <td colSpan={5} className="p-2 text-center text-muted-foreground">
                {t("extra_installments_section.table.no_installments")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
} 