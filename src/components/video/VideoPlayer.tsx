"use client"

interface VideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string | null
  title?: string
}

export function VideoPlayer({ videoUrl, thumbnailUrl, title }: VideoPlayerProps) {
  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        controls
        className="w-full h-full"
        title={title}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
