import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { ResourceType, PlanLimit } from "@/components/common/NoMoreSpace";

// Default plan limits as fallback
export const DEFAULT_SUBSCRIPTION_PLANS: Record<string, PlanLimit> = {
  personal: {
    name: "Personal",
    properties: 3,
    mortgages: 3,
    rentals: 0,
    price: 14.90
  },
  professional: {
    name: "Professional",
    properties: 5,
    mortgages: 15,
    rentals: 10,
    price: 24.90
  },
  investor: {
    name: "Investor",
    properties: Infinity,
    mortgages: Infinity,
    rentals: Infinity,
    price: 79.90
  }
};

// Debug mode to force logging all checks
const DEBUG_SUBSCRIPTION_LIMITS = false; // Set to false to reduce console noise

// Cache resource counts to prevent repeated API calls
interface ResourceCounts {
  property?: number;
  mortgage?: number;
  rental?: number;
  lastChecked: Record<ResourceType, number>;
}

// Return type for the hook
interface SubscriptionLimitsResult {
  isLoading: boolean;
  hasReachedLimit: boolean;
  currentUsage: number;
  planLimit: number;
  currentPlan: string;
  nextPlan: PlanLimit | undefined;
  checkLimit: (resourceType: ResourceType, forceRefresh?: boolean) => Promise<boolean>;
}

// Request tracking to prevent excessive API calls
interface RequestTracker {
  lastRequest: number;
  inProgress: boolean;
}

// Feature limit type from the database
interface PlanFeature {
  id: string;
  feature_name: string;
  feature_limit: number;
  created_at?: string;
}

