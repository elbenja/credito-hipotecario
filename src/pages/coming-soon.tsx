import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { EarlyAccessForm } from "@/components/early-access-form"
import { Link } from "@/components/ui/link"
import { SEO } from "@/components/seo"

export default function ComingSoonPage() {
  return (
    <>
      <SEO 
        title="Coming Soon - CreditoHipotecar.io"
        description="Get early access to CreditoHipotecar.io - Your comprehensive platform for analyzing mortgage scenarios and understanding your credit options. Sign up now to be notified when we launch!"
        type="website"
        name="CreditoHipotecar.io"
      />
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="relative bg-brand p-6 lg:p-10">
          <div className="absolute left-6 top-6">
            <Link href="/app" className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center">
                <img
                  src="/lovable-uploads/Logo.svg"
                  alt="CreditoHipotecar.io Logo"
                  className="h-full w-full"
                />
              </div>
            </Link>
          </div>
          <div className="absolute right-6 top-6">
            <LanguageSwitcher />
          </div>
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h1 className="mb-4 text-6xl font-bold text-white">COMING SOON</h1>
            <img
              src="/lovable-uploads/Latina w Laptop.png"
              alt="Person working on laptop"
              className="mx-auto mb-8 max-w-md rounded-lg"
            />
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-white">
                créditohipotecar.io
              </h2>
              <p className="text-lg text-white/90">
                Analyze different scenarios, and clearly understand your credit.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold">Get Early Access</h2>
              <p className="text-muted-foreground">
                Register your email to be notified and be among the first to access
                the beta version.
              </p>
            </div>
            <EarlyAccessForm />
            <p className="text-center text-sm text-muted-foreground">
              We won't spam you and won't share your email. By clicking "Notify Me",
              you agree to our Terms of Service and Security Policy
            </p>
          </div>
        </div>
      </div>
    </>
  )
} 