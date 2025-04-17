import React, { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
  VisibilityState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ColumnToggle } from "@/components/ui/column-toggle"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  className?: string
  onReorder?: (reorderedData: TData[]) => void
}

export function DataTable<TData extends { id: string }, TValue>({
  columns,
  data,
  onRowClick,
  className,
  onReorder,
}: DataTableProps<TData, TValue>) {
  // Define hooks at the top level, not conditionally
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  // Always create the table config object
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  // Handle row drop for reordering
  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetRowId: string) => {
    e.preventDefault();
    console.log("Drop event triggered on row:", targetRowId);
    
    try {
      // Get the dragged mortgage ID from dataTransfer
      const draggedMortgageId = e.dataTransfer.getData('text/plain');
      console.log("Dragged mortgage ID from dataTransfer:", draggedMortgageId);
      
      if (!draggedMortgageId) {
        console.log("Invalid drag operation - empty ID");
        return;
      }
      
      // Find the actual row objects from the table
      const tableRows = table.getRowModel().rows;
      const draggedRow = tableRows.find(row => row.original.id === draggedMortgageId);
      const targetRow = tableRows.find(row => row.id === targetRowId);
      
      if (!draggedRow || !targetRow) {
        console.log("Could not find rows in table", {draggedRow, targetRow});
        return;
      }
      
      console.log("Dragged row:", draggedRow.original);
      console.log("Target row:", targetRow.original);
      
      // Find indexes in the original data array
      const draggedIndex = data.findIndex(item => item.id === draggedMortgageId);
      const targetIndex = data.findIndex(item => item.id === targetRow.original.id);
      
      console.log("Data array indexes - Dragged index:", draggedIndex, "Target index:", targetIndex);
      
      if (draggedIndex < 0 || targetIndex < 0) {
        console.log("Could not find row indexes in data array");
        return;
      }
      
      if (draggedIndex === targetIndex) {
        console.log("Same position, no reordering needed");
        return;
      }
      
      // Create a new array with the reordered data
      const newData = [...data];
      const [movedItem] = newData.splice(draggedIndex, 1);
      newData.splice(targetIndex, 0, movedItem);
      
      // Print the ID before and after reordering to verify the change
      console.log("Data before reordering:", data.map(item => item.id));
      console.log("Data after reordering:", newData.map(item => item.id));
      
      // If onReorder callback is provided, call it with the new order
      if (onReorder) {
        console.log("Calling onReorder callback");
        onReorder(newData);
      } else {
        console.log("No onReorder callback provided");
      }
    } catch (error) {
      console.error("Error in drop handler:", error);
    } finally {
      // Reset drag over state
      setDragOverRowId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ColumnToggle table={table} columns={columns} />
      </div>
      <div 
        className={cn("rounded-md border", className)}
        onDragOver={(e) => {
          // Allow drops on the entire table
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          console.log("Drag over table container");
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    dragOverRowId === row.id ? "bg-muted/70 border-t-2 border-primary" : "",
                    "group" // Add group class for styling
                  )}
                  // Remove onClick from the row - we'll put it on cells instead
                  draggable={false}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Stop propagation to prevent bubbling
                    e.dataTransfer.dropEffect = 'move';
                    console.log("Drag over row:", row.id);
                    setDragOverRowId(row.id);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    console.log("Drag enter row:", row.id);
                    setDragOverRowId(row.id);
                  }}
                  onDragLeave={(e) => {
                    // Only clear if we're actually leaving this row (not entering a child)
                    if (dragOverRowId === row.id) {
                      console.log("Drag leave row:", row.id);
                      // Use setTimeout to avoid flickering when moving between cells
                      setTimeout(() => {
                        if (dragOverRowId === row.id) {
                          setDragOverRowId(null);
                        }
                      }, 50);
                    }
                  }}
                  onDrop={(e) => {
                    console.log("Drop triggered on row");
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(e, row.id);
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    // Check if this is the drag handle column
                    const isDragHandleColumn = cellIndex === 0; 
                    
                    return (
                      <TableCell 
                        key={cell.id}
                        className={cn(
                          !isDragHandleColumn && onRowClick ? "cursor-pointer hover:bg-muted/50" : "",
                          isDragHandleColumn ? "drag-handle-cell" : ""
                        )}
                        // Only attach click handler to non-drag-handle cells
                        onClick={(e) => {
                          if (!isDragHandleColumn && onRowClick) {
                            // Only navigate if we click on a non-drag-handle cell
                            onRowClick(row.original);
                          }
                        }}
                        onDragOver={(e) => e.stopPropagation()}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 