import { Link } from "react-router-dom"
import { SEO } from "@/components/seo"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <SEO 
        title="404 Not Found - CreditoHipotecar.io"
        description="The page you're looking for doesn't exist."
      />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-primary hover:underline">
        Go back home
      </Link>
    </div>
  )
}
