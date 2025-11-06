import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import Axios from '@/lib/axios';
import { toast } from 'sonner';
import {
  UserProfile,
  UserWallet,
  UserSession,
  ReferralUser,
  UserTrade,
  UserStrategy,
  ProfileStats,
  Notification,
  UpdateUserData
} from '@/types';

export const useProfile = () => {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch user profile data
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<UserProfile> => {
      const response = await Axios.get('/users/profile');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch user wallet data
  const {
    data: wallet,
    isLoading: isWalletLoading,
    error: walletError
  } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async (): Promise<UserWallet> => {
      const response = await Axios.get('/users/wallet');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Fetch user sessions
  const {
    data: sessions,
    isLoading: isSessionsLoading,
    error: sessionsError
  } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async (): Promise<UserSession[]> => {
      const response = await Axios.get('/users/sessions');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Fetch referral users
  const {
    data: referrals,
    isLoading: isReferralsLoading,
    error: referralsError
  } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async (): Promise<ReferralUser[]> => {
      const response = await Axios.get('/users/referrals');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch user trades
  const {
    data: trades,
    isLoading: isTradesLoading,
    error: tradesError
  } = useQuery({
    queryKey: ['trades', user?.id],
    queryFn: async (): Promise<UserTrade[]> => {
      const response = await Axios.get('/users/trades');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1 * 60 * 1000 // 1 minute
  });

  // Fetch user strategies
  const {
    data: strategies,
    isLoading: isStrategiesLoading,
    error: strategiesError
  } = useQuery({
    queryKey: ['user-strategies', user?.id],
    queryFn: async (): Promise<UserStrategy[]> => {
      const response = await Axios.get('/users/strategies');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch profile statistics
  const {
    data: stats,
    isLoading: isStatsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async (): Promise<ProfileStats> => {
      const response = await Axios.get('/users/stats');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Fetch notifications
  const {
    data: notifications,
    isLoading: isNotificationsLoading,
    error: notificationsError
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      const response = await Axios.get('/notifications');
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 30 * 1000 // 30 seconds
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserData): Promise<UserProfile> => {
      const response = await Axios.put('/users/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
    }
  });

  // Refresh wallet balance mutation
  const refreshBalanceMutation = useMutation({
    mutationFn: async (): Promise<UserWallet> => {
      const response = await Axios.post('/users/refresh-balance');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['wallet', user?.id], data);
      toast.success('Balance refreshed successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to refresh balance';
      toast.error(errorMessage);
    }
  });

  // Mark notification as read mutation
  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      await Axios.put(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to mark notification as read';
      toast.error(errorMessage);
    }
  });

  // Mark all notifications as read mutation
  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await Axios.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to mark all notifications as read';
      toast.error(errorMessage);
    }
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      await Axios.delete(`/users/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      toast.success('Session revoked successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to revoke session';
      toast.error(errorMessage);
    }
  });

  // Invalidate all profile queries
  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['referrals', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['trades', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['user-strategies', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['profile-stats', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
  };

  return {
    // Data
    profile,
    wallet,
    sessions,
    referrals,
    trades,
    strategies,
    stats,
    notifications,

    // Loading states
    isProfileLoading,
    isWalletLoading,
    isSessionsLoading,
    isReferralsLoading,
    isTradesLoading,
    isStrategiesLoading,
    isStatsLoading,
    isNotificationsLoading,

    // Combined loading state
    isLoading:
      isProfileLoading ||
      isWalletLoading ||
      isSessionsLoading ||
      isReferralsLoading ||
      isTradesLoading ||
      isStrategiesLoading ||
      isStatsLoading ||
      isNotificationsLoading,

    // Errors
    profileError,
    walletError,
    sessionsError,
    referralsError,
    tradesError,
    strategiesError,
    statsError,
    notificationsError,

    // Mutations
    updateProfile: updateProfileMutation.mutate,
    refreshBalance: refreshBalanceMutation.mutate,
    markNotificationRead: markNotificationReadMutation.mutate,
    markAllNotificationsRead: markAllNotificationsReadMutation.mutate,
    revokeSession: revokeSessionMutation.mutate,

    // Mutation loading states
    isUpdatingProfile: updateProfileMutation.isPending,
    isRefreshingBalance: refreshBalanceMutation.isPending,
    isMarkingNotificationRead: markNotificationReadMutation.isPending,
    isMarkingAllNotificationsRead: markAllNotificationsReadMutation.isPending,
    isRevokingSession: revokeSessionMutation.isPending,

    // Utility functions
    refetchAll
  };
};
