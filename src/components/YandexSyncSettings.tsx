import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Cloud, CheckCircle2, HelpCircle, AlertTriangle, RefreshCw, Copy, ExternalLink, Github, Download, Upload } from 'lucide-react';
import { testYandexToken } from '../lib/yandexDisk';
import { testGithubToken } from '../lib/githubSync';
import { RepairItem } from '../types';

interface YandexSyncSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Sync general choice
  syncProvider: 'yandex' | 'github' | 'manual';
  onSetSyncProvider: (provider: 'yandex' | 'github' | 'manual') => void;

  // Manual Export / Import Props
  items: RepairItem[];
  partsText: string;
  deletedIds: string[];
  onImportDb: (items: RepairItem[], partsText: string, deletedIds: string[]) => void;

  // Yandex Disk properties
  token: string;
  onSaveToken: (newToken: string) => Promise<boolean>;
  onClearToken: () => void;

  // GitHub properties
  ghToken: string;
  ghRepo: string;
  ghPath: string;
  onSaveGhParams: (token: string, repo: string, path: string) => Promise<boolean>;
  onClearGhParams: () => void;

  syncStatus: 'syncing' | 'synced' | 'local' | 'error';
  syncErrorMessage?: string;
  syncSteps?: Array<{ time: string; message: string; status: 'info' | 'success' | 'error' }>;
  onForceSync: () => Promise<void>;
}

