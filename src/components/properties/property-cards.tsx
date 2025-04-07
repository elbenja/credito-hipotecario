import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil } from "lucide-react";
import SVGillustration from "@/components/ui/SVGillustration";
import { useNavigate } from "react-router-dom";
import { Property } from "./types";

type PropertyCardsProps = {
  onPropertySelect?: (property: Property) => void;
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

export function PropertyCards({ onPropertySelect }: PropertyCardsProps) {
  const { t } = useTranslation(['properties', 'global']);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mortgageCounts, setMortgageCounts] = useState<Record<string, number>>({});

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setProperties(data || []);
      
      // Fetch mortgage counts for each property
      const counts: Record<string, number> = {};
      for (const property of data || []) {
        counts[property.id] = await getPropertyMortgagesCount(property.id);
      }
      setMortgageCounts(counts);
      
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        variant: "destructive",
        title: t('global:ui.error'),
        description: t('properties:messages.error_loading_properties'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [user]);

  const handleEditProperty = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    if (onPropertySelect) {
      onPropertySelect(property);
    }
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
    return (
      <div className="flex flex-col items-center justify-center h-60">
        <p className="text-muted-foreground mb-4">{t('messages.no_properties', { ns: 'properties' })}</p>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground"
          onClick={() => navigate('/properties')}
        >
          <Plus className="h-4 w-4" />
          {t('actions.add_property', { ns: 'properties' })}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-wrap content-start">
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
                {t('ui.mortgages', 'Mortgages', { ns: 'properties' })}
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
    </div>
  );
} 