import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionCheck } from '@/components/SubscriptionCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function CreatePropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [propertyCount, setPropertyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    price_cost: 0
  });
  
  // Fetch property count for current user
  useEffect(() => {
    const fetchPropertyCount = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        const { count, error } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (error) {
          throw error;
        }
        
        setPropertyCount(count || 0);
      } catch (err) {
        console.error('Error fetching property count:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPropertyCount();
  }, [user]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price_cost' ? parseFloat(value) || 0 : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Debes iniciar sesión para crear una propiedad');
      return;
    }
    
    if (!formData.name || !formData.address || formData.price_cost <= 0) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          name: formData.name,
          address: formData.address,
          price_cost: formData.price_cost,
          user_id: user.id
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast.success('Propiedad creada exitosamente');
      navigate(`/properties/${data.id}`);
    } catch (err) {
      console.error('Error creating property:', err);
      toast.error('No se pudo crear la propiedad');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle upgrade button click
  const handleUpgrade = () => {
    navigate('/subscriptions');
  };
  
  if (isLoading) {
    return (
      <div className="container max-w-xl py-10">
        <div className="h-40 animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }
  
  return (
    <div className="container max-w-xl py-10">
      <h1 className="text-3xl font-bold mb-8">Crear Nueva Propiedad</h1>
      
      <SubscriptionCheck 
        featureName="properties"
        currentCount={propertyCount}
        onUpgrade={handleUpgrade}
      >
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Detalles de la Propiedad</CardTitle>
              <CardDescription>Ingresa la información de tu nueva propiedad</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price_cost">Precio / Costo</Label>
                <Input
                  id="price_cost"
                  name="price_cost"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.price_cost || ''}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/properties')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Propiedad'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </SubscriptionCheck>
    </div>
  );
} 