import { useState, useRef, useEffect, ElementType } from "react"
import { Pencil } from "lucide-react"
import { cn } from "@/utils/utils"

interface EditableHeadingProps {
  value: string
  onChange: (value: string) => void
  className?: string
  as?: ElementType
  size?: "default" | "sm" | "lg" | "breadcrumb"
}

export function EditableHeading({ 
  value, 
  onChange, 
  className,
  as: Component = "h1",
  size = "default" 
}: EditableHeadingProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setInputValue(value)
  }, [value])

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

  const sizeClasses = {
    default: "text-2xl font-bold",
    sm: "text-lg font-semibold",
    lg: "text-3xl font-bold",
    breadcrumb: "text-sm font-normal"
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
          "bg-transparent w-full px-0 border-none outline-none focus:ring-0 focus:border-none",
          sizeClasses[size],
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
      <Component className={cn(sizeClasses[size])}>
        {value}
      </Component>
      <Pencil className="w-4 h-4 text-foreground opacity-40 group-hover:opacity-100 absolute -right-6 top-1/2 -translate-y-1/2 transition-opacity" />
    </div>
  )
}
