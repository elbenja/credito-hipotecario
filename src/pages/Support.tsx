import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import SVGillustration from "@/components/ui/SVGillustration"
import { useTranslation } from "react-i18next"
import { Instagram } from "lucide-react"

export default function Support() {
  const { t } = useTranslation()
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t('support.title', 'Support')}</h1>,
      }}
    >
      <div className="flex min-h-[60vh] items-center justify-center">

      <div className="flex flex-col-reverse sm:flex-row p-12 inline-flex justify-start items-center gap-12">
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
                   <Instagram className="size-8" />
                    </span>
                </Button>
                </a>
            </CardContent>
            </Card>
        <div className="size-60 sm:size-80">
<SVGillustration variant="support" className="size-60 sm:size-80" />
        </div>
    </div>
      
      </div>
    </DashboardLayout>
  )
} 