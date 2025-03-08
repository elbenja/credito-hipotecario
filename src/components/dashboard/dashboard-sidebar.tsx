import { Building, Calculator, LayoutDashboard, MessageSquare, User, CreditCard, Bell, Settings, LogOut, ChevronsUpDown } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
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
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { useTheme } from "next-themes"

function PropertyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H13C14.9628 4 15.9443 4 16.7889 4.42229C17.6334 4.84458 18.2223 5.62972 19.4 7.2C21.1333 9.51111 22 10.6667 22 12C22 13.3333 21.1333 14.4889 19.4 16.8C18.2223 18.3703 17.6334 19.1554 16.7889 19.5777C15.9443 20 14.9628 20 13 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 9.375C9.6716 9.375 9 9.9626 9 10.6875C9 11.4124 9.6716 12 10.5 12C11.3284 12 12 12.5876 12 13.3125C12 14.0374 11.3284 14.625 10.5 14.625M10.5 9.375C11.1531 9.375 11.7087 9.7402 11.9146 10.25M10.5 9.375V8.5M10.5 14.625C9.8469 14.625 9.2913 14.2598 9.0854 13.75M10.5 14.625V15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AmortizationIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M15 20V4.5C15 3.67157 14.3284 3 13.5 3H11.5C10.6716 3 10 3.67157 10 4.5V20"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M20 20V12.5C20 11.6716 19.3284 11 18.5 11H16.5C15.6716 11 15 11.6716 15 12.5V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 20V8.5C10 7.67157 9.32843 7 8.5 7H6.5C5.67157 7 5 7.67157 5 8.5V20"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1 20.25H23"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RentalIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M12 3V22H7C5.11438 22 4.17157 22 3.58579 21.4142C3 20.8284 3 19.8856 3 18V3" 
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

      <path 
        d="M12 3H3" 
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

      <path
        d="M10 21.9997H17C18.8856 21.9997 19.8284 21.9997 20.4142 21.4139C21 20.8281 21 19.8853 21 17.9997V10H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7H8M7 11H8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 14H17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 22V18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const mainNavItems = [
  { title: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "properties", icon: PropertyIcon, href: "/properties" },
  { title: "amortizations", icon: AmortizationIcon, href: "/amortizations" },
  { 
    title: "rentals", 
    icon: RentalIcon, 
    href: "/rentals",
    badge: "coming"
  },
]

const footerNavItems = [
  { title: "ai_chat", icon: MessageSquare, href: "/chat" },
]

export function DashboardSidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()

  const { data: propertiesWithAmortizations } = useQuery({
    queryKey: ["properties-with-amortizations", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          currency,
          price_cost,
          amortizations (
            id,
            name,
            loan_amount,
            down_payment,
            interest_rate,
            term_years,
            installments_per_year,
            installment_amount,
            total_interest,
            total_payment
          )
        `)
        .eq("user_id", user.id)

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError)
        return []
      }

      return properties || []
    },
    enabled: !!user,
  })

  const propertiesCount = propertiesWithAmortizations?.length || 0
  const amortizationsCount = propertiesWithAmortizations?.reduce(
    (acc, property) => acc + (property.amortizations?.length || 0),
    0
  ) || 0

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/auth")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-4">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 37 41" 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 ${theme === 'dark' ? 'fill-white' : 'fill-black'} transition-colors`}
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M19.7051 1.02024C19.0175 0.460054 18.0289 0.46005 17.3413 1.02023L1.13491 14.2236C-0.223223 15.3301 0.562253 17.5225 2.31682 17.5225H3.98161V31.4973C3.98161 32.5243 4.81742 33.3568 5.84844 33.3568H8.78323V38.7373C8.78323 40.2604 10.5209 41.1375 11.754 40.2368L21.1728 33.3568H31.198C32.229 33.3568 33.0648 32.5243 33.0648 31.4973V17.5225H34.7296C36.4842 17.5225 37.2697 15.3301 35.9115 14.2236L19.7051 1.02024ZM8.98275 28.3753V14.2655L18.5232 6.49289L28.0637 14.2655V28.3753H19.5356L13.7844 32.5763V28.3753H8.98275Z" />
          </svg>
          <span className="font-bold text-lg">CreditoHipotecar.io</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.title)}</span>
                      {item.badge && (
                        <Badge variant="outline" className="ml-2 text-xs">{t(item.badge)}</Badge>
                      )}
                      {item.title === "properties" && propertiesCount > 0 && (
                        <SidebarMenuBadge>{propertiesCount}</SidebarMenuBadge>
                      )}
                      {item.title === "amortizations" && amortizationsCount > 0 && (
                        <SidebarMenuBadge>{amortizationsCount}</SidebarMenuBadge>
                      )}
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
                      <span>{t(item.title)}</span>
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
                        <span>{t('account')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/billing" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>{t('billing')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/notifications" className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>{t('notifications')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t('settings')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('log_out')}</span>
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
