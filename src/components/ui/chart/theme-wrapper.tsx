import React from 'react'
import { useTheme } from '@/components/theme-provider'

interface ChartThemeWrapperProps {
  children: React.ReactNode
}

export function ChartThemeWrapper({ children }: ChartThemeWrapperProps) {
  const { theme } = useTheme()

  const chartThemeStyles = {
    '--color-principal': `hsl(${theme === 'light' ? ' 41 89% 61%' : ' 41 89% 61%'})`,
    '--color-interest_insurance': `hsl(${theme === 'light' ? '215.3 19.3% 34.5%' : '215.4 16.3% 46.9%'})`,
  } as React.CSSProperties

  return (
    <div className="h-full w-full" style={chartThemeStyles}>
      {children}
    </div>
  )
} 


