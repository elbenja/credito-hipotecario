import { useTranslation } from "react-i18next"

interface UserTabsProps {
  users: User[]
  activeTab: string
  onTabChange: (tab: string) => void
}

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: string
  subscription?: {
    id: string
    plan_id: string
    plan_name?: string
  } | null
  mortgages_count?: number
}

export function UserTabs({ users, activeTab, onTabChange }: UserTabsProps) {
  const { t } = useTranslation(["admin"])

  // Calculate counts for each tab
  const allCount = users.length
  const personalCount = users.filter(user => 
    user.subscription?.plan_name?.toLowerCase() === 'personal'
  ).length
  const profesionalCount = users.filter(user => 
    user.subscription?.plan_name?.toLowerCase() === 'profesional'
  ).length
  const inversionistaCount = users.filter(user => 
    user.subscription?.plan_name?.toLowerCase() === 'inversionista'
  ).length
  const noneCount = users.filter(user => !user.subscription).length

  const tabs = [
    { id: 'all', label: t('all'), count: allCount },
    { id: 'personal', label: 'Personal', count: personalCount },
    { id: 'profesional', label: 'Profesional', count: profesionalCount },
    { id: 'inversionista', label: 'Inversionista', count: inversionistaCount },
    { id: 'none', label: 'None', count: noneCount },
  ]

  return (
    <div className="flex justify-start items-center gap-1 mb-6 border-b">
    
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${activeTab === tab.id 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }
          `}
        >
          {tab.label} {tab.count}
        </button>
      ))}
    </div>
  )
} 