import { useState, useMemo } from 'react';
import { Upload, Shirt, Palette, Activity, Server, Clock, CalendarDays, User, Lock, Link2 } from 'lucide-react';
import type { Account } from '../types/account';
import SkinViewer3D from './SkinViewer3D';

interface ProfileSectionProps {
  account: Account;
  onLinkDiscord?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: '#9932CC' },
  admin: { label: 'Admin', color: '#FF6464' },
  moderator: { label: 'Moderator', color: '#3BA55D' },
  helper: { label: 'Helper', color: '#5865F2' },
  qa: { label: 'QA', color: '#C084FC' },
  developer: { label: 'Developer', color: '#80FF97' },
  sponsor_plusplus: { label: 'Sponsor [++]', color: '#FFD700' },
  sponsor_plus: { label: 'Sponsor [+]', color: '#6BB7FF' },
  sponsor: { label: 'Sponsor', color: '#80FF97' },
  vip: { label: 'VIP', color: '#6BB7FF' },
  user: { label: 'User', color: '#7A8A9E' },
};

const GRADIENT_PRESETS = [
  { from: '#80FF97', to: '#6BB7FF', label: 'Client' },
  { from: '#A217FF', to: '#2C37FF', label: 'Ночной Токио' },
  { from: '#FF4D17', to: '#FFED2C', label: 'Приятный вечер' },
  { from: '#2A2A2A', to: '#ACACAC', label: 'Пепел' },
  { from: '#000000', to: '#FFFFFF', label: 'Тёмный Друн' },
  { from: '#FFA500', to: '#FFD700', label: 'Золото' },
  { from: '#1EAAF0', to: '#F2F2F2', label: 'Голубое небо' },
];

