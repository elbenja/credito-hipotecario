import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PopExpense } from "./PopExpense";
import { Trash2 } from "lucide-react";

interface ExpensesGroupProps {
  name: string;
  viewPeriod: boolean;
  viewRelation: boolean;
  suggestedNames?: string[];
}

export const ExpensesGroup: React.FC<ExpensesGroupProps> = ({ name, viewPeriod, viewRelation, suggestedNames = [] }) => {
  const [expenses, setExpenses] = useState<{
    name: string;
    amount: string;
    period: string;
    relation: string;
  }[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editExpense, setEditExpense] = useState<{ name: string; amount: string; period: string; relation: string } | null>(null);

  const handleAddClick = () => {
    setEditingIdx(null);
    setEditExpense(null);
    setShowPopover(true);
  };

  const handleEditExpense = (idx: number) => {
    setEditingIdx(idx);
    setEditExpense(expenses[idx]);
    setShowPopover(true);
  };

  const handleAddOrEditExpense = (expense: { name: string; amount: string; period: string; relation: string }) => {
    if (editingIdx !== null) {
      setExpenses(expenses.map((e, i) => (i === editingIdx ? expense : e)));
    } else {
      setExpenses([...expenses, expense]);
    }
    setShowPopover(false);
    setEditingIdx(null);
    setEditExpense(null);
  };

  const handleDeleteExpense = (idx: number) => {
    setExpenses(expenses.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-4">
      <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <div className="flex items-center justify-between w-full">
              <span className="truncate mr-2">{name}</span>
              <span className="font-medium">
                Total S/. {expenses.reduce((acc, exp) => {
                  const amt = parseFloat(exp.amount) || 0;
                  return acc + (exp.period === "Annually" ? amt / 12 : amt);
                }, 0).toFixed(2)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="gap-4">
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
                  <tr key={idx} className="cursor-pointer" onClick={() => handleEditExpense(idx)}>
                    <td className="border px-2 py-1">{exp.name}</td>
                    <td className="border px-2 py-1">
                      {exp.period === "Annually"
                        ? (parseFloat(exp.amount) / 12).toFixed(2)
                        : parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="border px-2 py-1">{exp.period}</td>
                    <td className="border px-2 py-1">{exp.relation}</td>
                    <td className="border px-2 py-1" onClick={e => { e.stopPropagation(); handleDeleteExpense(idx); }}>
                      <button className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PopExpense
              title="Other Expense"
              suggestedNames={suggestedNames}
              viewPeriod={viewPeriod}
              viewRelation={viewRelation}
              onConfirm={handleAddOrEditExpense}
              open={showPopover}
              onOpenChange={open => {
                setShowPopover(open);
                if (!open) {
                  setEditingIdx(null);
                  setEditExpense(null);
                }
              }}
              initialValues={editExpense}
            />
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAddClick}>
              Add Expense
            </button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}; 