export function useSubscriptionLimits(): SubscriptionLimitsResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [currentUsage, setCurrentUsage] = useState(0);
  const [planLimit, setPlanLimit] = useState(0);
  const [currentPlan, setCurrentPlan] = useState("personal");
  const [nextPlan, setNextPlan] = useState<PlanLimit | undefined>(undefined);
  const [resourceCounts, setResourceCounts] = useState<ResourceCounts>({
    lastChecked: {
      property: 0,
      mortgage: 0,
      rental: 0
    }
  });
  const [planFetched, setPlanFetched] = useState(false);
  // Store the actual feature limits from the DB
  const [featureLimits, setFeatureLimits] = useState<Record<string, number>>({});
  
  // Request tracking refs to prevent excessive requests
  const requestTrackerRef = useRef<Record<string, RequestTracker>>({
    planFetch: { lastRequest: 0, inProgress: false },
    property: { lastRequest: 0, inProgress: false },
    mortgage: { lastRequest: 0, inProgress: false },
    rental: { lastRequest: 0, inProgress: false }
  });
  
  // Forced delays to prevent excessive requests
  const MIN_REQUEST_INTERVAL = 2000; // 2 seconds minimum between requests

  // Safer fetch function with rate limiting and auth protection
  const safeFetch = async <T,>(
    key: string,
    fetchFn: () => Promise<T>,
    skipCache = false
  ): Promise<T | null> => {
    const tracker = requestTrackerRef.current[key];
    const now = Date.now();
    
    // Skip if a request is already in progress for this key
    if (tracker.inProgress) {
      if (DEBUG_SUBSCRIPTION_LIMITS) {
        console.log(`[${key}] Request already in progress, skipping`);
      }
      return null;
    }
    
    // Skip if we've made a request recently (unless skipCache is true)
    if (!skipCache && now - tracker.lastRequest < MIN_REQUEST_INTERVAL) {
      if (DEBUG_SUBSCRIPTION_LIMITS) {
        console.log(`[${key}] Request too soon (${now - tracker.lastRequest}ms), skipping`);
      }
      return null;
    }
    
    // Mark request as in progress
    tracker.inProgress = true;
    
    try {
      // Execute the fetch function
      const result = await fetchFn();
      
      // Update last request time
      tracker.lastRequest = Date.now();
      
      return result;
    } catch (error) {
      console.error(`Error in safeFetch for ${key}:`, error);
      return null;
    } finally {
      // Mark request as completed
      tracker.inProgress = false;
    }
  };

  // Fetch user's current subscription plan and feature limits
  useEffect(() => {
    const fetchUserSubscription = async () => {
      if (!user || planFetched) return;

      const result = await safeFetch("planFetch", async () => {
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log("==== SUBSCRIPTION PLAN FETCH ====");
          console.log(`Fetching subscription for user: ${user.id}`);
        }
        
        setIsLoading(true);
        try {
          // Subscription Plan Fetch
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .single();

          if (subscriptionError && subscriptionError.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" - not an error for our purposes
            console.error("Error fetching subscription:", subscriptionError);
          }

          let planName = "personal"; // Default plan
          let planId = null;

          if (subscriptionData) {
            if (DEBUG_SUBSCRIPTION_LIMITS) {
              console.log("Found active subscription:", subscriptionData);
            }
            planId = subscriptionData.plan_id;
            
            // Fetch plan details
            const { data: planData, error: planError } = await supabase
              .from("subscription_plans")
              .select("*")
              .eq("id", planId)
              .single();

            if (planError) {
              console.error("Error fetching plan:", planError);
            } else if (planData) {
              planName = planData.name.toLowerCase();
              if (DEBUG_SUBSCRIPTION_LIMITS) {
                console.log(`Found plan: ${planName} (${planData.name})`);
              }
              setCurrentPlan(planName);
            }
          } else {
            // Default to personal plan if no subscription is found
            if (DEBUG_SUBSCRIPTION_LIMITS) {
              console.log("No active subscription found, defaulting to Personal plan");
            }
            setCurrentPlan("personal");
          }

          // Fetch feature limits from plan_features table
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`Fetching feature limits for plan: ${planName}`);
          }
          
          const { data: featureData, error: featureError } = await supabase
            .from("plan_features")
            .select("*");

          if (featureError) {
            console.error("Error fetching plan features:", featureError);
          } else if (featureData) {
            if (DEBUG_SUBSCRIPTION_LIMITS) {
              console.log("Retrieved plan features:", featureData);
              
              // Log all available features for debugging
              console.log("All plan features:", featureData.map(f => ({
                id: f.id,
                name: f.feature_name,
                limit: f.feature_limit,
                plan_id: f.plan_id
              })));
            }
            
            const currentPlanId = planId || null;
            if (DEBUG_SUBSCRIPTION_LIMITS) {
              console.log(`Current plan ID: ${currentPlanId}`);
            }

            // Much simpler approach - get the exact feature names from the database
            // and only use features that belong to the current plan
            const limits: Record<string, number> = {};

            // Get features belonging to the current plan
            let currentPlanFeatures = [];

            if (currentPlanId) {
              // If we have a plan ID, get exact features for this plan
              currentPlanFeatures = featureData.filter(f => f.plan_id === currentPlanId);
              if (DEBUG_SUBSCRIPTION_LIMITS) {
                console.log(`Found ${currentPlanFeatures.length} features for plan ID ${currentPlanId}`);
              }
            } else {
              // If we don't have a plan ID (e.g., defaulting to personal), 
              // filter by expected feature values for that plan
              if (DEBUG_SUBSCRIPTION_LIMITS) {
                console.log(`No plan ID available, looking for features matching plan: ${planName}`);
              }
              
              if (planName === "personal") {
                // For personal plan, look for features with typical limits
                currentPlanFeatures = featureData.filter(f => 
                  (f.feature_name === "properties" && f.feature_limit === 3) ||
                  (f.feature_name === "mortgages" && f.feature_limit === 3) ||
                  (f.feature_name === "rentals" && f.feature_limit === 1) 
                );
              } else if (planName === "professional") {
                // For professional plan, look for features with typical limits
                currentPlanFeatures = featureData.filter(f => 
                  (f.feature_name === "properties" && f.feature_limit === 5) ||
                  (f.feature_name === "mortgages" && f.feature_limit === 15) ||
                  (f.feature_name === "rentals" && f.feature_limit === 10) 
                );
              } else if (planName === "investor") {
                // For investor plan, features typically have very high or -1 limits (unlimited)
                currentPlanFeatures = featureData.filter(f => 
                  f.feature_limit === -1 || f.feature_limit > 100
                );
              }
              
              // If we still couldn't find matching features, fall back to defaults
              if (currentPlanFeatures.length === 0) {
                if (DEBUG_SUBSCRIPTION_LIMITS) {
                  console.log(`⚠️ No matching features found for plan: ${planName}, using defaults`);
                }
                
                // Create synthetic features using default values
                if (planName === "personal") {
                  currentPlanFeatures = [
                    { feature_name: "properties", feature_limit: 3 },
                    { feature_name: "mortgages", feature_limit: 3 },
                    { feature_name: "rentals", feature_limit: 1 }
                  ];
                } else if (planName === "professional") {
                  currentPlanFeatures = [
                    { feature_name: "properties", feature_limit: 5 },
                    { feature_name: "mortgages", feature_limit: 15 },
                    { feature_name: "rentals", feature_limit: 10 }
                  ];
                } else if (planName === "investor") {
                  currentPlanFeatures = [
                    { feature_name: "properties", feature_limit: -1 },
                    { feature_name: "mortgages", feature_limit: -1 },
                    { feature_name: "rentals", feature_limit: -1 }
                  ];
                }
              }
            }

            if (DEBUG_SUBSCRIPTION_LIMITS) {
              console.log("Features for current plan:", currentPlanFeatures);
            }

            // Map direct feature names to our internal names
            currentPlanFeatures.forEach(feature => {
              // Use exact feature names from database
              if (feature.feature_name === "properties") {
                limits["property"] = feature.feature_limit;
                if (DEBUG_SUBSCRIPTION_LIMITS) {
                  console.log(`✅ Set property limit to ${feature.feature_limit} [Exact match: properties]`);
                }
              } 
              else if (feature.feature_name === "mortgages") {
                limits["mortgage"] = feature.feature_limit;
                if (DEBUG_SUBSCRIPTION_LIMITS) {
                  console.log(`✅ Set mortgage limit to ${feature.feature_limit} [Exact match: mortgages]`);
                }
              } 
              else if (feature.feature_name === "rentals") {
                limits["rental"] = feature.feature_limit;
                if (DEBUG_SUBSCRIPTION_LIMITS) {
                  console.log(`✅ Set rental limit to ${feature.feature_limit} [Exact match: rentals]`);
                }
              }
              else {
                if (DEBUG_SUBSCRIPTION_LIMITS) {
                  console.log(`⚠️ Ignoring unknown feature: ${feature.feature_name}`);
                }
              }
            });

            if (DEBUG_SUBSCRIPTION_LIMITS) {
              console.log("Final processed feature limits:", limits);
            }
            setFeatureLimits(limits);
            
            // Determine next plan based on current plan
            if (planName === "personal") {
              setNextPlan({
                ...DEFAULT_SUBSCRIPTION_PLANS.professional,
                // Override with actual limits if available
                properties: featureData.find(f => f.feature_name === "properties" && f.feature_limit === 5)?.feature_limit || 5,
                mortgages: featureData.find(f => f.feature_name === "mortgages" && f.feature_limit === 15)?.feature_limit || 15,
                rentals: featureData.find(f => f.feature_name === "rentals" && f.feature_limit === 10)?.feature_limit || 10,
              });
              if (DEBUG_SUBSCRIPTION_LIMITS) {
                console.log("Next plan tier: Professional");
              }
            } else if (planName === "professional") {
              setNextPlan(DEFAULT_SUBSCRIPTION_PLANS.investor);
              if (DEBUG_SUBSCRIPTION_LIMITS) {
                console.log("Next plan tier: Investor");
              }
            } else {
              if (DEBUG_SUBSCRIPTION_LIMITS) {
                console.log("No next plan tier (already at highest)");
              }
            }
          }
          
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log("==== END SUBSCRIPTION PLAN FETCH ====");
          }
          
          return { planName, planId, featureData };
        } catch (error) {
          console.error("Error in subscription check:", error);
          return null;
        } finally {
          setIsLoading(false);
        }
      });
      
      // If we got a result, mark plan as fetched
      if (result !== null) {
        setPlanFetched(true);
      }
    };

    fetchUserSubscription();
  }, [user, planFetched]);

  // Function to check if user has reached limit for a specific resource with caching
  const checkLimit = useCallback(async (resourceType: ResourceType, forceRefresh = false): Promise<boolean> => {
    if (!user) {
      if (DEBUG_SUBSCRIPTION_LIMITS) console.log(`[Subscription Limits] No user found, skipping limit check for ${resourceType}`);
      return false;
    }
    
    if (!planFetched) {
      // Don't check limits until we know the plan
      if (DEBUG_SUBSCRIPTION_LIMITS) console.log(`[Subscription Limits] Plan not fetched yet, skipping limit check for ${resourceType}`);
      return false;
    }
    
    // For debugging, log all info about the current check
    if (DEBUG_SUBSCRIPTION_LIMITS) {
      console.log(`\n==== SUBSCRIPTION LIMIT CHECK ====`);
      console.log(`Resource: ${resourceType}`);
      console.log(`User: ${user.id}`);
      console.log(`Current Plan: ${currentPlan}`);
      console.log(`Force Refresh: ${forceRefresh}`);
      console.log(`Feature Limits:`, featureLimits);
    }
    
    // Use cached value if checked recently (within last 30 seconds) and not forcing refresh
    const now = Date.now();
    const lastCheckedTime = resourceCounts.lastChecked[resourceType] || 0;
    const cachedCount = resourceCounts[resourceType as keyof typeof resourceCounts] as number | undefined;
    const timeElapsed = now - lastCheckedTime;
    
    if (!forceRefresh && cachedCount !== undefined && timeElapsed < 30000) {
      // Use cached count
      // Get the limit from the fetched feature limits or fallback to default
      let planFeatureLimit: number;
      if (resourceType === "property" && featureLimits.property !== undefined) {
        planFeatureLimit = featureLimits.property;
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`Using property limit from DB: ${planFeatureLimit}`);
        }
      } else if (resourceType === "mortgage" && featureLimits.mortgage !== undefined) {
        planFeatureLimit = featureLimits.mortgage;
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`Using mortgage limit from DB: ${planFeatureLimit}`);
        }
      } else if (resourceType === "rental" && featureLimits.rental !== undefined) {
        planFeatureLimit = featureLimits.rental;
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`Using rental limit from DB: ${planFeatureLimit}`);
        }
      } else {
        // Fallback to default limits
        planFeatureLimit = DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.[`${resourceType}s` as keyof PlanLimit] as number || 0;
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`Using default ${resourceType} limit: ${planFeatureLimit}`);
        }
      }
      
      // Important: Ensure we're correctly comparing the count to the limit
      const limitReached = planFeatureLimit > 0 && cachedCount >= planFeatureLimit;
      
      setCurrentUsage(cachedCount);
      setPlanLimit(planFeatureLimit <= 0 ? Infinity : planFeatureLimit);
      setHasReachedLimit(limitReached);
      
      if (DEBUG_SUBSCRIPTION_LIMITS) {
        console.log(`[CACHED] Cache Age: ${timeElapsed}ms`);
        console.log(`[CACHED] Count: ${cachedCount}`);
        console.log(`[CACHED] Limit: ${planFeatureLimit}`);
        console.log(`[CACHED] Limit Reached: ${limitReached}`);
        console.log(`==== END SUBSCRIPTION LIMIT CHECK ====\n`);
      }
      
      return limitReached;
    }
    
    // Use the safeFetch to make the database request
    const result = await safeFetch(resourceType, async () => {
      setIsLoading(true);
      
      try {
        // Get the limit from the fetched feature limits or fallback to default
        let planFeatureLimit: number;
        if (resourceType === "property" && featureLimits.property !== undefined) {
          planFeatureLimit = featureLimits.property;
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`Using property limit from DB: ${planFeatureLimit}`);
          }
        } else if (resourceType === "mortgage" && featureLimits.mortgage !== undefined) {
          planFeatureLimit = featureLimits.mortgage;
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`Using mortgage limit from DB: ${planFeatureLimit}`);
          }
        } else if (resourceType === "rental" && featureLimits.rental !== undefined) {
          planFeatureLimit = featureLimits.rental;
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`Using rental limit from DB: ${planFeatureLimit}`);
          }
        } else {
          // Fallback to default limits
          planFeatureLimit = DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.[`${resourceType}s` as keyof PlanLimit] as number || 0;
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`Using default ${resourceType} limit: ${planFeatureLimit}`);
          }
        }
        
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`[FRESH CHECK] Plan Limit for ${resourceType}: ${planFeatureLimit}`);
          console.log(`[FRESH CHECK] Feature Limits: ${JSON.stringify(featureLimits)}`);
        }
        
        // If limit is 0 or negative, treat as unlimited
        if (planFeatureLimit <= 0) {
          setHasReachedLimit(false);
          setCurrentUsage(0);
          setPlanLimit(Infinity);
          
          // Update cache
          setResourceCounts(prev => ({
            ...prev,
            [resourceType]: 0,
            lastChecked: {
              ...prev.lastChecked,
              [resourceType]: now
            }
          }));
          
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`[FRESH CHECK] Unlimited resources, no limit applied`);
            console.log(`==== END SUBSCRIPTION LIMIT CHECK ====\n`);
          }
          
          return false;
        }
        
        // IMPORTANT: We need to wait for this promise to resolve before proceeding
        const { count, error: countError } = await supabase
          .from(resourceType === "mortgage" ? "mortgages" : `${resourceType}s`) 
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        
        if (countError) {
          console.error(`Error counting ${resourceType}s:`, countError);
          if (DEBUG_SUBSCRIPTION_LIMITS) {
            console.log(`[ERROR] Could not count resources: ${countError.message}`);
            console.log(`==== END SUBSCRIPTION LIMIT CHECK ====\n`);
          }
          return false;
        }
        
        // This is what we're comparing to the limit
        const usage = count !== null ? count : 0;
        
        // CRITICAL: This is the comparison that determines if the limit is reached
        const limitReached = usage >= planFeatureLimit;
        
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`[FRESH CHECK] DB Count: ${usage}`);
          console.log(`[FRESH CHECK] Comparison: ${usage} >= ${planFeatureLimit} = ${limitReached}`);
        }
        
        // Update state
        setCurrentUsage(usage);
        setPlanLimit(planFeatureLimit);
        setHasReachedLimit(limitReached);
        
        // Update cache with fresh data
        setResourceCounts(prev => ({
          ...prev,
          [resourceType]: usage,
          lastChecked: {
            ...prev.lastChecked,
            [resourceType]: now
          }
        }));
        
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`[FRESH CHECK] Final Result: Limit reached = ${limitReached}`);
          console.log(`==== END SUBSCRIPTION LIMIT CHECK ====\n`);
        }
        
        return limitReached;
        
      } catch (error) {
        console.error("Error checking resource limits:", error);
        if (DEBUG_SUBSCRIPTION_LIMITS) {
          console.log(`[CRITICAL ERROR] ${error}`);
          console.log(`==== END SUBSCRIPTION LIMIT CHECK ====\n`);
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    }, forceRefresh);
    
    // If the request was skipped (returned null), use the cached values
    if (result === null) {
      // Use cached results if available
      if (cachedCount !== undefined) {
        const planFeatureLimit = planLimit || DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.[`${resourceType}s` as keyof PlanLimit] as number || 0;
        return planFeatureLimit > 0 && cachedCount >= planFeatureLimit;
      }
      return hasReachedLimit; // Fall back to current state
    }
    
    return result;
  }, [user, currentPlan, resourceCounts, planFetched, featureLimits, planLimit, hasReachedLimit]);

  return {
    isLoading,
    hasReachedLimit,
    currentUsage,
    planLimit,
    currentPlan,
    nextPlan,
    checkLimit
  };
} 