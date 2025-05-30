import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"

// Utility to extract thumbnail from YouTube URL
const getThumbnail = (url: string) => {
  const videoId = new URL(url).searchParams.get("v") || url.split("/").pop()?.split("?")[0]
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export default function YouTubeCard({ url, children }: { url: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const videoId = new URL(url).searchParams.get("v") || url.split("/").pop()?.split("?")[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition">
          <CardContent className="p-0">
            <img src={getThumbnail(url)} alt="YouTube Thumbnail" className="w-full rounded-t-md" />
      <div className="p-4 text-sm font-medium">{children}</div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full aspect-video p-0 overflow-hidden">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        ></iframe>
      </DialogContent>
    </Dialog>
  )
}