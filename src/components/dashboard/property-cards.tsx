import { useState, useEffect, useRef } from "react";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil } from "lucide-react";
import SVGillustration from "@/components/ui/SVGillustration";
import { useNavigate } from "react-router-dom";
import { Property } from "@/types/property";
import { fetchPropertyWithBonus,  usePropertiesWithMortgagesAndBonus } from '@/services/propertyService';
import type { PropertyWithBonus } from '@/types/property';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PropertyForm } from "@/components/properties/property-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { fetchProperties } from '@/services/propertyService';
import { formatCurrency } from "@/utils/utils";
import { useCanCreateFeature } from "@/hooks/usePlanLimits"


type PropertyCardsProps = {
  onPropertySelect?: (property: Property) => void;
  onPropertiesLoaded?: (hasProperties: boolean) => void;
  onAddMortgage?: (e: React.MouseEvent, property: Property) => void;
}

interface PropertyEditSheetProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyUpdate?: (property: Property) => void;
}

function PropertyEditSheet({ property, open, onOpenChange, onPropertyUpdate 
}: PropertyEditSheetProps) {

  const { t } = useTranslation(['global', 'properties', 'dashboard']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // const [showDialog, setShowDialog] = useState(false)

  const handlePropertyUpdate = async () => {
    try {
      if (!user) throw new Error('No user logged in');
      // Use the service to get property with bonus
      const updated: PropertyWithBonus = await fetchPropertyWithBonus(user.id, property.id);
      
      onOpenChange(false);
      onPropertyUpdate?.(updated);
      queryClient.invalidateQueries({ queryKey: ['properties'] });

    } catch (error) {
      console.error('Error fetching updated property:', error);
    }
  };

  if (!property) {
    return null;
  }
  const { canCreate } = useCanCreateFeature()

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
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PropertyCards({ onPropertySelect, onPropertiesLoaded, onAddMortgage }: PropertyCardsProps) {
  const { t } = useTranslation(['properties', 'global', 'dashboard']);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mortgageCounts, setMortgageCounts] = useState<Record<string, number>>({});
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyEditSheetOpen, setPropertyEditSheetOpen] = useState(false);
  const fetchedPropertyIds = useRef<Set<string>>(new Set());

  // hook to fetch PropertyWithBonus
//  const { data: properties = [], isLoading, refetch } = useProperties(user?.id)
 const { data: propertiesWithMortgages=[], isLoading } = usePropertiesWithMortgagesAndBonus(user?.id);

  // Update mortgage counts and onPropertiesLoaded callback
  // useEffect(() => {
  //   onPropertiesLoaded?.(propertiesWithMortgages.length > 0);
    
  //   const fetchMortgageCounts = async () => {
  //     if (propertiesWithMortgages.length === 0) return;
      
  //     const newCounts = { ...mortgageCounts };
  //     let hasUpdates = false;
      
  //     for (const property of propertiesWithMortgages) {
  //       if (!fetchedPropertyIds.current.has(property.id)) {
  //         newCounts[property.id] = await getPropertyMortgagesCount(property.id);
  //         fetchedPropertyIds.current.add(property.id);
  //         hasUpdates = true;
  //       }
  //     }
      
  //     if (hasUpdates) {
  //       setMortgageCounts(newCounts);
  //     }
  //   };
    
  //   fetchMortgageCounts();
  // }, [properties, onPropertiesLoaded]);



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


  // note to self i think this can be merged with properties-mortgages-bonus from Mortgages.tsx
  // const getPropertyMortgagesCount = async (propertyId: string): Promise<number> => {
  //   try {
      
  //     const { error, count } = await supabase
  //       .from('mortgages')
  //       .select('*', { count: 'exact' })
  //       .eq('property_id', propertyId);

  //     if (error) throw error;
  //     return count || 0;
  //   } catch (error) {
  //     console.error('Error counting mortgages:', error);
  //     return 0;
  //   }
  // };

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

  if (propertiesWithMortgages.length === 0) {
    return null;
  }

  return (
    <>
      {propertiesWithMortgages.map((property, index) => (
        <div 
          key={property.id} 
          className=" h-80 w-52 bg-card rounded-2xl flex flex-col items-center overflow-hidden p-4 cursor-pointer hover:shadow-md transition-shadow"
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
                {property.mortgageCount || 0}
              </div>
              <div className="justify-start text-sm font-normal leading-none">
                {t('sections.mortgages', { ns: 'dashboard' })}
              </div>
            </div>


            <button 
            type="button"  
              className="size-8 border border-foreground text-foreground rounded-[99px] flex justify-center items-center"
              onClick={(e) => {
                if (onAddMortgage) {
                  onAddMortgage(e, property);
                }
                console.log('property', property);
              }}
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