import React, { useState, useEffect } from 'react';
import { X, Key, Cloud, CheckCircle2, HelpCircle, AlertTriangle, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { testYandexToken } from '../lib/yandexDisk';

interface YandexSyncSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSaveToken: (newToken: string) => Promise<boolean>;
  onClearToken: () => void;
  syncStatus: 'syncing' | 'synced' | 'local' | 'error';
  syncErrorMessage?: string;
  syncSteps?: Array<{ time: string; message: string; status: 'info' | 'success' | 'error' }>;
  onForceSync: () => Promise<void>;
}

export default function YandexSyncSettings({
  isOpen,
  onClose,
  token,
  onSaveToken,
  onClearToken,
  syncStatus,
  syncErrorMessage,
  syncSteps = [],
  onForceSync
}: YandexSyncSettingsProps) {
  const [inputToken, setInputToken] = useState(token);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [clientId, setClientId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLogs, setShowLogs] = useState(syncStatus === 'error');

  useEffect(() => {
    if (syncStatus === 'error') {
      setShowLogs(true);
    }
  }, [syncStatus]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = inputToken.trim();
    if (!cleanToken) {
      setTestResult({ success: false, message: 'Пожалуйста, введите токен.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testYandexToken(cleanToken);

      if (result.success) {
        setTestResult({
          success: true,
          message: `Успешно! Диск подключен. Авторизован как: ${result.username}.`
        });
        await onSaveToken(cleanToken);
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Неверный токен или нет прав доступа.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Не удалось проверить токен: ${err?.message || 'ошибка сети'}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    onClearToken();
    setInputToken('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
      <div 
        id="yandex-settings-modal"
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
              <p className="text-xs text-neutral-400">Синхронизация через ваш Яндекс.Диск</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-[#222222] border border-[#2d2d2d] hover:bg-[#2b2b2b] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {token ? (
            /* Active Sync Status */
            <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/20 p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-emerald-300">Яндекс.Диск подключен</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Сайт автоматически и бесшумно сохраняет все данные на ваш личный Яндекс.Диск в файл <code className="text-neutral-300 font-mono">repair_db.json</code>.
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    Ваш брат может зайти с работы или дома, ввести этот же токен, и вы будете работать с <strong className="text-white">общей базой</strong>!
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2 border-t border-emerald-500/10 text-xs">
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
                  <div className="p-2.5 rounded bg-rose-500/5 border border-rose-500/10 text-rose-300 font-mono text-[10px] break-words text-left leading-relaxed mt-1">
                    <span className="font-semibold text-rose-400">Детали ошибки:</span> {syncErrorMessage}
                  </div>
                )}

                {syncSteps && syncSteps.length > 0 && (
                  <div className="mt-3 border border-[#2b2b2b] rounded-lg bg-[#141414] overflow-hidden text-[11px] font-sans">
                    <button
                      type="button"
                      onClick={() => setShowLogs(!showLogs)}
                      className="bg-[#1e1e1e] hover:bg-[#222222] border-b border-[#2b2b2b] px-3 py-2 flex items-center justify-between text-neutral-300 w-full transition-all cursor-pointer text-left"
                    >
                      <span className="font-semibold tracking-tight flex items-center gap-1.5 text-neutral-200">
                        <AlertTriangle className={`w-3.5 h-3.5 text-yellow-500 ${syncStatus === 'error' ? 'text-rose-500 animate-pulse' : ''}`} />
                        Детальный лог синхронизации:
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

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onForceSync}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Синхронизировать сейчас
                </button>
                <button
                  onClick={handleClear}
                  className="bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 font-medium py-1.5 px-3 rounded text-xs transition-colors cursor-pointer"
                >
                  Отключить
                </button>
              </div>
            </div>
          ) : (
            /* Promo / Instructions Toggle */
            <div className="bg-[#1f1f1f] rounded-lg border border-[#2b2b2b] p-4 text-center space-y-3">
              <Cloud className="w-10 h-10 text-yellow-500 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-white">Работайте вместе 24/7 бесплатно</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Сайт будет хранить файлы прямо на вашем личном Яндекс.Диске. Никаких серверов и VPN не требуется!
                </p>
              </div>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs text-yellow-500 hover:text-yellow-400 underline font-medium cursor-pointer"
              >
                {showInstructions ? 'Скрыть инструкцию по получению токена' : 'Показать инструкцию по получению токена'}
              </button>
            </div>
          )}

          {/* Quick Setup Instructions */}
          {showInstructions && (
            <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 text-xs space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-yellow-500" />
                Инструкция получения токена за 1 минуту:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-neutral-400 leading-relaxed">
                <li>
                  Перейдите по ссылке Яндекса:{' '}
                  <a
                    href="https://oauth.yandex.ru/client/new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-yellow-500 hover:text-yellow-400 inline-flex items-center gap-0.5 underline font-medium"
                  >
                    Создать приложение <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Введите название приложения (например, <code className="text-white bg-[#222] px-1 py-0.5 rounded font-mono">MyRepair</code>).
                </li>
                <li>
                  В разделе <strong className="text-white">Платформы</strong> выберите <strong className="text-white">Веб-сервисы</strong> и нажмите кнопку <strong className="text-white">«Подставить URL для отладки»</strong> (появится URL с кодом).
                </li>
                <li>
                  Внизу найдите <strong className="text-white">Яндекс.Диск (cloud_api)</strong> и выберите один или оба типа прав (наша система автоматически переключится на доступный режим):
                  <div className="pl-4 mt-1.5 space-y-1">
                    <div className="text-[11px] leading-relaxed"><span className="text-emerald-400 font-bold">• Доступ к папке приложения</span> (<code className="text-yellow-400 font-mono">cloud_api:write</code> или аналогичный) — для записи базы только в специальную выделенную папку <code className="text-neutral-400">Приложения/MyRepair/</code>.</div>
                    <div className="text-[11px] leading-relaxed"><span className="text-blue-400 font-bold">• Доступ к записи и чтению файлов на Диске</span> (<code className="text-yellow-400 font-mono">cloud_api:disk.write</code> / <code className="text-yellow-400 font-mono">info</code>) — для записи базы напрямую в корень вашего Диска.</div>
                    <div className="text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded mt-1 leading-snug">
                      💡 <b>Авто-выбор:</b> если токен не имеет прав на специальную папку, программа теперь автоматически переключится на сохранение в корень Диска (и наоборот), полностью уберегая вас от ошибок доступа!
                    </div>
                  </div>
                </li>
                <li>
                  Нажмите <strong className="text-white">«Создать приложение»</strong> внизу. Вы попадете на страницу со своими ключами. Скопируйте <strong className="text-yellow-400 font-mono">ID приложения</strong> (Client ID).
                </li>
                <li>
                  Получите готовый токен авторизации по вашей персональной ссылке:
                  <div className="mt-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 block font-medium">
                        Шаг А: Вставьте ваш скопированный <span className="text-yellow-500">Client ID</span> (ID приложения):
                      </label>
                      <input
                        type="text"
                        placeholder="Например: a0b1c2d3e4f5..."
                        value={clientId}
                        onChange={(e) => {
                          setClientId(e.target.value.trim());
                          setCopiedLink(false);
                        }}
                        className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2b2b2b] rounded text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 block font-medium">
                        Шаг Б: Перейдите по ссылке или скопируйте её:
                      </label>
                      {clientId ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-yellow-500/5 border border-yellow-500/10 rounded text-[11px] font-mono break-all text-neutral-200 select-all leading-normal">
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
                              className="flex-1 py-1.5 px-3 rounded bg-[#252525] hover:bg-[#303030] border border-[#3b3b3b] text-neutral-200 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Copy size={12} className="text-yellow-500" />
                              {copiedLink ? 'Скопировано!' : 'Скопировать ссылку'}
                            </button>
                            <a
                              href={`https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 px-3 rounded bg-yellow-500 hover:bg-yellow-400 text-black text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all text-center"
                            >
                              Перейти и получить токен
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-neutral-950 rounded border border-neutral-800 text-[10px] text-neutral-500 text-center italic">
                          Заполните ID приложения в "Шаге А", чтобы сгенерировать ссылку...
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Form to enter OAuth Token */}
          <form onSubmit={handleTestAndSave} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">
                Введите OAuth-токен Яндекс.Диска:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="Нажмите 'Создать приложение', чтобы получить токен и вставьте сюда..."
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1c1c1c] border border-[#2d2d2d] rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg flex items-start gap-2 text-xs ${
                testResult.success 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={testing}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none shadow-lg"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  ПРОВЕРКА ПОДКЛЮЧЕНИЯ...
                </>
              ) : token ? (
                'ОБНОВИТЬ И СОХРАНИТЬ ТОКЕН'
              ) : (
                'ПРОИЗВЕСТИ ПОДКЛЮЧЕНИЕ К ОБЛАКУ'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>БЕЗОПАСНОЕ ХРАНЕНИЕ НА ВАШЕМ ДИСКЕ</span>
          <span className="text-yellow-500">Yandex.Disk Cloud Integration</span>
        </div>
      </div>
    </div>
  );
}
