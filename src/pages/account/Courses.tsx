import YouTubeCard from "@/components/common/YouTubeCard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"


import { useTranslation } from "react-i18next"


// import { testErrorMapping } from "@/utils/test-error-mapping"; // it works

export default function Courses() {
  const { t } = useTranslation('account')

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t('title')}</h1>,
      }}
    >
      <div className="container py-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-bold">Como empezar</h2>
          <p className="text-muted-foreground">
            Estos videos te ayudarán a empezar a usar la aplicación.
          </p>

          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-between gap-4">
         
          <YouTubeCard url="https://youtu.be/psZ37ue7_04?si=pc5nAAqFiLkBg_9V">Crear Propiedad</YouTubeCard>
          <YouTubeCard url="https://youtu.be/exIUTPmSla8?si=JOsA1APa8VJj-x6Z">  Crear Hipotecas</YouTubeCard>
          <YouTubeCard url="https://framerusercontent.com/images/QMrgq7wtnstgN2rTCSktS120xh4.jpg"> <small className="xs"> Pronto:</small>Crear Amortizaciones y Compra de deuda</YouTubeCard>
          <YouTubeCard url="https://framerusercontent.com/images/bzkYpstKh46CY3UqJhaNxFxXgM.jpg"> <small className="xs"> Pronto:</small> Escenarios Favoritos y Captura</YouTubeCard>
           

           
          </div>
          
        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          </div>
           
        </div>
         
 
      </div>
    </DashboardLayout>
  )
}