import React from 'react';
import { useSubscription } from '@/hooks/-useSubscription';
import { FeatureName } from '@/types/subscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type SubscriptionCheckProps = {
  featureName: FeatureName;
  currentCount: number;
  children: React.ReactNode;
  onUpgrade?: () => void;
};

/**
 * A component that checks if a user can perform an action based on their subscription plan
 * If they can't, it shows an upgrade message instead of the children
 */
export function SubscriptionCheck({
  featureName,
  currentCount,
  children,
  onUpgrade
}: SubscriptionCheckProps) {
  const { hasFeatureAccess, getFeatureLimit, subscription, isLoading } = useSubscription();
  
  // If still loading subscription data, show a loading state
  if (isLoading) {
    return <div className="animate-pulse h-8 w-full bg-muted rounded" />;
  }
  
  // If user has access to the feature, render the children
  if (hasFeatureAccess(featureName, currentCount)) {
    return <>{children}</>;
  }
  
  // Otherwise, show an upgrade message
  const limit = getFeatureLimit(featureName);
  const featureLabels = {
    properties: 'Propiedades',
    mortgages: 'Hipotecas',
    rentals: 'Alquileres'
  };
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>Límite alcanzado</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Has alcanzado el límite de {featureLabels[featureName]} ({limit}) 
          en tu plan {subscription?.plan.name || 'Personal'}.
          Actualiza tu plan para continuar.
        </p>
        <Button 
          variant="outline" 
          onClick={onUpgrade}
          className="mt-2"
        >
          Actualizar ahora
        </Button>
      </AlertDescription>
    </Alert>
  );
} 