import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
// import { supabase } from '@/integrations/supabase/client';
import type { PropertyWithBonus } from '@/types/property';
import { useProperties } from '@/services/propertyService';
import { useTranslation } from 'react-i18next';
//zustand

// import { useMortgageDraftStore } from "@/store/mortgage/store"


export function PropertySelect({
  form,
  onPropertyChange,
  disabled = false,
}: {
  form: UseFormReturn<any>;
  onPropertyChange?: (p: PropertyWithBonus | null) => void;
  disabled?: boolean;
}) {
  const [list, setList] = useState<PropertyWithBonus[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth()
  const { t } = useTranslation('properties');
  // const { data: PropertyWithBonus = [], isLoading: boolean, refetch } = useProperties(user?.id)
  // const { updateDraft , resetDraft } = useMortgageDraftStore()

//finde the error here
const {
  data: PropertyWithBonus = [],
  isLoading,
  isError,
  error
} = useProperties(user?.id);

useEffect(() => {
  if (isError) console.error("Failed to load properties:", error);
}, [isError, error]);

useEffect(() => {
  setList(PropertyWithBonus);
}, [PropertyWithBonus]);
// console.error(PropertyWithBonus); 

  return (
    <FormField control={form.control} name="property_id" render={({ field }) => (
      <FormItem>
        <FormLabel>{t('property')}</FormLabel>
        <FormControl>
          <Select
            disabled={disabled || loading}
            value={field.value || ''}
            onValueChange={(val) => {
              field.onChange(val);
              const sel = list.find((p) => p.id === val) ?? null;
              onPropertyChange?.(sel);
              // if (sel) {
              //   updateDraft({
              //     property_id: sel.id,
              //     property: sel,
              //   });
              // }
            }}
          >
            <SelectTrigger><SelectValue placeholder={t('form.select_property')} /></SelectTrigger>
            <SelectContent>
              {PropertyWithBonus.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}