export default function YandexSyncSettings({
  isOpen,
  onClose,
  syncProvider,
  onSetSyncProvider,
  items,
  partsText,
  deletedIds,
  onImportDb,
  token,
  onSaveToken,
  onClearToken,
  ghToken,
  ghRepo,
  ghPath,
  onSaveGhParams,
  onClearGhParams,
  syncStatus,
  syncErrorMessage,
  syncSteps = [],
  onForceSync
}: YandexSyncSettingsProps) {
  // Yandex.Disk Form States
  const [inputToken, setInputToken] = useState(token);
  const [testingYandex, setTestingYandex] = useState(false);
  const [yandexTestResult, setYandexTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showYandexInstructions, setShowYandexInstructions] = useState(true);
  const [clientId, setClientId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // GitHub Form States
  const [inputGhToken, setInputGhToken] = useState(ghToken);
  const [inputGhRepo, setInputGhRepo] = useState(ghRepo);
  const [inputGhPath, setInputGhPath] = useState(ghPath || 'repair_db.json');
  const [testingGithub, setTestingGithub] = useState(false);
  const [githubTestResult, setGithubTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGithubInstructions, setShowGithubInstructions] = useState(true);

  // Manual Export/Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');

  // UI helpers
  const [showLogs, setShowLogs] = useState(syncStatus === 'error');

  useEffect(() => {
    if (syncStatus === 'error') {
      setShowLogs(true);
    }
  }, [syncStatus]);

  // Sync state inputs when props change
  useEffect(() => {
    setInputToken(token);
  }, [token]);

  useEffect(() => {
    setInputGhToken(ghToken);
    setInputGhRepo(ghRepo);
    setInputGhPath(ghPath || 'repair_db.json');
  }, [ghToken, ghRepo, ghPath]);

  if (!isOpen) return null;

  // Handle Yandex Token Testing and Saving
  const handleTestAndSaveYandex = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = inputToken.trim();
    if (!cleanToken) {
      setYandexTestResult({ success: false, message: 'Пожалуйста, введите токен Яндекс.Диска.' });
      return;
    }

    setTestingYandex(true);
    setYandexTestResult(null);

    try {
      const result = await testYandexToken(cleanToken);

      if (result.success) {
        setYandexTestResult({
          success: true,
          message: `Успешно! Диск подключен. Авторизован как: ${result.username}.`
        });
        await onSaveToken(cleanToken);
      } else {
        setYandexTestResult({
          success: false,
          message: result.error || 'Неверный токен или нет прав доступа.'
        });
      }
    } catch (err: any) {
      setYandexTestResult({
        success: false,
        message: `Не удалось проверить токен: ${err?.message || 'ошибка сети'}`
      });
    } finally {
      setTestingYandex(false);
    }
  };

  const handleClearYandex = () => {
    onClearToken();
    setInputToken('');
    setYandexTestResult(null);
  };

  // Handle GitHub Parameters Testing and Saving
  const handleTestAndSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = inputGhToken.trim();
    const cleanRepo = inputGhRepo.trim();
    const cleanPath = inputGhPath.trim() || 'repair_db.json';

    if (!cleanToken) {
      setGithubTestResult({ success: false, message: 'Пожалуйста, введите персональный токен GitHub (PAT).' });
      return;
    }
    if (!cleanRepo || !cleanRepo.includes('/')) {
      setGithubTestResult({ success: false, message: 'Пожалуйста, ведите репозиторий в формате "владелец/имя".' });
      return;
    }

    setTestingGithub(true);
    setGithubTestResult(null);

    try {
      const result = await testGithubToken(cleanToken, cleanRepo);

      if (result.success) {
        setGithubTestResult({
          success: true,
          message: `Успешно! Репозиторий подтвержден. Аккаунт: ${result.username}.`
        });
        await onSaveGhParams(cleanToken, cleanRepo, cleanPath);
      } else {
        setGithubTestResult({
          success: false,
          message: result.error || 'Ошибка проверки прав доступа или репозитория.'
        });
      }
    } catch (err: any) {
      setGithubTestResult({
        success: false,
        message: `Ошибка связи: ${err?.message || 'сбой сети'}`
      });
    } finally {
      setTestingGithub(false);
    }
  };

  const handleClearGithub = () => {
    onClearGhParams();
    setInputGhToken('');
    setInputGhRepo('');
    setInputGhPath('repair_db.json');
    setGithubTestResult(null);
  };

  const handleExportJson = () => {
    try {
      const dbPayload = {
        items,
        partsText,
        deletedIds: deletedIds || [],
        updatedAt: Date.now(),
        exportedBy: 'RepairApp Backup Service'
      };
      const jsonString = JSON.stringify(dbPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString('ru-RU').replace(/\./g, '_');
      link.download = `repair_db_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setManualSuccess('Слепок базы девайса успешно экспортирован в файл!');
      setManualError('');
    } catch (e: any) {
      setManualError(`Не удалось выполнить экспорт: ${e?.message || e}`);
      setManualSuccess('');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Файл не содержит корректные данные (ожидается { items, partsText })');
        }

        const importedItems = parsed.items;
        const importedPartsText = parsed.partsText !== undefined ? parsed.partsText : '';
        const importedDeletedIds = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];

        if (importedItems !== undefined && !Array.isArray(importedItems)) {
          throw new Error('Поле "items" должно быть списком ремонтов.');
        }

        const validatedItems = Array.isArray(importedItems) ? importedItems : [];

        onImportDb(validatedItems, importedPartsText, importedDeletedIds);
        setManualSuccess(`Отлично! Успешно загружен слепок из файла: ${validatedItems.length} записей восстановлено.`);
        setManualError('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err: any) {
        setManualError(`Некорректный формат файла резервной копии: ${err?.message || err}`);
        setManualSuccess('');
      }
    };
    reader.onerror = () => {
      setManualError('Ошибка при чтении файла с диска.');
      setManualSuccess('');
    };
    reader.readAsText(file);
  };

  const isYandexActive = !!token;
  const isGithubActive = !!(ghToken && ghRepo);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
      <div 
        id="cloud-settings-modal"
        className="bg-[#181818] rounded-xl border border-[#2b2b2b] max-w-lg w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Облачная синхронизация</h3>
              <p className="text-xs text-neutral-400">Резервное копирование и работа на нескольких устройствах</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-[#222222] border border-[#2d2d2d] hover:bg-[#2b2b2b] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sync Provider Toggles */}
        <div className="flex bg-[#111111] border-b border-[#262626] text-xs">
          <button
            type="button"
            onClick={() => onSetSyncProvider('yandex')}
            className={`flex-[1.1] py-3 font-semibold tracking-tight transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              syncProvider === 'yandex'
                ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Яндекс.Диск</span>
            {isYandexActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse flex-shrink-0"></span>}
          </button>
          
          <button
            type="button"
            onClick={() => onSetSyncProvider('github')}
            className={`flex-[1.1] py-3 font-semibold tracking-tight transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              syncProvider === 'github'
                ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Github className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">GitHub</span>
            {isGithubActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse flex-shrink-0"></span>}
          </button>

          <button
            type="button"
            onClick={() => onSetSyncProvider('manual')}
            className={`flex-[0.9] py-3 font-semibold tracking-tight transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              syncProvider === 'manual'
                ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Без интернета (JSON)</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 select-none">
          
          {/* ======================= TAB: MANUAL EXPORT/IMPORT ======================= */}
          {syncProvider === 'manual' && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="bg-[#111111] border border-[#262626] rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2.5 text-yellow-500">
                  <CheckCircle2 className="w-5 h-5 text-yellow-500" />
                  <h4 className="text-sm font-semibold text-neutral-100">100% Рабочий вариант без костылей</h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Этот способ <strong className="text-neutral-200">абсолютно автономен</strong> и работает вообще без интернета, VPN, прокси, сложных токенов, Git-аккаунтов и паролей. Вы просто скачиваете слепок вашей базы данных на одном устройстве и загружаете его на другом.
                </p>
                <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] text-neutral-400 font-sans border-t border-[#1f1f1f]">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400">✓</span> Без блокировок
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400">✓</span> Без ограничений CORS
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400">✓</span> Напрямую с диска
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400">✓</span> Файл можно слать в Telegram
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                
                {/* Export Button */}
                <div className="bg-[#1a1a1a] border border-[#2d2d2d] hover:border-neutral-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                  <div>
                    <h5 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-yellow-500" />
                      Экспорт в файл
                    </h5>
                    <p className="text-[10px] text-neutral-500 mt-1.5 leading-relaxed font-sans">
                      Скачает всю вашу базу ремонтов с текущего устройства в компактный файл <code className="text-neutral-300">repair_db.json</code>.
                    </p>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2 font-sans"
                  >
                    Сохранить базу на устройство
                  </button>
                </div>

                {/* Import Button */}
                <div className="bg-[#1a1a1a] border border-[#2d2d2d] hover:border-neutral-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                  <div>
                    <h5 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      Импорт из файла
                    </h5>
                    <p className="text-[10px] text-neutral-500 mt-1.5 leading-relaxed font-sans">
                      Загрузит базу из файла <code className="text-neutral-300">.json</code>, заменяя базу на этом устройстве на файл-слепок.
                    </p>
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportJson}
                    accept=".json"
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#2a2a2a] hover:bg-[#333333] border border-[#3a3a3a] hover:border-[#444444] text-white font-medium py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2 font-sans"
                  >
                    Выбрать и загрузить файл
                  </button>
                </div>

              </div>

              {/* Status messages */}
              {manualError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg flex items-start gap-2 text-xs font-sans">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{manualError}</span>
                </div>
              )}

              {manualSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg flex items-start gap-2 text-xs font-sans">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{manualSuccess}</span>
                </div>
              )}

              {/* Informative Instructions panel */}
              <div className="bg-[#141414] border border-[#222222] rounded-lg p-3 text-[10px] sm:text-xs text-neutral-400 space-y-2 font-sans">
                <h6 className="font-bold text-neutral-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-yellow-500" />
                  КАК ПЕРЕНЕСТИ РЕМОНТЫ НА ДРУГОЙ ТЕЛЕФОН/КОМПЬЮТЕР ЗА 3 ШАГА:
                </h6>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1 leading-relaxed">
                  <li>Нажмите <strong className="text-yellow-500">«Сохранить базу на устройство»</strong> на этом телефоне.</li>
                  <li>Перешлите файл <code className="text-[#eee] bg-[#222] px-1 rounded text-[10px]">repair_db_*.json</code> себе в Telegram или WhatsApp.</li>
                  <li>Откройте приложение на втором телефоне/ПК, зайдите сюда и нажмите <strong className="text-emerald-400">«Выбрать и загрузить файл»</strong>. Всё готово!</li>
                </ol>
              </div>
            </div>
          )}

          {/* ======================= TAB: YANDEX ======================= */}
          {syncProvider === 'yandex' && (
            <div className="space-y-4">
              {isYandexActive ? (
                /* Active Sync Status for Yandex */
                <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/20 p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-emerald-300">Яндекс.Диск подключен</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Все изменения автоматически улетают на Яндекс.Диск в файл <code className="text-neutral-300 font-mono">repair_db.json</code>.
                      </p>
                      <p className="text-xs text-neutral-400 mt-2">
                        Ваш коллега/брат может зайти со своего смартфона, подключить этот же токен и работать в режиме реального времени.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2 border-t border-emerald-500/10 text-xs text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-mono">ТЕКУЩИЙ СТАТУС:</span>
                      <span className={`font-semibold flex items-center gap-1.5 ${
                        syncStatus === 'synced' ? 'text-emerald-400' :
                        syncStatus === 'syncing' ? 'text-blue-400' :
                        syncStatus === 'error' ? 'text-rose-400' :
                        'text-yellow-500'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' :
                          syncStatus === 'syncing' ? 'bg-blue-400 animate-spin' :
                          syncStatus === 'error' ? 'bg-rose-500 animate-bounce' :
                          'bg-yellow-500'
                        }`}></span>
                        {syncStatus === 'synced' ? 'СИНХРОНИЗИРОВАНО' :
                         syncStatus === 'syncing' ? 'ИДЕТ ОТПРАВКА...' :
                         syncStatus === 'error' ? 'ОШИБКА ДИСКА' :
                         'ПОДКЛЮЧЕНО'}
                      </span>
                    </div>

                    {syncStatus === 'error' && syncErrorMessage && (
                      <div className="p-2.5 rounded bg-rose-500/5 border border-rose-500/10 text-rose-300 font-mono text-[10px] break-words leading-relaxed mt-1">
                        <span className="font-semibold text-rose-400">Детали ошибки:</span> {syncErrorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={onForceSync}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                    >
                      <RefreshCw className="w-3 h-3 text-yellow-500" />
                      Синхронизировать сейчас
                    </button>
                    <button
                      onClick={handleClearYandex}
                      className="bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 font-medium py-1.5 px-3 rounded text-xs transition-colors cursor-pointer"
                    >
                      Отключить
                    </button>
                  </div>
                </div>
              ) : (
                /* Promo card */
                <div className="bg-[#1f1f1f] rounded-lg border border-[#2b2b2b] p-4 text-center space-y-3">
                  <Cloud className="w-10 h-10 text-yellow-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Интеграция с Яндекс.Диском</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                      Позволяет хранить единую базу данных на вашем персональном Диске бесплатно и без VPN.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowYandexInstructions(!showYandexInstructions)}
                    className="text-xs text-yellow-500 hover:text-yellow-400 underline font-medium cursor-pointer"
                  >
                    {showYandexInstructions ? 'Скрыть инструкцию получения токена' : 'Показать инструкцию получения токена'}
                  </button>
                </div>
              )}

              {/* Instructions Yandex */}
              {!isYandexActive && showYandexInstructions && (
                <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 text-xs space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-yellow-500" />
                    Как подключить Яндекс за 1 минуту:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-400 leading-relaxed text-left">
                    <li>
                      Перейдите в OAuth-панель Яндекса:{' '}
                      <a
                        href="https://oauth.yandex.ru/client/new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-500 hover:text-yellow-400 inline-flex items-center gap-0.5 underline font-medium"
                      >
                        Создать приложение <ExternalLink className="w-3" />
                      </a>
                    </li>
                    <li>
                      Заполните любое имя приложения, в <strong>Платформы</strong> выберите <strong>Веб-сервисы</strong> и нажмите <strong>«Подставить URL для отладки»</strong>.
                    </li>
                    <li>
                      В доступах отметьте <strong>Яндекс.Диск (cloud_api)</strong> и поставьте галочки на все пункты (Папка приложения, чтение/запись Диска).
                    </li>
                    <li>
                      Нажмите «Создать приложение» и скопируйте <strong>ID приложения</strong> (Client id).
                    </li>
                    <li>
                      Запишите скопированный ID приложения ниже, чтобы сгенерировать токен:
                      <div className="mt-3.5 p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10.5px] text-neutral-400 block font-medium">
                            Ваш Client ID:
                          </label>
                          <input
                            type="text"
                            placeholder="Например: a0b1c2..."
                            value={clientId}
                            onChange={(e) => {
                              setClientId(e.target.value.trim());
                              setCopiedLink(false);
                            }}
                            className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2b2b2b] rounded text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 font-mono"
                          />
                        </div>
                        
                        {clientId && (
                          <div className="space-y-2">
                            <div className="p-2 bg-yellow-500/5 border border-yellow-500/10 rounded text-[10.5px] font-mono break-all text-neutral-300 leading-normal">
                              https://oauth.yandex.ru/authorize?response_type=token&client_id={clientId}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}`);
                                  setCopiedLink(true);
                                  setTimeout(() => setCopiedLink(false), 2000);
                                }}
                                className="flex-1 py-1 px-2.5 rounded bg-[#252525] hover:bg-[#303030] border border-[#3b3b3b] text-neutral-200 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Copy size={12} className="text-yellow-500" />
                                {copiedLink ? 'Скопировано!' : 'Скопировать ссылку'}
                              </button>
                              <a
                                href={`https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1 px-2.5 rounded bg-yellow-500 hover:bg-yellow-400 text-black text-[11px] font-semibold flex items-center justify-center gap-1 transition-all text-center"
                              >
                                Перейти за токеном
                                <ExternalLink size={11} />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  </ol>
                </div>
              )}

              {/* Form Yandex */}
              {!isYandexActive && (
                <form onSubmit={handleTestAndSaveYandex} className="space-y-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Токен Яндекс.Диска (OAuth):
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        placeholder="Вставьте полученный Яндекс-токен сюда..."
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-[#1c1c1c] border border-[#2d2d2d] rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  {yandexTestResult && (
                    <div className={`p-3 rounded-lg flex items-start gap-2 text-xs text-left ${
                      yandexTestResult.success 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                    }`}>
                      {yandexTestResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                      <span>{yandexTestResult.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={testingYandex}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none shadow-lg font-sans"
                  >
                    {testingYandex ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        ПРОВЕРКА...
                      </>
                    ) : (
                      'ПОДКЛЮЧИТЬ ЯНДЕКС'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================= TAB: GITHUB ======================= */}
          {syncProvider === 'github' && (
            <div className="space-y-4">
              {isGithubActive ? (
                /* Active Sync Status for GitHub */
                <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/20 p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-emerald-300">Синхронизация GitHub активна</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Ваша зашифрованная база хранится на GitHub в приватном репозитории в файле <code className="text-neutral-300 font-mono">{ghPath || 'repair_db.json'}</code>.
                      </p>
                      <p className="text-[11px] text-yellow-500 font-semibold bg-yellow-500/5 border border-yellow-500/10 rounded p-2 mt-2 leading-snug">
                        ⚡ <b>Рекомендуется для совместной работы!</b> В отличие от Яндекс.Диска, GitHub работает напрямую из вашего браузера, не ломается из-за блокировок, и хранит <u>полную историю изменений (коммитов)</u> на случай сбоев!
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2 border-t border-emerald-500/10 text-xs text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-mono">РЕПОЗИТОРИЙ:</span>
                      <span className="font-mono text-neutral-200 text-[11px] bg-[#222] px-1.5 py-0.5 rounded border border-[#2d2d2d]">{ghRepo}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-mono">ТЕКУЩИЙ СТАТУС:</span>
                      <span className={`font-semibold flex items-center gap-1.5 ${
                        syncStatus === 'synced' ? 'text-emerald-400' :
                        syncStatus === 'syncing' ? 'text-blue-400' :
                        syncStatus === 'error' ? 'text-rose-400' :
                        'text-yellow-500'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' :
                          syncStatus === 'syncing' ? 'bg-blue-400 animate-spin' :
                          syncStatus === 'error' ? 'bg-rose-500 animate-bounce' :
                          'bg-yellow-500'
                        }`}></span>
                        {syncStatus === 'synced' ? 'СИНХРОНИЗИРОВАНО' :
                         syncStatus === 'syncing' ? 'КОММИТИТСЯ...' :
                         syncStatus === 'error' ? 'ОШИБКА GITHUB' :
                         'ПОДКЛЮЧЕНО'}
                      </span>
                    </div>

                    {syncStatus === 'error' && syncErrorMessage && (
                      <div className="p-2.5 rounded bg-rose-500/5 border border-rose-500/10 text-rose-300 font-mono text-[10px] break-words leading-relaxed mt-1">
                        <span className="font-semibold text-rose-400">Детали ошибки:</span> {syncErrorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={onForceSync}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                    >
                      <RefreshCw className="w-3 h-3 text-yellow-500" />
                      Синхронизировать сейчас
                    </button>
                    <button
                      onClick={handleClearGithub}
                      className="bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 font-medium py-1.5 px-3 rounded text-xs transition-colors cursor-pointer"
                    >
                      Отключить
                    </button>
                  </div>
                </div>
              ) : (
                /* Promo card for GitHub */
                <div className="bg-[#1f1f1f] rounded-lg border border-[#2b2b2b] p-4 text-center space-y-3">
                  <Github className="w-10 h-10 text-yellow-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Интеграция с GitHub</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                      Самый надежный и профессиональный способ хранить базу данных на любом устройстве напрямую, без дополнительных серверов.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGithubInstructions(!showGithubInstructions)}
                    className="text-xs text-yellow-500 hover:text-yellow-400 underline font-medium cursor-pointer"
                  >
                    {showGithubInstructions ? 'Скрыть инструкцию GitHub' : 'Показать инструкцию GitHub'}
                  </button>
                </div>
              )}

              {/* Instructions GitHub */}
              {!isGithubActive && showGithubInstructions && (
                <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 text-xs space-y-3 max-h-72 overflow-y-auto scrollbar-thin text-left">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-yellow-500" />
                    Как подключить GitHub за 2 минуты:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-400 leading-relaxed">
                    <li>
                      Создайте бесплатный аккаунт на{' '}
                      <a href="https://github.com" target="_blank" rel="noreferrer" className="text-yellow-500 underline font-medium">github.com</a>
                    </li>
                    <li>
                      Создайте новый репозиторий:{' '}
                      <a
                        href="https://github.com/new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-500 hover:text-yellow-400 inline-flex items-center gap-0.5 underline font-medium"
                      >
                        github.com/new <ExternalLink className="w-3" />
                      </a>
                      <p className="pl-4 mt-1 text-neutral-500 text-[11px] leading-relaxed">
                        • Задайте имя (например, <strong>shop-db</strong>).<br />
                        • Выберите <strong>Private</strong> (чтобы база была скрыта от чужих глаз).<br />
                        • Поставьте галочку "Add a README file" (необязательно, но полезно).
                      </p>
                    </li>
                    <li>
                      Выпустите токен доступа (PAT):{' '}
                      <a
                        href="https://github.com/settings/tokens/new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-500 hover:text-yellow-400 inline-flex items-center gap-0.5 underline font-medium"
                      >
                        Создать Classic токен <ExternalLink className="w-3" />
                      </a>
                      <p className="pl-4 mt-1 text-neutral-500 text-[11px] leading-relaxed">
                        • Note (Имя): <strong>RepairApp</strong>.<br />
                        • Срок действия (Expiration): выберите <strong>No expiration</strong> (без ограничения по срокам) или свой вариант.<br />
                        • В списках прав (Scopes) отметьте самую первую галочку <strong>[✓] repo</strong> (со всеми внутренними пунктами). Это нужно, чтобы сайт мог записывать изменения в приватный репозиторий.<br />
                        • Нажмите на зелёную кнопку «Generate token» внизу страницы.<br />
                        • Копируйте готовый ключ (он начинается на <code className="text-yellow-400">ghp_...</code>) — он показывается только один раз!
                      </p>
                    </li>
                  </ol>
                </div>
              )}

              {/* Form GitHub */}
              {!isGithubActive && (
                <form onSubmit={handleTestAndSaveGithub} className="space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Токен GitHub Person-Access (Classic ghp_...):
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        placeholder="ghp_vH8W1rB7..."
                        value={inputGhToken}
                        onChange={(e) => setInputGhToken(e.target.value)}
                        className="w-full pl-10 pr-3 py-1.5 bg-[#1c1c1c] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-300 block">
                        Имя репозитория (логин/имя):
                      </label>
                      <input
                        type="text"
                        placeholder="например: ivan/my-db"
                        value={inputGhRepo}
                        onChange={(e) => setInputGhRepo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#1c1c1c] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 transition-all font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-300 block">
                        Имя файла в репо:
                      </label>
                      <input
                        type="text"
                        placeholder="repair_db.json"
                        value={inputGhPath}
                        onChange={(e) => setInputGhPath(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#1c1c1c] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {githubTestResult && (
                    <div className={`p-3 rounded-lg flex items-start gap-2 text-xs ${
                      githubTestResult.success 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                    }`}>
                      {githubTestResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                      <span>{githubTestResult.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={testingGithub}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none shadow-lg font-sans"
                  >
                    {testingGithub ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        ПРОВЕРКА...
                      </>
                    ) : (
                      'ПОДКЛЮЧИТЬ GITHUB'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================= LOGS PANEL (SHARED) ======================= */}
          {(isYandexActive || isGithubActive) && syncSteps && syncSteps.length > 0 && (
            <div className="border border-[#2b2b2b] rounded-lg bg-[#141414] overflow-hidden text-[11px] font-sans mt-3">
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="bg-[#1e1e1e] hover:bg-[#222222] border-b border-[#2b2b2b] px-3 py-2 flex items-center justify-between text-neutral-300 w-full transition-all cursor-pointer text-left"
              >
                <span className="font-semibold tracking-tight flex items-center gap-1.5 text-neutral-200">
                  <AlertTriangle className={`w-3.5 h-3.5 text-yellow-500 ${syncStatus === 'error' ? 'text-rose-500 animate-pulse' : ''}`} />
                  Детальный лог синхронизации {syncProvider === 'github' ? 'GitHub' : 'Yandex'}:
                </span>
                <span className="text-[10px] text-yellow-500 underline font-mono select-none">
                  {showLogs ? 'Скрыть ▴' : 'Развернуть ▾'}
                </span>
              </button>
              {showLogs && (
                <div className="p-3.5 space-y-2 max-h-56 overflow-y-auto font-mono text-[10px] sm:text-[10.5px] scrollbar-thin leading-relaxed">
                  {syncSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2 text-left items-start">
                      <span className="text-neutral-500 select-none whitespace-nowrap">[{step.time}]</span>
                      <span className={
                        step.status === 'success' ? 'text-emerald-400 font-semibold' :
                        step.status === 'error' ? 'text-rose-400 font-semibold' :
                        'text-neutral-300'
                      }>
                        {step.status === 'success' ? '✓ ' : step.status === 'error' ? '✗ ' : '· '}
                        {step.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>БЕЗОПАСНОЕ ХРАНЕНИЕ НА ВАШЕМ ОБЛАКЕ</span>
          <span className="text-yellow-500">{syncProvider === 'github' ? 'GitHub Git-Repo Integration' : 'Yandex.Disk Cloud Integration'}</span>
        </div>
      </div>
    </div>
  );
}
