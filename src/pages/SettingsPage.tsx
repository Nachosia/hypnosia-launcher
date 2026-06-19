import { useState } from 'react';
import { FolderOpen, Monitor, Terminal, Info, Save } from 'lucide-react';

export default function SettingsPage({
  autoUpdate,
  setAutoUpdate,
}: {
  autoUpdate: boolean;
  setAutoUpdate: (value: boolean) => void;
}) {
  const [javaPath, setJavaPath] = useState('Авто');
  const [closeOnLaunch, setCloseOnLaunch] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors relative ${
        checked ? 'bg-green' : 'bg-white/[0.1]'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-bg transition-all ${
          checked ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  );

  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <p className="font-mono text-xs tracking-[4px] text-green mb-1">// SETTINGS</p>
          <h2 className="font-bold text-3xl text-text">Настройки</h2>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-6">
          {/* Java path */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-3">
              Путь к Java 21
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={javaPath}
                onChange={(e) => setJavaPath(e.target.value)}
                className="flex-1 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-green/50 transition-colors"
              />
              <button className="px-3 py-2.5 rounded-xl bg-white/[0.05] text-text-secondary hover:text-text border border-border hover:border-border-hover transition-colors">
                <FolderOpen size={18} />
              </button>
            </div>
            <p className="font-mono text-[10px] text-muted mt-2">
              Оставьте «Авто», чтобы лаунчер скачал Java автоматически.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-4 border-t border-border">
            <label className="flex items-center justify-between cursor-pointer group py-1">
              <div className="flex items-center gap-3">
                <Monitor size={18} className="text-text-secondary" />
                <span className="text-sm text-text">Закрывать лаунчер при запуске игры</span>
              </div>
              <Toggle checked={closeOnLaunch} onChange={setCloseOnLaunch} />
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-1">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="text-text-secondary" />
                <span className="text-sm text-text">Показывать консоль запуска</span>
              </div>
              <Toggle checked={showConsole} onChange={setShowConsole} />
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-1">
              <div className="flex items-center gap-3">
                <Save size={18} className="text-text-secondary" />
                <span className="text-sm text-text">Автообновление сборки</span>
              </div>
              <Toggle checked={autoUpdate} onChange={setAutoUpdate} />
            </label>
          </div>
        </div>

        {/* About */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info size={18} className="text-green" />
            <h4 className="font-semibold text-text">О лаунчере</h4>
          </div>
          <div className="space-y-1.5 font-mono text-xs text-text-secondary">
            <p>Hypnosia Launcher v0.1.0-beta</p>
            <p>Tauri v2 • React 19 • Tailwind CSS v4</p>
            <p>© 2026 Nachosia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
