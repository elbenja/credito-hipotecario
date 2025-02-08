
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your HomeSavvy dashboard.</p>
      </div>
    </DashboardLayout>
  )
}
