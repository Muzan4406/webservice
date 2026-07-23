import { useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { googleAuth } from '@workspace/api-client-react';
import { getDeviceId } from '@/lib/deviceId';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Hook that handles Google OAuth sign-in.
 * Returns signInWithGoogle() which triggers the Google consent flow
 * and then calls the backend /auth/google endpoint.
 */
export function useGoogleAuth() {
  const [isPending, setIsPending] = useState(false);

  const [, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'muzan' }),
  });

  async function signInWithGoogle(opts?: { country?: string; referralCode?: string }) {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error("Google Sign-In non configuré. Veuillez contacter l'administrateur.");
    }

    setIsPending(true);
    try {
      const result = await promptAsync();

      if (result?.type !== 'success') {
        // User cancelled or error
        return null;
      }

      const accessToken = result.authentication?.accessToken;
      if (!accessToken) {
        throw new Error('Token Google manquant.');
      }

      const deviceId = await getDeviceId();

      const authResult = await googleAuth({
        accessToken,
        deviceId: deviceId ?? undefined,
        country: opts?.country,
        referralCode: opts?.referralCode,
      });

      return authResult;
    } finally {
      setIsPending(false);
    }
  }

  return { signInWithGoogle, isPending };
}
