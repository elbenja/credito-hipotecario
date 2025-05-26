import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { SEO } from "@/components/seo"
import { Logo } from "@/components/ui/logo"
import { useTranslation } from "react-i18next"

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const { t } = useTranslation('global')

  useEffect(() => {
    // If we have a user and we're not loading, redirect to dashboard
    if (!loading && user) {
      // navigate('/dashboard', { replace: true })
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

//    if (!loading && user && !hasAccess) {
//     console.log('no access, redirecting to account from auth')
//     navigate('/account', { replace: true })

//   } else if (!loading && user) {
//     navigate('/dashboard', { replace: true })
//   }
// }, [user, loading, navigate])


  // Show loading state
  if (loading || user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t('messages.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <SEO 
        title={t('auth.title')}
        description={t('auth.description')}
      />
      <div className="flex flex-col gap-4 p-6 md:p-10 min-h-[700px]">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 ">
            <Logo className="h-6 w-6" />
            <span class="font-bold text-md"> {t('auth.brand_name')}</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>

        <div className="text-center mt-8">
         {/* <p className="mb-4">
          {t('auth.no_credentials_prompt')} &nbsp;
          
          <a 
            href="http://CreditoHipotecar.io#earlyaccess" 
            className="text-blue-500 font-bold hover:underline"
          >
            {t('auth.register_prompt')}
          </a>
        </p> */}
        <p className="text-sm text-muted-foreground">
          May 2025
        </p>
      </div>
      
      </div>
      <div className="flex items-center justify-center p-6 lg:p-10 bg-slate-800 min-h-[800px]">
        <div className="w-full max-w-md space-y-6 text-center flex flex-col gap-2 mt-4 mb-4">
              <h2 className="text-5xl font-black">
                    <span className="text-brand  leading-[70%]">crédito</span>
                    <br />
                    <span className="text-white leading-[70%]">hipotecar.io</span>
                 </h2>
                 <p className="mt-4 text-lg text-slate-200">
                 {t('auth.clear_and_simple')}
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
