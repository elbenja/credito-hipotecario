import React from 'react'
import { useTheme } from '@/components/theme-provider'

interface ChartThemeWrapperProps {
  children: React.ReactNode
  cardBackground?: string
  textColor?: string
  principalColor?: string
  interestColor?: string
}

export function ChartThemeWrapper({ 
  children,
  cardBackground,
  textColor,
  principalColor,
  interestColor
}: ChartThemeWrapperProps) {
  const { theme } = useTheme()

  const chartThemeStyles = {
    '--color-principal': principalColor || "hsl(var(--brand))",
    '--color-interest_insurance': interestColor || `hsl(${theme === 'light' ? '215.3 19.3% 60%' : '215.4 16.3% 46.9%'})`,
    '--background': cardBackground || "var(--card)", /*shit*/
    '--foreground': textColor || "var(--card-foreground)",/*shit*/
    '--card': cardBackground || "var(--primary)",/*shit*/
    '--card-foreground': textColor || "var(--card-foreground)",/*shit*/
  } as React.CSSProperties

  return (
    <div className="h-full w-full" style={chartThemeStyles}>
      {children}
    </div>
  )
}


