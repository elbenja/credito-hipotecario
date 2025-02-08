
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "@/context/auth-context"

const features = [
  {
    title: "Amortization Simulator",
    href: "#amortization",
    description: "Optimize your savings and decision-making with our advanced simulator."
  },
  {
    title: "Rent Return Simulator",
    href: "#rent-return",
    description: "Analyze how long allocated rent will take to recover your investment."
  },
  {
    title: "AI Real Estate Expert",
    href: "#ai-expert",
    description: "Get personalized insights powered by artificial intelligence."
  }
]

const resources = [
  { title: "About Us", href: "#about" },
  { title: "Contact", href: "#contact" },
  { title: "Privacy Policy", href: "#privacy" },
  { title: "Terms of Service", href: "#terms" }
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleAction = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  const MobileNavItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      className="flex items-center py-3 text-sm font-medium text-slate-600 hover:text-slate-900"
      onClick={() => setIsOpen(false)}
    >
      {children}
    </a>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-bold text-xl text-slate-900">
            HomeSavvy
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium">Features</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4">
                      {features.map((feature) => (
                        <li key={feature.title}>
                          <NavigationMenuLink asChild>
                            <a
                              href={feature.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100"
                            >
                              <div className="text-sm font-medium leading-none text-slate-900">{feature.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-slate-600">
                                {feature.description}
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium">Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-3 p-4">
                      {resources.map((resource) => (
                        <li key={resource.title}>
                          <NavigationMenuLink asChild>
                            <a
                              href={resource.href}
                              className="block select-none rounded-md p-3 text-sm leading-none no-underline outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100"
                            >
                              {resource.title}
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="#pricing" className="group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    Pricing
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button 
            size="sm" 
            className={cn(
              "text-sm font-medium",
              user && "bg-[#ea384c] hover:bg-[#ea384c]/90 rounded-full"
            )}
            onClick={handleAction}
          >
            {user ? "Go to App" : "Get Started"}
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[300px]">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xl text-slate-900">HomeSavvy</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-col space-y-3">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Features</p>
                    {features.map((feature) => (
                      <MobileNavItem key={feature.title} href={feature.href}>
                        {feature.title}
                      </MobileNavItem>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Resources</p>
                    {resources.map((resource) => (
                      <MobileNavItem key={resource.title} href={resource.href}>
                        {resource.title}
                      </MobileNavItem>
                    ))}
                  </div>
                  <MobileNavItem href="#pricing">Pricing</MobileNavItem>
                </div>
                <div className="pt-4">
                  <Button 
                    className={cn(
                      "w-full",
                      user && "bg-[#ea384c] hover:bg-[#ea384c]/90 rounded-full"
                    )} 
                    size="sm"
                    onClick={handleAction}
                  >
                    {user ? "Go to App" : "Get Started"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
