import { FeedCard } from "./FeedCard"

interface Feed {
  id: string
  name: string
  description: string | null
  subscription_price_usd: string
  is_public: boolean
  owner_username?: string
}

export function FeedList({ feeds, showOwner = true }: { feeds: Feed[]; showOwner?: boolean }) {
  if (feeds.length === 0) {
    return <p className="text-gray-500 text-center py-8">No feeds yet.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {feeds.map((feed) => (
        <FeedCard
          key={feed.id}
          id={feed.id}
          name={feed.name}
          description={feed.description}
          ownerUsername={feed.owner_username || "unknown"}
          subscriptionPriceUsd={feed.subscription_price_usd}
          isPublic={feed.is_public}
        />
      ))}
    </div>
  )
}
