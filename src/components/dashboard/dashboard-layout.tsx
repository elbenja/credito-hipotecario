import { SEO } from "@/components/seo"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardNoAccessSidebar } from "./dashboard-noaccess-sidebar"
import { Separator } from "@/components/ui/separator"
import { useSidebarAutoCollapse } from "@/hooks/use-sidebar-auto-collapse"
import { useAuth } from "@/context/auth-context"
// ... existing imports ...
import { PlanLimitDialog } from "@/components/common/PlanLimitDialog"
import { useState, createContext, useContext } from "react"

// Create a context for the dialog
interface PlanLimitDialogContextType {
  showDialog: () => void
}

const PlanLimitDialogContext = createContext<PlanLimitDialogContextType | undefined>(undefined)

export function usePlanLimitDialog() {
  const context = useContext(PlanLimitDialogContext)
  if (!context) {
    throw new Error('usePlanLimitDialog must be used within DashboardLayout')
  }
  return context
}

interface HeaderProps {
  title?: React.ReactNode
  actions?: React.ReactNode
}

function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-8">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      {title && <div className="flex-1">{title}</div>}
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </header>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
  header?: HeaderProps
}

function DashboardContent({ children, header }: DashboardLayoutProps) {
  useSidebarAutoCollapse()
  const { hasAccess } = useAuth()
  
  return (
    <div className="min-h-screen flex w-full bg-background">
      {hasAccess ? <DashboardSidebar /> : <DashboardNoAccessSidebar />}
      <main className="flex-1 flex flex-col">
        <Header title={header?.title || "Dashboard"} actions={header?.actions} />
        <div className="flex-1 bg-muted/10">
          {children}
        </div>
      </main>
    </div>
  )
}

// export function DashboardLayout({ children, header }: DashboardLayoutProps) {
//   return (
//     <SidebarProvider defaultOpen={true}>
//       <SEO 
//         title="Dashboard - CreditoHipotecar.io"
//         description="Dashboard for CreditoHipotecar.io"
//       />
//       <DashboardContent header={header}>
//         {children}
//       </DashboardContent>
//     </SidebarProvider>
//   )
// }
export function DashboardLayout({ children, header }: DashboardLayoutProps) {
  const [showLimitDialog, setShowLimitDialog] = useState(false)

  return (
    <SidebarProvider defaultOpen={true}>
      <SEO 
        title="Dashboard - CreditoHipotecar.io"
        description="Dashboard for CreditoHipotecar.io"
      />
      <PlanLimitDialogContext.Provider 
        value={{ showDialog: () => setShowLimitDialog(true) }}
      >
        <DashboardContent header={header}>
          {children}
        </DashboardContent>
        
        {/* Global Plan Limit Dialog */}
        <PlanLimitDialog
          open={showLimitDialog}
          onClose={() => setShowLimitDialog(false)}
        />
      </PlanLimitDialogContext.Provider>
    </SidebarProvider>
  )
}