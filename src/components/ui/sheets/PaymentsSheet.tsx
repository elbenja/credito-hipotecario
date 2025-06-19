import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { SavedScenario } from "@/components/rentals-ui/SavedScenarioPayments";

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
  const { t } = useTranslation('rentals');
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {t('payments_sheet.title')} 
            {mortgageInfo && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {mortgageInfo.mortgage.name}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {mortgageId ? (
            <SavedScenario mortgageId={mortgageId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('payments_sheet.no_mortgage_selected')}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 