function formatPlaytime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export default function ProfileSection({ account, onLinkDiscord }: ProfileSectionProps) {
  if (!account.discordLinked) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-2xl overflow-hidden"
            style={{
              width: 180,
              height: 180,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <img
              src="https://mc-heads.net/avatar/fe008fc7387e4477a8260219bd8c0c13/180"
              alt="Steve"
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Lock size={18} className="text-muted" />
              <h3 className="font-bold text-xl text-text">Профиль недоступен</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Данные функции доступны только с привязкой аккаунта Discord либо полной регистрацией на сайте и привязкой аккаунта.
            </p>
            {onLinkDiscord && (
              <button
                onClick={onLinkDiscord}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)' }}
              >
                <Link2 size={16} />
                Привязать Discord
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ProfileContent account={account} />;
}

function ProfileContent({ account }: { account: Account }) {
  const skinModel = account.skinModel || 'classic';
  const skinUrl = account.skinUrl || null;
  const [skinPreview, setSkinPreview] = useState<string | null>(skinUrl);

  const [nickFrom, setNickFrom] = useState(account.nickGradientFrom || '#80FF97');
  const [nickTo, setNickTo] = useState(account.nickGradientTo || '#6BB7FF');
  const [roleFrom, setRoleFrom] = useState(account.roleGradientFrom || '#6BB7FF');
  const [roleTo, setRoleTo] = useState(account.roleGradientTo || '#FFD700');
  const [showGradientEditor, setShowGradientEditor] = useState(false);

  const displayRole = account.role || 'user';
  const rc = ROLE_CONFIG[displayRole] ?? ROLE_CONFIG.user;
  const allRoles = account.allRoles?.length ? account.allRoles : [displayRole];

  const hasNickGradient = !!nickFrom && !!nickTo;
  const hasRoleGradient = !!roleFrom && !!roleTo;

  const activity = useMemo(
    () =>
      account.activity?.length
        ? account.activity
        : [
            { date: '2026-06-13', dayName: 'Пн', hours: 2 },
            { date: '2026-06-14', dayName: 'Вт', hours: 5 },
            { date: '2026-06-15', dayName: 'Ср', hours: 0 },
            { date: '2026-06-16', dayName: 'Чт', hours: 3 },
            { date: '2026-06-17', dayName: 'Пт', hours: 7 },
            { date: '2026-06-18', dayName: 'Сб', hours: 4 },
            { date: '2026-06-19', dayName: 'Вс', hours: 1 },
          ],
    [account.activity]
  );

  const topServers = useMemo(
    () =>
      account.topServers?.length
        ? account.topServers
        : [
            { serverIp: 'mc.hypnosia.site', displayName: 'Hypnosia Main', totalMinutes: 4200 },
            { serverIp: '2b2t.org.ru', displayName: '2B2T', totalMinutes: 1800 },
            { serverIp: 'fun.minecraft.ru', displayName: 'FunCraft', totalMinutes: 600 },
          ],
    [account.topServers]
  );

  const maxActivityHours = Math.max(...activity.map((d) => d.hours), 1);
  const maxServerMinutes = Math.max(...topServers.map((s) => s.totalMinutes), 1);

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* 3D Skin preview */}
          <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center gap-3">
            <div className="flex items-center justify-center">
              <SkinViewer3D skinUrl={skinPreview} skinModel={skinModel} size={240} />
            </div>

            <div className="flex items-center gap-2 w-full">
              <span
                className={`flex-1 py-2 rounded-xl font-mono text-xs text-center ${
                  skinModel === 'classic' ? 'text-bg' : 'text-text-secondary bg-white/[0.03] border border-border'
                }`}
                style={skinModel === 'classic' ? { background: 'linear-gradient(135deg, #80FF97, #6BB7FF)' } : undefined}
              >
                Стив
              </span>
              <span
                className={`flex-1 py-2 rounded-xl font-mono text-xs text-center ${
                  skinModel === 'slim' ? 'text-bg' : 'text-text-secondary bg-white/[0.03] border border-border'
                }`}
                style={skinModel === 'slim' ? { background: 'linear-gradient(135deg, #80FF97, #6BB7FF)' } : undefined}
              >
                Алекс
              </span>
            </div>

            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setSkinPreview(url);
                }}
              />
              <div className="py-2.5 rounded-xl font-mono text-xs text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-2 bg-white/[0.03] border border-dashed border-green/30 text-green">
                <Upload size={14} />
                Изменить скин
              </div>
            </label>
          </div>

          {/* Name + roles + stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2
                className="font-bold"
                style={{
                  fontSize: 'clamp(24px, 4vw, 36px)',
                  background: hasNickGradient
                    ? `linear-gradient(135deg, ${nickFrom}, ${nickTo})`
                    : undefined,
                  backgroundClip: hasNickGradient ? 'text' : undefined,
                  WebkitBackgroundClip: hasNickGradient ? 'text' : undefined,
                  WebkitTextFillColor: hasNickGradient ? 'transparent' : undefined,
                  color: hasNickGradient ? 'transparent' : '#E8E4E0',
                }}
              >
                {account.displayName || account.username}
              </h2>

              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full border"
                style={{
                  background: account.isOnline ? 'rgba(128, 255, 151, 0.1)' : 'rgba(122, 138, 158, 0.1)',
                  borderColor: account.isOnline ? 'rgba(128, 255, 151, 0.25)' : 'rgba(122, 138, 158, 0.15)',
                  color: account.isOnline ? '#80FF97' : '#7A8A9E',
                }}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: account.isOnline ? '#80FF97' : '#7A8A9E',
                    boxShadow: account.isOnline ? '0 0 6px rgba(128, 255, 151, 0.5)' : 'none',
                  }}
                />
                {account.isOnline ? 'онлайн' : 'офлайн'}
              </span>
            </div>

            {/* Roles */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {allRoles.map((role) => {
                const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
                const isPrimary = role === displayRole;
                return (
                  <span
                    key={role}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1"
                    style={{
                      background: isPrimary && hasRoleGradient
                        ? `linear-gradient(90deg, ${roleFrom}, ${roleTo})`
                        : `${cfg.color}15`,
                      color: isPrimary && hasRoleGradient ? '#fff' : cfg.color,
                      border: `1px solid ${cfg.color}30`,
                    }}
                  >
                    {cfg.label}
                  </span>
                );
              })}
              <span className="font-mono text-[10px] text-muted">ID: {account.accountId}</span>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 bg-bg-secondary/50 border border-green/10">
                <p className="font-mono text-[10px] text-muted uppercase mb-1 flex items-center gap-1">
                  <Clock size={10} /> Total Time
                </p>
                <p className="font-semibold text-text" style={{ color: rc.color }}>
                  {formatPlaytime(account.totalMinutes ?? Math.round((account.hoursPlayed || 0) * 60))}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-bg-secondary/50 border border-green/10">
                <p className="font-mono text-[10px] text-muted uppercase mb-1 flex items-center gap-1">
                  <Activity size={10} /> 7 Days
                </p>
                <p className="font-semibold text-text" style={{ color: rc.color }}>
                  {formatPlaytime(account.weeklyMinutes ?? 0)}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-bg-secondary/50 border border-green/10">
                <p className="font-mono text-[10px] text-muted uppercase mb-1 flex items-center gap-1">
                  <User size={10} /> Joined
                </p>
                <p className="font-semibold text-text">{account.mcJoined || '—'}</p>
              </div>
              <div className="rounded-xl p-3 bg-bg-secondary/50 border border-green/10">
                <p className="font-mono text-[10px] text-muted uppercase mb-1 flex items-center gap-1">
                  <CalendarDays size={10} /> Site Joined
                </p>
                <p className="font-semibold text-text">{formatDate(account.siteJoined)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="glass-panel rounded-2xl p-6">
        <p className="font-mono text-xs tracking-wide text-muted mb-4">LAST 7 DAYS ACTIVITY</p>
        <div className="flex items-end gap-3" style={{ height: 100 }}>
          {activity.map((day) => {
            const pct = (day.hours / maxActivityHours) * 100;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="font-mono text-[10px]" style={{ color: rc.color, opacity: 0.8 }}>
                  {day.hours}h
                </span>
                <div
                  className="w-full rounded-t overflow-hidden"
                  style={{ height: `${Math.max(pct * 0.7, 4)}px` }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background: 'linear-gradient(180deg, #80FF97 0%, #6BB7FF 100%)',
                      opacity: day.hours >= 1 ? 1 : 0.3,
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted">{day.dayName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Server stats */}
      <div className="glass-panel rounded-2xl p-6">
        <p className="font-mono text-xs tracking-wide text-muted mb-4 flex items-center gap-2">
          <Server size={14} /> СТАТИСТИКА ПО СЕРВЕРАМ
        </p>
        <div className="flex flex-col gap-3">
          {topServers.map((srv, idx) => {
            const pct = Math.max(5, Math.round((srv.totalMinutes / maxServerMinutes) * 100));
            return (
              <div key={srv.serverIp} className="flex items-center gap-3">
                <span className="font-mono text-xs w-6 text-center text-muted">{idx + 1}</span>
                <span className="text-sm w-32 truncate text-text" title={srv.displayName || srv.serverIp}>
                  {srv.displayName || srv.serverIp}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #80FF97 0%, #6BB7FF 100%)',
                    }}
                  />
                </div>
                <span className="font-mono text-xs w-20 text-right text-muted">
                  {formatPlaytime(srv.totalMinutes)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nick / Role gradient editor */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-green" />
            <h4 className="font-semibold text-text">Градиент ника/роли</h4>
          </div>
          <button
            onClick={() => setShowGradientEditor((v) => !v)}
            className="px-4 py-2 rounded-xl font-mono text-xs transition-all hover:scale-[1.02] bg-white/[0.03] border border-border hover:border-border-hover text-text-secondary"
          >
            {showGradientEditor ? 'Скрыть' : 'Редактировать'}
          </button>
        </div>

        {!showGradientEditor && (
          <p className="text-xs text-text-secondary">
            Здесь можно настроить градиент ника и градиент основной роли. Пока изменения сохраняются только локально.
          </p>
        )}

        {showGradientEditor && (
          <div className="space-y-6">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setNickFrom(p.from);
                    setNickTo(p.to);
                    setRoleFrom(p.from);
                    setRoleTo(p.to);
                  }}
                  className="flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 bg-white/[0.03] border border-border text-text-secondary"
                >
                  <div className="w-6 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${p.from}, ${p.to})` }} />
                  {p.label}
                </button>
              ))}
            </div>

            {/* Nick gradient */}
            <div className="rounded-xl p-4 bg-bg-secondary/50 border border-green/10">
              <p className="font-mono text-xs uppercase text-muted mb-3">Градиент ника</p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="color"
                  value={nickFrom}
                  onChange={(e) => setNickFrom(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="font-mono text-xs text-text">{nickFrom}</span>
                <span className="text-muted">→</span>
                <input
                  type="color"
                  value={nickTo}
                  onChange={(e) => setNickTo(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="font-mono text-xs text-text">{nickTo}</span>
                <div
                  className="ml-auto w-24 h-4 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${nickFrom}, ${nickTo})` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-secondary">Превью:</span>
                <span
                  className="font-bold text-base"
                  style={{
                    background: `linear-gradient(135deg, ${nickFrom}, ${nickTo})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {account.displayName || account.username}
                </span>
              </div>
            </div>

            {/* Role gradient */}
            <div className="rounded-xl p-4 bg-bg-secondary/50 border border-green/10">
              <p className="font-mono text-xs uppercase text-muted mb-3">Градиент роли</p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="color"
                  value={roleFrom}
                  onChange={(e) => setRoleFrom(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="font-mono text-xs text-text">{roleFrom}</span>
                <span className="text-muted">→</span>
                <input
                  type="color"
                  value={roleTo}
                  onChange={(e) => setRoleTo(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="font-mono text-xs text-text">{roleTo}</span>
                <div
                  className="ml-auto w-24 h-4 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${roleFrom}, ${roleTo})` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-secondary">Превью:</span>
                <span
                  className="font-mono text-[10px] px-2.5 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${roleFrom}, ${roleTo})`,
                    color: '#fff',
                  }}
                >
                  {rc.label}
                </span>
              </div>
            </div>

            <button
              onClick={() => {}}
              className="w-full py-2.5 rounded-xl font-mono text-xs transition-all hover:scale-[1.02] bg-green/10 text-green border border-green/20"
            >
              Сохранить градиенты
            </button>
          </div>
        )}
      </div>

      {/* Skin style */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Shirt size={18} className="text-green" />
          <h4 className="font-semibold text-text">Стиль скина</h4>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          Выбранная модель: <span className="text-green font-mono">{skinModel === 'classic' ? 'Стив (Classic)' : 'Алекс (Slim)'}</span>
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`px-4 py-2 rounded-xl font-mono text-xs ${
              skinModel === 'classic' ? 'text-bg' : 'text-text-secondary bg-white/[0.03] border border-border'
            }`}
            style={skinModel === 'classic' ? { background: 'linear-gradient(135deg, #80FF97, #6BB7FF)' } : undefined}
          >
            Стив (Classic)
          </span>
          <span
            className={`px-4 py-2 rounded-xl font-mono text-xs ${
              skinModel === 'slim' ? 'text-bg' : 'text-text-secondary bg-white/[0.03] border border-border'
            }`}
            style={skinModel === 'slim' ? { background: 'linear-gradient(135deg, #80FF97, #6BB7FF)' } : undefined}
          >
            Алекс (Slim)
          </span>
        </div>
      </div>
    </div>
  );
}
