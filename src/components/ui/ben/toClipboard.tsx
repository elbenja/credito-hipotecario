// components/ui/ButtonToClipboard.tsx

import React, { useState, useEffect, ReactNode, ButtonHTMLAttributes } from "react"
import { Check, Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

interface ButtonToClipboardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 
   * The text to copy.  
   * If you omit this, we'll try to stringify `children` (only works reliably if children is a string).
   */
  textToCopy?: string

  /**
   * Duration (in milliseconds) that "Copied!" stays visible before reverting.
   * Default: 2000 (2 seconds)
   */
  copyDuration?: number

  /**
   * The button's contents (normally just a short string, e.g. "20CREDITO" or "HELLO").
   * We'll display this when not in the "copied" state.
   */
  children: ReactNode
}

export function ButtonToClipboard({
  children,
  textToCopy,
  copyDuration = 2000,
  className = "",
  style,
  ...buttonProps
}: ButtonToClipboardProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation('global')

  // When copied === true, automatically reset back to false after `copyDuration` ms
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), copyDuration)
    return () => window.clearTimeout(id)
  }, [copied, copyDuration])

  const handleClick = async () => {
    // Determine what string to copy:
    let toCopy: string

    if (typeof textToCopy === "string") {
      toCopy = textToCopy
    } else if (typeof children === "string") {
      toCopy = children
    } else {
      // Fallback: JSON.stringify child if it's not a string (not ideal, but prevents a crash)
      toCopy = JSON.stringify(children)
    }

    try {
      await navigator.clipboard.writeText(toCopy)
      setCopied(true)
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  return (
    <button
      {...buttonProps}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center gap-2 
        ${copied ? "bg-white" : "bg-brand"} 
        ${className}
      `}
      style={style}
      type={buttonProps.type ?? "button"} // default to type="button"
    >
      {copied ? (
        <>
          <span className="font-semibold uppercase text-base">{t('ui.copied')}</span> 
          <Check className="w-4 h-4" />
        </>
      ) : (
        <>
          <span className="font-extrabold uppercase text-base">{children}</span>
          <Copy className="w-4 h-4" />
        </>
      )}
    </button>
  )
}