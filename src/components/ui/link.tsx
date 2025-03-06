import { Link as RouterLink } from "react-router-dom"
import { cn } from "@/lib/utils"

interface LinkProps extends React.ComponentPropsWithoutRef<typeof RouterLink> {
  href: string
  className?: string
  children: React.ReactNode
}

export function Link({ href, className, children, ...props }: LinkProps) {
  return (
    <RouterLink
      to={href}
      className={cn(
        "text-primary underline-offset-4 hover:underline",
        className
      )}
      {...props}
    >
      {children}
    </RouterLink>
  )
} 