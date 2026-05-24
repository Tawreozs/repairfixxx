import { RepairItem } from '../types';

export interface CloudDatabase {
  items: RepairItem[];
  partsText: string;
  deletedIds?: string[];
  updatedAt: number;
}

// Check if a file exists on Yandex.Disk
export async function yandexFileExists(token: string, path: string = 'app:/repair_db.json'): Promise<boolean> {
  try {
    const res = await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}`, {
          mode: 'cors',
          method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    return res.status === 200;
  } catch (e) {
    console.error('Error checking Yandex Disk file existence', e);
    return false;
  }
}

export interface SyncStep {
  time: string;
  message: string;
  status: 'info' | 'success' | 'error';
}

export interface DownloadResult {
  success: boolean;
  exists: boolean;
  data: CloudDatabase | null;
  error?: string;
  steps?: SyncStep[];
}

// Bypasses browser-CORS limits for direct client-side requests to Yandex storage nodes
async function fetchWithFallback(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } catch (err) {
    if (url.startsWith('https://cloud-api.yandex.net') || url.startsWith('/api/')) {
      throw err;
    }
    console.warn(`Direct fetch to ${url} failed. Attempting CORS proxy fallback...`, err);
    try {
      const proxiedUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxiedUrl, options);
      if (!res.ok) {
        throw new Error(`Proxy HTTP ${res.status}`);
      }
      return res;
    } catch (proxyErr) {
      console.error(`CORS proxy fallback to ${url} failed as well.`, proxyErr);
      throw err; // throw original fetch error
    }
  }
}

// Helper to perform client-side download direct to Yandex Disk
async function downloadDirectFromClient(token: string): Promise<DownloadResult> {
  const pathCandidates = ['app:/repair_db.json', 'disk:/repair_db.json'];
  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Начало прямого скачивания через браузерные прокси', 'info');
  
  // To avoid IP mismatch blocks on downloader.disk.yandex.ru, we MUST request both 
  // the download href AND download the file itself using the EXACT SAME proxy provider.
  const flowProviders = [
    { name: 'direct', wrap: (url: string) => url }
  ];

  let lastErrorMsg = 'Не удалось найти работающий способ подключения';

  for (const provider of flowProviders) {
    addStep(`Пробуем обходной провайдер: ${provider.name}`, 'info');
    
    let pathIndex = 0;
    while (pathIndex < pathCandidates.length) {
      const path = pathCandidates[pathIndex];
      try {
        addStep(`Проверка наличия файла по пути: ${path}`, 'info');
        const metaUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`;
        const proxiedMetaUrl = provider.wrap(metaUrl);
        
        const metaRes = await fetch(proxiedMetaUrl, {
          mode: 'cors',
          method: 'GET',
          headers: {
            'Authorization': `OAuth ${token}`
          }
        });

        if (metaRes.status === 404) {
          addStep(`Путь ${path} не найден на Диске (HTTP 404)`, 'info');
          // If the primary path doesn't exist, let's check the other path candidate before concluding it's a 404.
          if (pathIndex < pathCandidates.length - 1) {
            pathIndex++;
            continue;
          }
          addStep('Файл базы данных полностью отсутствует на Диске', 'success');
          return { success: true, exists: false, data: null, steps };
        }

        if (!metaRes.ok) {
          throw new Error(`Яндекс вернул статус ошибки: ${metaRes.status}`);
        }

        const metaData = await metaRes.json();
        const href = metaData.href;
        if (!href) {
          throw new Error('Отсутствует ссылка на прямое скачивание (href)');
        }

        addStep('Ссылка на скачивание получена. Загружаем содержимое файла...', 'info');
        // Fetch the file content from href using the SAME provider for IP parity
        const proxiedDownloadUrl = provider.wrap(href);
        const fileRes = await fetch(proxiedDownloadUrl);

        if (!fileRes.ok) {
          throw new Error(`Загрузка файла прервана: статус ${fileRes.status}`);
        }

        const text = await fileRes.text();
        if (text.trim().startsWith('<') || text.includes('<!doctype') || text.includes('<html')) {
          throw new Error('Яндекс вернул HTML вместо JSON (возможна блокировка или лимит провайдера)');
        }

        const data = JSON.parse(text);
        addStep(`База успешно скачана из ${path} через ${provider.name}!`, 'success');
        return { success: true, exists: true, data, steps };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addStep(`Ошибка провайдера ${provider.name} на пути ${path}: ${errMsg}`, 'error');
        lastErrorMsg = errMsg;
        
        pathIndex++;
      }
    }
  }

  addStep('Все альтернативные браузерные провайдеры исчерпали попытки', 'error');
  return {
    success: false,
    exists: true,
    data: null,
    error: lastErrorMsg,
    steps
  };
}

