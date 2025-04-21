import * as React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Columns2, ChevronDown, Check } from "lucide-react"
import { ColumnDef, Table } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"

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
  const allColumns = table.getAllColumns().filter(
    column => column.getCanHide() && 
    column.id !== 'drag_handle' && 
    column.id !== 'row_actions'
  )
  
  // Load saved column visibility on mount
  useEffect(() => {
    const savedVisibility = localStorage.getItem(storageKey)
    
    if (savedVisibility) {
      try {
        const parsedVisibility = JSON.parse(savedVisibility)
        
        // Apply saved visibility to columns
        allColumns.forEach(column => {
          if (parsedVisibility[column.id] !== undefined) {
            column.toggleVisibility(parsedVisibility[column.id])
          }
        })
      } catch (error) {
        console.error("Failed to parse saved column visibility", error)
      }
    }
  }, [allColumns, storageKey])
  
  // Save visibility state when it changes
  const saveColumnVisibility = (columnId: string, isVisible: boolean) => {
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
  }
  
  const getColumnName = (column: any) => {
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
      
      // If it's not a translation call, execute the header function
      const result = column.columnDef.header(column)
      // If the result is a React element, try to get its text content
      if (result && typeof result === 'object' && 'props' in result) {
        return result.props.children
      }
      return result
    }
    if (column.columnDef.header) {
      return column.columnDef.header
    }
    // Fallback to formatted column ID if no header is provided
    return column.id.charAt(0).toUpperCase() + 
           column.id.slice(1).replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ')
  }

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
        {/* <DropdownMenuLabel className="text-center font-semibold">{t('column_toggle.customize_columns')}</DropdownMenuLabel> */}
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {allColumns.map((column) => {
            const isVisible = column.getIsVisible()
            
            return (
              <DropdownMenuItem
                key={column.id}
                className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                onClick={() => {
                  column.toggleVisibility(!isVisible)
                  saveColumnVisibility(column.id, !isVisible)
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