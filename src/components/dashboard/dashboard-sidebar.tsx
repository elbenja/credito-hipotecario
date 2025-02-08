
import { Building, Calculator, LayoutDashboard, MessageSquare, User, Home } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const mainNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Properties", icon: Building, href: "/properties" },
  { title: "Amortizations", icon: Calculator, href: "/amortizations" },
  { title: "Rentals", icon: Building, href: "/rentals" },
]

const footerNavItems = [
  { title: "AI Chat", icon: MessageSquare, href: "/chat" },
  { title: "Profile", icon: User, href: "/profile" },
]

export function DashboardSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-4">
          <Home className="h-6 w-6" />
          <span className="font-bold text-xl">CreditoHipotecar.io</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {footerNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
