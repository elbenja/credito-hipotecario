import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ChevronRight, Eye, Plus, Table, TableProperties } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { usePropertiesWithMortgagesAndBonus } from "@/services/propertyService";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
// } from "@/components/ui/sheet";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/utils";
import { useTranslation } from "react-i18next";
import type { Mortgage } from "@/types";
// import useSavedScenarioPayments from "@/hooks/mortgages/useSavedScenarioPayments";
// import { SavedScenarioExample } from "@/components/Rentals/ScenarioPayments";
import { MortgageSelectionSheet } from "../../components/ui/sheets/MortgageSelectionSheet";
import { PaymentsSheet } from "../../components/ui/sheets/PaymentsSheet";
// import { Switch } from "@/components/ui/switch";
// import { Input } from "@/components/ui/input";
import { PopExpense } from "@/components/Rentals/PopExpense";
// import { TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { TableBody } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function TestExtraInstallments() {
  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const [isSelectionSheetOpen, setIsSelectionSheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);
  
  // Add state for PopExpense fields
  // const [expenseName, setExpenseName] = useState("");
  // const [expenseAmount, setExpenseAmount] = useState("");
  const [showPopover, setShowPopover] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Switches for showing/hiding TabSwitches
  // const [periodSwitch, setPeriodSwitch] = useState(true); // true = hidden
  // const [relationSwitch, setRelationSwitch] = useState(true); // true = hidden

  const { user } = useAuth();
  const { t } = useTranslation(['properties', 'global']);
  
  const { data: propertiesWithMortgages = [], isLoading } = usePropertiesWithMortgagesAndBonus(user?.id);

  // Find the selected mortgage and its property
  const selectedMortgageInfo = selectedMortgageId ? (() => {
    for (const property of propertiesWithMortgages) {
      const mortgage = property.mortgages?.find((m: Mortgage) => m.id === selectedMortgageId);
      if (mortgage) {
        return { mortgage, property };
      }
    }
    return null;
  })() : null;

  // const { payments, summary, savedScenarioType } = useSavedScenarioPayments(selectedMortgageId);

  type Expense = {
    name: string;
    amount: string;
    period: string;
    relation: string;
  };

  // // Handler for adding expense
  // const handleAddExpense = (periodTabValue: string, relationTabValue: string) => {
  //   setExpenses([
  //     ...expenses,
  //     {
  //       name: expenseName,
  //       amount: expenseAmount,
  //       period: periodTabValue,
  //       relation: relationSwitch ? "Fixed" : relationTabValue,
  //     },
  //   ]);
  //   setExpenseName("");
  //   setExpenseAmount("");
  //   setShowPopover(false);
  // };

  const handleDeleteExpense = (idx: number) => {
    setExpenses(expenses.filter((_, i) => i !== idx));
  };

  return (
    <DashboardLayout header={{ title: "Test Extra Installments" }}>
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-16">

        <div className="flex items-center justify-center gap-1">
          <Button onClick={() => setIsSelectionSheetOpen(true)}>
            {selectedMortgageInfo ? (
              <div className="flex justify-between w-full">
                <span className="truncate mr-2">
                  {selectedMortgageInfo.mortgage.name.length > 15 
                    ? `${selectedMortgageInfo.mortgage.name.substring(0, 15)}...` 
                    : selectedMortgageInfo.mortgage.name}
                </span>
                <span className="font-medium">
                  {formatCurrency(selectedMortgageInfo.mortgage.loan_amount, selectedMortgageInfo.property.currency)}
                </span>
              </div>
            ) : (
              <> Choose mortgage <ChevronRight className="w-4 h-4" /></>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (selectedMortgageId) {
                setIsPaymentsSheetOpen(true);
              } else {
                alert("Please select a mortgage first");
              }
            }}
            disabled={!selectedMortgageId}
          >
            <Eye className="w-4 h-4" />
            Payments
          </Button>
        </div>
        <div className="flex flex-col gap-4">

 

          <div className="flex flex-col gap-2">

          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue="item-1"
          >
            <AccordionItem value="item-1">
              <AccordionTrigger>Product Information</AccordionTrigger>
              <AccordionContent className=" gap-4 ">
                <p>
                  Our flagship product combines cutting-edge technology with sleek
                  design. Built with premium materials, it offers unparalleled
                  performance and reliability.
                </p>
                <p>
                  Key features include advanced processing capabilities, and an
                  intuitive user interface designed for both beginners and experts.
                </p>
              </AccordionContent>
            </AccordionItem>
        
          </Accordion>

            {/* <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" value={expenseName} onChange={e => setExpenseName(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="period-switch" checked={periodSwitch} onCheckedChange={setPeriodSwitch} />
              <Label htmlFor="period-switch">Show Period TabSwitch</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="relation-switch" checked={relationSwitch} onCheckedChange={setRelationSwitch} />
              <Label htmlFor="relation-switch">Show Relation TabSwitch</Label>
            </div> */}

        

            {/* Expenses Table */}
            <table className="mt-4 w-full border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Amount</th>
                  <th className="border px-2 py-1">Period</th>
                  <th className="border px-2 py-1">Relation</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{exp.name}</td>
                    <td className="border px-2 py-1">{exp.amount}</td>
                    <td className="border px-2 py-1">{exp.period}</td>
                    <td className="border px-2 py-1">{exp.relation}</td>
                    <td className="border px-2 py-1">
                      <button onClick={() => handleDeleteExpense(idx)} className="text-red-500">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          <PopExpense
              title="Other Expense"
              suggestedNames={["maintenance", "internet", "agent", "condo fees"]}
              viewPeriod={false}
              viewRelation={false}
              onConfirm={({ name, amount, period, relation }) => {
                // Add to table here
              }}
              open={showPopover}
              onOpenChange={setShowPopover}
            />
          </div>
          
        </div>
      </div>

      <MortgageSelectionSheet
        isOpen={isSelectionSheetOpen}
        onOpenChange={setIsSelectionSheetOpen}
        selectedMortgageId={selectedMortgageId}
        onMortgageSelect={setSelectedMortgageId}
        properties={propertiesWithMortgages}
        isLoading={isLoading}
      />

      <PaymentsSheet
        isOpen={isPaymentsSheetOpen}
        onOpenChange={setIsPaymentsSheetOpen}
        mortgageId={selectedMortgageId}
        mortgageInfo={selectedMortgageInfo}
      />
    </DashboardLayout>
  );
}
