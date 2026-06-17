import { useEffect, useState } from 'react';
import { User, Link2, LogOut, Shield, Gamepad2, Loader2, CheckCircle2, AlertCircle, BadgeCheck, Fingerprint, CalendarDays, RefreshCw, Download } from 'lucide-react';
import { useAccount } from '../hooks/useAccount';
import { checkForUpdate, installUpdate, onUpdaterProgress, type UpdateInfo, type UpdateProgress } from '../lib/updater';

export default function AccountPage() {
  const { account, isLoading, isAuthenticated, login, loginHwid, logout, linkMinecraft, linkDiscord } = useAccount();
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [installProgress, setInstallProgress] = useState<UpdateProgress | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    onUpdaterProgress((progress) => setInstallProgress(progress))
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    setUpdateInfo(null);
    try {
      const info = await checkForUpdate();
      setUpdateInfo(info);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Не удалось проверить обновления');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    setInstallingUpdate(true);
    setUpdateError(null);
    setInstallSuccess(false);
    try {
      await installUpdate();
      setInstallSuccess(true);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Не удалось установить обновление');
    } finally {
      setInstallingUpdate(false);
    }
  };

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);
    try {
      await login();
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleLinkMinecraft = async () => {
    if (linkCode.length !== 6) return;
    setLinking(true);
    setLinkSuccess(false);
    setLinkError(null);
    const result = await linkMinecraft(linkCode);
    setLinking(false);
    if (result.success) {
      setLinkSuccess(true);
      setLinkCode('');
    } else {
      setLinkError(result.message || result.error || 'Не удалось привязать Minecraft');
    }
  };

  if (discordLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <Loader2 className="text-green animate-spin" size={32} />
          <p className="font-mono text-sm text-muted">Ожидание авторизации в Discord...</p>
          <p className="text-xs text-text-secondary">
            Подтвердите вход в открывшемся окне браузера. Эта страница обновится автоматически.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-green animate-spin" size={32} />
          <p className="font-mono text-sm text-muted">Проверка устройства...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full overflow-y-auto p-10">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <p className="font-mono text-xs tracking-[4px] text-green mb-3">// AUTHENTICATION</p>
            <h2 className="font-bold text-3xl text-text mb-2">Привязать устройство</h2>
            <p className="text-sm text-text-secondary">
              Лаунчер автоматически проверит, есть ли уже аккаунт для этого устройства. Если нет — войдите через Discord или продолжите как гость.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green/20 to-blue/20 flex items-center justify-center mx-auto border border-green/20 glow-green">
              <User className="text-green" size={36} />
            </div>

            <div>
              <h3 className="font-bold text-xl text-text mb-2">Устройство не привязано</h3>
              <p className="text-sm text-text-secondary">
                Для доступа к профилю, роли и синхронизации конфигов войдите через Discord.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDiscordLogin}
                disabled={discordLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #5865F2, #4752C4)',
                  color: '#FFFFFF',
                }}
              >
                {discordLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                )}
                {discordLoading ? 'Ожидание Discord...' : 'Войти через Discord'}
              </button>

              <button
                onClick={loginHwid}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl font-medium text-sm text-text-secondary hover:text-text bg-white/[0.03] border border-border hover:border-border-hover transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    Проверка устройства...
                  </span>
                ) : (
                  'Войти / создать аккаунт'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs tracking-[4px] text-green mb-1">// ACCOUNT</p>
            <h2 className="font-bold text-3xl text-text">Профиль</h2>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-secondary hover:text-red-400 hover:bg-red-500/10 border border-border hover:border-red-500/20 transition-all text-sm"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>

        {/* Profile card */}
        <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green to-blue flex items-center justify-center text-bg font-bold text-2xl">
            {account?.avatar ? (
              <img src={account.avatar} alt={account.username} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              account?.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-text">{account?.displayName || account?.username}</h3>
            <p className="font-mono text-sm text-muted">@{account?.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full bg-green/10 text-green border border-green/20">
                <Shield size={10} />
                {account?.role.toUpperCase()}
              </span>
              {account?.discordLinked && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  Discord
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account info badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center border border-green/20">
              <BadgeCheck className="text-green" size={20} />
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted uppercase tracking-wider">Статус</p>
              <p className="font-semibold text-sm text-text">Аккаунт вошёл</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center border border-blue/20">
              <Fingerprint className="text-blue" size={20} />
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted uppercase tracking-wider">ID аккаунта</p>
              <p className="font-semibold text-sm text-text font-mono">{account?.accountId || account?.id || '—'}</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center border border-purple/20">
              <CalendarDays className="text-purple" size={20} />
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted uppercase tracking-wider">Дата регистрации</p>
              <p className="font-semibold text-sm text-text">
                {account?.registeredAt
                  ? new Date(account.registeredAt).toLocaleDateString('ru-RU')
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Minecraft link */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center border border-border">
                <Gamepad2 className="text-text-secondary" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-text">Minecraft</h4>
                <p className="font-mono text-xs text-muted">
                  {account?.minecraftLinked
                    ? `Привязан: ${account.minecraftUsername}`
                    : 'Не привязан к аккаунту'}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full border ${
                account?.minecraftLinked
                  ? 'bg-green/10 text-green border-green/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}
            >
              {account?.minecraftLinked ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
              {account?.minecraftLinked ? 'Привязан' : 'Не привязан'}
            </span>
          </div>

          {!account?.minecraftLinked && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Введите в игре <span className="text-green font-mono">/hypnosia link</span>, получите 6-значный код и введите его ниже.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="XXXXXX"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  className="flex-1 bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-text font-mono uppercase focus:outline-none focus:border-green/50 transition-colors"
                />
                <button
                  onClick={handleLinkMinecraft}
                  disabled={linkCode.length !== 6 || linking}
                  className="px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.99] flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #80FF97, #6BB7FF)',
                    color: '#0B0D12',
                  }}
                >
                  {linking ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                  Привязать
                </button>
              </div>
              {linkSuccess && (
                <p className="text-sm text-green flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Minecraft успешно привязан
                </p>
              )}
              {linkError && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} />
                  {linkError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Launcher update */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center border border-border">
                <RefreshCw className={`text-text-secondary ${checkingUpdate ? 'animate-spin' : ''}`} size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-text">Обновление лаунчера</h4>
                <p className="font-mono text-xs text-muted">
                  {updateInfo
                    ? `Доступна версия ${updateInfo.version}`
                    : 'Проверьте наличие новой версии'}
                </p>
              </div>
            </div>
            <button
              onClick={updateInfo ? handleInstallUpdate : handleCheckUpdate}
              disabled={checkingUpdate || installingUpdate}
              className="px-5 py-2.5 rounded-xl font-medium text-sm text-bg transition-all hover:scale-[1.02] active:scale-[0.99] flex items-center gap-2 disabled:opacity-60"
              style={{
                background: installingUpdate
                  ? 'linear-gradient(135deg, #6BB7FF, #80FF97)'
                  : 'linear-gradient(135deg, #80FF97, #6BB7FF)',
              }}
            >
              {installingUpdate ? (
                <Loader2 size={16} className="animate-spin" />
              ) : checkingUpdate ? (
                <Loader2 size={16} className="animate-spin" />
              ) : updateInfo ? (
                <Download size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              {installingUpdate
                ? 'Установка...'
                : checkingUpdate
                ? 'Проверка...'
                : updateInfo
                ? 'Обновить сейчас'
                : 'Проверить обновления'}
            </button>
          </div>

          {updateInfo?.body && (
            <div className="bg-bg-secondary rounded-xl p-4 mb-4 text-sm text-text-secondary whitespace-pre-wrap border border-border">
              {updateInfo.body}
            </div>
          )}

          {installingUpdate && installProgress && (
            <div className="space-y-2">
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-green to-blue transition-all duration-300"
                  style={{
                    width:
                      installProgress.contentLength && installProgress.contentLength > 0
                        ? `${Math.min(
                            100,
                            ((installProgress.chunkLength || 0) / installProgress.contentLength) * 100
                          )}%`
                        : '50%',
                  }}
                />
              </div>
              <p className="font-mono text-xs text-muted">
                {installProgress.finished
                  ? 'Завершено, перезапуск...'
                  : 'Скачивание обновления...'}
              </p>
            </div>
          )}

          {installSuccess && (
            <p className="text-sm text-green flex items-center gap-2 mt-3">
              <CheckCircle2 size={14} />
              Обновление установлено. Перезапустите лаунчер.
            </p>
          )}

          {updateError && (
            <p className="text-sm text-red-400 flex items-center gap-2 mt-3">
              <AlertCircle size={14} />
              {updateError}
            </p>
          )}
        </div>

        {/* Discord link */}
        {!account?.discordLinked && (
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 flex items-center justify-center border border-[#5865F2]/20">
                  <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-text">Привязать Discord</h4>
                  <p className="font-mono text-xs text-muted">Для синхронизации роли и доступа к сайту</p>
                </div>
              </div>
              <button
                onClick={linkDiscord}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.99] flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)' }}
              >
                <Link2 size={16} />
                Привязать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
