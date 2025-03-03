import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function Dashboard() {
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-3xl font-bold">Dashboard</h1>
      }}
    >
      <div className="p-8">
        <p className="text-muted-foreground">Welcome to your CreditoHipotecar.io dashboard.</p>
      </div>
    </DashboardLayout>
  )
}
