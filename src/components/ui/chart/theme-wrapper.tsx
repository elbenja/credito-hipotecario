import React from 'react'
import { useTheme } from '@/components/theme-provider'

interface ChartThemeWrapperProps {
  children: React.ReactNode
}

export function ChartThemeWrapper({ children }: ChartThemeWrapperProps) {
  const { theme } = useTheme()

  const chartThemeStyles = {
    '--color-principal': `hsl(${theme === 'light' ? '359 80% 60%' : '359 2% 90%'})`,
    '--color-interest_insurance': `hsl(${theme === 'light' ? '240 70% 50%' : '240 1% 74%'})`,
  } as React.CSSProperties

  return (
    <div className="h-full w-full" style={chartThemeStyles}>
      {children}
    </div>
  )
} 