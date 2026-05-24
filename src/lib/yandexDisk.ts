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

// Download database from Yandex.Disk
export async function downloadYandexDoc(token: string): Promise<DownloadResult> {
  try {
    let path = 'app:/repair_db.json';
    let metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (metaRes.status === 403) {
      console.warn('403 Forbidden on app:/ road. Attempting automatic fallback to disk:/');
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
      throw new Error(`Сервер вернул статус ${metaRes.status} при получении ссылки на скачивание`);
    }

    const { href } = await metaRes.json();

    // 2. Fetch the actual content
    const fileRes = await fetch(href);
    if (!fileRes.ok) {
      throw new Error(`Не удалось загрузить файл по выданной ссылке: ${fileRes.status}`);
    }

    const data = await fileRes.json();
    return { success: true, exists: true, data };
  } catch (e: any) {
    console.error('Failed to download document from Yandex Disk', e);
    return { success: false, exists: true, data: null, error: e?.message || 'Неизвестная сетевая ошибка' };
  }
}

// Upload database to Yandex.Disk
export async function uploadYandexDoc(token: string, db: CloudDatabase): Promise<boolean> {
  try {
    let path = 'app:/repair_db.json';
    let metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
      method: 'GET',
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (metaRes.status === 403) {
      console.warn('403 Forbidden on upload to app:/ folder. Falling back to disk:/');
      path = 'disk:/repair_db.json';
      metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });
    }

    if (!metaRes.ok) {
      if (metaRes.status === 403) {
        console.error('Failed to get upload URL: 403 Forbidden. Your token does not have write access to this path.');
      }
      throw new Error(`Failed to get upload URL: ${metaRes.status}`);
    }

    const { href } = await metaRes.json();

    // 2. Perform the PUT upload
    const uploadRes = await fetch(href, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(db, null, 2)
    });

    return uploadRes.ok;
  } catch (e) {
    console.error('Failed to upload document to Yandex Disk', e);
    return false;
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
