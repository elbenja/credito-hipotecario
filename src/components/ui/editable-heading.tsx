
import { useState, useRef, useEffect } from "react"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditableHeadingProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function EditableHeading({ value, onChange, className }: EditableHeadingProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (inputValue.trim() !== value) {
      onChange(inputValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setInputValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-transparent w-full px-0 text-2xl font-bold border-none outline-none focus:ring-0 focus:border-none",
          className
        )}
      />
    )
  }

  return (
    <div 
      className={cn("group relative cursor-text", className)}
      onClick={() => setIsEditing(true)}
    >
      <h1 className="text-2xl font-bold">{value}</h1>
      <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 absolute -right-6 top-1/2 -translate-y-1/2 transition-opacity" />
    </div>
  )
}
