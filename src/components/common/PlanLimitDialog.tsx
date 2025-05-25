import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import SVGillustration from "@/components/ui/SVGillustration"
import { useNavigate } from "react-router-dom"
//   import Image from "next/image"
//   import astronaut from "@/assets/astronaut.png"
  
interface PlanLimitDialogProps {
  open: boolean
  onClose: () => void
  onUpgrade?: () => void
}

export function PlanLimitDialog({ open, onClose, onUpgrade }: PlanLimitDialogProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/account');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">
              {/* ¡oh no! */}

          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col justify-center mt-4">
          <p className=" w-full text-center text-6xl font-black -mb-4">¡oh no!</p>
        <SVGillustration variant="astroGirl" className="size-80" />
        </div>
        <DialogDescription className="text-lg font-medium mt-4">
          You need more space
        </DialogDescription>
        <p className="text-sm text-muted-foreground mb-6">
          Upgrade your plan to unlock more properties and mortgages!
        </p>
        <DialogFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={handleUpgrade}>
            Review my Account            
          </Button>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
  