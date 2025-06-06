import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SavedScenarioExample } from "@/components/Rentals/ScenarioPayments";

interface PaymentsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mortgageId: string | null;
  mortgageInfo: any | null; // Replace with proper type if available
}

export function PaymentsSheet({
  isOpen,
  onOpenChange,
  mortgageId,
  mortgageInfo,
}: PaymentsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Saved Scenario Payments
            {mortgageInfo && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {mortgageInfo.mortgage.name}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {mortgageId ? (
            <SavedScenarioExample mortgageId={mortgageId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No mortgage selected
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 