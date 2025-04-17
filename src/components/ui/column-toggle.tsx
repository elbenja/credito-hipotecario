import * as React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Columns2, ChevronDown, Check } from "lucide-react"
import { ColumnDef, Table } from "@tanstack/react-table"

interface ColumnToggleProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  table: Table<TData>
}

export function ColumnToggle<TData, TValue>({
  columns,
  table,
}: ColumnToggleProps<TData, TValue>) {
  const allColumns = table.getAllColumns().filter(
    column => column.getCanHide() && 
    column.id !== 'drag_handle' && 
    column.id !== 'row_actions'
  )
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto flex gap-2">
          <Columns2 className="h-4 w-4" />
          <span className="hidden lg:inline">Customize Columns</span>
          <span className="lg:hidden">Columns</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel className="text-center font-semibold">Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {allColumns.map((column) => {
            const isVisible = column.getIsVisible()
            
            return (
              <DropdownMenuItem
                key={column.id}
                className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                onClick={() => column.toggleVisibility(!isVisible)}
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-sm border mr-2">
                  {isVisible ? <Check className="h-3 w-3" /> : null}
                </div>
                <span>
                  {column.columnDef.header?.toString() || 
                    column.id.charAt(0).toUpperCase() + 
                    column.id.slice(1).replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ')}
                </span>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 