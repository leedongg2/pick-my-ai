import { supabase } from './supabase';
import { useStore } from '@/store';
import type { RealtimeChannel } from '@supabase/supabase-js';

let walletChannel: RealtimeChannel | null = null;
let transactionsChannel: RealtimeChannel | null = null;

export const subscribeToWalletUpdates = (userId: string) => {
  if (!userId) return;

  // 기존 구독 정리
  if (walletChannel) {
    supabase.removeChannel(walletChannel);
    walletChannel = null;
  }

  // user_wallets 테이블 변경 구독
  walletChannel = supabase
    .channel(`wallet:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_wallets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('💰 Wallet update received:', payload);
        }

        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newData = payload.new as any;
          const currentState = useStore.getState();
          
          if (newData.credits && currentState.wallet) {
            useStore.setState({
              wallet: {
                ...currentState.wallet,
                credits: newData.credits,
              },
            });
          }
        }
      }
    )
    .subscribe((status) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('💰 Wallet subscription status:', status);
      }
    });
};

export const subscribeToTransactionUpdates = (userId: string) => {
  if (!userId) return;

  // 기존 구독 정리
  if (transactionsChannel) {
    supabase.removeChannel(transactionsChannel);
    transactionsChannel = null;
  }

  // transactions 테이블 변경 구독
  transactionsChannel = supabase
    .channel(`transactions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📊 Transaction update received:', payload);
        }

        const newTransaction = payload.new as any;
        const currentState = useStore.getState();
        
        if (currentState.wallet) {
          const existingTransaction = currentState.wallet.transactions.find(
            (t) => t.id === newTransaction.id
          );

          if (!existingTransaction) {
            useStore.setState({
              wallet: {
                ...currentState.wallet,
                transactions: [
                  ...currentState.wallet.transactions,
                  {
                    id: newTransaction.id,
                    type: newTransaction.type,
                    modelId: newTransaction.model_id,
                    amount: newTransaction.amount,
                    timestamp: newTransaction.created_at,
                    description: newTransaction.description,
                  },
                ],
              },
            });
          }
        }
      }
    )
    .subscribe((status) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📊 Transactions subscription status:', status);
      }
    });
};

export const unsubscribeFromRealtimeUpdates = () => {
  if (walletChannel) {
    supabase.removeChannel(walletChannel);
    walletChannel = null;
  }

  if (transactionsChannel) {
    supabase.removeChannel(transactionsChannel);
    transactionsChannel = null;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 Unsubscribed from all realtime updates');
  }
};

export const initializeRealtimeSync = (userId: string) => {
  if (!userId) return;

  if (process.env.NODE_ENV !== 'production') {
    console.log('🚀 Initializing realtime sync for user:', userId);
  }

  subscribeToWalletUpdates(userId);
  subscribeToTransactionUpdates(userId);
};
