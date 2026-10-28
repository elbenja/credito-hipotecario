import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { EarlyAccessForm } from "@/components/early-access-form"
import { Link } from "react-router-dom"
import { SEO } from "@/components/seo"
import { useTranslation } from "react-i18next"

export default function ComingSoonPage() {
  const { t } = useTranslation()
  
  return (
    <>
      <SEO 
        title={`${t('coming_soon')} - CreditoHipotecar.io`}
        description={t('register_email')}
        type="website"
        name="CreditoHipotecar.io"
      />
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="relative bg-brand p-6 lg:p-10 overflow-hidden">
          <div className="absolute left-6 top-6">
            <Link to="/app" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <svg width="37" height="41" viewBox="0 0 37 41" xmlns="http://www.w3.org/2000/svg" className="h-full w-full fill-white">
                  <path fillRule="evenodd" clipRule="evenodd" d="M19.7051 1.02024C19.0175 0.460054 18.0289 0.46005 17.3413 1.02023L1.13491 14.2236C-0.223223 15.3301 0.562253 17.5225 2.31682 17.5225H3.98161V31.4973C3.98161 32.5243 4.81742 33.3568 5.84844 33.3568H8.78323V38.7373C8.78323 40.2604 10.5209 41.1375 11.754 40.2368L21.1728 33.3568H31.198C32.229 33.3568 33.0648 32.5243 33.0648 31.4973V17.5225H34.7296C36.4842 17.5225 37.2697 15.3301 35.9115 14.2236L19.7051 1.02024ZM8.98275 28.3753V14.2655L18.5232 6.49289L28.0637 14.2655V28.3753H19.5356L13.7844 32.5763V28.3753H8.98275Z" />
                </svg>
              </div>
            </Link>
          </div>
          <div className="absolute right-6 top-6 z-20">
            <LanguageSwitcher />
          </div>
          <div className="flex h-full flex-col items-center justify-center text-center relative ">
            <h1 className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 mb-4 w-[504px] text-[117px] font-black text-white leading-[90%] z-0">{t('coming_soon')}</h1>
            <img
              src="/images/Latina w Laptop.png"
              alt="Person working on laptop"
              className="relative z-10 mx-auto mt-12 max-w-md rounded-lg"
            />
            <div className="mt-12 z-10">
              <a 
                href="https://www.instagram.com/creditohipotecar.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-black hover:text-white transition-colors duration-200"
              >
                <img
                  src="/images/Instagram.svg"
                  alt="Instagram"
                  className="w-6 h-6"
                />
                <span className="font-bold">{t('follow_us_on_instagram')}</span>
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-sm space-y-6">
            
            <div className="space-y-2 text-center">
              <div className="mb-20 mt-16">
                <h2 className="text-5xl font-black">
                  <span className="text-brand leading-[70%]">crédito</span>
                  <br />
                  <span className="text-primary leading-[70%]">hipotecar.io</span>
                </h2>
                <p className="mt-4 text-lg">
                  {t('analyze_scenarios')}
                </p>
              </div>
              <h2 className="text-3xl font-bold">{t('get_early_access')}</h2>
              <p className="text-muted-foreground">
                {t('register_email')}
              </p>
            </div>
            <EarlyAccessForm />
            <p className="text-center text-sm text-muted-foreground">
              {t('privacy_notice')}
            </p>
          </div>
        </div>
      </div>
    </>
  )
} 