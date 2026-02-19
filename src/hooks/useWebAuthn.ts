import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function useWebAuthn() {
  const [loading, setLoading] = useState(false);

  const isSupported = () =>
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof navigator.credentials?.create === 'function';

  const register = async (userId: string, userName: string, userEmail: string) => {
    if (!isSupported()) {
      toast.error('Biometric authentication is not supported on this device');
      return false;
    }
    setLoading(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'My City Radius', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(userId),
            name: userEmail,
            displayName: userName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error('Registration cancelled');

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = bufferToBase64(credential.rawId);
      const publicKey = bufferToBase64(response.getPublicKey?.() || new ArrayBuffer(0));

      const { error } = await supabase.from('webauthn_credentials' as any).insert({
        user_id: userId,
        credential_id: credentialId,
        public_key: publicKey,
        counter: 0,
        device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
        transports: response.getTransports?.() || [],
      });

      if (error) throw error;
      toast.success('Fingerprint registered successfully! 🎉');
      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        toast.error(err.message || 'Failed to register fingerprint');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async (userId: string) => {
    if (!isSupported()) {
      toast.error('Biometric authentication is not supported on this device');
      return false;
    }
    setLoading(true);
    try {
      const { data: credentials } = await supabase
        .from('webauthn_credentials' as any)
        .select('credential_id, transports')
        .eq('user_id', userId);

      if (!credentials || credentials.length === 0) {
        toast.error('No fingerprint registered. Please register in your Profile first.');
        return false;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const allowCredentials = credentials.map((c: any) => ({
        id: base64ToBuffer(c.credential_id),
        type: 'public-key' as const,
        transports: c.transports || [],
      }));

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: 'required',
          timeout: 60000,
        },
      });

      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        toast.error(err.message || 'Fingerprint verification failed');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getCredentials = async (userId: string) => {
    const { data } = await supabase
      .from('webauthn_credentials' as any)
      .select('*')
      .eq('user_id', userId);
    return data || [];
  };

  const removeCredential = async (id: string) => {
    const { error } = await supabase.from('webauthn_credentials' as any).delete().eq('id', id);
    if (error) toast.error('Failed to remove credential');
    else toast.success('Fingerprint removed');
    return !error;
  };

  return { isSupported, register, authenticate, getCredentials, removeCredential, loading };
}
