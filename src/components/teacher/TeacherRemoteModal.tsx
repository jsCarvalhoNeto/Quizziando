import React, { useState } from 'react';
import { Smartphone, Copy, Check, X, ExternalLink } from 'lucide-react';

interface TeacherRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  pairingPin: string;
  isSmartphoneConnected?: boolean;
}

export const TeacherRemoteModal: React.FC<TeacherRemoteModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  pairingPin,
  isSmartphoneConnected = false
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const remoteUrl = `${currentOrigin}/?room=${roomCode}&view=remote&token=${pairingPin}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(remoteUrl)}&color=1E1B4B&bgcolor=FFFFFF&margin=2`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(remoteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          color: '#0f172a',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
        }}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '8px'
          }}
        >
          <X style={{ width: '22px', height: '22px' }} />
        </button>

        {/* Ícone e Título */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 20px rgba(124, 58, 237, 0.35)'
            }}
          >
            <Smartphone style={{ width: '28px', height: '28px', color: '#ffffff' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px', color: '#0f172a' }}>
            Controle Remoto do Professor
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Circule pela sala e comande a partida direto do seu smartphone!
          </p>
        </div>

        {/* Status de Conexão */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            backgroundColor: isSmartphoneConnected ? '#ecfdf5' : '#f1f5f9',
            border: `1px solid ${isSmartphoneConnected ? '#a7f3d0' : '#e2e8f0'}`,
            fontSize: '12px',
            fontWeight: 800,
            color: isSmartphoneConnected ? '#059669' : '#64748b'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isSmartphoneConnected ? '#10b981' : '#94a3b8'
            }}
            className={isSmartphoneConnected ? 'animate-ping' : ''}
          />
          <span>{isSmartphoneConnected ? '📱 Smartphone Conectado' : 'Aguardando leitura do QR Code'}</span>
        </div>

        {/* Imagem do QR Code */}
        <div
          style={{
            background: '#f8fafc',
            padding: '14px',
            borderRadius: '20px',
            border: '2px dashed #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={qrCodeUrl}
            alt="QR Code do Controle Remoto"
            style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
          />
        </div>

        {/* PIN de Pareamento em Destaque */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
            PIN DE SEGURANÇA DO HOST
          </div>
          <div
            style={{
              display: 'inline-block',
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '4px',
              color: '#4338ca',
              backgroundColor: '#eef2ff',
              padding: '6px 20px',
              borderRadius: '12px',
              border: '1.5px solid #c7d2fe'
            }}
          >
            {pairingPin}
          </div>
        </div>

        {/* Ações */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: copied ? '#ecfdf5' : '#f8fafc',
              border: `1.5px solid ${copied ? '#a7f3d0' : '#cbd5e1'}`,
              color: copied ? '#059669' : '#334155',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            {copied ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
            <span>{copied ? 'Link do Controle Copiado!' : 'Copiar Link do Smartphone'}</span>
          </button>

          <a
            href={remoteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#1e1b4b',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <ExternalLink style={{ width: '15px', height: '15px' }} />
            <span>Testar no Navegador (Nova Aba)</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TeacherRemoteModal;
