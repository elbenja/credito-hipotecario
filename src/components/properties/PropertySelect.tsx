import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Property } from '@/types/property';
import { useProperties } from '@/services/propertyService';

export function PropertySelect({
  form,
  onPropertyChange,
  disabled = false,
}: {
  form: UseFormReturn<any>;
  onPropertyChange?: (p: Property | null) => void;
  disabled?: boolean;
}) {
  const [list, setList] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth()
  const { data: properties = [], isLoading, refetch } = useProperties(user?.id)

  return (
    <FormField control={form.control} name="property_id" render={({ field }) => (
      <FormItem>
        <FormLabel>Property</FormLabel>
        <FormControl>
          <Select
            disabled={disabled || loading}
            value={field.value || ''}
            onValueChange={(val) => {
              field.onChange(val);
              const sel = list.find((p) => p.id === val) ?? null;
              onPropertyChange?.(sel);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
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