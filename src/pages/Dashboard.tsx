import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import SVGillustration from '@/components/ui/SVGillustration'
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { Separator } from "@radix-ui/react-separator"

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  const { user } = useAuth()

  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plan:subscription_plans(name)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })
  
  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold tracking-tight">{t("sections.dashboard")}</h1>
      }}
    >
   
{/* container start */}
<div className="min-h-svh p-2 sm:p-6 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 overflow-hidden">
  
<div className="mb-10 inline-flex justify-start items-start gap-4 flex-wrap content-start">
      <div className="w-32 h-80 relative bg-primary rounded-3xl flex flex-col items-start p-6">
        <Badge variant="plan" className="text-sm ">
          {subscription?.subscription_plan?.name || 'Free'}
        </Badge>
<Separator className="w-full bg-background/40 my-4"></Separator>

        <div className="self-stretch flex flex-col justify-start items-start gap-1">
          <div className="progress-component self-stretch h-1 bg-slate-700 rounded-[99px] inline-flex justify-start items-center gap-0.5">
            <div className="w-14 h-1 bg-amber-300 rounded-[99px]"></div>
          </div>
          <div className="self-stretch flex flex-col justify-center items-start gap-0.5">
            <div className="counter text-right justify-start text-white text-xl font-semibold font-['Inter'] leading-tight">1</div>
            <div className="counter-label justify-start text-white text-xs font-normal font-['Inter'] leading-none">Properties</div>
          </div>
      </div>

      </div>

      {/*  <Card className="w-32 h-80 relative bg-black rounded-3xl gap-4">
       <CardHeader>
          <CardTitle> 
             <Badge variant="plan" className="text-sm">
          {subscription?.subscription_plan?.name || 'Free'}
        </Badge>
        </CardTitle>
     
        </CardHeader>
       {/*   <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <p>Card Footer</p>
        </CardFooter> 
      </Card>*/}

      <div className=" flex justify-start items-center gap-4">
          <div className="w-64 flex flex-col justify-start items-start gap-8 relative ml-12">
               <div className="flex items-center space-x-4">
                <div className="text-xl font-black flex size-16  flex-none rounded-full bg-muted text-primary  items-center justify-center">01</div>   
                <Link to="/properties">
                  <p className="text-md sm:text-lg leading-none hover:text-brand">{t("sections.step_one")}</p>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                  <div className="text-xl font-black flex size-16  flex-none rounded-full bg-muted text-primary items-center justify-center">02</div>   
                  <Link to="/mortgages">
                    <p className="text-md sm:text-lg leading-none hover:text-brand">{t("sections.step_two")}</p>
                  </Link>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-xl font-black flex size-16  flex-none rounded-full bg-muted text-primary  items-center justify-center">03
                  </div>   
                  <p className="text-md sm:text-lg leading-none">{t("sections.step_three")}</p>
                </div>

          </div>
          <div className="w-52 h-80 relative">
            <SVGillustration variant="ladyDog" className = 'sm:h-80 sm:w-52'/> 
          </div>

      </div> 
 
    
   </div>

 

 

</div>



    </DashboardLayout>
  )
}
