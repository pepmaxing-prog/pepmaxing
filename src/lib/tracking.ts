import * as Device from 'expo-device';
import {
  getTrackingPermissionsAsync,
  isAvailable,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

/**
 * Shows iOS's App Tracking Transparency prompt
 * ("Allow "Pepmaxing" to track your activity across other companies' apps and websites?").
 *
 * iOS only shows the system dialog once per install and only while the app is active,
 * so call this after the splash has dissolved. Resolves to whether tracking is authorized.
 */
export async function requestTrackingPermission(): Promise<boolean> {
  // Simulators have no advertising identifier; the prompt would only get in the way.
  if (!isAvailable() || !Device.isDevice) return false;
  try {
    const current = await getTrackingPermissionsAsync();
    const result = current.canAskAgain && current.status === 'undetermined'
      ? await requestTrackingPermissionsAsync()
      : current;
    return result.granted;
  } catch {
    return false;
  }
}
