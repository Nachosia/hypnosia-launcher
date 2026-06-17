import { useState } from 'react';
import { Gamepad2, User, Settings, Sparkles } from 'lucide-react';
import HomePage from './pages/HomePage';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'account' | 'settings'>('home');

  const navItems: { id: 'home' | 'account' | 'settings'; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Главная', icon: <Gamepad2 size={18} /> },
    { id: 'account', label: 'Аккаунт', icon: <User size={18} /> },
    { id: 'settings', label: 'Настройки', icon: <Settings size={18} /> },
  ];

  return (
    <div className="flex w-full h-screen bg-bg overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green/8 rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue/8 rounded-full blur-[150px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(128,255,151,0.03),transparent_50%)]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 w-[260px] h-full glass-panel border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green to-blue flex items-center justify-center glow-green">
              <Sparkles className="text-bg" size={22} />
            </div>
            <div>
              <h1 className="font-bold text-text text-lg leading-tight tracking-tight">Hypnosia</h1>
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Launcher</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-green/15 to-blue/10 text-green border border-green/20 glow-green'
                  : 'text-text-secondary hover:text-text hover:bg-white/[0.03]'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="glass-panel rounded-xl p-3 glass-panel-hover transition-colors">
            <p className="font-mono text-[10px] text-muted">Версия</p>
            <p className="font-mono text-xs text-text">0.1.0-beta</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative z-10 flex-1 h-full overflow-hidden">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'account' && <AccountPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
