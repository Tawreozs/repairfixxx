import React, { useState, useEffect } from 'react';
import { Smartphone, Download, AlertCircle, RefreshCw, X, ChevronRight, Apple, Monitor } from 'lucide-react';

interface PWAInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export default function PWAInstallGuide({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}: PWAInstallGuideProps) {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [isIframe, setIsIframe] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if inside an iframe
    setIsIframe(window.self !== window.top);
    // Detect if already standalone
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone);
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      onInstallSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div 
        id="pwa-guide-modal"
        className="bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Установка приложения</h3>
              <p className="text-[11px] text-neutral-400">Запускайте Repair NEW прямо с экрана телефона</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#222222] border border-[#2d2d2d] text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Standalone check / Already installed badge */}
          {isStandalone && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center font-medium">
              ✨ Вы уже запустили приложение в режиме PWA!
            </div>
          )}

          {/* Iframe detection alert */}
          {isIframe ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-2.5">
              <div className="flex gap-2 text-yellow-400">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-snug">
                  Режим предпросмотра ограничивает установку!
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed pl-7">
                Вы сейчас просматриваете приложение через окно редактора. Браузеры запрещают установку приложений (PWA) внутри фреймов.
              </p>
              <div className="pl-7 pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-bold transition-all"
                >
                  Открыть в новой вкладке 
                  <ChevronRight size={12} />
                </a>
              </div>
            </div>
          ) : (
            /* Native browser prompt button if available */
            deferredPrompt ? (
              <div className="p-4 bg-blue-500/10 border border-blue-500/25 rounded-xl text-center space-y-3">
                <p className="text-xs text-neutral-200">
                  Ваш браузер полностью поддерживает автоматическую установку! Нажмите кнопку ниже:
                </p>
                <button
                  onClick={handleNativeInstall}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 active:scale-98 transition-all text-white font-semibold text-xs cursor-pointer shadow-lg"
                >
                  <Download size={15} />
                  Установить в один клик
                </button>
              </div>
            ) : null
          )}

          {/* Instruction Tabs Navigation */}
          <div className="grid grid-cols-3 gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-[#262626]">
            <button
              onClick={() => setActiveTab('android')}
              className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'android' ? 'bg-[#2b2b2b] text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone size={13} className="text-emerald-400" />
              Android
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ios' ? 'bg-[#2b2b2b] text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Apple size={13} className="text-neutral-300" />
              iPhone
            </button>
            <button
              onClick={() => setActiveTab('pc')}
              className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'pc' ? 'bg-[#2b2b2b] text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Monitor size={13} className="text-blue-400" />
              ПК / Ноут
            </button>
          </div>

          {/* Tab Contents */}
          <div className="bg-[#111111] border border-[#232323] rounded-xl p-4 min-h-[160px] flex flex-col justify-center">
            {activeTab === 'android' && (
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Установка на Android (Chrome / Яндекс)
                </h4>
                <ol className="list-decimal list-inside text-[11px] text-neutral-300 space-y-2 leading-relaxed">
                  <li>Открыть ссылку на приложение в браузере <b className="text-white">Google Chrome</b> или <b className="text-white">Яндекс</b> (напрямую, не внутри других приложений).</li>
                  <li>Дождаться всплывающего окна внизу экрана или нажать на <b className="text-white">три точки</b> в верхнем правом углу браузера.</li>
                  <li>Выбрать пункт <b className="text-white">«Добавить на главный экран»</b> или <b className="text-white">«Установить приложение»</b>.</li>
                  <li>Подтвердить установку — иконка появится на рабочем столе!</li>
                </ol>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Установка на iPhone / iPad (Safari)
                </h4>
                <ol className="list-decimal list-inside text-[11px] text-neutral-300 space-y-2 leading-relaxed">
                  <li>Обязательно откройте ссылку в стандартном браузере <b className="text-white">Safari</b>.</li>
                  <li>В нижней панели нажмите кнопку <b className="text-white">«Поделиться»</b> (квадрат со стрелкой вверх <span className="bg-[#2a2a2a] px-1 rounded">⎋</span>).</li>
                  <li>Прокрутите открывшейся список вниз и нажмите <b className="text-emerald-400">«На экран "Домой"»</b>.</li>
                  <li>Вверху нажмите кнопку <b className="text-white">«Добавить»</b>.</li>
                  <li>Приложение запустится в режиме PWA, скрыв адресную строку Safari!</li>
                </ol>
              </div>
            )}

            {activeTab === 'pc' && (
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Установка на ПК / Компьютер
                </h4>
                <ol className="list-decimal list-inside text-[11px] text-neutral-300 space-y-2 leading-relaxed">
                  <li>В конце адресной строки Chrome/Edge появится <b className="text-blue-400">иконка монитора со стрелочкой</b> (или плюсик).</li>
                  <li>Кликните по ней и нажмите <b className="text-white">«Установить»</b>.</li>
                  <li>Также можно нажать <b className="text-white">три точки (меню) &rarr; Сохранить и поделиться &rarr; Установить приложение</b>.</li>
                  <li>Теперь вести учет ремонтов можно в отдельном независимом окне, как стандартный софт!</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#121212] px-5 py-3 border-t border-[#262626] flex items-center justify-between text-[10px] text-neutral-500 font-mono">
          <span>РЕЖИМ PWA АКТИВЕН</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
