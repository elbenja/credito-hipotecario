import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import SVGillustration from "@/components/ui/SVGillustration"
import { useTranslation } from "react-i18next"

export default function Support() {
  const { t } = useTranslation()
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t('support.title', 'Support')}</h1>,
      }}
    >
      <div className="flex min-h-[60vh] items-center justify-center">

      <div className="size- p-12 inline-flex justify-start items-center gap-12">
        <Card className="w-full max-w-md text-center p-8">
            <CardContent className="flex flex-col items-center gap-6 p-0">
                <p className="text-lg text-muted-foreground">
                {t('support.found_mistake', 'Found a mistake or have suggestions?')}
                </p>
                <Separator />
                <a
                href="https://www.instagram.com/creditohipotecar.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
                >
                <Button className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-zinc-800">
                    {t('support.contact_us', 'Contact us')}
                    <span className="ml-2">
                    {/* Instagram SVG icon inline */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="#fff" strokeWidth="2"/>
                        <path d="M17.508 6.5H17.499" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    </span>
                </Button>
                </a>
            </CardContent>
            </Card>
        <div className="size-80">
<SVGillustration variant="support" className="size-80" />
        </div>
    </div>
      
      </div>
    </DashboardLayout>
  )
} 