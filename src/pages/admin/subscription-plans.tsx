import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlanWithFeatures, FeatureName } from '@/types/subscription';
import { Pencil, Plus, Save, X } from 'lucide-react';

export default function SubscriptionPlansManagement() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{planId: string, feature: string} | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [availableFeatures] = useState<FeatureName[]>(['properties', 'mortgages', 'rentals']);

  // Fetch all subscription plans with their features
  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*, features:plan_features(*)')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data as PlanWithFeatures[]);
    } catch (err) {
      console.error('Error fetching plans:', err);
      toast.error('Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Get feature limit for a specific plan and feature
  const getFeatureLimit = (plan: PlanWithFeatures, featureName: string) => {
    const feature = plan.features.find(f => f.feature_name === featureName);
    return feature?.feature_limit ?? 0;
  };

  // Handle saving feature limit changes
  const handleSaveFeatureLimit = async (planId: string, featureName: string) => {
    if (!editingCell) return;

    try {
      const limit = tempValue === 'unlimited' ? -1 : parseInt(tempValue);
      if (isNaN(limit)) {
        toast.error('Please enter a valid number or "unlimited"');
        return;
      }

      const feature = plans
        .find(p => p.id === planId)
        ?.features.find(f => f.feature_name === featureName);

      if (feature) {
        // Update existing feature
        const { error } = await supabase
          .from('plan_features')
          .update({ feature_limit: limit })
          .eq('id', feature.id);

        if (error) throw error;
      } else {
        // Create new feature
        const { error } = await supabase
          .from('plan_features')
          .insert({
            plan_id: planId,
            feature_name: featureName,
            feature_limit: limit
          });

        if (error) throw error;
      }

      toast.success('Feature limit updated successfully');
      fetchPlans();
    } catch (err) {
      console.error('Error updating feature limit:', err);
      toast.error('Failed to update feature limit');
    } finally {
      setEditingCell(null);
      setTempValue('');
    }
  };

  // Format feature limit for display
  const formatLimit = (limit: number) => {
    return limit === -1 ? 'unlimited' : limit.toString();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-8">Manage Subscription Plans</h1>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature / Plan</TableHead>
                    {plans.map(plan => (
                      <TableHead key={plan.id} className="text-center">
                        <div className="font-bold">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${plan.price_yearly}/año
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableFeatures.map(feature => (
                    <TableRow key={feature}>
                      <TableCell className="font-medium capitalize">
                        {feature}
                      </TableCell>
                      {plans.map(plan => (
                        <TableCell key={`${plan.id}-${feature}`} className="text-center">
                          {editingCell?.planId === plan.id && editingCell?.feature === feature ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="w-24 text-center"
                                placeholder="Number or 'unlimited'"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveFeatureLimit(plan.id, feature)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingCell(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center justify-center group cursor-pointer"
                              onClick={() => {
                                setEditingCell({ planId: plan.id, feature });
                                setTempValue(formatLimit(getFeatureLimit(plan, feature)));
                              }}
                            >
                              <span>{formatLimit(getFeatureLimit(plan, feature))}</span>
                              <Pencil className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 