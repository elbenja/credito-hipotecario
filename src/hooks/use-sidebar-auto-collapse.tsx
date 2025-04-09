import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"

const SIDEBAR_AUTOCOLLAPSE_BREAKPOINT = 1320

export function useSidebarAutoCollapse() {
  const { setOpen } = useSidebar()
  const [prevWidth, setPrevWidth] = React.useState(window.innerWidth)

  React.useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth
      // Only collapse if we're crossing the breakpoint while resizing
      if (prevWidth >= SIDEBAR_AUTOCOLLAPSE_BREAKPOINT && currentWidth < SIDEBAR_AUTOCOLLAPSE_BREAKPOINT) {
        setOpen(false)
      } else if (prevWidth < SIDEBAR_AUTOCOLLAPSE_BREAKPOINT && currentWidth >= SIDEBAR_AUTOCOLLAPSE_BREAKPOINT) {
        setOpen(true)
      }
      setPrevWidth(currentWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [prevWidth, setOpen])
} 