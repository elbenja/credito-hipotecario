import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/utils";

interface TabSwitchProps {
  id: string;
  options: string[];
  defaultValue?: string;
  value?: string;
  onCheckedChange?: (value: string) => void;
  className?: string;
}

export const TabSwitch: React.FC<TabSwitchProps> = ({
  id,
  options,
  defaultValue,
  value,
  onCheckedChange,
  className,
}) => {
  const [selected, setSelected] = useState(defaultValue || options[0]);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep internal state in sync with defaultValue if it changes
  useEffect(() => {
    if (defaultValue && options.includes(defaultValue)) {
      setSelected(defaultValue);
    }
  }, [defaultValue, options]);

  // Use controlled value if provided and valid
  const current = value && options.includes(value) ? value : selected;

  const handleSelect = (val: string, idx: number) => {
    setSelected(val);
    onCheckedChange?.(val);
    btnRefs.current[idx]?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      let nextIdx = idx + (e.key === "ArrowRight" ? 1 : -1);
      if (nextIdx < 0) nextIdx = options.length - 1;
      if (nextIdx >= options.length) nextIdx = 0;
      btnRefs.current[nextIdx]?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(options[idx], idx);
    }
  };

  return (
    <div
      id={id}
      role="tablist"
      aria-label={id}
      className={cn(
        "inline-flex  items-center justify-center rounded-md bg-muted p-1 gap-1 w-full text-muted-foreground",
        className
      )}
    >
      {options.map((option, idx) => (
        <button
          key={option}
          ref={el => (btnRefs.current[idx] = el)}
          role="tab"
          aria-selected={current === option}
          tabIndex={current === option ? 0 : -1}
          className={cn(
            "inline-flex w-full items-center justify-center whitespace-nowrap rounded-sm px-0 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            current === option
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
            idx === 0 && "rounded-l-md",
            idx === options.length - 1 && "rounded-r-md"
          )}
          onClick={() => handleSelect(option, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}; 