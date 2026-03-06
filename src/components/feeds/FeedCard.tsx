import Link from "next/link"

interface FeedCardProps {
  id: string
  name: string
  description: string | null
  ownerUsername: string
  subscriptionPriceUsd: string
  isPublic: boolean
}

export function FeedCard({ id, name, description, ownerUsername, subscriptionPriceUsd, isPublic }: FeedCardProps) {
  const price = Number(subscriptionPriceUsd)
  return (
    <Link href={`/feed/${id}`} className="block rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-colors">
      <h3 className="font-semibold text-lg">{name}</h3>
      {description && <p className="text-gray-600 text-sm mt-1 line-clamp-2">{description}</p>}
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-gray-500">by {ownerUsername}</span>
        <span className={price > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
          {price > 0 ? `$${price}/mo` : "Free"}
        </span>
      </div>
    </Link>
  )
}
