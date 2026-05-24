import React, { useState } from 'react';
import { X, Key, Cloud, CheckCircle2, HelpCircle, AlertTriangle, RefreshCw, Copy, ExternalLink } from 'lucide-react';

interface YandexSyncSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSaveToken: (newToken: string) => Promise<boolean>;
  onClearToken: () => void;
  syncStatus: 'syncing' | 'synced' | 'local' | 'error';
  onForceSync: () => Promise<void>;
}

export default function YandexSyncSettings({
  isOpen,
  onClose,
  token,
  onSaveToken,
  onClearToken,
  syncStatus,
  onForceSync
}: YandexSyncSettingsProps) {
  const [inputToken, setInputToken] = useState(token);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(!token);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setTestResult({ success: false, message: 'Пожалуйста, введите токен.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Test token on Yandex API
      const res = await fetch('https://cloud-api.yandex.net/v1/disk/', {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${inputToken.trim()}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const username = data.user?.login || 'Пользователь';
        setTestResult({
          success: true,
          message: `Успешно! Диск подключен. Пользователь: ${username}.`
        });
        await onSaveToken(inputToken.trim());
      } else {
        setTestResult({
          success: false,
          message: 'Ошибка: Токен не подошел или истек. Проверьте правильность.'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Не удалось связаться с серверами Яндекс. Проверьте интернет.'
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

              <div className="pt-2 flex items-center justify-between border-t border-emerald-500/10 text-xs">
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
                  Внизу найдите <strong className="text-white">Яндекс.Диск (cloud_api)</strong> и поставьте галочки:
                  <div className="pl-4 mt-1 space-y-0.5">
                    <div>• <code className="text-yellow-400 font-mono">Доступ к информации о Диске (cloud_api:info)</code></div>
                    <div>• <code className="text-yellow-400 font-mono">Доступ к папке приложения (cloud_api:write)</code></div>
                  </div>
                </li>
                <li>
                  Нажмите <strong className="text-white">«Создать приложение»</strong> внизу. Вы попадете на страницу со своими ключами. Скопируйте <strong className="text-yellow-400 font-mono">ID приложения</strong> (Client ID).
                </li>
                <li>
                  Вставьте ваш скопированный <strong className="text-white">Client ID</strong> в ссылку ниже и перейдите по ней для получения готового токена:
                  <div className="mt-2 bg-[#222] p-2 rounded border border-[#333] break-all font-mono">
                    https://oauth.yandex.ru/authorize?response_type=token&client_id=<span className="text-yellow-500 font-bold">ВАШ_ID_ПРИЛОЖЕНИЯ</span>
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
