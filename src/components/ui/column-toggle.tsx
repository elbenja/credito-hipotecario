import * as React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Columns2, ChevronDown, Check } from "lucide-react"
import { ColumnDef, Table, Column } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { useEffect, useMemo, useCallback } from "react"

interface ColumnToggleProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  table: Table<TData>
  storageKey?: string
}

export function ColumnToggle<TData, TValue>({
  columns,
  table,
  storageKey = "tableColumnVisibility",
}: ColumnToggleProps<TData, TValue>) {
  const { t } = useTranslation('components')
  const { t: tMortgages } = useTranslation('mortgages')
  
  // Memoize the filterable columns to prevent recalculation on each render
  const allColumns = useMemo(() => (
    table.getAllColumns().filter(
      column => column.getCanHide() && 
      column.id !== 'drag_handle' && 
      column.id !== 'row_actions' &&
      // Safe check for isHidden flag in meta
      !(column.columnDef.meta && 
        typeof column.columnDef.meta === 'object' && 
        'isHidden' in column.columnDef.meta && 
        column.columnDef.meta.isHidden)
    )
  ), [table]);
  
  // Load saved column visibility on mount only
  useEffect(() => {
    const savedVisibility = localStorage.getItem(storageKey)
    
    if (savedVisibility) {
      try {
        const parsedVisibility = JSON.parse(savedVisibility)
        
        // Initialize visibility state once on component mount
        table.setColumnVisibility(prevState => {
          const newState = {...prevState};
          
          // Only apply saved states, don't modify existing ones if not found in saved state
          Object.entries(parsedVisibility).forEach(([columnId, isVisible]) => {
            newState[columnId] = Boolean(isVisible);
          });
          
          return newState;
        });
      } catch (error) {
        console.error("Failed to parse saved column visibility", error)
      }
    }
  }, [storageKey, table]);
  
  // Save visibility state when it changes, memoize to prevent recreation on each render
  const saveColumnVisibility = useCallback((columnId: string, isVisible: boolean) => {
    try {
      const savedVisibility = localStorage.getItem(storageKey) || "{}"
      const parsedVisibility = JSON.parse(savedVisibility)
      
      // Update visibility for this column
      parsedVisibility[columnId] = isVisible
      
      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(parsedVisibility))
      
    } catch (error) {
      console.error("Failed to save column visibility", error)
    }
  }, [storageKey]);
  
  // Memoize the getColumnName function to prevent recreation on each render
  const getColumnName = useCallback((column: any) => {
    if (typeof column.columnDef.header === 'function') {
      // Get the original function's string representation
      const headerStr = column.columnDef.header.toString()
      
      // Check if it's a translation call
      const translationMatch = headerStr.match(/tMortgages\('([^']+)'\)/)
      if (translationMatch) {
        // Get the translation key and remove 'short_' prefix if it exists
        const translationKey = translationMatch[1].replace('short_', '')
        // Use the mortgages translation with the modified key
        return tMortgages(translationKey)
      }
      
      // If it's not a translation call, try to get the column header as a string
      try {
        // Avoid re-execution of the header function if possible
        if (column.columnDef.meta && column.columnDef.meta.cachedHeader) {
          return column.columnDef.meta.cachedHeader;
        }
        
        const result = column.columnDef.header(column)
        // If the result is a React element, try to get its text content
        if (result && typeof result === 'object' && 'props' in result) {
          return result.props.children
        }
        return result
      } catch (e) {
        // Fallback if header function fails
        return column.id
      }
    }
    if (column.columnDef.header) {
      return column.columnDef.header
    }
    // Fallback to formatted column ID if no header is provided
    return column.id.charAt(0).toUpperCase() + 
           column.id.slice(1).replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ')
  }, [tMortgages]);

  // Handle visibility toggle with a memoized function
  const handleToggleVisibility = useCallback((column: Column<TData, unknown>, isCurrentlyVisible: boolean) => {
    column.toggleVisibility(!isCurrentlyVisible);
    saveColumnVisibility(column.id, !isCurrentlyVisible);
  }, [saveColumnVisibility]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto flex gap-2">
          <Columns2 className="h-4 w-4" />
          <span className="hidden lg:inline">{t('column_toggle.customize_columns')}</span>
          <span className="lg:hidden">{t('column_toggle.columns')}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {allColumns.map((column) => {
            const isVisible = column.getIsVisible()
            
            return (
              <DropdownMenuItem
                key={column.id}
                className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleVisibility(column, isVisible);
                }}
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-sm border mr-2">
                  {isVisible ? <Check className="h-3 w-3" /> : null}
                </div>
                <span className="line-clamp-1">
                  {getColumnName(column)}
                </span>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 