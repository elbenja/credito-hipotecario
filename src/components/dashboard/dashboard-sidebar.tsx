import { LayoutDashboard, MessageSquare, User, CreditCard, Settings, LogOut, ChevronsUpDown, UserCog, UsersRound, Sun, Moon, LifeBuoy } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
// import { useQuery } from "@tanstack/react-query"
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
import { useTheme } from "@/components/theme-provider"
import { useState, useEffect } from "react"
import { Logo } from "@/components/ui/logo"
import { useMortgageCount } from "@/hooks/mortgages/useCount"
import { usePropertyCount } from "@/hooks/properties/useCount"
import { Tooltip, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { APP_VERSION } from "../common/version"

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

function CoursesIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      fill="none"
      className={className}
    >
      <path d="M18.9737 15.0215C18.9795 14.9928 19.0205 14.9928 19.0263 15.0215C19.3302 16.5081 20.4919 17.6698 21.9785 17.9737C22.0072 17.9795 22.0072 18.0205 21.9785 18.0263C20.4919 18.3302 19.3302 19.4919 19.0263 20.9785C19.0205 21.0072 18.9795 21.0072 18.9737 20.9785C18.6698 19.4919 17.5081 18.3302 16.0215 18.0263C15.9928 18.0205 15.9928 17.9795 16.0215 17.9737C17.5081 17.6698 18.6698 16.5081 18.9737 15.0215Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.6469 12.6727C15.3884 12.1531 15.7591 11.8934 15.9075 11.5158C16.0308 11.2021 16.0308 10.7979 15.9075 10.4842C15.7591 10.1066 15.3884 9.84685 14.6469 9.3273C14.1274 8.9633 13.5894 8.60214 13.1167 8.3165C12.7229 8.07852 12.2589 7.82314 11.7929 7.57784C11.005 7.16312 10.6111 6.95576 10.2297 7.00792C9.91348 7.05115 9.58281 7.25237 9.38829 7.5199C9.1536 7.84266 9.12432 8.30677 9.06577 9.23497C9.02725 9.84551 9 10.4661 9 11C9 11.5339 9.02725 12.1545 9.06577 12.765C9.12432 13.6932 9.1536 14.1573 9.38829 14.4801C9.58281 14.7476 9.91348 14.9489 10.2297 14.9921C10.6111 15.0442 11.005 14.8369 11.7929 14.4221C12.2589 14.1768 12.7229 13.9215 13.1167 13.6835C13.5894 13.3978 14.1274 13.0367 14.6469 12.6727Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21.872 14.8357C22 13.9227 22 12.7279 22 11C22 8.19974 22 6.79961 21.455 5.73005C20.9757 4.78924 20.2108 4.02433 19.27 3.54497C18.2004 3 16.8003 3 14 3H10C7.19974 3 5.79961 3 4.73005 3.54497C3.78924 4.02433 3.02433 4.78924 2.54497 5.73005C2 6.79961 2 8.19974 2 11C2 13.8003 2 15.2004 2.54497 16.27C3.02433 17.2108 3.78924 17.9757 4.73005 18.455C5.79961 19 7.19974 19 10 19H13.4257" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type DashboardSectionKey = 'dashboard' | 'properties' | 'mortgages' | 'rentals' | 'courses' | 'ai_chat' | 'account' | 'billing' | 'notifications'
type AdminSectionKey = 'user_management' | 'early_access' | 'test' | 'subscription_plans'

type NavItem = {
  title: DashboardSectionKey | AdminSectionKey
  namespace: 'dashboard' | 'admin'
  icon: any
  href: string
  badge?: 'coming'
}

const mainNavItems: NavItem[] = [
  { title: "dashboard", namespace: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "properties", namespace: "dashboard", icon: PropertyIcon, href: "/properties" },
  { title: "mortgages", namespace: "dashboard", icon: AmortizationIcon, href: "/mortgages" },
  { 
    title: "rentals", 
    namespace: "dashboard",
    icon: RentalIcon, 
    href: "/",
    badge: "coming"
  },
  { 
    title: "courses", 
    namespace: "dashboard",
    icon: CoursesIcon, 
    href: "/",
    badge: "coming"
  },
]

const adminNavItems: NavItem[] = [
  { title: "user_management", namespace: "admin", icon: UsersRound, href: "/admin/users" },
  { title: "subscription_plans", namespace: "admin", icon: CreditCard, href: "/admin/subscription-plans" },
  { title: "early_access", namespace: "admin", icon: UserCog, href: "/admin/early-access" },
  // { title: "test", namespace: "admin", icon: Calculator, href: "/test-extra-installments" },
]

const footerNavItems: NavItem[] = [
  { title: "ai_chat", namespace: "dashboard", icon: MessageSquare, href: "/dashboard" },


]

export function DashboardSidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { t: tDashboard } = useTranslation('dashboard')
  const { t: tAdmin } = useTranslation('admin')
  const { t: tGlobal } = useTranslation('global')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkIfAdmin = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.error('Error checking admin status:', authError)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          return
        }

        setIsAdmin(!!profile?.is_admin)
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }

    checkIfAdmin()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const { data: propertiesCount = 0 } = usePropertyCount()

  const { data: mortgagesCount = 0 } = useMortgageCount()

  const getTranslation = (item: NavItem): string => {
    if (item.namespace === 'dashboard') {
      return tDashboard(`sections.${item.title}`)
    }
    return tAdmin(item.title)
  }

  return (
    <Sidebar className="bg-background">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-3">
         
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-2">  
                <Logo /> <span className="font-bold text-md">CreditoHipotecar.io</span> 
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white text-xs rounded-md py-2 px-4">
              {APP_VERSION}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{tDashboard('sections.main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{getTranslation(item)}</span>
                      {item.badge && (
                        <Badge variant="outline" className="ml-2 text-xs">{tGlobal('ui.coming')}</Badge>
                      )}
                      {item.title === "properties" && propertiesCount > 0 && (
                        <SidebarMenuBadge>{propertiesCount}</SidebarMenuBadge>
                      )}
                      {item.title === "mortgages" && mortgagesCount > 0 && (
                        <SidebarMenuBadge>{mortgagesCount}</SidebarMenuBadge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{tAdmin('title')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{getTranslation(item)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                      <span>{tDashboard(`sections.${item.title}`)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    {theme === 'light' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span>{tGlobal(theme === 'light' ? 'settings.light' : 'settings.dark')}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                      <Link to="/account" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>{tDashboard('sections.account')}</span>
                      </Link>
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>{tDashboard('sections.billing')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>{tDashboard('sections.notifications')}</span>
                      </Link>
                    </DropdownMenuItem> */}
                     <DropdownMenuItem asChild>
                      <Link to="/support" className="flex items-center">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        <span>{tDashboard('sections.support')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{tGlobal('settings.title')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{tGlobal('ui.log_out')}</span>
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
