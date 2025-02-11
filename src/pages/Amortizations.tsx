
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function Amortizations() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Amortizations</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Amortization
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
