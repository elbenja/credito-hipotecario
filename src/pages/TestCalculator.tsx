import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { cn, formatDate, formatCurrency } from "@/lib/utils"
import { amortizationDataService } from "@/services/amortization/calculations/amortizationData"
import type { Property } from "@/services/amortization/types/common"
import type { AmortizationRow } from "@/services/amortization/calculations/amortizationData"

export default function TestCalculator() {
  // Input states
  const [cost, setCost] = useState<string>("0")
  const [propertyInsurance, setPropertyInsurance] = useState<string>("0")
  const [downPayment, setDownPayment] = useState<string>("0")
  const [loanProtection, setLoanProtection] = useState<string>("0")
  const [interestRate, setInterestRate] = useState<string>("4")
  const [termYears, setTermYears] = useState<string>("20")
  const [installmentsPerYear, setInstallmentsPerYear] = useState<"12" | "14">("12")
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<Date>(new Date())
  const [loanProtectionType, setLoanProtectionType] = useState<string>("none")

  // Output states
  const [installmentAmount, setInstallmentAmount] = useState<number>(0)
  const [totalInterestAndPayments, setTotalInterestAndPayments] = useState<number>(0)
  const [totalMonths, setTotalMonths] = useState<number>(0)
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0)
  const [monthlyRate, setMonthlyRate] = useState<number>(0)
  const [paymentSchedule, setPaymentSchedule] = useState<AmortizationRow[]>([]);

  // Calculate outputs whenever inputs change
  useEffect(() => {
    // Parse input values
    const costValue = parseFloat(cost) || 0
    const propertyInsuranceValue = parseFloat(propertyInsurance) || 0
    const downPaymentValue = parseFloat(downPayment) || 0
    const loanProtectionValue = parseFloat(loanProtection) || 0
    const interestRateValue = parseFloat(interestRate) || 0
    const termYearsValue = parseInt(termYears) || 0

    // Create mock property object
    const mockProperty: Property = {
      id: "test",
      cost: costValue,
      currency: "PEN",
      property_insurance: propertyInsuranceValue,
      property_insurance_type: "manual",
      bonus: 0
    }

    // Calculate amortization schedule using the centralized service
    const schedule = amortizationDataService.calculateAmortizationSchedule({
      property: mockProperty,
      downPayment: downPaymentValue,
      interestRate: interestRateValue,
      termYears: termYearsValue,
      installmentsPerYear: parseInt(installmentsPerYear) as 12 | 14,
      firstInstallmentDate,
      propertyInsurance: propertyInsuranceValue,
      loanProtection: loanProtectionValue
    });

    if (schedule.length > 0) {
      const firstRow = schedule[0];
      
      // Update output states
      setInstallmentAmount(firstRow.baseInstallment)
      setMonthlyPayment(firstRow.monthlyPayment)
      setTotalMonths(schedule.length)
      // Use effective annual rate (EAR) formula instead of nominal rate
      setMonthlyRate(Math.pow(1 + (interestRateValue / 100), 1/12) - 1)
      // Calculate total interest and all insurance payments
      setTotalInterestAndPayments(
        schedule.reduce((sum, row) => {
          // Each row's interestAndPayments already contains interest + property insurance + loan protection
          return sum + row.interestAndPayments;
        }, 0)
      )
      setPaymentSchedule(schedule)
    }
  }, [cost, propertyInsurance, downPayment, loanProtection, interestRate, termYears, installmentsPerYear, loanProtectionType, firstInstallmentDate])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Loan Calculator Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Inputs</h2>
          
          <div className="space-y-2">
            <Label htmlFor="cost">Cost</Label>
            <Input
              id="cost"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Enter property cost"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyInsurance">Property Insurance</Label>
            <Input
              id="propertyInsurance"
              type="number"
              value={propertyInsurance}
              onChange={(e) => setPropertyInsurance(e.target.value)}
              placeholder="Enter property insurance"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="downPayment">Down Payment</Label>
            <Input
              id="downPayment"
              type="number"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="Enter down payment"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loanProtectionType">Loan Protection Type</Label>
            <Select 
              value={loanProtectionType} 
              onValueChange={(value) => {
                setLoanProtectionType(value);
                // Set the corresponding percentage based on type
                switch(value) {
                  case "individual":
                    setLoanProtection("0.028");
                    break;
                  case "joint":
                    setLoanProtection("0.052");
                    break;
                  case "none":
                    setLoanProtection("0");
                    break;
                  case "custom":
                    // Keep current value if it's custom
                    break;
                }
              }}
            >
              <SelectTrigger id="loanProtectionType">
                <SelectValue placeholder="Select protection type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual (0.028%)</SelectItem>
                <SelectItem value="joint">Joint (0.052%)</SelectItem>
                <SelectItem value="none">None (0%)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loanProtection">Loan Protection Rate (%)</Label>
            <Input
              id="loanProtection"
              type="number"
              value={loanProtection}
              onChange={(e) => {
                setLoanProtection(e.target.value);
                // Set to custom type if user manually changes the value
                if (loanProtectionType !== "custom" && e.target.value !== "0.028" && e.target.value !== "0.052" && e.target.value !== "0") {
                  setLoanProtectionType("custom");
                }
              }}
              placeholder="Enter percentage rate (e.g. 0.028)"
              step="0.001"
              disabled={loanProtectionType !== "custom" && loanProtectionType !== ""}
            />
            <p className="text-xs text-muted-foreground">
              This percentage will be applied monthly to each month's beginning balance
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <Input
              id="interestRate"
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="Enter interest rate"
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="termYears">Term (Years)</Label>
            <Input
              id="termYears"
              type="number"
              value={termYears}
              onChange={(e) => setTermYears(e.target.value)}
              placeholder="Enter term in years"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installmentsPerYear">Installments per Year</Label>
            <Select 
              value={installmentsPerYear} 
              onValueChange={(value: "12" | "14") => setInstallmentsPerYear(value)}
            >
              <SelectTrigger id="installmentsPerYear">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">Simple </SelectItem>
                <SelectItem value="14">Double </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstInstallmentDate">First Installment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="firstInstallmentDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !firstInstallmentDate && "text-muted-foreground"
                  )}
                >
                  {firstInstallmentDate ? (
                    formatDate(firstInstallmentDate)
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={firstInstallmentDate}
                  onSelect={(date) => {
                    if (date) {
                      const adjustedDate = new Date(date);
                      adjustedDate.setHours(12, 0, 0, 0);
                      setFirstInstallmentDate(adjustedDate);
                    }
                  }}
                  disabled={(date) =>
                    date < new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>


        </div>

        {/* Outputs Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Outputs</h2>
          
          <div className="space-y-4 p-6 border rounded-lg">
            <div>
              <Label className="text-muted-foreground">Monthly Interest Rate (%)</Label>
              <div className="text-2xl font-bold">
                {(monthlyRate * 100).toFixed(6)}%
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Base Installment Amount</Label>
              <div className="text-2xl font-bold">
                {formatCurrency(installmentAmount, "PEN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fixed principal + interest component (same amount every month)
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Sum Interest & Insurances</Label>
              <div className="text-2xl font-bold">
                {formatCurrency(totalInterestAndPayments, "PEN")}
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Total Months</Label>
              <div className="text-2xl font-bold">
                {totalMonths}
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Monthly Payment</Label>
              <div className="text-2xl font-bold bg-blue-100 p-2">
                {formatCurrency(monthlyPayment, "PEN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total payment (2× in July/December for Double option)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Payment Schedule</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Row</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Monthly Payment</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Base Installment</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Principal</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Interest</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Property Insurance</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Loan Insurance</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Beginning Balance</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Ending Balance</th>
              </tr>
            </thead>
            <tbody>
              {paymentSchedule.map((row) => (
                <tr 
                  key={row.row}
                  className={cn(
                    "hover:bg-gray-50 text-xs",
                    installmentsPerYear === "14" && 
                    (row.date.getMonth() === 6 || row.date.getMonth() === 11) ? "bg-gray-100" : ""
                  )}
                >
                  <td className="border p-2">{row.row}</td>
                  <td className="border p-2">{formatDate(row.date)}</td>
                  <td className="border p-2">{formatCurrency(row.monthlyPayment, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.baseInstallment, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.principal, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.interest, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.propertyInsurance, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.loanInsurance, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.beginBalance, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.endBalance, "PEN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 