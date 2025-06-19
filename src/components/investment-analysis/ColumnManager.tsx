import { useState } from 'react';
import { useInvestmentAnalysisStore } from '@/store/investmentAnalysis';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Settings2, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Column {
  id: string;
  label: string;
  type: 'currency' | 'percentage' | 'date' | 'number';
  category: 'time' | 'income' | 'expense' | 'equity' | 'summary';
  getValue: (result: any) => number | string | Date;
}

interface ColumnManagerProps {
  columns: Column[];
}

const categoryLabels = {
  time: 'Time & Date',
  income: 'Income Sources',
  expense: 'Expense Sources',
  equity: 'Equity Sources',
  summary: 'Summary Metrics'
};

const categoryColors = {
  time: 'text-gray-600',
  income: 'text-green-600',
  expense: 'text-red-600',
  equity: 'text-blue-600',
  summary: 'text-purple-600'
};

export function ColumnManager({ columns }: ColumnManagerProps) {
  const { visibleColumns, toggleColumn, setVisibleColumns } = useInvestmentAnalysisStore();
  const [isOpen, setIsOpen] = useState(false);

  // Group columns by category
  const columnsByCategory = columns.reduce((acc, column) => {
    if (!acc[column.category]) {
      acc[column.category] = [];
    }
    acc[column.category].push(column);
    return acc;
  }, {} as Record<string, Column[]>);

  const handleSelectAll = () => {
    setVisibleColumns(columns.map(col => col.id));
  };

  const handleSelectNone = () => {
    setVisibleColumns(['date']); // Always keep date column
  };

  const handleSelectByCategory = (category: string) => {
    const categoryColumnIds = columnsByCategory[category]?.map(col => col.id) || [];
    const otherVisibleColumns = visibleColumns.filter(
      colId => !categoryColumnIds.includes(colId)
    );
    setVisibleColumns([...otherVisibleColumns, ...categoryColumnIds]);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Columns ({visibleColumns.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Manage Columns</h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                None
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(columnsByCategory).map(([category, categoryColumns]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={`text-sm font-medium ${categoryColors[category as keyof typeof categoryColors]}`}>
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectByCategory(category)}
                    className="h-6 px-2 text-xs"
                  >
                    <Filter className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="space-y-2 pl-2">
                  {categoryColumns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={visibleColumns.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id)}
                        disabled={column.id === 'date'} // Always keep date column
                      />
                      <Label
                        htmlFor={column.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Select columns to display in the investment analysis table. 
              The date column is always visible.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 