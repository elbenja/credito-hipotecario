import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Building, ChevronRight, Eye, Plus, Table, TableProperties } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { usePropertiesWithMortgagesAndBonus } from "@/services/propertyService";
import { Link } from "react-router-dom";
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
// import { SavedScenario } from "@/components/rentals/SavedScenarioPayments";
import { MortgageSelectionSheet } from "@/components/ui/sheets/MortgageSelectionSheet";
import { PaymentsSheet } from "@/components/ui/sheets/PaymentsSheet";
import { ExpensesGroup } from "@/components/rentals-ui/expenses-group";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { convertTermToMonths, formatTermForInput } from "@/utils/term-conversion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Term Months Input Component with Popover - bidirectional converter
interface TermMonthsPopoverProps {
  value?: number;
  onChange?: (months: number) => void;
  className?: string;
}

const TermMonthsPopover = ({ value, onChange, className }: TermMonthsPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [yearsInput, setYearsInput] = useState<string>("")
  const [monthsInput, setMonthsInput] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  
  // Display values for the main input
  const [displayValue, setDisplayValue] = useState<string>("")
  const [displayConversion, setDisplayConversion] = useState<string>("")

  // Initialize display values and popover inputs
  useEffect(() => {
    if (value && value > 0) {
      const yearsValue = formatTermForInput(value)
      setDisplayValue(yearsValue)
      setDisplayConversion(`${value} months`)
      
      // Set popover inputs
      setMonthsInput(value.toString())
      setYearsInput(yearsValue)
    } else {
      setDisplayValue("")
      setDisplayConversion("")
      setMonthsInput("")
      setYearsInput("")
    }
  }, [value])

  // Convert months to years (1 decimal place)
  const monthsToYears = (months: number): string => {
    return (months / 12).toFixed(1)
  }

  // Convert years to months (rounded integer)
  const yearsToMonths = (years: number): number => {
    return Math.round(years * 12)
  }

  // Validate range (5-30 years = 60-360 months)
  const validateValue = (months: number): boolean => {
    return months >= 60 && months <= 360
  }

  // Handle years input change
  const handleYearsChange = (inputValue: string) => {
    setYearsInput(inputValue)
    setErrorMessage("")
    
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed) && parsed > 0) {
      const months = yearsToMonths(parsed)
      setMonthsInput(months.toString())
      
      if (validateValue(months)) {
        onChange?.(months)
      } else {
        setErrorMessage("Outside the range")
      }
    } else if (inputValue === "") {
      setMonthsInput("")
    }
  }

  // Handle months input change
  const handleMonthsChange = (inputValue: string) => {
    setMonthsInput(inputValue)
    setErrorMessage("")
    
    const parsed = parseInt(inputValue)
    if (!isNaN(parsed) && parsed > 0) {
      const years = monthsToYears(parsed)
      setYearsInput(years)
      
      if (validateValue(parsed)) {
        onChange?.(parsed)
      } else {
        setErrorMessage("Outside the range")
      }
    } else if (inputValue === "") {
      setYearsInput("")
    }
  }

  return (
    <div className={className}>
      <Label>
        Loan Term (Years)
      </Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Input
            value={displayValue}
            readOnly
            placeholder="20.0"
            className="cursor-pointer"
            onClick={() => setIsOpen(true)}
          />
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="text-sm font-medium">Term</div>
            
            {/* Side-by-side converter */}
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Years</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="5"
                  max="30"
                  value={yearsInput}
                  onChange={(e) => handleYearsChange(e.target.value)}
                  placeholder="19.6"
                />
              </div>
              
              <div className="px-2 py-6 text-lg font-medium text-muted-foreground">
                =
              </div>
              
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Months</Label>
                <Input
                  type="number"
                  min="60"
                  max="360"
                  value={monthsInput}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  placeholder="235"
                />
              </div>
            </div>
            
            {/* Error message */}
            {errorMessage && (
              <div className="text-xs text-red-500">
                {errorMessage}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      <div className="text-xs text-muted-foreground mt-1">
        {displayConversion && 
          <span>
            {displayConversion}
          </span>
        }
      </div>
    </div>
  )
}

export default function TestExtraInstallments() {
  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const [isSelectionSheetOpen, setIsSelectionSheetOpen] = useState(false);
  const [isPaymentsSheetOpen, setIsPaymentsSheetOpen] = useState(false);
  const [termMonths, setTermMonths] = useState<number>(240); // Default 20 years
  


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



  return (
    <DashboardLayout header={{ title: "Test Extra Installments" }}>
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-16">
        
<Link to="/rentals">
  <Button variant="outline" className="flex items-center gap-2"> 
    <Building className="w-4 h-4" />
    Rentals
  </Button>
</Link> 


{/* PopOver-months mock */}
<div className="w-full max-w-sm space-y-4">
  <TermMonthsPopover
    value={termMonths}
    onChange={setTermMonths}
    className="space-y-2"
  />
  <div className="mt-2 text-sm text-muted-foreground">
    Current value: {termMonths} months ({(termMonths / 12).toFixed(1)} years)
  </div>
  
  {/* Test button to show how it could be used */}
  <Button 
    variant="outline" 
    onClick={() => {
      console.log("Term months selected:", termMonths);
      alert(`Selected term: ${termMonths} months (${(termMonths / 12).toFixed(1)} years)`);
    }}
  >
    Test Term Selection
  </Button>
</div>



{/* future component Inherit payments */}
        {/* <div className="flex items-center justify-center gap-1">
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
        </div> */}




        <div className="flex flex-col gap-4">

 

          <div className="flex flex-col gap-2">

            <ExpensesGroup
              name="Costos de Compra"
              // suggestedNames={["Mantenimiento", "Internet", "Agente", "Condo Fees"]}
              suggestedNames={["Tasación", "Minuta", "Alcabala", "Notariales", "Registrales"]}
              viewPeriod={true}
              viewRelation={true}
            />
            <ExpensesGroup
              name="Costos de Implementación"
              // suggestedNames={["Amoblamiento", "Equipo de Cocina"]}
              suggestedNames={["Gas Natural", "Cortinas", "Luces", "Mamparas De Vidrio", "Espejo"]}
              viewPeriod={false}
              viewRelation={false}
            />
          {/* <Accordion
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
        
          </Accordion> */}

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
            {/* <table className="mt-4 w-full border">
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
            /> */}
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
