// useRoomSubscription.ts — Orquestração de Realtime, Heartbeat e Reconexão Resiliente
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RoomSubscriptionConfig<T> {
  roomCode: string | null | undefined;
  enabled?: boolean;
  pollIntervalMs?: number;
  fetchState: () => Promise<T>;
  onState: (state: T) => void;
  presenceKey?: string;
  presencePayload?: Record<string, unknown>;
  onPresenceChange?: (onlineKeys: string[]) => void;
  tables?: Array<{
    table: string;
    filter?: string;
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    schema?: string;
    onPayload?: (payload: unknown) => void;
  }>;
}

export interface RoomSubscriptionResult {
  status: ConnectionStatus;
  latencyMs: number | null;
  lastSyncAt: Date | null;
  refresh: () => Promise<void>;
  isOnline: boolean;
}

export function useRoomSubscription<T>({
  roomCode,
  enabled = true,
  pollIntervalMs = 2000,
  fetchState,
  onState,
  presenceKey,
  presencePayload,
  onPresenceChange,
  tables
}: RoomSubscriptionConfig<T>): RoomSubscriptionResult {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const fetchStateRef = useRef(fetchState);
  fetchStateRef.current = fetchState;

  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  const onPresenceChangeRef = useRef(onPresenceChange);
  onPresenceChangeRef.current = onPresenceChange;

  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const stoppedRef = useRef(false);

  const doRefresh = useCallback(async () => {
    if (stoppedRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;
    const start = Date.now();

    try {
      const state = await fetchStateRef.current();
      if (!stoppedRef.current) {
        onStateRef.current(state);
        setLastSyncAt(new Date());
        setLatencyMs(Date.now() - start);
        setStatus('connected');
      }
    } catch {
      if (!stoppedRef.current) {
        setStatus(prev => (prev === 'connected' ? 'reconnecting' : 'error'));
      }
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current && !stoppedRef.current) {
        queuedRef.current = false;
        void doRefresh();
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !roomCode) {
      setStatus('disconnected');
      return;
    }

    stoppedRef.current = false;
    setStatus('connecting');

    // Escuta eventos de conectividade do navegador
    const handleOnline = () => {
      setIsOnline(true);
      void doRefresh();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('reconnecting');
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void doRefresh();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    // Canal Realtime do Supabase
    const channelName = `sub-${roomCode.toUpperCase()}-${Math.random().toString(36).slice(2, 7)}`;
    const channelConfig = presenceKey ? { config: { presence: { key: presenceKey } } } : undefined;
    const channel = supabase.channel(channelName, channelConfig);

    // Adiciona listeners para tabelas informadas
    if (tablesRef.current && tablesRef.current.length > 0) {
      for (const t of tablesRef.current) {
        channel.on(
          'postgres_changes',
          {
            event: t.event || '*',
            schema: t.schema || 'public',
            table: t.table,
            filter: t.filter
          },
          (payload) => {
            if (t.onPayload) {
              t.onPayload(payload);
            }
            void doRefresh();
          }
        );
      }
    }

    // Suporte a Presence se solicitado
    if (presenceKey) {
      channel.on('presence', { event: 'sync' }, () => {
        if (onPresenceChangeRef.current) {
          const state = channel.presenceState();
          onPresenceChangeRef.current(Object.keys(state));
        }
      });
    }

    channel.subscribe((subStatus) => {
      if (stoppedRef.current) return;
      if (subStatus === 'SUBSCRIBED') {
        setStatus('connected');
        if (presenceKey && presencePayload) {
          void channel.track(presencePayload);
        }
        void doRefresh();
      } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
        setStatus('reconnecting');
      } else if (subStatus === 'CLOSED') {
        setStatus('disconnected');
      }
    });

    // Carga inicial
    void doRefresh();

    // Fallback de polling periódico (heartbeat de sincronização)
    const pollTimer = window.setInterval(() => {
      void doRefresh();
    }, pollIntervalMs);

    return () => {
      stoppedRef.current = true;
      window.clearInterval(pollTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [roomCode, enabled, pollIntervalMs, presenceKey, doRefresh]);

  return {
    status,
    latencyMs,
    lastSyncAt,
    refresh: doRefresh,
    isOnline
  };
}