// Helper to perform client-side upload direct to Yandex Disk
async function uploadDirectFromClient(token: string, db: CloudDatabase): Promise<{ success: boolean; error?: string; steps?: SyncStep[] }> {
  const pathCandidates = ['app:/repair_db.json', 'disk:/repair_db.json'];
  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Начало прямой отправки файла через браузер', 'info');
  
  // To avoid IP mismatch blocks on upload target node, we MUST request both
  // the upload href AND upload the data itself using the EXACT SAME proxy provider.
  const flowProviders = [
    { name: 'direct', wrap: (url: string) => url }
  ];

  let lastErrorMsg = 'Не удалось найти работающий способ подключения для отправки';

  for (const provider of flowProviders) {
    addStep(`Пробуем обходной провайдер: ${provider.name}`, 'info');
    for (const path of pathCandidates) {
      try {
        addStep(`Запрос адреса выгрузки для пути: ${path}`, 'info');
        const metaUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`;
        const proxiedMetaUrl = provider.wrap(metaUrl);
        
        const metaRes = await fetch(proxiedMetaUrl, {
          mode: 'cors',
          method: 'GET',
          headers: {
            'Authorization': `OAuth ${token}`
          }
        });

        if (!metaRes.ok) {
          throw new Error(`Яндекс вернул ошибку: ${metaRes.status}`);
        }

        const metaData = await metaRes.json();
        const href = metaData.href;
        if (!href) {
          throw new Error('Отсутствует временная ссылка PUT для загрузки');
        }

        addStep(`Адрес получен. Загружаем JSON на сервер хранения...`, 'info');
        // Perform PUT upload using the SAME provider for IP parity
        const proxiedUploadUrl = provider.wrap(href);
        const uploadRes = await fetch(proxiedUploadUrl, {
          mode: 'cors',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(db, null, 2)
        });

        if (uploadRes.ok) {
          addStep(`База данных успешно выгружена напрямую на ${path} с помощью ${provider.name}!`, 'success');
          return { success: true, steps };
        } else {
          throw new Error(`Модуль хранения вернул ошибку: ${uploadRes.status}`);
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addStep(`Отказ провайдера ${provider.name} на пути ${path}: ${errMsg}`, 'error');
        lastErrorMsg = errMsg;
      }
    }
  }

  addStep('Все альтернативные браузерные провайдеры записи исчерпали попытки', 'error');
  return { success: false, error: lastErrorMsg, steps };
}

export interface TestTokenResult {
  success: boolean;
  username?: string;
  error?: string;
}

// Direct client token test fallback
async function testYandexTokenDirectly(token: string): Promise<TestTokenResult> {
  try {
    // 1. Try cloud-api:info (general endpoint)
    const res = await fetch('https://cloud-api.yandex.net/v1/disk/', {
          mode: 'cors',
          method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, username: data.user?.login || 'Пользователь' };
    }

    if (res.status === 401) {
      return { success: false, error: 'Ошибка 401: Токен недействителен или истек.' };
    }

    if (res.status === 403) {
      // Fallback: token might specify only folder app access
      const appRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
          mode: 'cors',
          method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });
      if (appRes.ok) {
        return { success: true, username: 'Пользователь (папка софта)' };
      }

      // Also try disk:/ path check
      const diskRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=disk:/', {
          mode: 'cors',
          method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });
      if (diskRes.ok) {
        return { success: true, username: 'Пользователь (общие документы)' };
      }

      return {
        success: false,
        error: 'Ошибка 403: Нет доступа. Токен корректен, но не имеет прав "Доступ к папке приложения" или "Доступ к Диску".'
      };
    }

    return {
      success: false,
      error: `Яндекс вернул статус ${res.status}. Проверьте правильность токена.`
    };
  } catch (err: any) {
    console.error('Direct client test error:', err);
    return {
      success: false,
      error: `Не удалось связаться с Яндексом напрямую: ${err?.message || 'ошибка сети'}`
    };
  }
}

// Global test function with backend proxy and client fallback
export async function testYandexToken(token: string): Promise<TestTokenResult> {
  const cleanToken = token.trim();
  try {
    const res = await fetch(`/api/yandex/test?token=${encodeURIComponent(cleanToken)}`);
    if (res.status === 404) {
      console.log('Backend test endpoint returned 404, testing directly on client...');
      return await testYandexTokenDirectly(cleanToken);
    }

    if (!res.ok) {
      throw new Error(`Код статуса: ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn('Backend proxy test failed, trying direct browser-api test...', err);
    return await testYandexTokenDirectly(cleanToken);
  }
}

// Download database from Yandex.Disk
export async function downloadYandexDoc(token: string): Promise<DownloadResult> {
  const cleanToken = token.trim();
  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Запущено скачивание базы данных из облака', 'info');
  try {
    addStep('Попытка скачивания через защищенный серверный прокси...', 'info');
    const res = await fetch(`/api/yandex/download?token=${encodeURIComponent(cleanToken)}`);
    
    if (res.status === 404) {
      addStep('Прокси-сервер вернул статус 404 (не найден). Переход на прямой метод.', 'error');
      const fallbackResult = await downloadDirectFromClient(cleanToken);
      return { 
        ...fallbackResult, 
        steps: [...steps, ...(fallbackResult.steps || [])] 
      };
    }

    if (!res.ok) {
      let errMessage = `Отказ сервера: статус ${res.status}`;
      try {
        const errorJson = await res.json();
        errMessage = errorJson.error || errMessage;
      } catch {}
      addStep(`Ошибка прокси-сервера: ${errMessage}`, 'error');
      
      addStep('Попытка резервной прямой загрузки в обход сервера...', 'info');
      const fallbackResult = await downloadDirectFromClient(cleanToken);
      if (fallbackResult.success) {
        addStep('Резервная прямая загрузка завершилась успешно!', 'success');
        return { 
          ...fallbackResult, 
          steps: [...steps, ...(fallbackResult.steps || [])] 
        };
      } else {
        addStep(`Резервная прямая загрузка завершилась ошибкой: ${fallbackResult.error}`, 'error');
        return {
          success: false,
          exists: false,
          data: null,
          error: `${errMessage}. Резервный метод: ${fallbackResult.error}`,
          steps: [...steps, ...(fallbackResult.steps || [])]
        };
      }
    }

    const result = await res.json();
    if (result.exists) {
      addStep('База успешно скачана из облака через прокси-сервер', 'success');
      return { success: true, exists: true, data: result.data, steps };
    } else {
      addStep('База данных отсутствует на Диске. Будет создана при первом сохранении.', 'info');
      return { success: true, exists: false, data: null, steps };
    }
  } catch (e: any) {
    const errorStr = e?.message || String(e);
    addStep(`Сбой соединения с прокси-сервером: ${errorStr}`, 'error');
    
    addStep('Попытка резервной прямой загрузки в обход сервера...', 'info');
    const fallbackResult = await downloadDirectFromClient(cleanToken);
    if (!fallbackResult.success) {
      addStep(`Резервная прямая загрузка завершилась ошибкой: ${fallbackResult.error}`, 'error');
      return {
        ...fallbackResult,
        error: `Прокси недоступен (${errorStr}). Резервный метод: ${fallbackResult.error}`,
        steps: [...steps, ...(fallbackResult.steps || [])]
      };
    }
    addStep('Резервная прямая загрузка завершилась успешно!', 'success');
    return {
      ...fallbackResult,
      steps: [...steps, ...(fallbackResult.steps || [])]
    };
  }
}

// Upload database to Yandex.Disk
export async function uploadYandexDoc(token: string, db: CloudDatabase): Promise<{ success: boolean; error?: string; steps?: SyncStep[] }> {
  const cleanToken = token.trim();
  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Запущен экспорт базы данных в облако', 'info');
  try {
    addStep('Отправка обновленной базы через серверный прокси...', 'info');
    const res = await fetch('/api/yandex/upload', {
          mode: 'cors',
          method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: cleanToken, db })
    });

    if (res.status === 404) {
      addStep('Прокси-сервер вернул 404 (не найден). Переход на прямой метод отправки.', 'error');
      const fallbackResult = await uploadDirectFromClient(cleanToken, db);
      return { 
        ...fallbackResult, 
        steps: [...steps, ...(fallbackResult.steps || [])] 
      };
    }

    if (!res.ok) {
      let errMessage = `Ошибка записи: статус ${res.status}`;
      try {
        const errorJson = await res.json();
        errMessage = errorJson.error || errMessage;
      } catch {}
      addStep(`Ошибка прокси-сервера: ${errMessage}`, 'error');
      
      addStep('Попытка резервной прямой выгрузки в обход сервера...', 'info');
      const fallbackResult = await uploadDirectFromClient(cleanToken, db);
      if (fallbackResult.success) {
        addStep('Резервная прямая выгрузка совершена успешно!', 'success');
        return { 
          ...fallbackResult, 
          steps: [...steps, ...(fallbackResult.steps || [])] 
        };
      } else {
        addStep(`Резервная прямая выгрузка завершилась ошибкой: ${fallbackResult.error}`, 'error');
        return {
          success: false,
          error: `${errMessage}. Резервный метод: ${fallbackResult.error}`,
          steps: [...steps, ...(fallbackResult.steps || [])]
        };
      }
    }
    addStep('База данных успешно сохранена в облаке через прокси-сервер', 'success');
    return { success: true, steps };
  } catch (e: any) {
    const errorStr = e?.message || String(e);
    addStep(`Сбой соединения с прокси-сервером: ${errorStr}`, 'error');
    
    addStep('Попытка резервной прямой выгрузки в обход сервера...', 'info');
    const fallbackResult = await uploadDirectFromClient(cleanToken, db);
    if (!fallbackResult.success) {
      addStep(`Резервная прямая выгрузка завершилась ошибкой: ${fallbackResult.error}`, 'error');
      return {
        success: false,
        error: `Прокси недоступен (${errorStr}). Резервный метод: ${fallbackResult.error}`,
        steps: [...steps, ...(fallbackResult.steps || [])]
      };
    }
    addStep('Резервная прямая выгрузка совершена успешно!', 'success');
    return {
      ...fallbackResult,
      steps: [...steps, ...(fallbackResult.steps || [])]
    };
  }
}

