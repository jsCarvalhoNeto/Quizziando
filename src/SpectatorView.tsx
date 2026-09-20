import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { remainingSeconds } from './lib/gameRules';
import type { OnlineRoom } from './lib/onlineGame';

interface SpectatorPlayer { id: string; nickname: string; score: number; team_name: string | null }

export default function SpectatorView({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [players, setPlayers] = useState<SpectatorPlayer[]>([]);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      const [{ data: nextRoom, error: roomError }, { data: nextPlayers, error: playersError }] = await Promise.all([
        supabase.from('game_rooms').select('code,status,round_state,current_round,rounds,game_mode,current_question,selected_category,question_deadline,paused_remaining_ms,answered_count').eq('code', roomCode).maybeSingle(),
        supabase.from('room_players').select('id,nickname,score,team_name').eq('room_code', roomCode).order('score', { ascending: false }),
      ]);
      if (stopped) return;
      if (roomError || !nextRoom) { setError('Sala não encontrada ou indisponível.'); return; }
      if (playersError) { setError('Não foi possível atualizar o placar. Tentando novamente...'); return; }
      setError('');
      setRoom(nextRoom as OnlineRoom);
      setPlayers(nextPlayers || []);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [roomCode]);

  useEffect(() => {
    const tick = () => setSeconds(room?.paused_remaining_ms != null
      ? Math.ceil(room.paused_remaining_ms / 1000)
      : remainingSeconds(room?.question_deadline ?? null));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [room?.question_deadline, room?.paused_remaining_ms]);

  const teams = Object.entries(players.reduce<Record<string, number>>((scores, player) => {
    if (player.team_name) scores[player.team_name] = (scores[player.team_name] || 0) + player.score;
    return scores;
  }, {})).sort(([, a], [, b]) => b - a);

  return <main style={{ minHeight: '100vh', background: '#0f1022', color: 'white', padding: '32px max(20px, 6vw)', fontFamily: 'sans-serif' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
      <h1 style={{ fontSize: 32 }}>Quizziando · Espectador</h1>
      <span style={{ color: '#c4b5fd' }}>Sala {roomCode}</span>
    </header>
    {error && <p role="alert">{error}</p>}
    {room && <>
      <p style={{ color: '#cbd5e1' }}>Rodada {room.current_round} de {room.rounds} · {room.status === 'finished' ? 'Jogo encerrado' : room.round_state === 'idle' ? 'Aguardando rodada' : 'Partida em andamento'}</p>
      {room.selected_category && <h2 style={{ color: room.selected_category.color }}>{room.selected_category.name}</h2>}
      {room.current_question && <section style={{ margin: '24px 0', padding: 28, borderRadius: 18, background: '#1d2040' }}>
        <h2 style={{ fontSize: 30 }}>{room.current_question.question_text}</h2>
        {room.round_state === 'question' && <p role="timer" style={{ color: '#fbbf24', fontSize: 26 }}>{room.paused_remaining_ms != null ? 'Pausado · ' : ''}{seconds}s</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {room.current_question.alternatives.map((alternative, index) => <div key={index} style={{ padding: 20, borderRadius: 12, background: ['#991b1b', '#1e40af', '#854d0e', '#166534'][index], border: alternative.isCorrect ? '3px solid #86efac' : '3px solid transparent' }}>
            <strong>{'ABCD'[index]}.</strong> {alternative.text}
          </div>)}
        </div>
        <p style={{ color: '#cbd5e1' }}>{room.answered_count} resposta{room.answered_count === 1 ? '' : 's'} recebida{room.answered_count === 1 ? '' : 's'}</p>
        {['answered', 'ranking'].includes(room.round_state) && room.current_question.explanation && <p style={{ color: '#e9d5ff' }}><strong>Explicação:</strong> {room.current_question.explanation}
          {room.current_question.reference_url?.match(/^https?:\/\//i) && <a href={room.current_question.reference_url} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', marginLeft: 10 }}>Ver referência</a>}
        </p>}
      </section>}
      <section style={{ maxWidth: 760 }}>
        <h2>{room.game_mode === 'team' ? 'Placar dos times' : 'Placar'}</h2>
        {room.game_mode === 'team' && teams.map(([name, score], index) => <p key={name} style={{ padding: 14, borderRadius: 10, background: '#25284c' }}>{index + 1}º {name} · {score} pontos</p>)}
        {players.map((player, index) => <p key={player.id} style={{ padding: 12, borderBottom: '1px solid #374151' }}>{index + 1}º {player.nickname}{player.team_name ? ` · ${player.team_name}` : ''} — {player.score} pontos</p>)}
      </section>
    </>}
  </main>;
}
