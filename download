import React from 'react';
import { Phone, ShoppingCart, Trash2, ChevronLeft, ChevronRight, Cpu, TrendingUp, Cloud, RefreshCw, Smartphone } from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeCount: number;
  archiveCount: number;
  syncStatus: 'syncing' | 'synced' | 'local' | 'error';
  onBackupImport: (file: File) => Promise<void>;
  onBackupExport: () => void;
  onOpenYandexSettings: () => void;
  onForceSync?: () => void;
  onOpenPwaInstaller: () => void;
}

export default function Sidebar({
  activeTab,
  onChangeTab,
  collapsed,
  onToggleCollapse,
  activeCount,
  archiveCount,
  syncStatus,
  onBackupImport,
  onBackupExport,
  onOpenYandexSettings,
  onForceSync,
  onOpenPwaInstaller
}: SidebarProps) {
  const menuItems = [
    {
      id: 'phones' as ActiveTab,
      label: 'Телефоны',
      icon: Phone,
      count: activeCount
    },
    {
      id: 'purchases' as ActiveTab,
      label: 'Покупки',
      icon: ShoppingCart,
      count: null
    },
    {
      id: 'archive' as ActiveTab,
      label: 'Архив',
      icon: Trash2,
      count: archiveCount
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Аналитика',
      icon: TrendingUp,
      count: null
    }
  ];

  return (
    <div
      className={`h-screen flex flex-col bg-[#161616] text-[#f5f5f5] transition-all duration-300 border-r border-[#262626] hidden md:flex ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#262626] min-h-[64px]">
        {!collapsed ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-[2px] flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#161616] rounded-[6px] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-blue-400" />
               </div>
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
              Repair NEW
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-[2px] flex items-center justify-center mx-auto">
            <div className="w-full h-full bg-[#161616] rounded-[6px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded bg-[#222222] border border-[#2e2e2e] hover:bg-[#2b2b2b] text-neutral-400 hover:text-white transition-colors"
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`w-full flex items-center rounded-lg p-3 text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-[#2b2b2b] text-white shadow-md'
                  : 'text-neutral-400 hover:bg-[#1e1e1e] hover:text-neutral-200'
              }`}
            >
              <IconComponent
                size={18}
                className={`transition-colors flex-shrink-0 ${
                  isActive ? 'text-blue-400' : 'text-neutral-400 group-hover:text-neutral-300'
                }`}
              />
              {!collapsed && (
                <span className="ml-3 truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.count !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-[#3b3b3b] text-blue-300' : 'bg-[#222222] text-[#9e9e9e]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={onOpenPwaInstaller}
          className="w-full flex items-center rounded-lg p-3 text-sm font-medium transition-all group text-neutral-400 hover:bg-[#1e1e1e] hover:text-neutral-200 mt-2 border border-dashed border-[#2b2b2b]"
          title="Инструкция по установке на телефон как приложения"
        >
          <Smartphone
            size={18}
            className="text-amber-500 transition-colors group-hover:text-amber-400 flex-shrink-0"
          />
          {!collapsed && (
            <span className="ml-3 truncate flex-1 text-left">Установить PWA</span>
          )}
        </button>
      </nav>

      {/* Collapse-mode Cloud Sync Button */}
      {collapsed && (
        <div className="mt-auto p-4 flex flex-col gap-2 items-center border-t border-[#262626]">
          <button
            onClick={onOpenPwaInstaller}
            className="w-8 h-8 rounded-lg bg-[#1d1d1d] hover:bg-[#282828] border border-[#2b2b2b] text-amber-500 flex items-center justify-center transition-all cursor-pointer"
            title="Инструкция по установке PWA"
          >
            <Smartphone size={16} />
          </button>
          <button
            onClick={onOpenYandexSettings}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              syncStatus === 'syncing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
              syncStatus === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-[#1d1d1d] hover:bg-[#282828] border border-[#2b2b2b] text-amber-500'
            }`}
            title="Настройки облака Яндекс.Диск"
          >
            <Cloud size={16} className={syncStatus === 'syncing' ? 'animate-bounce' : ''} />
          </button>
        </div>
      )}

      {/* App Metadata in Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#262626] font-sans mt-auto">
          <div className="flex gap-1.5 items-center justify-between mb-2">
            <button
              onClick={onOpenYandexSettings}
              className="flex-1 flex items-center justify-between text-[10px] tracking-wider uppercase font-mono hover:bg-[#222222] p-1.5 rounded transition-all cursor-pointer group text-left border border-transparent hover:border-[#2b2b2b]"
              title="Открыть настройки облачной синхронизации Яндекс.Диска"
            >
              <span className="text-neutral-500 flex items-center gap-1 group-hover:text-neutral-300">
                <Cloud size={10} className="text-yellow-500" />
                ОБЛАКО ЯНДЕКС
              </span>
              <span className={`font-bold flex items-center gap-1 ${
                syncStatus === 'synced' ? 'text-emerald-400' :
                syncStatus === 'syncing' ? 'text-blue-400' :
                syncStatus === 'error' ? 'text-rose-400' :
                'text-amber-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' :
                  syncStatus === 'syncing' ? 'bg-blue-400 animate-spin' :
                  syncStatus === 'error' ? 'bg-rose-500 animate-bounce' :
                  'bg-amber-500'
                }`}></span>
                {syncStatus === 'synced' ? 'ОК' :
                 syncStatus === 'syncing' ? 'СИНК' :
                 syncStatus === 'error' ? 'ОШИБКА' :
                 'ВЫКЛ'}
              </span>
            </button>

            {onForceSync && (
              <button
                onClick={onForceSync}
                className="p-1.5 rounded bg-[#1d1d1d] hover:bg-[#282828] border border-[#2b2b2b] text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center h-[26px]"
                title="Синхронизировать сейчас"
                disabled={syncStatus === 'syncing'}
              >
                <RefreshCw size={10} className={syncStatus === 'syncing' ? 'animate-spin text-blue-400' : ''} />
              </button>
            )}
          </div>

          <div className="flex gap-2 justify-stretch mt-3">
            <button
              onClick={onBackupExport}
              className="flex-1 text-[10px] bg-[#1d1d1d] hover:bg-[#282828] border border-[#2b2b2b] py-1 px-1 rounded text-neutral-400 hover:text-white font-mono transition-colors cursor-pointer text-center select-none"
              title="Скачать резервную копию DB"
            >
              ЭКСПОРТ
            </button>
            <label
              className="flex-1 text-[10px] bg-[#1d1d1d] hover:bg-[#282828] border border-[#2b2b2b] py-1 px-1 rounded text-neutral-400 hover:text-white font-mono transition-colors cursor-pointer text-center select-none"
              title="Загрузить базу из файла"
            >
              ИМПОРТ
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onBackupImport(file);
                    // Reset input
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[9px] text-neutral-500 mt-2 text-center font-mono">
            VER 1.4 · АВТОСИНХРОНИЗАЦИЯ
          </p>
        </div>
      )}
    </div>
  );
}
