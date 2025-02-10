
import { Building, Calculator, LayoutDashboard, MessageSquare, User, CreditCard, Bell, Settings, LogOut, ChevronsUpDown } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"

const CostsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
    <path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H13C14.9628 4 15.9443 4 16.7889 4.42229C17.6334 4.84458 18.2223 5.62972 19.4 7.2C21.1333 9.51111 22 10.6667 22 12C22 13.3333 21.1333 14.4889 19.4 16.8C18.2223 18.3703 17.6334 19.1554 16.7889 19.5777C15.9443 20 14.9628 20 13 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10.5 9.375C9.6716 9.375 9 9.9626 9 10.6875C9 11.4124 9.6716 12 10.5 12C11.3284 12 12 12.5876 12 13.3125C12 14.0374 11.3284 14.625 10.5 14.625M10.5 9.375C11.1531 9.375 11.7087 9.7402 11.9146 10.25M10.5 9.375V8.5M10.5 14.625C9.8469 14.625 9.2913 14.2598 9.0854 13.75M10.5 14.625V15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const mainNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Properties", icon: Building, href: "/properties" },
  { title: "Amortizations", icon: CostsIcon, href: "/amortizations" },
  { title: "Rentals", icon: Building, href: "/rentals" },
]

const footerNavItems = [
  { title: "AI Chat", icon: MessageSquare, href: "/chat" },
]

export function DashboardSidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/auth")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-4">
          <img src="/lovable-uploads/17eb0714-2b3e-4b08-a1d6-a92337781e6d.png" alt="Logo" className="h-6 w-6" />
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
                      {typeof item.icon === 'function' ? <item.icon /> : <item.icon className="h-4 w-4" />}
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
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                      <ChevronsUpDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start" side="right">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/billing" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Billing</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/notifications" className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
