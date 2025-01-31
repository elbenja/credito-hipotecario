import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"

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
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-bold text-xl text-slate-900">
            HomeSavvy
          </Link>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-sm font-medium">
            Sign in
          </Button>
          <Button size="sm" className="text-sm font-medium">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  )
}