import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useExchangeRate } from './use-exchange-rate'

import type { Property } from '@/types/property'



export function usePropertyBonus() {
  const { data: exchangeRate } = useExchangeRate()
  
  // Cache bonus rules with React Query for efficient data fetching
  const { data: bonusRules = [], isLoading } = useQuery({
    queryKey: ['bonus-rules'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bonus_rules')
          .select('*')
          .eq('is_active', true)
          .order('min_value', { ascending: true })

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error loading bonus rules:", error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })

  // Helper function to convert currency to PEN
  const convertToPEN = useMemo(() => {
    return (amount: number, currency: string): number => {
      if (currency === 'PEN') return amount
      return amount * (exchangeRate || 3.7167)
    }
  }, [exchangeRate])

  // The calculation function with memoization for better performance
  const calculateBonus = useMemo(() => {
    return (property: Property): number | null => {
      if (!property.is_first_home || bonusRules.length === 0) return null

      const propertyValueInPEN = convertToPEN(property.price_cost, property.currency)
      
      const applicableRule = bonusRules.find(
        rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
      )

      if (!applicableRule) return null

      return property.is_sustainable 
        ? applicableRule.sustainable_bonus 
        : applicableRule.traditional_bonus
    }
  }, [bonusRules, convertToPEN])

  // Calculate bonus for multiple properties efficiently
  const calculateBonusForProperties = useMemo(() => {
    return (properties: Property[]): Property[] => {
      return properties.map(property => ({
        ...property,
        bonus: calculateBonus(property)
      }))
    }
  }, [calculateBonus])

  return {
    calculateBonus,
    calculateBonusForProperties,
    bonusRules,
    isLoadingRules: isLoading,
    convertToPEN
  }
} 