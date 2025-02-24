import { SEO } from "@/components/seo"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "./dashboard-sidebar"
import { Separator } from "@/components/ui/separator"

interface HeaderProps {
  title?: React.ReactNode
  actions?: React.ReactNode
}

function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-8">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      {title && <div className="flex-1">{title}</div>}
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </header>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
  header?: {
    title?: React.ReactNode
    actions?: React.ReactNode
  }
}

export function DashboardLayout({ children, header }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <SEO title="Dashboard - CreditoHipotecar.io" />
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col">
          <Header title={header?.title} actions={header?.actions} />
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
