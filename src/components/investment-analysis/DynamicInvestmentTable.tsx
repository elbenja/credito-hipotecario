import { useMemo } from 'react';
import { useInvestmentAnalysisStore } from '@/store/investmentAnalysis';
import { formatCurrency } from '@/utils/utils';
import { formatDate } from '@/utils/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Plus, Minus } from 'lucide-react';
import { ColumnManager } from '@/components/investment-analysis/ColumnManager';
import { TableControls } from '@/components/investment-analysis/TableControls';

interface Column {
  id: string;
  label: string;
  type: 'currency' | 'percentage' | 'date' | 'number';
  category: 'time' | 'income' | 'expense' | 'equity' | 'summary';
  getValue: (result: any) => number | string | Date;
}

const defaultColumns: Column[] = [
  {
    id: 'date',
    label: 'Month',
    type: 'date',
    category: 'time',
    getValue: (result) => result.date
  },
  {
    id: 'totalIncome',
    label: 'Total Income',
    type: 'currency',
    category: 'income',
    getValue: (result) => result.totalIncome
  },
  {
    id: 'totalExpenses',
    label: 'Total Expenses',
    type: 'currency',
    category: 'expense',
    getValue: (result) => result.totalExpenses
  },
  {
    id: 'totalEquity',
    label: 'Monthly Equity',
    type: 'currency',
    category: 'equity',
    getValue: (result) => result.totalEquity
  },
  {
    id: 'netCashFlow',
    label: 'Net Cash Flow',
    type: 'currency',
    category: 'summary',
    getValue: (result) => result.netCashFlow
  },
  {
    id: 'accumulatedEquity',
    label: 'Accumulated Equity',
    type: 'currency',
    category: 'equity',
    getValue: (result) => result.accumulatedEquity
  },
  {
    id: 'propertyValue',
    label: 'Property Value',
    type: 'currency',
    category: 'equity',
    getValue: (result) => result.propertyValue
  },
  {
    id: 'equityPercentage',
    label: 'Equity %',
    type: 'percentage',
    category: 'equity',
    getValue: (result) => result.equityPercentage
  }
];

export function DynamicInvestmentTable() {
  const {
    monthlyResults,
    visibleColumns,
    isTableExpanded,
    selectedTimeRange,
    isCalculating,
    activeCalculations,
    setTableExpanded,
    getFilteredResults,
    getSummaryMetrics
  } = useInvestmentAnalysisStore();

  // Filter results based on time range
  const filteredResults = useMemo(() => {
    if (selectedTimeRange) {
      return getFilteredResults(selectedTimeRange.start, selectedTimeRange.end);
    }
    return monthlyResults;
  }, [monthlyResults, selectedTimeRange, getFilteredResults]);

  // Get visible column definitions
  const visibleColumnDefs = useMemo(() => {
    return defaultColumns.filter(col => visibleColumns.includes(col.id));
  }, [visibleColumns]);

  // Format cell value based on column type
  const formatCellValue = (value: any, column: Column, currency = 'PEN' as 'USD' | 'PEN') => {
    switch (column.type) {
      case 'currency':
        return formatCurrency(value || 0, currency);
      case 'percentage':
        return `${(value || 0).toFixed(2)}%`;
      case 'date':
        return formatDate(value);
      case 'number':
        return (value || 0).toLocaleString();
      default:
        return value?.toString() || '';
    }
  };

  // Show limited rows when collapsed
  const displayResults = useMemo(() => {
    if (isTableExpanded) return filteredResults;
    return filteredResults.slice(0, 12); // Show first 12 months when collapsed
  }, [filteredResults, isTableExpanded]);

  const summaryMetrics = getSummaryMetrics();

  if (activeCalculations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoreHorizontal className="w-5 h-5" />
            Investment Analysis Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a property or mortgage to see investment analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MoreHorizontal className="w-5 h-5" />
            Investment Analysis Table
            {isCalculating && (
              <Badge variant="secondary" className="ml-2">
                Calculating...
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <ColumnManager columns={defaultColumns} />
            <TableControls />
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Income</div>
            <div className="font-semibold text-green-600">
              {formatCurrency(summaryMetrics.totalIncome, 'PEN')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="font-semibold text-red-600">
              {formatCurrency(summaryMetrics.totalExpenses, 'PEN')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Equity</div>
            <div className="font-semibold text-blue-600">
              {formatCurrency(summaryMetrics.totalEquity, 'PEN')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Net Cash Flow</div>
            <div className={`font-semibold ${summaryMetrics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summaryMetrics.netCashFlow, 'PEN')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Property Value</div>
            <div className="font-semibold text-indigo-600">
              {formatCurrency(summaryMetrics.finalPropertyValue, 'PEN')}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumnDefs.map((column) => (
                  <TableHead key={column.id} className="text-center">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayResults.map((result, index) => (
                <TableRow key={index}>
                  {visibleColumnDefs.map((column) => {
                    const value = column.getValue(result);
                    return (
                      <TableCell key={column.id} className="text-center">
                        {formatCellValue(value, column)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Expand/Collapse Button */}
        {filteredResults.length > 12 && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setTableExpanded(!isTableExpanded)}
              className="flex items-center gap-2"
            >
              {isTableExpanded ? (
                <>
                  <Minus className="w-4 h-4" />
                  Show Less ({displayResults.length} of {filteredResults.length} months)
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Show All ({filteredResults.length} months)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results Info */}
        <div className="text-sm text-muted-foreground mt-4 text-center">
          Showing {displayResults.length} of {filteredResults.length} months
          {selectedTimeRange && (
            <span className="ml-2">
              (Filtered: {formatDate(selectedTimeRange.start)} - {formatDate(selectedTimeRange.end)})
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 