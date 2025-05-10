import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PropertyForm } from '@/components/properties/property-form';
import { usePropertyBonus } from '@/hooks/usePropertyBonus';
import type { Property , PropertyWithBonus} from '@/types/property';

interface PropertyDisplayProps {
  property: PropertyWithBonus | null;
  onPropertyUpdate: (p: PropertyWithBonus) => void;
}

export function PropertyDisplay({
  property,
  onPropertyUpdate,
}: PropertyDisplayProps) {
  // if you need local copy (for bonus loading, etc.), sync it from props:
  // const [current, setCurrent] = useState<PropertyWithBonus | null>(null);

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
            onSuccess={(fresh) => {
              // console.log("PROPERTY DISPLAY: onSuccess", property);
              
              // onPropertyUpdate?.(fresh);
              onPropertyUpdate(fresh);
              setOpen(false);
             
            }}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}