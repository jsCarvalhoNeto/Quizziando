// NetworkStatusBadge.tsx — Indicador visual de sinal Wi-Fi, latência e status de reconexão
import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useRoomSubscription';

interface NetworkStatusBadgeProps {
  status: ConnectionStatus;
  latencyMs: number | null;
  isOnline: boolean;
  showText?: boolean;
  compact?: boolean;
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({
  status,
  latencyMs,
  isOnline,
  showText = true,
  compact = false,
}) => {
  // Determina cor e estado de sinal
  let signalColor = '#10B981'; // Verde (Excelente)
  let statusText = 'Conectado';
  let isReconnecting = false;

  if (!isOnline || status === 'disconnected' || status === 'error') {
    signalColor = '#EF4444'; // Vermelho
    statusText = 'Sem conexão';
    isReconnecting = true;
  } else if (status === 'reconnecting') {
    signalColor = '#F59E0B'; // Amarelo/Laranja
    statusText = 'Reconectando...';
    isReconnecting = true;
  } else if (latencyMs !== null) {
    if (latencyMs > 350) {
      signalColor = '#F59E0B'; // Oscilação
      statusText = `${latencyMs}ms (Lento)`;
    } else if (latencyMs > 180) {
      signalColor = '#3B82F6'; // Bom
      statusText = `${latencyMs}ms`;
    } else {
      signalColor = '#10B981'; // Ótimo
      statusText = `${latencyMs}ms`;
    }
  }

  if (compact) {
    return (
      <div
        title={!isOnline ? 'Sem conexão com a internet' : `Status: ${statusText}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          borderRadius: 999,
          backgroundColor: `${signalColor}20`,
          border: `1px solid ${signalColor}50`,
          fontSize: 10,
          fontWeight: 700,
          color: signalColor,
          transition: 'all 0.2s ease',
        }}
      >
        {isReconnecting ? (
          <RefreshCw style={{ width: 11, height: 11, animation: 'spin 1.5s linear infinite' }} />
        ) : !isOnline ? (
          <WifiOff style={{ width: 11, height: 11 }} />
        ) : (
          <Wifi style={{ width: 11, height: 11 }} />
        )}
        {showText && <span>{statusText}</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 12,
        backgroundColor: `${signalColor}15`,
        border: `1px solid ${signalColor}40`,
        color: signalColor,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {isReconnecting ? (
          <RefreshCw style={{ width: 13, height: 13, animation: 'spin 1.5s linear infinite' }} />
        ) : !isOnline ? (
          <WifiOff style={{ width: 13, height: 13 }} />
        ) : (
          <Wifi style={{ width: 13, height: 13 }} />
        )}
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: signalColor,
            boxShadow: `0 0 6px ${signalColor}`,
          }}
        />
      </div>
      {showText && <span>{statusText}</span>}
    </div>
  );
};

export default NetworkStatusBadge;
