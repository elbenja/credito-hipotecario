import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PropertyForm } from '@/components/properties/property-form';
import { usePropertyBonus } from '@/hooks/usePropertyBonus';
import type { Property } from '@/types/property';

export function PropertyDisplay({
  property,
  onPropertyUpdate,
}: {
  property: Property | null;
  onPropertyUpdate?: (p: Property) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!property) return <div>No property selected</div>;

  const bonus = usePropertyBonus().calculateBonus(property);

  return (
    <div>
      <h3>{property.name}</h3>
      <p>Cost: {property.price_cost}</p>
      <p>Bonus: {bonus}</p>
      <Button onClick={() => setOpen(true)}>Edit</Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Property</SheetTitle>
          </SheetHeader>
          <PropertyForm
            selectedProperty={property}
            onSuccess={() => {
              setOpen(false);
              onPropertyUpdate?.(property);
            }}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}