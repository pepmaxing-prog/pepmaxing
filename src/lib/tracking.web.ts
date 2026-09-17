/** App Tracking Transparency is an iOS system prompt; there is nothing to ask for on web. */
export async function requestTrackingPermission(): Promise<boolean> {
  return false;
}
