import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { TabSwitch } from "@/components/Rentals/TabSwitch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface PopExpenseProps {
  title: string;
  suggestedNames?: string[];
  viewPeriod: boolean;
  viewRelation: boolean;
  onConfirm: (values: { name: string; amount: string; period: string; relation: string }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: { name: string; amount: string; period: string; relation: string } | null;
  trigger?: React.ReactNode;
}

export const PopExpense: React.FC<PopExpenseProps> = ({
  title,
  suggestedNames = [],
  viewPeriod,
  viewRelation,
  onConfirm,
  open,
  onOpenChange,
  initialValues = null,
  trigger,
}) => {
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(
    !suggestedNames || suggestedNames.length === 0 || suggestedNames.length === 1
  );
  const [periodTab, setPeriodTab] = useState("Monthly");
  const [relationTab, setRelationTab] = useState("Fixed");
  const [amount, setAmount] = useState("");
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");

  React.useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setAmount(initialValues.amount);
      setPeriodTab(initialValues.period);
      setRelationTab(initialValues.relation);
      setShowNameInput(true);
    } else if (suggestedNames && suggestedNames.length === 1) {
      setName(suggestedNames[0]);
      setShowNameInput(true);
    } else if (open && suggestedNames && suggestedNames.length > 1) {
      setShowNameInput(false);
      setName("");
      setAmount("");
      setPeriodTab("Monthly");
      setRelationTab("Fixed");
    }
  }, [initialValues, suggestedNames, open]);

  const handleSelect = (val: string) => {
    setShowNameInput(true);
    setName(val === "__other__" ? "" : val);
  };

  const validate = () => {
    let valid = true;
    if (!name || name.trim().length < 1) {
      setNameError("Name is required");
      valid = false;
    } else {
      setNameError("");
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setAmountError("Amount must be a number with up to 2 decimals");
      valid = false;
    } else {
      setAmountError("");
    }
    return valid;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm({
      name,
      amount,
      period: viewPeriod ? periodTab : "Monthly",
      relation: viewRelation ? relationTab : "Fixed",
    });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent>
        <div className="flex flex-col gap-2">
          <div className="font-bold text-lg">{title}</div>
          {/* Select for suggested names if more than one and not editing */}
          {(!initialValues && suggestedNames && suggestedNames.length > 1 && !showNameInput) && (
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="suggested-name">Suggested Name</Label>
              <select
                id="suggested-name"
                className="input"
                defaultValue=""
                onChange={e => {
                  if (e.target.value === "") return;
                  handleSelect(e.target.value);
                }}
              >
                <option value="">-- Select --</option>
                {suggestedNames.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
                <option value="__other__">Other</option>
              </select>
            </div>
          )}
          {/* Name input */}
          {showNameInput && (
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              {nameError && <span className="text-red-500 text-xs">{nameError}</span>}
            </div>
          )}
          {/* Amount input */}
          <div className="grid w-full max-w-sm items-center gap-3">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            {amountError && <span className="text-red-500 text-xs">{amountError}</span>}
          </div>
          {viewPeriod && (
            <TabSwitch
              id="period"
              options={["Monthly", "Annually"]}
              defaultValue="Monthly"
              value={periodTab}
              onCheckedChange={setPeriodTab}
            />
          )}
          {viewRelation && (
            <TabSwitch
              id="relation"
              options={["Fixed", "Rent Percentage"]}
              defaultValue="Fixed"
              value={relationTab}
              onCheckedChange={setRelationTab}
            />
          )}
          <Button className="mt-2" onClick={handleConfirm}>Confirm</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}; 