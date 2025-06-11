import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { LiveScenarioPayments } from "@/components/Rentals/LiveScenarioPayments";
import { PaymentRow, ScenarioResult } from "@/types/common";

interface ExtraInstallment {
  id: string;
  mortgage_id: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  created_at?: string;
  updated_at?: string;
}

interface LivePaymentsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: ScenarioResult;
  extraInstallments: ExtraInstallment[];
  scenarioType: string;
  mortgageName?: string;
}

export function LivePaymentsSheet({
  isOpen,
  onOpenChange,
  scenario,
  extraInstallments,
  scenarioType,
  mortgageName,
}: LivePaymentsSheetProps) {
  const { t } = useTranslation('rentals');
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {t('payments_sheet.title')} 
            {mortgageName && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {mortgageName}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <LiveScenarioPayments 
            scenario={scenario}
            extraInstallments={extraInstallments}
            scenarioType={scenarioType}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
} 