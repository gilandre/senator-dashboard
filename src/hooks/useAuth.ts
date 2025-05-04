import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const isAdmin = session?.user?.role === 'admin';

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  return {
    session,
    status,
    isAuthenticated,
    isLoading,
    isAdmin,
    logout,
    user: session?.user,
  };
} 