import { ConnectStripeButton } from "@/components/payments/ConnectStripeButton"

export default function StripeConnectPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <h1 className="text-2xl font-bold mb-4">Connect Your Stripe Account</h1>
      <p className="text-gray-600 mb-6">
        To receive payments from subscribers, you need to connect a Stripe account.
        This allows us to send you 95% of all subscription revenue directly.
      </p>
      <ConnectStripeButton />
    </div>
  )
}
