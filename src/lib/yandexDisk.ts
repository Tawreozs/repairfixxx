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

// Helper to perform direct client-side download to Yandex Disk
async function downloadDirectFromClient(token: string): Promise<DownloadResult> {
  const pathCandidates = ['app:/repair_db.json', 'disk:/repair_db.json'];
  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Запрос на скачивание напрямую с API Яндекс.Диска без прокси', 'info');
  
  let pathIndex = 0;
  while (pathIndex < pathCandidates.length) {
    const path = pathCandidates[pathIndex];
    try {
      addStep(`Попытка получить ссылку на скачивание для: ${path}`, 'info');
      const metaUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`;
      
      const metaRes = await fetch(metaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });

      if (metaRes.status === 404) {
        addStep(`Файл ${path} не найден на Диске.`, 'info');
        if (pathIndex < pathCandidates.length - 1) {
          pathIndex++;
          continue;
        }
        addStep('Файл базы данных отсутствует на Яндекс.Диске.', 'success');
        return { success: true, exists: false, data: null, steps };
      }

      if (!metaRes.ok) {
        throw new Error(`Яндекс API вернул HTTP ${metaRes.status}`);
      }

      const metaData = await metaRes.json();
      const href = metaData.href;
      if (!href) {
        throw new Error('Отсутствует ссылка на прямое скачивание (href)');
      }

      addStep('Ссылка получена. Скачиваем содержимое напрямую в браузере...', 'info');
      const fileRes = await fetch(href);

      if (!fileRes.ok) {
        throw new Error(`Не удалось скачать файл: статус ${fileRes.status}`);
      }

      const text = await fileRes.text();
      const data = JSON.parse(text);
      addStep(`Успешно получено из ${path}!`, 'success');
      return { success: true, exists: true, data, steps };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addStep(`Режим статического сайта: Прямой запрос к ${path} заблокирован или прерван (ошибка CORS на клиенте). Подробно: ${errMsg}`, 'error');
      pathIndex++;
    }
  }

  addStep('Прямой доступ невозможен. Поскольку приложение работает без серверов и прокси (статический сайт на GitHub Pages), Яндекс блокирует запросы по правилам безопасности CORS.', 'error');
  return {
    success: false,
    exists: true,
    data: null,
    error: 'Доступ заблокирован браузером из-за ограничений CORS Яндекса. На GitHub Pages рекомендуется использовать режим "Без интернета (JSON)" - это абсолютно стабильно и безопасно.',
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

  addStep('Запрос адреса выгрузки напрямую с API Яндекс.Диска без прокси', 'info');
  
  for (const path of pathCandidates) {
    try {
      addStep(`Запрос временной PUT-ссылки для: ${path}`, 'info');
      const metaUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`;
      
      const metaRes = await fetch(metaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });

      if (!metaRes.ok) {
        throw new Error(`Яндекс API вернул HTTP ${metaRes.status}`);
      }

      const metaData = await metaRes.json();
      const href = metaData.href;
      if (!href) {
        throw new Error('Отсутствует ссылка PUT для загрузки');
      }

      addStep(`Временный адрес получен. Прямая PUT-отправка файла в облако...`, 'info');
      const uploadRes = await fetch(href, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(db, null, 2)
      });

      if (uploadRes.ok) {
        addStep(`База данных успешно сохранена в облаке на ${path}!`, 'success');
        return { success: true, steps };
      } else {
        throw new Error(`Сервер хранения вернул HTTP ${uploadRes.status}`);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addStep(`Прямая загрузка на ${path} сорвалась: ${errMsg} (ограничения CORS на статическом сайте)`, 'error');
    }
  }

  addStep('Отклонено политикой CORS. На статическом сайте GitHub Pages обмен данными с Яндекс Диском напрямую блокируется браузером.', 'error');
  return {
    success: false,
    error: 'Прямая выгрузка невозможна из-за CORS ограничений Яндекса. Пожалуйста, используйте ручную выгрузку/импорт на вкладке "Без интернета (JSON)" - это работает всегда.',
    steps
  };
}

export interface TestTokenResult {
  success: boolean;
  username?: string;
  error?: string;
}

// Direct client token test
async function testYandexTokenDirectly(token: string): Promise<TestTokenResult> {
  try {
    const res = await fetch('https://cloud-api.yandex.net/v1/disk/', {
      method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, username: data.user?.login || 'Пользователь Яндекс.Диска' };
    }

    if (res.status === 401) {
      return { success: false, error: 'Ошибка 401: Токен недействителен или истек.' };
    }

    if (res.status === 403) {
      return {
        success: false,
        error: 'Ошибка 403: Доступ запрещен. Проверьте разрешения OAuth-приложения.'
      };
    }

    return {
      success: false,
      error: `Яндекс API вернул статус ${res.status}.`
    };
  } catch (err: any) {
    console.error('Direct client test error:', err);
    return {
      success: false,
      error: `Не удалось связаться с Яндексом напрямую: ${err?.message || 'ошибка сети/CORS блокировка со стороны Яндекса на статическом хостинге'}`
    };
  }
}

// Global test function
export async function testYandexToken(token: string): Promise<TestTokenResult> {
  return await testYandexTokenDirectly(token.trim());
}

// Download database from Yandex.Disk
export async function downloadYandexDoc(token: string): Promise<DownloadResult> {
  return await downloadDirectFromClient(token.trim());
}

// Upload database to Yandex.Disk
export async function uploadYandexDoc(token: string, db: CloudDatabase): Promise<{ success: boolean; error?: string; steps?: SyncStep[] }> {
  return await uploadDirectFromClient(token.trim(), db);
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
