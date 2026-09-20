export interface PlayerSession { token: string; nickname: string }

const sessionKey = (code: string) => `quizziando:player:${code.toUpperCase()}`;

export function readPlayerSession(code: string): PlayerSession | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(sessionKey(code)) || 'null');
    if (!value || typeof value !== 'object') return null;
    const session = value as Record<string, unknown>;
    return typeof session.token === 'string' && /^[a-f0-9]{64}$/.test(session.token) &&
      typeof session.nickname === 'string' && session.nickname.trim().length > 0
      ? { token: session.token, nickname: session.nickname } : null;
  } catch { return null; }
}

export function savePlayerSession(code: string, session: PlayerSession): void {
  localStorage.setItem(sessionKey(code), JSON.stringify(session));
}

export function newPlayerToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
}
