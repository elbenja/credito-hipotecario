import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PropertyForm } from '@/components/properties/property-form';
import { usePropertyBonus } from '@/hooks/usePropertyBonus';
import type { Property , PropertyWithBonus} from '@/types/property';
import { formatCurrency } from '@/utils/utils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('properties');

  if (!property) return <div>No property selected</div>;

  const bonus = usePropertyBonus().calculateBonus(property);

  return (
    <div>


      <div className="flex items-center p-2 sm:p-4 justify-between">
      <div>
          <p className="text-sm">{t('property', '', )}</p>
          <h3 className=" font-semibold">{property?.name}</h3>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          type="button" // Explicitly set button type
        >
          {t('ui.edit', { ns: 'global' })}
        </Button>
      </div>
      {/* start */}
      <div className="flex flex-col items-stretch space-y-0 border-t p-0 sm:flex-row">
        <div className="justify-top flex flex-1 flex-col gap-1 px-2 py-2 sm:px-4 sm:py-4">
          <Label className="text-muted-foreground text-xs">
            {t('form.property_cost')}
          </Label>
          <span className="text-lg leading-none font-bold sm:text-lg whitespace-nowrap">
            {formatCurrency(property.price_cost, property.currency as "USD" | "PEN")}
          </span>
        </div>

        <div className="flex">
          <div className="justify-top relative z-30 flex flex-1 flex-col gap-1 border-t px-2 py-2 text-left even:border-l sm:border-t-0 sm:border-l sm:px-4 sm:py-4">
            <Label className="text-muted-foreground text-xs">
              {t('bonus.amount_short')}
            </Label>
            <span className="text-lg leading-none font-bold sm:text-lg whitespace-nowrap">
              {bonus ? formatCurrency(bonus, "PEN") : t('bonus.no_bonus')}
            </span>
          </div>

          <div className="justify-top flex flex-1 flex-col gap-1 border-t px-2 py-2 text-left even:border-l sm:border-t-0 sm:border-l sm:px-4 sm:py-4">
            <Label className="text-muted-foreground text-xs whitespace-nowrap">
              {t('form.property_insurance_short')}
            </Label>
            <span className="text-lg leading-none font-bold sm:text-lg whitespace-nowrap">
              {property.property_insurance !== null
                ? formatCurrency(property.property_insurance, property.currency as "USD" | "PEN")
                : t('bonus.no_bonus')}
            </span>
          </div>
        </div>
      </div>
      {/* end */}


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