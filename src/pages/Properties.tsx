
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function Properties() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Properties</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
