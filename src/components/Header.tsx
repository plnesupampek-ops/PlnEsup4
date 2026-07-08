import React from 'react';
import { LayoutGrid, FileText, Scissors, Zap, Wallet, BarChart2, ShieldCheck, Settings, AlertTriangle, Cpu } from 'lucide-react';

interface HeaderProps {
  activeTab: 'CCTV' | 'ANOMALI' | 'OVER_SLA' | 'RATING' | 'YANTEK_OPTIMITATION' | 'ADMIN';
  onTabChange: (tab: 'CCTV' | 'ANOMALI' | 'OVER_SLA' | 'RATING' | 'YANTEK_OPTIMITATION' | 'ADMIN') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="bg-[#0a1128] text-white min-h-[4rem] py-2 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between px-3 md:px-6 sticky top-0 z-50 gap-3 md:gap-4 shadow-md border-b border-white/5">
      <div className="flex items-center gap-3 self-start md:self-auto">
        <div className="bg-white p-1 rounded-lg shrink-0">
          <img 
            src="https://lh3.googleusercontent.com/d/1oVyyV8xNI5Xse4CMC2Ovn11w18uVXp7E" 
            alt="Logo" 
            className="w-7 h-7 md:w-8 md:h-8 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h1 className="text-xs md:text-sm font-black tracking-tighter leading-none">DASHBOARD MONITORING YANDAL</h1>
          <p className="text-[9px] md:text-[10px] text-brand-accent font-bold opacity-80 uppercase">PLN ES BUKITTINGGI</p>
        </div>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-1 w-full md:w-auto">
        <NavItem 
          icon={<LayoutGrid size={16} />} 
          label="CCTV" 
          active={activeTab === 'CCTV'} 
          onClick={() => onTabChange('CCTV')}
        />
        <NavItem 
          icon={<AlertTriangle size={16} />} 
          label="ANOMALI" 
          active={activeTab === 'ANOMALI'} 
          onClick={() => onTabChange('ANOMALI')}
        />
        <NavItem 
          icon={<BarChart2 size={16} />} 
          label="OVER SLA" 
          active={activeTab === 'OVER_SLA'} 
          onClick={() => onTabChange('OVER_SLA')}
        />
        <NavItem 
          icon={<Zap size={16} />} 
          label="RATING" 
          active={activeTab === 'RATING'} 
          onClick={() => onTabChange('RATING')}
        />
        <NavItem 
          icon={<Cpu size={16} />} 
          label="YANTEK OPTIMITATION" 
          active={activeTab === 'YANTEK_OPTIMITATION'} 
          onClick={() => onTabChange('YANTEK_OPTIMITATION')}
        />
        <NavItem 
          icon={<ShieldCheck size={16} />} 
          label="ADMIN" 
          active={activeTab === 'ADMIN'} 
          onClick={() => onTabChange('ADMIN')}
        />
      </nav>

      <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> SISTEM AKTIF
          </span>
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-700 rounded-full overflow-hidden border-2 border-brand-accent shrink-0">
          <img src="https://picsum.photos/seed/admin/100/100" alt="Admin" referrerPolicy="no-referrer" />
        </div>
      </div>
    </header>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-1.5 px-2 py-1.5 xl:px-3 xl:py-2 rounded-lg transition-all duration-200 border border-transparent ${
      active 
        ? 'bg-[#00e5ff]/15 text-brand-accent border-[#00e5ff]/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <span className={active ? 'text-brand-accent' : 'text-slate-400 group-hover:text-white'}>{icon}</span>
    <span className="text-[9px] md:text-[10px] xl:text-[10.5px] font-black tracking-wider uppercase">{label}</span>
  </button>
);
