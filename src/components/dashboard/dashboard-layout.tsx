
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "./dashboard-sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <main className="flex-1">
          <div className="container py-4">
            <SidebarTrigger />
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
