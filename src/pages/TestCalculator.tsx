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
import { LoanCalculator } from "@/services/amortization/calculations/loan"
import type { Property } from "@/services/amortization/types/common"

interface PaymentScheduleRow {
  row: number;
  date: Date;
  monthlyPayment: number;
  monthlyInstallment: number;
  interestAndPayments: number;
  principal: number;
  interest: number;
  beginBalance: number;
  endBalance: number;
}

export default function TestCalculator() {
  const loanCalculator = new LoanCalculator()

  // Input states
  const [cost, setCost] = useState<string>("0")
  const [propertyInsurance, setPropertyInsurance] = useState<string>("0")
  const [downPayment, setDownPayment] = useState<string>("0")
  const [loanProtection, setLoanProtection] = useState<string>("0")
  const [interestRate, setInterestRate] = useState<string>("4")
  const [termYears, setTermYears] = useState<string>("20")
  const [installmentsPerYear, setInstallmentsPerYear] = useState<string>("12")
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<Date>(new Date())
  const [loanProtectionType, setLoanProtectionType] = useState<string>("none")

  // Output states
  const [installmentAmount, setInstallmentAmount] = useState<number>(0)
  const [totalInterestAndPayments, setTotalInterestAndPayments] = useState<number>(0)
  const [totalMonths, setTotalMonths] = useState<number>(0)
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0)
  const [monthlyRate, setMonthlyRate] = useState<number>(0)
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleRow[]>([]);

  // Calculate outputs whenever inputs change
  useEffect(() => {
    // Parse input values
    const costValue = parseFloat(cost) || 0
    const propertyInsuranceValue = parseFloat(propertyInsurance) || 0
    const downPaymentValue = parseFloat(downPayment) || 0
    const loanProtectionValue = parseFloat(loanProtection) || 0
    const interestRateValue = parseFloat(interestRate) || 0
    const termYearsValue = parseInt(termYears) || 0
    const installmentsPerYearValue = parseInt(installmentsPerYear) || 12

    // Calculate monthly rate
    const calculatedMonthlyRate = (interestRateValue / 100) / installmentsPerYearValue

    // Function to calculate final balance given a monthly installment
    const calculateFinalBalance = (monthlyInstallmentGuess: number): number => {
      let balance = costValue - downPaymentValue;
      const months = termYearsValue * 12;
      
      for (let i = 0; i < months; i++) {
        const isDoubleMonth = installmentsPerYear === "14" && (i % 12 === 6 || i % 12 === 11);
        const interest = Number((balance * calculatedMonthlyRate).toFixed(10));
        const installment = isDoubleMonth ? monthlyInstallmentGuess * 2 : monthlyInstallmentGuess;
        const principal = Number((installment - interest).toFixed(10));
        balance = Number((balance - principal).toFixed(10));
      }
      
      return balance;
    };

    // Binary search to find the correct monthly installment
    const findCorrectMonthlyInstallment = () => {
      let low = 0;
      let high = (costValue - downPaymentValue) * 2; // Start with a high upper bound
      let guess = (low + high) / 2;
      const tolerance = 0.0000001; // Increased precision
      let iterations = 0;
      const maxIterations = 1000; // Increased max iterations

      while (Math.abs(calculateFinalBalance(guess)) > tolerance && iterations < maxIterations) {
        const balance = calculateFinalBalance(guess);
        
        if (balance > 0) {
          low = guess;
        } else {
          high = guess;
        }
        
        guess = Number(((low + high) / 2).toFixed(10));
        iterations++;
      }

      return guess;
    };

    // Find the correct monthly installment
    const baseMonthlyInstallment = findCorrectMonthlyInstallment();
    
    // Create a mock property object for the calculator
    const mockProperty: Property = {
      id: "test",
      cost: costValue,
      currency: "PEN",
      property_insurance: propertyInsuranceValue,
      property_insurance_type: "manual",
      bonus: 0
    }

    // Create base values for calculation
    const baseValues = {
      property_id: "test",
      down_payment: downPaymentValue,
      down_payment_percentage: (downPaymentValue / costValue) * 100,
      interest_rate: interestRateValue,
      term_years: termYearsValue,
      installments_per_year: installmentsPerYearValue as 12 | 14,
      first_installment_date: firstInstallmentDate,
      loan_protection_type: loanProtectionType as "individual" | "joint" | "none" | "custom",
      loan_protection_insurance: loanProtectionValue
    }

    // Calculate results using the loan calculator service
    const results = loanCalculator.calculateResults(mockProperty, baseValues)

    // Update output states
    setInstallmentAmount(results.base_monthly_payment)
    setTotalInterestAndPayments(results.total_interest_and_insurance)
    setTotalMonths(results.total_months)
    setMonthlyPayment(results.monthly_payment)
    setMonthlyRate(calculatedMonthlyRate * 100)

    // Calculate payment schedule with the goal-seeked monthly installment
    const generatePaymentSchedule = () => {
      const rows: PaymentScheduleRow[] = [];
      let currentDate = new Date(firstInstallmentDate);
      let beginBalance = Number((costValue - downPaymentValue).toFixed(10));
      const monthlyRate = calculatedMonthlyRate;
      const baseMonthlyInstallment = results.base_monthly_payment;

      for (let i = 0; i < totalMonths; i++) {
        const currentMonth = currentDate.getMonth();
        const isDoublePaymentMonth = installmentsPerYear === "14" && (currentMonth === 6 || currentMonth === 11);
        const monthlyInstallment = isDoublePaymentMonth ? baseMonthlyInstallment * 2 : baseMonthlyInstallment;
        
        // Insurance amounts
        const currentPropertyInsurance = isDoublePaymentMonth ? propertyInsuranceValue * 2 : propertyInsuranceValue;
        const currentLoanProtection = isDoublePaymentMonth ? loanProtectionValue * 2 : loanProtectionValue;
        const monthlyPaymentAmount = monthlyInstallment + currentPropertyInsurance + currentLoanProtection;
        
        const interest = Number((beginBalance * monthlyRate).toFixed(10));
        const principal = Number((monthlyInstallment - interest).toFixed(10));
        const endBalance = i === totalMonths - 1 ? 0 : Number((beginBalance - principal).toFixed(10));
        
        rows.push({
          row: i + 1,
          date: new Date(currentDate),
          monthlyPayment: Number(monthlyPaymentAmount.toFixed(10)),
          monthlyInstallment: Number(monthlyInstallment.toFixed(10)),
          interestAndPayments: Number((interest + monthlyInstallment).toFixed(10)),
          principal: Number(principal.toFixed(10)),
          interest: Number(interest.toFixed(10)),
          beginBalance: Number(beginBalance.toFixed(10)),
          endBalance: endBalance
        });

        beginBalance = endBalance;
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      setPaymentSchedule(rows);
    };

    generatePaymentSchedule();
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
            <Label htmlFor="loanProtection">Loan Protection</Label>
            <Input
              id="loanProtection"
              type="number"
              value={loanProtection}
              onChange={(e) => setLoanProtection(e.target.value)}
              placeholder="Enter loan protection amount"
            />
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
            <Label>Installments per Year</Label>
            <Select value={installmentsPerYear} onValueChange={setInstallmentsPerYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">Simple (12)</SelectItem>
                <SelectItem value="14">Double (14)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>First Installment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
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
                  onSelect={(date) => date && setFirstInstallmentDate(date)}
                  disabled={(date) =>
                    date < new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Loan Protection Type</Label>
            <Select value={loanProtectionType} onValueChange={setLoanProtectionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="joint">Joint</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Outputs Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Outputs</h2>
          
          <div className="space-y-4 p-6 border rounded-lg">
            <div>
              <Label className="text-muted-foreground">Monthly Interest Rate (%)</Label>
              <div className="text-2xl font-bold">
                {monthlyRate.toFixed(4)}%
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Base Installment Amount</Label>
              <div className="text-2xl font-bold">
                {formatCurrency(installmentAmount, "PEN")}
              </div>
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
              <div className="text-2xl font-bold">
                {formatCurrency(monthlyPayment, "PEN")}
              </div>
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
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Monthly Installment</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Interest + Monthly Payments</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Principal</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Interest</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">Begin Balance</th>
                <th className="border p-2 text-left text-xs font-medium text-gray-600">End Balance</th>
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
                  <td className="border p-2">{formatCurrency(row.monthlyInstallment, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.interestAndPayments, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.principal, "PEN")}</td>
                  <td className="border p-2">{formatCurrency(row.interest, "PEN")}</td>
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