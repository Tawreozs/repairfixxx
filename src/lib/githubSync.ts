import { RepairItem } from '../types';
import { CloudDatabase, SyncStep, DownloadResult } from './yandexDisk';

// Helper to convert Unicode strings to Base64 (safely handling Cyrillic / UTF-8 characters)
function utf8ToBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

// Helper to decode Base64 safely back to Unicode UTF-8 strings
function base64ToUtf8(str: string): string {
  // Remove any whitespace/newlines from base64 string
  const cleanBase64 = str.replace(/\s/g, '');
  return decodeURIComponent(Array.prototype.map.call(atob(cleanBase64), (c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

export interface GithubTestResult {
  success: boolean;
  username?: string;
  error?: string;
}

// Helper to make direct GitHub verification requests from the browser
async function testGithubTokenDirectly(token: string, repo: string): Promise<GithubTestResult> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${cleanToken}`
      }
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, error: 'Ошибка 401: Токен GitHub недействителен или истек.' };
      }
      return { success: false, error: `GitHub вернул код ${userRes.status} при проверке пользователя.` };
    }

    const userData = await userRes.json();
    const username = userData.login || 'Пользователь';

    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${cleanToken}`
      }
    });

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return { success: false, error: `Внимание: репозиторий "${cleanRepo}" не найден. Убедитесь, что репозиторий создан в GitHub и токен имеет права доступа.` };
      }
      return { success: false, error: `Репозиторий недоступен: код ${repoRes.status} (${repoRes.statusText})` };
    }

    const repoData = await repoRes.json();
    const permissions = repoData.permissions;

    if (permissions && !permissions.push) {
      return { 
        success: true, 
        username: `${username} (Чтение/Ограниченный доступ)`, 
        error: 'Внимание: у токена нет прав на запись (push) в репозиторий!' 
      };
    }

    return { success: true, username: `${username} (Полный доступ)` };
  } catch (e: any) {
    console.error('Github auth test directly failed', e);
    return { success: false, error: `Сбой сети при связи с GitHub напрямую: ${e?.message || e}` };
  }
}

// Test GitHub access token and repository suitability
export async function testGithubToken(token: string, repo: string): Promise<GithubTestResult> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();

  if (!cleanToken) {
    return { success: false, error: 'Токен GitHub отсутствует' };
  }
  if (!cleanRepo || !cleanRepo.includes('/')) {
    return { success: false, error: 'Репозиторий должен быть в формате: владелец/имя (например, ivan/my-db)' };
  }

  return await testGithubTokenDirectly(cleanToken, cleanRepo);
}

// Helper to make direct GitHub file downloads from the browser
async function downloadDirectFromClient(token: string, repo: string, path: string): Promise<DownloadResult> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanPath = path.trim() || 'repair_db.json';

  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Начало прямого скачивания с GitHub через браузер', 'info');
  try {
    addStep(`Запрос файла "${cleanPath}" в репозитории "${cleanRepo}"...`, 'info');
    const res = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${cleanToken}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (res.status === 404) {
      addStep('Файл базы данных отсутствует в репозитории. Он будет создан при первой выгрузке.', 'info');
      return { success: true, exists: false, data: null, steps };
    }

    if (!res.ok) {
      let errMessage = `Код ответа GitHub: ${res.status}`;
      try {
        const errorJson = await res.json();
        errMessage = errorJson.message || errMessage;
      } catch {}
      addStep(`Ошибка загрузки напрямую: ${errMessage}`, 'error');
      return { success: false, exists: false, data: null, error: errMessage, steps };
    }

    const fileMeta = await res.json();
    if (fileMeta.type !== 'file') {
      throw new Error(`Указанный путь "${cleanPath}" ведет не к файлу, а к ${fileMeta.type}`);
    }

    if (fileMeta.sha) {
      localStorage.setItem(`github_sha_${cleanRepo}_${cleanPath}`, fileMeta.sha);
    }

    addStep('Файл найден, декодируем содержимое...', 'info');
    const b64Content = fileMeta.content || '';
    const text = base64ToUtf8(b64Content);
    const data = JSON.parse(text);

    addStep('База успешно скачана из GitHub напрямую и расшифрована!', 'success');
    return { success: true, exists: true, data, steps };
  } catch (e: any) {
    const errorStr = e?.message || String(e);
    addStep(`Отказ при прямом скачивании с GitHub: ${errorStr}`, 'error');
    return { success: false, exists: false, data: null, error: errorStr, steps };
  }
}

// Helper to make direct GitHub file uploads/commits from the browser
async function uploadDirectFromClient(
  token: string,
  repo: string,
  path: string,
  db: CloudDatabase
): Promise<{ success: boolean; error?: string; steps?: SyncStep[] }> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanPath = path.trim() || 'repair_db.json';

  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Начало прямой выгрузки на GitHub из браузера', 'info');
  try {
    addStep('Считывание свежего SHA-хеша...', 'info');
    let sha: string | null = localStorage.getItem(`github_sha_${cleanRepo}_${cleanPath}`);

    try {
      const shaRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${cleanToken}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (shaRes.ok) {
        const fileData = await shaRes.json();
        if (fileData.sha) {
          sha = fileData.sha;
          localStorage.setItem(`github_sha_${cleanRepo}_${cleanPath}`, sha);
        }
      } else if (shaRes.status === 404) {
        sha = null;
      }
    } catch {
      addStep('Используем локальный кэш SHA из-за ошибки сети.', 'info');
    }

    const jsonString = JSON.stringify(db, null, 2);
    const b64Content = utf8ToBase64(jsonString);

    const body: any = {
      message: `Sync service update: ${new Date().toLocaleString('ru-RU')}`,
      content: b64Content
    };

    if (sha) {
      body.sha = sha;
    }

    addStep('Отправка PUT-запроса коммита напрямую...', 'info');
    const res = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Authorization': `token ${cleanToken}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errMessage = `Статус ${res.status}`;
      try {
        const errJson = await res.json();
        errMessage = errJson.message || errMessage;
      } catch {}
      addStep(`GitHub вернул ошибку записи напрямую: ${errMessage}`, 'error');
      return { success: false, error: errMessage, steps };
    }

    const resData = await res.json();
    if (resData.content?.sha) {
      localStorage.setItem(`github_sha_${cleanRepo}_${cleanPath}`, resData.content.sha);
    }

    addStep('Коммит успешно отправлен напрямую!', 'success');
    return { success: true, steps };
  } catch (e: any) {
    const errorStr = e?.message || String(e);
    addStep(`Ошибка прямой отправки на GitHub: ${errorStr}`, 'error');
    return { success: false, error: errorStr, steps };
  }
}

// Download database file from GitHub
export async function downloadGithubDoc(token: string, repo: string, path: string = 'repair_db.json'): Promise<DownloadResult> {
  return await downloadDirectFromClient(token.trim(), repo.trim(), path.trim());
}

// Upload/commit database file to GitHub
export async function uploadGithubDoc(
  token: string, 
  repo: string, 
  path: string = 'repair_db.json', 
  db: CloudDatabase
): Promise<{ success: boolean; error?: string; steps?: SyncStep[] }> {
  return await uploadDirectFromClient(token.trim(), repo.trim(), path.trim(), db);
}
