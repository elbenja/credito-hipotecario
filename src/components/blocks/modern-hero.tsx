import { ArrowRight, Star } from "lucide-react"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"

export interface HeroProps {
  title: string
  description: string
  buttonText: string
  avatars?: string[] | { src: string, alt: string }[]
  rating?: number
  className?: string
}

export function Hero({
  title,
  description,
  buttonText,
  avatars = [],
  rating,
  className,
  ...props
}: HeroProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignIn = () => {
    navigate('/')
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
            onClick={handleSignIn}
          >
            {user ? "Go to App" : buttonText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg">
            Watch Demo
          </Button>
        </div>
        {(avatars.length > 0 || rating) && (
          <div className="mt-10 flex w-full max-w-fit flex-col items-center justify-center gap-4 sm:flex-row">
            {avatars.length > 0 && (
              <span className="inline-flex items-center -space-x-4">
                {avatars.map((avatar, index) => (
                  <Avatar key={index} className="h-14 w-14 border">
                    <AvatarImage 
                      src={typeof avatar === 'string' ? avatar : avatar.src} 
                      alt={typeof avatar === 'string' ? `Avatar ${index + 1}` : avatar.alt} 
                    />
                  </Avatar>
                ))}
              </span>
            )}
            {rating && (
              <div className="flex flex-col items-center sm:items-start">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      className={cn(
                        "h-5 w-5",
                        index < Math.floor(rating) 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "fill-slate-200 text-slate-200"
                      )}
                    />
                  ))}
                  <span className="font-semibold text-slate-900">{rating.toFixed(1)}</span>
                </div>
                <p className="font-medium text-slate-600">
                  from {Math.floor(rating * 100)}+ reviews
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
