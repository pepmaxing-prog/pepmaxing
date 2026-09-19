export type PlanId = 'yearly' | 'monthly';

export type Plan = {
  id: PlanId;
  title: string;
  /** Localised price string exactly as the store reports it, e.g. "$39.99". */
  price: string;
  period: string;
  /** Monthly equivalent for annual plans, e.g. "$3.33 / mo". */
  perMonth?: string;
  /** What the same period would cost on the monthly plan, shown struck through. */
  compareAt?: string;
  badge?: string;
};

/**
 * True once a store integration (StoreKit via RevenueCat or expo-iap) is configured.
 * Until then the paywall renders placeholder plans and purchases fail fast.
 */
export const purchasesConfigured = false;

export class PurchasesNotConfiguredError extends Error {
  constructor() {
    super('Purchases are not configured yet.');
    this.name = 'PurchasesNotConfiguredError';
  }
}

/**
 * PLACEHOLDER pricing for layout only. Real prices must come from the store products so they are
 * localised and match App Store Connect; never ship these numbers.
 */
const PLACEHOLDER_PLANS: Plan[] = [
  { id: 'yearly', title: 'Yearly', price: '$39.99', period: 'billed annually', perMonth: '$3.33 / mo', compareAt: '$12.99', badge: 'Best deal' },
  { id: 'monthly', title: 'Monthly', price: '$12.99', period: 'billed monthly', perMonth: '$12.99 / mo' },
];

export async function getPlans(): Promise<Plan[]> {
  return PLACEHOLDER_PLANS;
}

export async function purchase(_plan: PlanId): Promise<void> {
  throw new PurchasesNotConfiguredError();
}

export async function restorePurchases(): Promise<void> {
  throw new PurchasesNotConfiguredError();
}
