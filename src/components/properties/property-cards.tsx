import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil } from "lucide-react";
import SVGillustration from "@/components/ui/SVGillustration";
import { useNavigate } from "react-router-dom";
import { Property } from "./types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PropertyForm } from "@/components/properties/property-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type PropertyCardsProps = {
  onPropertySelect?: (property: Property) => void;
  onPropertiesLoaded?: (hasProperties: boolean) => void;
}

interface PropertyEditSheetProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyUpdate?: (property: Property) => void;
}

function PropertyEditSheet({ property, open, onOpenChange, onPropertyUpdate }: PropertyEditSheetProps) {
  const { t } = useTranslation(['global', 'properties', 'dashboard']);
  const { user } = useAuth();
  const [bonusRules, setBonusRules] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const handlePropertyUpdate = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq('id', property.id)
      .single();

    if (error) {
      console.error("Error fetching updated property:", error);
      return;
    }

    onOpenChange(false);
    if (onPropertyUpdate) {
      onPropertyUpdate(data);
    }
    
    // Broadcast property update message
    const channel = supabase.channel('property-updates');
    channel.send({
      type: 'broadcast',
      event: 'property-updated',
      payload: { action: 'update', userId: user?.id },
    });
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['properties-count'] });
  };

  if (!property) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{t("ui.edit", { ns: "global" })}</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          <PropertyForm
            onSuccess={handlePropertyUpdate}
            onClose={() => onOpenChange(false)}
            selectedProperty={property}
            bonusRules={bonusRules}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

const formatCurrency = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'PEN' ? 'PEN' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  const formatted = formatter.format(amount);
  return currency === 'PEN' ? formatted.replace('PEN', 'S/') : formatted;
}

export function PropertyCards({ onPropertySelect, onPropertiesLoaded }: PropertyCardsProps) {
  const { t } = useTranslation(['properties', 'global', 'dashboard']);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mortgageCounts, setMortgageCounts] = useState<Record<string, number>>({});
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyEditSheetOpen, setPropertyEditSheetOpen] = useState(false);
  const fetchedPropertyIds = useRef<Set<string>>(new Set());

  // Use React Query to fetch properties
  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000 // 2 minutes
  });

  // Update mortgage counts and onPropertiesLoaded callback
  useEffect(() => {
    onPropertiesLoaded?.(properties.length > 0);
    
    const fetchMortgageCounts = async () => {
      if (properties.length === 0) return;
      
      const newCounts = { ...mortgageCounts };
      let hasUpdates = false;
      
      for (const property of properties) {
        if (!fetchedPropertyIds.current.has(property.id)) {
          newCounts[property.id] = await getPropertyMortgagesCount(property.id);
          fetchedPropertyIds.current.add(property.id);
          hasUpdates = true;
        }
      }
      
      if (hasUpdates) {
        setMortgageCounts(newCounts);
      }
    };
    
    fetchMortgageCounts();
  }, [properties, onPropertiesLoaded]);

  // Subscribe to broadcast messages for property updates
  useEffect(() => {
    if (!user) return;

    // Define a function to handle property updates that require refetching
    const handlePropertyUpdate = () => {
      // Clear cached property IDs to force a refresh of mortgage counts
      fetchedPropertyIds.current.clear();
      refetch(); // Refresh properties list
    };

    // Set up the realtime subscription
    const channel = supabase
      .channel('property-updates')
      .on('broadcast', { event: 'property-created' }, (payload) => {
        console.log('Property created broadcast received:', payload);
        if (payload.payload?.userId === user.id) {
          handlePropertyUpdate();
        }
      })
      .on('broadcast', { event: 'property-updated' }, (payload) => {
        console.log('Property updated broadcast received:', payload);
        if (payload.payload?.userId === user.id) {
          handlePropertyUpdate();
        }
      })
      .on('broadcast', { event: 'property-deleted' }, (payload) => {
        console.log('Property deleted broadcast received:', payload);
        if (payload.payload?.userId === user.id) {
          handlePropertyUpdate();
        }
      })
      .subscribe();

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const handleEditProperty = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    setEditingProperty(property);
    setPropertyEditSheetOpen(true);
  };

  const handlePropertyUpdate = (updatedProperty: Property) => {
    // Clear cached property IDs to force a refresh of mortgage counts when properties are updated
    fetchedPropertyIds.current.clear();
    
    // Broadcast will handle notifying other components
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['properties-count'] });
  };

  const handleAddMortgage = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    navigate(`/mortgages/new?propertyId=${property.id}`);
  };

  const getPropertyMortgagesCount = async (propertyId: string): Promise<number> => {
    try {
      const { data, error, count } = await supabase
        .from('amortizations')
        .select('*', { count: 'exact' })
        .eq('property_id', propertyId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting mortgages:', error);
      return 0;
    }
  };

  // Get SVG variant for properties
  const getSVGVariant = (index: number): "stool" | "dog" | "armchair" | "hangingPlant" | "plant" | "beanBag" => {
    const variants: Array<"stool" | "dog" | "armchair" | "hangingPlant" | "plant" | "beanBag"> = [
      "dog", "stool", "armchair", "hangingPlant", "plant", "beanBag", 
    ];
    return variants[index % variants.length];
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40">Loading properties...</div>;
  }

  if (properties.length === 0) {
    return null;
  }

  return (
    <>
      {properties.map((property, index) => (
        <div 
          key={property.id} 
          className="container h-80 w-52 bg-card rounded-2xl flex flex-col justify-between items-center overflow-hidden p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onPropertySelect && onPropertySelect(property)}
        >
          <div className="self-stretch flex justify-start items-start gap-2">
            <div className="flex-1 flex flex-col justify-start items-start gap-1">
              <div className="name self-stretch justify-start text-sm font-normal leading-none">
                {property.name}
              </div>
              <div className="price_cost self-stretch justify-start text-lg font-black leading-snug">
                {formatCurrency(property.price_cost, property.currency || 'USD')}
              </div>
            </div>
            <button 
              className="size-8 bg-primary text-primary-foreground rounded-[99px] flex justify-center items-center"
              onClick={(e) => handleEditProperty(e, property)}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          
          <SVGillustration variant={getSVGVariant(index)} className="h-52 w-52" />
          
          <div className="self-stretch flex justify-between items-center">
            <div className="flex flex-col justify-center items-start gap-1">
              <div className="justify-start text-lg font-semibold leading-none">
                {mortgageCounts[property.id] || 0}
              </div>
              <div className="justify-start text-sm font-normal leading-none">
                {t('sections.mortgages', { ns: 'dashboard' })}
              </div>
            </div>
            <button 
              className="size-8 border border-foreground text-foreground rounded-[99px] flex justify-center items-center"
              onClick={(e) => handleAddMortgage(e, property)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      {editingProperty && (
        <PropertyEditSheet
          property={editingProperty}
          open={propertyEditSheetOpen}
          onOpenChange={(open) => {
            setPropertyEditSheetOpen(open);
            if (!open) setEditingProperty(null);
          }}
          onPropertyUpdate={handlePropertyUpdate}
        />
      )}
    </>
  );
} 