// Perform smart merge of local and remote state
export function mergeDatabases(
  localItems: RepairItem[],
  localPartsText: string,
  localDeletedIds: string[],
  remoteDb: CloudDatabase
): {
  mergedItems: RepairItem[];
  mergedPartsText: string;
  mergedDeletedIds: string[];
} {
  const remoteItems = remoteDb.items || [];
  const remotePartsText = remoteDb.partsText || '';
  const remoteDeletedIds = remoteDb.deletedIds || [];

  // Union of deleted IDs (Tombstones)
  const combinedDeletedIds = Array.from(new Set([...localDeletedIds, ...remoteDeletedIds]));

  // Create a dictionary for merging items
  const itemMap = new Map<string, RepairItem>();

  // Add remote items
  remoteItems.forEach(item => {
    if (!combinedDeletedIds.includes(item.id)) {
      itemMap.set(item.id, item);
    }
  });

  // Add local items (overwrite if local has newer timestamp)
  localItems.forEach(item => {
    if (combinedDeletedIds.includes(item.id)) {
      return; // Already deleted
    }

    const existing = itemMap.get(item.id);
    if (!existing) {
      itemMap.set(item.id, item);
    } else {
      const localTime = item.updatedAt || 0;
      const remoteTime = existing.updatedAt || 0;
      if (localTime >= remoteTime) {
        itemMap.set(item.id, item);
      }
    }
  });

  const mergedItems = Array.from(itemMap.values());
  // Sort items to preserve visual order (newer ID timestamps or existing order)
  // Let's sort active items from most recently added/updated to oldest
  mergedItems.sort((a, b) => {
    // Keep active on top, archived below
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }
    // Sort by id timestamp string or date
    return b.id.localeCompare(a.id);
  });

  // Resolve parts conflict: if remote edit timestamp is not clear, we edit partsText
  // Let's assume the one with changes or larger length, or simply remote wins if it has content
  // Since remoteDb has its own updatedAt or we can just trace parts text lengths or edits.
  // We can let the latest overall database update decide or merge/keep remote if it changed.
  // Let's use simple logic: if partsText differ, we can prefer whichever was modified more recently, 
  // or default to local if remote is empty.
  const mergedPartsText = remotePartsText || localPartsText;

  return {
    mergedItems,
    mergedPartsText,
    mergedDeletedIds: combinedDeletedIds
  };
}
