
import { useParams } from "react-router-dom"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ExtraInstallmentsList } from "@/components/amortizations/extra-installments-list"
import { RefinancingOptionsList } from "@/components/amortizations/refinancing-options-list"

export default function EditAmortization() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <div>Invalid amortization ID</div>
  }

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <h1 className="text-3xl font-bold">Edit Amortization</h1>
        <div className="grid gap-6">
          <ExtraInstallmentsList amortizationId={id} />
          <RefinancingOptionsList amortizationId={id} />
        </div>
      </div>
    </DashboardLayout>
  )
}
