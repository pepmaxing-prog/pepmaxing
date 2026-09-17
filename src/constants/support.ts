/**
 * Destinations that only exist once the app has a real listing and inbox.
 * Both are null until then; the Profile tab degrades gracefully instead of opening a dead link.
 */
export const AppStoreId: string | null = null;
export const SupportEmail: string | null = null;

export function reviewUrl(): string | null {
  return AppStoreId ? `https://apps.apple.com/app/id${AppStoreId}?action=write-review` : null;
}

export function supportUrl(): string | null {
  return SupportEmail ? `mailto:${SupportEmail}?subject=Pepmaxing%20support` : null;
}
