'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useAuthStore from '../../../lib/auth';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push('/auth/login?error=auth_failed');
      return;
    }

    if (token) {
      // Decode token to get user info (basic JWT decode)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user = {
          id: payload.id,
          email: payload.email,
          username: payload.username,
          role: payload.role,
        };
        setAuth(user, token);
        router.push('/');
      } catch (e) {
        console.error('Token decode error:', e);
        router.push('/auth/login?error=invalid_token');
      }
    } else {
      router.push('/auth/login');
    }
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
