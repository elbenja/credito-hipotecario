import { useState } from 'react';
import { useInvestmentAnalysisStore } from '@/store/investmentAnalysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar, Filter, Download, X } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';

export function TableControls() {
  const {
    selectedTimeRange,
    monthlyResults,
    setSelectedTimeRange,
    propertyAnnualAppreciation,
    setPropertyAnnualAppreciation
  } = useInvestmentAnalysisStore();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    selectedTimeRange?.start ? selectedTimeRange.start.toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    selectedTimeRange?.end ? selectedTimeRange.end.toISOString().split('T')[0] : ''
  );

  const handleApplyFilter = () => {
    if (startDate && endDate) {
      setSelectedTimeRange({
        start: new Date(startDate),
        end: new Date(endDate)
      });
    }
    setIsFilterOpen(false);
  };

  const handleClearFilter = () => {
    setSelectedTimeRange(null);
    setStartDate('');
    setEndDate('');
    setIsFilterOpen(false);
  };

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Export functionality coming soon');
  };

  const getDateRange = () => {
    if (monthlyResults.length === 0) return null;
    
    const firstDate = monthlyResults[0].date;
    const lastDate = monthlyResults[monthlyResults.length - 1].date;
    
    return {
      min: new Date(firstDate).toISOString().split('T')[0],
      max: new Date(lastDate).toISOString().split('T')[0]
    };
  };

  const dateRange = getDateRange();

  return (
    <div className="flex items-center gap-2">
      {/* Time Range Filter */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {selectedTimeRange ? (
              <>
                Filter: {formatDate(selectedTimeRange.start)} - {formatDate(selectedTimeRange.end)}
              </>
            ) : (
              'Date Filter'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by Date Range</h4>
              {selectedTimeRange && (
                <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={dateRange?.min}
                  max={dateRange?.max}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || dateRange?.min}
                  max={dateRange?.max}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApplyFilter} disabled={!startDate || !endDate}>
                Apply Filter
              </Button>
              <Button variant="outline" onClick={handleClearFilter}>
                Clear
              </Button>
            </div>

            {dateRange && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Available range: {formatDate(new Date(dateRange.min))} - {formatDate(new Date(dateRange.max))}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Appreciation Rate Control */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Appreciation: {propertyAnnualAppreciation}%
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Property Annual Appreciation</h4>
              <p className="text-sm text-muted-foreground">
                Adjust the annual appreciation rate for property value calculations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appreciation-rate">Annual Rate (%)</Label>
              <Input
                id="appreciation-rate"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={propertyAnnualAppreciation}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  if (value >= 0 && value <= 20) {
                    setPropertyAnnualAppreciation(value);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Range: 0% - 20% annually
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Export Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExport}
        className="flex items-center gap-2"
        disabled={monthlyResults.length === 0}
      >
        <Download className="w-4 h-4" />
        Export
      </Button>
    </div>
  );
} 