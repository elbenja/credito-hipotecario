import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';

// Types for subscription plans and limits
interface PlanLimits {
  properties: number;
  mortgages: number;
  rentals: number;
}

interface SubscriptionStatus {
  planName: string;
  planId: string | null;
  limits: PlanLimits;
  isLoading: boolean;
  isLimitsFetched: boolean;
  // Check functions
  isLimitReached: (resourceType: 'property' | 'mortgage' | 'rental') => Promise<boolean>;
  getCurrentUsage: (resourceType: 'property' | 'mortgage' | 'rental') => Promise<number>;
  // Refetch method
  refreshLimits: () => Promise<void>;
}

// Default limits for fallback
const DEFAULT_PLAN_LIMITS: Record<string, PlanLimits> = {
  personal: {
    properties: 3,
    mortgages: 3,
    rentals: 1
  },
  professional: {
    properties: 5,
    mortgages: 15,
    rentals: 10
  },
  investor: {
    properties: Infinity,
    mortgages: Infinity,
    rentals: Infinity
  }
};

// Create the context
const SubscriptionContext = createContext<SubscriptionStatus | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isLimitsFetched, setIsLimitsFetched] = useState(false);
  const [planName, setPlanName] = useState<string>('personal');
  const [planId, setPlanId] = useState<string | null>(null);
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_PLAN_LIMITS.personal);
  
  // Resource usage cache
  const [cachedUsage, setCachedUsage] = useState<Record<string, number>>({});
  const [cacheTimestamp, setCacheTimestamp] = useState<Record<string, number>>({});

  // Set up Realtime subscriptions for properties table
  useEffect(() => {
    if (!user) return;
    
    // This will invalidate property counts when properties are added or deleted
    const propertiesSubscription = supabase
      .channel('properties-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'properties',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          // Only invalidate cache for INSERT and DELETE operations
          // Skip UPDATE events as they don't affect the count
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            console.log('SUBSCRIPTION: Realtime update for properties', payload.eventType);
            
            // Invalidate the properties cache immediately
            setCachedUsage(prev => {
              const newCache = { ...prev };
              delete newCache['property'];
              return newCache;
            });
            setCacheTimestamp(prev => {
              const newTimestamps = { ...prev };
              newTimestamps.property = 0;
              return newTimestamps;
            });
          }
        }
      )
      .subscribe();
      
    // Clean up subscription on unmount
    return () => {
      propertiesSubscription.unsubscribe();
    };
  }, [user]);

  // Fetch subscription plan and limits ONCE when user is authenticated
  // This only happens once per session
  useEffect(() => {
    if (!user || isLimitsFetched) return;
    
    const fetchSubscriptionLimits = async () => {
      setIsLoading(true);
      
      try {
        console.log("SUBSCRIPTION: Fetching plan information for user", user.id);
        
        // 1. Get the active subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();
        
        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error("Error fetching subscription:", subscriptionError);
        }
        
        let currentPlanName = 'personal';
        let currentPlanId = null;
        
        if (subscriptionData) {
          console.log("SUBSCRIPTION: Found active subscription", subscriptionData);
          currentPlanId = subscriptionData.plan_id;
          
          // 2. Get the plan details
          const { data: planData, error: planError } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", currentPlanId)
            .single();
            
          if (planError) {
            console.error("Error fetching plan:", planError);
          } else if (planData) {
            currentPlanName = planData.name.toLowerCase();
            console.log(`SUBSCRIPTION: User has ${currentPlanName} plan`);
          }
        } else {
          console.log("SUBSCRIPTION: No active subscription found, using Personal plan");
        }
        
        // Save the plan name and ID
        setPlanName(currentPlanName);
        setPlanId(currentPlanId);
        
        // 3. Get the plan feature limits
        const { data: featureData, error: featureError } = await supabase
          .from("plan_features")
          .select("*");
          
        if (featureError) {
          console.error("Error fetching plan features:", featureError);
          // Fall back to default limits
          setLimits(DEFAULT_PLAN_LIMITS[currentPlanName] || DEFAULT_PLAN_LIMITS.personal);
        } else if (featureData) {
          // Find limits for the current plan
          let planLimits = { ...DEFAULT_PLAN_LIMITS[currentPlanName] || DEFAULT_PLAN_LIMITS.personal };
          
          // Filter features for this plan
          const planFeatures = currentPlanId 
            ? featureData.filter(f => f.plan_id === currentPlanId)
            : featureData.filter(f => {
                if (currentPlanName === 'personal') {
                  return (f.feature_name === 'properties' && f.feature_limit === 3) ||
                         (f.feature_name === 'mortgages' && f.feature_limit === 3) ||
                         (f.feature_name === 'rentals' && f.feature_limit === 1);
                } else if (currentPlanName === 'professional') {
                  return (f.feature_name === 'properties' && f.feature_limit === 5) ||
                         (f.feature_name === 'mortgages' && f.feature_limit === 15) ||
                         (f.feature_name === 'rentals' && f.feature_limit === 10);
                }
                return false;
              });
          
          if (planFeatures.length === 0) {
            console.log("SUBSCRIPTION: No features found for plan, using defaults");
          } else {
            planFeatures.forEach(feature => {
              if (feature.feature_name === 'properties') {
                planLimits.properties = feature.feature_limit;
              } else if (feature.feature_name === 'mortgages') {
                planLimits.mortgages = feature.feature_limit;
              } else if (feature.feature_name === 'rentals') {
                planLimits.rentals = feature.feature_limit;
              }
            });
            
            console.log("SUBSCRIPTION: Plan limits set", planLimits);
          }
          
          setLimits(planLimits);
        }
        
        setIsLimitsFetched(true);
      } catch (error) {
        console.error("Error setting up subscription limits:", error);
        // Fallback to defaults
        setLimits(DEFAULT_PLAN_LIMITS.personal);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscriptionLimits();
  }, [user, isLimitsFetched]);
  
  // Function to get current resource usage with caching
  const getCurrentUsage = async (resourceType: 'property' | 'mortgage' | 'rental'): Promise<number> => {
    if (!user) return 0;
    
    // For properties, always get a fresh count since they can be deleted
    // and we need accurate counts when creating new properties
    if (resourceType === 'property') {
      return fetchResourceCount(resourceType);
    }
    
    // Cache expiry time (5 minutes)
    const CACHE_EXPIRY = 5 * 60 * 1000;
    
    // Check if cache is valid
    const now = Date.now();
    const lastChecked = cacheTimestamp[resourceType] || 0;
    
    if (now - lastChecked < CACHE_EXPIRY && cachedUsage[resourceType] !== undefined) {
      console.log(`SUBSCRIPTION: Using cached ${resourceType} count: ${cachedUsage[resourceType]}`);
      return cachedUsage[resourceType];
    }
    
    return fetchResourceCount(resourceType);
  };
  
  // Helper function to fetch resource count from database
  const fetchResourceCount = async (resourceType: 'property' | 'mortgage' | 'rental'): Promise<number> => {
    // Table name depends on resource type
    const tableName = resourceType === 'property' ? 'properties' : 
                    resourceType === 'mortgage' ? 'mortgages' : 'rentals';
    
    // Fetch the count directly from database
    try {
      // Add a debouncing mechanism to prevent excessive database calls
      console.log(`SUBSCRIPTION: Counting ${resourceType}s for user ${user?.id}`);
      
      const { count, error } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user?.id);
      
      if (error) {
        console.error(`Error counting ${resourceType}s:`, error);
        return cachedUsage[resourceType] || 0;
      }
      
      // Update cache
      const usage = count || 0;
      console.log(`SUBSCRIPTION: ${resourceType} count = ${usage}`);
      
      // Don't update cache state if unmounting or if value is unchanged
      if (cachedUsage[resourceType] !== usage) {
        setCachedUsage(prev => ({ ...prev, [resourceType]: usage }));
        setCacheTimestamp(prev => ({ ...prev, [resourceType]: Date.now() }));
      }
      
      return usage;
    } catch (error) {
      console.error(`Error getting ${resourceType} count:`, error);
      return cachedUsage[resourceType] || 0;
    }
  };
  
  // Function to check if user has reached limit for a specific resource
  const isLimitReached = async (resourceType: 'property' | 'mortgage' | 'rental'): Promise<boolean> => {
    if (!user) return false;
    
    // Not checking if still loading limits
    if (isLoading || !isLimitsFetched) {
      console.log("SUBSCRIPTION: Limits not loaded yet, assuming not reached");
      return false;
    }
    
    try {
      // Get the limit for this resource
      const limit = resourceType === 'property' ? limits.properties :
                    resourceType === 'mortgage' ? limits.mortgages :
                    limits.rentals;
      
      // If limit is Infinity or negative, user has unlimited resources
      if (limit <= 0 || limit === Infinity) {
        console.log(`SUBSCRIPTION: ${resourceType} is unlimited`);
        return false;
      }
      
      // Get current usage
      const usage = await getCurrentUsage(resourceType);
      
      // Check if limit is reached
      const reached = usage >= limit;
      console.log(`SUBSCRIPTION: ${resourceType} limit check: ${usage}/${limit} = ${reached ? 'REACHED' : 'not reached'}`);
      
      return reached;
    } catch (error) {
      console.error("Error checking limit:", error);
      return false;
    }
  };
  
  // Function to refresh limits manually (can be called after plan changes)
  const refreshLimits = async () => {
    setIsLimitsFetched(false);
    // Clear cache
    setCachedUsage({});
    setCacheTimestamp({});
  };
  
  return (
    <SubscriptionContext.Provider
      value={{
        planName,
        planId,
        limits,
        isLoading,
        isLimitsFetched,
        isLimitReached,
        getCurrentUsage,
        refreshLimits
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook for using the subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  
  return context;
} 