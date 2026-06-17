import { useState } from 'react';
import { Play, FolderOpen, Loader2, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAccount } from '../hooks/useAccount';
import { pickDirectory, launchMinecraft, fetchLaunchInfo, getHardwareId } from '../lib/api';

type LaunchState = 'idle' | 'checking' | 'downloading' | 'launching' | 'running' | 'error';

export default function HomePage() {
  const { account, isAuthenticated } = useAccount();
  const [launchState, setLaunchState] = useState<LaunchState>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Готов к запуску');
  const [ram, setRam] = useState(4);
  const [gameDir, setGameDir] = useState('%APPDATA%/.minecraft');
  const [modJarUrl, setModJarUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handlePickDirectory = async () => {
    const selected = await pickDirectory();
    if (selected) {
      setGameDir(selected);
      addLog(`Выбрана папка: ${selected}`);
    }
  };

  const handlePlay = async () => {
    if (launchState !== 'idle' && launchState !== 'error') return;

    setLaunchState('checking');
    setProgress(0);
    setStatusText('Проверка лицензии...');
    addLog('Запуск проверки системы...');

    const username = account?.minecraftUsername || account?.username || 'HypnosiaPlayer';

    try {
      const hwid = await getHardwareId();
      addLog(`HWID: ${hwid.slice(0, 16)}...`);

      const launchInfo = await fetchLaunchInfo(hwid);
      if (!launchInfo) {
        throw new Error('Не удалось получить данные для запуска');
      }
      if (!launchInfo.allowed) {
        throw new Error('Нет активной подписки или роли для запуска');
      }

      addLog(`Лицензия проверена: ${launchInfo.primaryRole}`);

      const steps = [
        { state: 'downloading' as LaunchState, progress: 25, text: 'Загрузка Fabric Loader 0.19.1...', log: 'Загрузка Fabric Loader...' },
        { state: 'downloading' as LaunchState, progress: 50, text: 'Загрузка Hypnosia Visuals...', log: 'Загрузка мода Hypnosia Visuals...' },
        { state: 'downloading' as LaunchState, progress: 75, text: 'Загрузка Fabric API...', log: 'Загрузка Fabric API...' },
        { state: 'launching' as LaunchState, progress: 90, text: 'Запуск Minecraft...', log: 'Запуск Minecraft 1.21.11...' },
      ];

      for (const step of steps) {
        setLaunchState(step.state);
        setProgress(step.progress);
        setStatusText(step.text);
        addLog(step.log);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      const result = await launchMinecraft(
        gameDir,
        'Авто',
        ram,
        username,
        modJarUrl || undefined
      );
      addLog(result);

      setLaunchState('running');
      setProgress(100);
      setStatusText('Игра запущена');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLaunchState('error');
      setStatusText(`Ошибка: ${message}`);
      addLog(`Ошибка запуска: ${message}`);
    }
  };

  const getButtonContent = () => {
    switch (launchState) {
      case 'checking':
        return (
          <>
            <Loader2 size={20} className="animate-spin" />
            Проверка...
          </>
        );
      case 'downloading':
        return (
          <>
            <Loader2 size={20} className="animate-spin" />
            Загрузка...
          </>
        );
      case 'launching':
        return (
          <>
            <Loader2 size={20} className="animate-spin" />
            Запуск...
          </>
        );
      case 'running':
        return (
          <>
            <CheckCircle2 size={20} />
            Игра запущена
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle size={20} />
            Ошибка
          </>
        );
      default:
        return (
          <>
            <Play size={20} />
            Играть
          </>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-mono text-xs tracking-[4px] text-green mb-3">// LAUNCH</p>
          <h2 className="font-bold text-5xl text-text mb-3 gradient-text">Hypnosia Visuals</h2>
          <p className="font-mono text-sm text-muted">
            Minecraft 1.21.11 • Fabric Loader 0.19.1 • Fabric API 0.141.3
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main play card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue/5 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative flex flex-col items-center gap-8">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green to-blue flex items-center justify-center glow-green animate-pulse-glow">
                  <Play className="text-bg ml-1" size={40} />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="font-bold text-2xl text-text">
                    {isAuthenticated && account?.minecraftLinked
                      ? `Добро пожаловать, ${account.minecraftUsername || account.username}`
                      : 'Готовы играть?'}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {isAuthenticated
                      ? 'Нажмите кнопку ниже для запуска сборки'
                      : 'Войдите в аккаунт, чтобы синхронизировать прогресс'}
                  </p>
                </div>

                <button
                  onClick={handlePlay}
                  disabled={launchState !== 'idle' && launchState !== 'running' && launchState !== 'error'}
                  className="group relative px-16 py-5 rounded-2xl font-bold text-base uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 min-w-[240px]"
                  style={{
                    background: 'linear-gradient(135deg, #80FF97, #6BB7FF)',
                    color: '#0B0D12',
                  }}
                >
                  {getButtonContent()}
                </button>

                {/* Progress */}
                {launchState !== 'idle' && launchState !== 'running' && launchState !== 'error' && (
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between font-mono text-xs text-muted">
                      <span>{statusText}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green to-blue transition-all duration-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {launchState === 'running' && (
                  <div className="flex items-center gap-2 text-green font-mono text-sm">
                    <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                    {statusText}
                  </div>
                )}

                {launchState === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
                    <AlertCircle size={14} />
                    {statusText}
                  </div>
                )}
              </div>
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl p-5 glass-panel-hover transition-colors">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-3">
                  Папка Minecraft
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gameDir}
                    onChange={(e) => setGameDir(e.target.value)}
                    className="flex-1 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-green/50 transition-colors min-w-0"
                  />
                  <button
                    onClick={handlePickDirectory}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.05] text-text-secondary hover:text-text border border-border hover:border-border-hover transition-colors shrink-0"
                    title="Выбрать папку"
                  >
                    <FolderOpen size={18} />
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5 glass-panel-hover transition-colors md:col-span-2">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-3">
                  URL мод-файла (Hypnosia Visuals)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/hypnosia-visuals.jar"
                  value={modJarUrl}
                  onChange={(e) => setModJarUrl(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-green/50 transition-colors"
                />
              </div>

              <div className="glass-panel rounded-2xl p-5 glass-panel-hover transition-colors">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-3">
                  Выделение RAM: {ram} GB
                </label>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={ram}
                  onChange={(e) => setRam(Number(e.target.value))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between font-mono text-[10px] text-muted mt-3">
                  <span>2 GB</span>
                  <span>16 GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <h4 className="font-semibold text-text mb-4 flex items-center gap-2">
                <Terminal size={16} className="text-green" />
                Лог запуска
              </h4>
              <div className="h-[280px] bg-bg-secondary rounded-xl p-3 overflow-y-auto font-mono text-[10px] leading-relaxed text-text-secondary border border-border">
                {logs.length === 0 ? (
                  <span className="text-muted">Ожидание запуска...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-green">➜</span> {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <h4 className="font-semibold text-text mb-3">Состав сборки</h4>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green" />
                  Hypnosia Visuals
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green" />
                  Fabric Loader 0.19.1
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green" />
                  Fabric API 0.141.3
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green" />
                  Fabric Language Kotlin
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
