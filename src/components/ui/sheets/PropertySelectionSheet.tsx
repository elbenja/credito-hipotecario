import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/utils";
import { useState } from "react";
import type { PropertyWithBonus } from "@/types/property";

interface PropertySelectionSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPropertyId: string | null;
  onPropertySelect: (id: string) => void;
  properties: PropertyWithBonus[];
  isLoading: boolean;
}

export function PropertySelectionSheet({
  isOpen,
  onOpenChange,
  selectedPropertyId,
  onPropertySelect,
  properties,
  isLoading,
}: PropertySelectionSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Choose a property</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <RadioGroup value={selectedPropertyId || ""} onValueChange={onPropertySelect}>
              {filteredProperties.map((property) => (
                <div key={property.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                  <RadioGroupItem
                    value={property.id}
                    id={property.id}
                    className="flex-shrink-0"
                  />
                  <Label
                    htmlFor={property.id}
                    className="flex-1 flex justify-between items-center cursor-pointer py-1"
                  >
                    <span>{property.name}</span>
                    <span className="font-medium">
                      {formatCurrency(property.price_cost, property.currency as "USD" | "PEN")}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {!isLoading && filteredProperties.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No properties found matching your search." : "No properties found."}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 