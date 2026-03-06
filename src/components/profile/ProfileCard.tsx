interface ProfileCardProps {
  displayName: string
  username: string
  avatarUrl: string | null
  feedCount: number
  videoCount: number
}

export function ProfileCard({ displayName, username, avatarUrl, feedCount, videoCount }: ProfileCardProps) {
  return (
    <div className="flex items-start gap-4 p-6">
      <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-gray-500">@{username}</p>
        <div className="flex gap-4 mt-2 text-sm text-gray-600">
          <span>{feedCount} feed{feedCount !== 1 ? "s" : ""}</span>
          <span>{videoCount} video{videoCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  )
}
