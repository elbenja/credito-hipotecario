
import { ArrowRight, Star } from "lucide-react"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"

interface HeroProps extends React.HTMLAttributes<HTMLElement> {
  title: string
  description: string
  buttonText: string
  avatars: Array<{
    src: string
    alt: string
  }>
  rating: {
    value: number
    count: number
  }
}

export function Hero({
  title,
  description,
  buttonText,
  avatars,
  rating,
  className,
  ...props
}: HeroProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleAction = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  return (
    <section
      className={cn("flex items-center justify-center w-full py-32 bg-slate-50", className)}
      {...props}
    >
      <div className="container flex flex-col items-center justify-center">
        <div className="mx-auto flex max-w-screen-lg flex-col items-center gap-6">
          <h1 className="text-center text-3xl font-extrabold text-slate-900 lg:text-6xl">
            {title}
          </h1>
          <p className="text-balance text-center text-slate-600 lg:text-lg">
            {description}
          </p>
        </div>
        <div className="flex gap-4 mt-10">
          <Button 
            size="lg"
            className={cn(
              user && "bg-[#ea384c] hover:bg-[#ea384c]/90 rounded-full"
            )}
            onClick={handleAction}
          >
            {user ? "Go to App" : buttonText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg">
            Watch Demo
          </Button>
        </div>
        <div className="mt-10 flex w-full max-w-fit flex-col items-center justify-center gap-4 sm:flex-row">
          <span className="inline-flex items-center -space-x-4">
            {avatars.map((avatar, index) => (
              <Avatar key={index} className="h-14 w-14 border">
                <AvatarImage src={avatar.src} alt={avatar.alt} />
              </Avatar>
            ))}
          </span>
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, index) => (
                <Star
                  key={index}
                  className="h-5 w-5 fill-yellow-400 text-yellow-400"
                />
              ))}
              <span className="font-semibold text-slate-900">{rating.value.toFixed(1)}</span>
            </div>
            <p className="font-medium text-slate-600">
              from {rating.count}+ reviews
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
