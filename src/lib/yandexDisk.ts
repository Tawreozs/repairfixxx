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

export interface DownloadResult {
  success: boolean;
  exists: boolean;
  data: CloudDatabase | null;
  error?: string;
}

// Helper to perform client-side download direct to Yandex Disk
async function downloadDirectFromClient(token: string): Promise<DownloadResult> {
  try {
    let path = 'app:/repair_db.json';
    let metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (metaRes.status === 403) {
      console.warn('403 Forbidden on app:/ road for download. Attempting fallback to disk:/');
      path = 'disk:/repair_db.json';
      metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });
    }

    if (!metaRes.ok) {
      if (metaRes.status === 404) {
        return { success: true, exists: false, data: null }; // File does not exist yet
      }
      if (metaRes.status === 403) {
        throw new Error(`Ошибка 403: Нет доступа. Проверьте права токена в Яндексе (нужен доступ к "Папке приложения" ИЛИ "Записи файлов на Диск").`);
      }
      if (metaRes.status === 401) {
        throw new Error(`Ошибка 401: Токен недействителен (авторизация не пройдена).`);
      }
      throw new Error(`Яндекс вернул статус ${metaRes.status} при получении ссылки на скачивание`);
    }

    const { href } = await metaRes.json();
    if (!href) {
      throw new Error('Не получен URL для скачивания от Яндекса');
    }

    // 2. Fetch the actual content
    const fileRes = await fetch(href);
    if (!fileRes.ok) {
      throw new Error(`Не удалось загрузить файл по выданной ссылке: ${fileRes.status}`);
    }

    const text = await fileRes.text();
    if (text.trim().startsWith('<') || text.includes('<!doctype') || text.includes('<html')) {
      throw new Error('Яндекс вернул HTML-страницу авторизации вместо JSON-файла. Проверьте права токена.');
    }

    const data = JSON.parse(text);
    return { success: true, exists: true, data };
  } catch (e: any) {
    console.error('Failed direct download from Yandex Disk', e);
    return { success: false, exists: true, data: null, error: e?.message || 'Неизвестная сетевая ошибка напрямую' };
  }
}

// Helper to perform client-side upload direct to Yandex Disk
async function uploadDirectFromClient(token: string, db: CloudDatabase): Promise<boolean> {
  try {
    let path = 'app:/repair_db.json';
    let metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
      method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (metaRes.status === 403) {
      path = 'disk:/repair_db.json';
      metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });
    }

    if (!metaRes.ok) {
      console.error('Failed direct upload authorization:', metaRes.status);
      return false;
    }

    const { href } = await metaRes.json();
    if (!href) return false;

    // 2. Perform PUT upload
    const uploadRes = await fetch(href, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(db, null, 2)
    });

    return uploadRes.ok;
  } catch (e) {
    console.error('Failed direct upload to Yandex Disk', e);
    return false;
  }
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
  try {
    const res = await fetch(`/api/yandex/download?token=${encodeURIComponent(cleanToken)}`);
    
    if (res.status === 404) {
      console.log("Backend download proxy not found (404), falling back to client-side direct...");
      return await downloadDirectFromClient(cleanToken);
    }

    if (!res.ok) {
      let errMessage = `Отказ сервера: статус ${res.status}`;
      try {
        const errorJson = await res.json();
        errMessage = errorJson.error || errMessage;
      } catch {
        // Fallback if not a json error
      }
      throw new Error(errMessage);
    }

    const result = await res.json();
    if (result.exists) {
      return { success: true, exists: true, data: result.data };
    } else {
      return { success: true, exists: false, data: null };
    }
  } catch (e: any) {
    console.warn('Failed backend download from Yandex Disk, attempting direct download...', e);
    return await downloadDirectFromClient(cleanToken);
  }
}

// Upload database to Yandex.Disk
export async function uploadYandexDoc(token: string, db: CloudDatabase): Promise<boolean> {
  const cleanToken = token.trim();
  try {
    const res = await fetch('/api/yandex/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: cleanToken, db })
    });

    if (res.status === 404) {
      console.log("Backend upload proxy not found (404), falling back to client-side direct...");
      return await uploadDirectFromClient(cleanToken, db);
    }

    if (!res.ok) {
      console.error(`Failed to upload to server proxy: responded with ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Failed backend upload to Yandex Disk, attempting direct upload...', e);
    return await uploadDirectFromClient(cleanToken, db);
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
