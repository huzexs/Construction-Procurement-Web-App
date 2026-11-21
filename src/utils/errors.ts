export function formatFriendlyFirebaseError(
  err: unknown,
  currentHostname?: string
): string {
  const host =
    currentHostname ??
    (typeof window !== 'undefined' ? window.location.hostname : 'this domain');

  const rawMessage = err instanceof Error ? err.message : String(err ?? '');

  // Unwrap structured FirestoreErrorInfo JSON if present
  let innerMessage = rawMessage;
  if (rawMessage.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMessage) as { error?: string };
      if (typeof parsed.error === 'string' && parsed.error.length > 0) {
        innerMessage = parsed.error;
      }
    } catch {
      // keep rawMessage
    }
  }

  const lower = innerMessage.toLowerCase();

  if (lower.includes('auth/unauthorized-domain')) {
    return `This domain (${host}) is not authorized for Firebase Google Sign-In. Open Firebase Console -> Authentication -> Settings -> Authorized domains, and add "${host}".`;
  }

  if (lower.includes('auth/popup-blocked')) {
    return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.';
  }

  if (lower.includes('auth/cancelled-popup-request')) {
    return 'Another sign-in popup is already open. Complete or close it and try again.';
  }

  if (lower.includes('auth/operation-not-allowed')) {
    return 'Google Sign-In is not enabled in Firebase Authentication. Enable the Google provider in Firebase Console -> Authentication -> Sign-in method.';
  }

  if (lower.includes('auth/api-key-not-valid') || lower.includes('api-key-not-valid')) {
    return 'Firebase API key is rejected for this origin. Check API key HTTP referrer restrictions in Google Cloud Console.';
  }

  if (lower.includes('auth/network-request-failed') || lower.includes('the client is offline')) {
    return 'Network error reaching Firebase. Check your internet connection and try again.';
  }

  if (lower.includes('quota exceeded')) {
    return 'Firestore daily free-tier quota exceeded. Quota resets tomorrow or can be upgraded in Firebase Console.';
  }

  if (lower.includes('missing or insufficient permissions') || lower.includes('permission-denied')) {
    return 'Permission denied by Firestore security rules. Ensure your Google account email is verified and your access is active.';
  }

  return innerMessage || 'An unexpected Firebase error occurred.';
}
