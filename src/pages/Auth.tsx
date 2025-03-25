import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { SEO } from "@/components/seo"
import { Logo } from "@/components/ui/logo"
import { useTranslation } from "react-i18next"

export default function Auth() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    if (user) {
      navigate("/dashboard")
    }
  }, [user, navigate])

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard")
      }
    })
  }, [navigate])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <SEO 
        title={t("auth.title")}
        description={t("auth.description")}
      />
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <Logo className="h-6 w-6" />
            {t("auth.brand_name")}
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>

        <div className="text-center mt-8">
         <p className="mb-4">
          {t("auth.register_prompt")}
        </p>
      </div>
      
      </div>
      <div className="flex items-center justify-center p-6 lg:p-10 bg-slate-800">
        <div className="w-full max-w-md space-y-6 text-center flex flex-col gap-2 mt-4 mb-4">
              <h2 className="text-5xl font-black">
                    <span className="text-brand leading-[70%]">crédito</span>
                    <br />
                    <span className="text-white leading-[70%]">hipotecar.io</span>
                 </h2>
                 <p className="mt-4 text-lg text-slate-200">
                 {t("auth.clear_and_simple")}
                </p>
                <img 
                  src="/lovable-uploads/amigo-en-beanbag.png" 
                  alt="Person sitting comfortably in a yellow beanbag chair working on a laptop"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
        </div>
    </div>
  )
}
