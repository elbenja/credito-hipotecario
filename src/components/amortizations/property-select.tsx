
import { useState, useEffect } from 'react'
import { useQuery } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Property as PropertyType } from "@/services/amortization/types/common"

export type Property = {
  id: string
  name: string
  cost: number
  currency: string
  property_insurance: number
  property_insurance_type: string
  bonus: number
}

async function getProperties(): Promise<Property[]> {
  const res = await fetch('/api/properties')
  return res.json()
}

export interface PropertySelectProps {
  onChange: (property: PropertyType) => void
}

export function PropertySelect({ onChange }: PropertySelectProps) {
  const [selected, setSelected] = useState<Property | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties
  })

  useEffect(() => {
    if (selected) {
      const property = {
        id: selected.id,
        cost: selected.cost,
        currency: selected.currency as "USD" | "PEN",
        property_insurance: selected.property_insurance,
        property_insurance_type: selected.property_insurance_type as "auto" | "manual",
        bonus: selected.bonus
      };
      onChange(property)
    }
  }, [selected, onChange])

  if (isLoading) return <div>Loading properties...</div>
  if (isError) return <div>Error fetching properties</div>

  return (
    <div className="grid gap-2">
      <Label htmlFor="property">Property</Label>
      <Select onValueChange={(value) => {
        const property = data?.find(property => property.id === value)
        setSelected(property || null)
      }}>
        <SelectTrigger id="property">
          <SelectValue placeholder="Select a property" />
        </SelectTrigger>
        <SelectContent>
          {data?.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Create a PropertyDisplay component to display property details
export function PropertyDisplay({ property }: { property: PropertyType }) {
  if (!property) return null;
  
  return (
    <div className="grid gap-2">
      <div className="font-medium">Property Information</div>
      <div className="text-sm text-gray-500">
        <div>ID: {property.id}</div>
        <div>Cost: {property.cost} {property.currency}</div>
        <div>Insurance: {property.property_insurance}</div>
        <div>Insurance Type: {property.property_insurance_type}</div>
        <div>Bonus: {property.bonus}</div>
      </div>
    </div>
  );
}
