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

  try {
    const res = await fetch(`/api/github/test?token=${encodeURIComponent(cleanToken)}&repo=${encodeURIComponent(cleanRepo)}`);
    if (res.status === 404) {
      console.log('Backend GitHub test endpoint returned 404, testing directly on client...');
      return await testGithubTokenDirectly(cleanToken, cleanRepo);
    }
    if (!res.ok) {
      throw new Error(`Код статуса прокси: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Backend GitHub proxy test failed, trying direct browser-api test...', err);
    return await testGithubTokenDirectly(cleanToken, cleanRepo);
  }
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

// Download database file from GitHub
export async function downloadGithubDoc(token: string, repo: string, path: string = 'repair_db.json'): Promise<DownloadResult> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanPath = path.trim() || 'repair_db.json';

  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Запущено скачивание базы данных из GitHub', 'info');
  try {
    addStep('Попытка скачивания через надежный серверный прокси...', 'info');
    const res = await fetch(`/api/github/download?token=${encodeURIComponent(cleanToken)}&repo=${encodeURIComponent(cleanRepo)}&path=${encodeURIComponent(cleanPath)}`);

    if (res.status === 404) {
      addStep('Прокси-сервер вернул статус 404 (не найден). Переход на прямой метод.', 'error');
      const fallbackResult = await downloadDirectFromClient(cleanToken, cleanRepo, cleanPath);
      return {
        ...fallbackResult,
        steps: [...steps, ...(fallbackResult.steps || [])]
      };
    }

    if (!res.ok) {
      let errMessage = `Отказ прокси-сервера: статус ${res.status}`;
      try {
        const errorJson = await res.json();
        errMessage = errorJson.error || errMessage;
      } catch {}
      addStep(`Ошибка прокси-сервера: ${errMessage}`, 'error');

      addStep('Попытка резервной прямой загрузки с GitHub через браузер...', 'info');
      const fallbackResult = await downloadDirectFromClient(cleanToken, cleanRepo, cleanPath);
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
      if (result.sha) {
        localStorage.setItem(`github_sha_${cleanRepo}_${cleanPath}`, result.sha);
      }
      
      addStep('Файл получен из прокси, декодируем...', 'info');
      const b64Content = result.content || '';
      const text = base64ToUtf8(b64Content);
      const data = JSON.parse(text);

      addStep('База успешно скачана из GitHub через прокси-сервер', 'success');
      return { success: true, exists: true, data, steps };
    } else {
      addStep('База данных отсутствует в репозитории. Будет создана при первой отправке.', 'info');
      return { success: true, exists: false, data: null, steps };
    }
  } catch (e: any) {
    const errorStr = e?.message || String(e);
    addStep(`Сбой соединения с прокси-сервером: ${errorStr}`, 'error');

    addStep('Попытка резервной прямой загрузки с GitHub через браузер...', 'info');
    const fallbackResult = await downloadDirectFromClient(cleanToken, cleanRepo, cleanPath);
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

// Upload/commit database file to GitHub
export async function uploadGithubDoc(
  token: string, 
  repo: string, 
  path: string = 'repair_db.json', 
  db: CloudDatabase
): Promise<{ success: boolean; error?: string; steps?: SyncStep[] }> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanPath = path.trim() || 'repair_db.json';

  const steps: SyncStep[] = [];
  const addStep = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    steps.push({ time: new Date().toLocaleTimeString('ru-RU'), message, status });
  };

  addStep('Запущен экспорт базы данных в GitHub', 'info');
  try {
    addStep('Попытка отправки коммита через надежный серверный прокси...', 'info');
    
    // First, fetch freshest SHA via Server Proxy
    addStep('Считывание свежего SHA-хеша файла для предотвращения конфликтов...', 'info');
    let sha: string | null = null;
    try {
      const shaRes = await fetch(`/api/github/download?token=${encodeURIComponent(cleanToken)}&repo=${encodeURIComponent(cleanRepo)}&path=${encodeURIComponent(cleanPath)}`);
      if (shaRes.ok) {
        const result = await shaRes.json();
        if (result.exists && result.sha) {
          sha = result.sha;
          localStorage.setItem(`github_sha_${cleanRepo}_${cleanPath}`, sha);
          addStep(`Свежий SHA-хеш загружен через прокси (${sha.substring(0, 7)}).`, 'info');
        }
      } else if (shaRes.status === 404) {
        sha = null;
        addStep('Файл еще не создан на GitHub. Будет произведено создание.', 'info');
      }
    } catch (e) {
      sha = localStorage.getItem(`github_sha_${cleanRepo}_${cleanPath}`);
      addStep('Используем локальный кэш SHA из-за ошибки связи с прокси.', 'info');
    }

    // 2. Prepare payload
    const jsonString = JSON.stringify(db, null, 2);
    const b64Content = utf8ToBase64(jsonString);

    const uploadRes = await fetch('/api/github/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: cleanToken,
        repo: cleanRepo,
        path: cleanPath,
        content: b64Content,
        sha: sha
      })
    });

    if (uploadRes.status === 404) {
      addStep('Прокси-сервер вернул 404 (не найден). Переход на прямой метод отправки.', 'error');
      const fallbackResult = await uploadDirectFromClient(cleanToken, cleanRepo, cleanPath, db);
      return { 
        ...fallbackResult, 
        steps: [...steps, ...(fallbackResult.steps || [])] 
      };
    }

    if (!uploadRes.ok) {
      let errMessage = `Ошибка записи через прокси: статус ${uploadRes.status}`;
      try {
        const errorJson = await uploadRes.json();
        errMessage = errorJson.error || errMessage;
        if (uploadRes.status === 409) {
          errMessage = 'Конфликт версий коммита (409 Conflict). Пожалуйста, повторите синхронизацию - система автоматически обновит SHA.';
        }
      } catch {}
      addStep(`Ошибка прокси-сервера при отправке: ${errMessage}`, 'error');
      
      addStep('Попытка резервной прямой выгрузки с GitHub через браузер...', 'info');
      const fallbackResult = await uploadDirectFromClient(cleanToken, cleanRepo, cleanPath, db);
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

    const resData = await uploadRes.json();
    if (resData.sha) {
      localStorage.setItem(`github_sha_${cleanRepo}_${cleanPath}`, resData.sha);
    }

    addStep('Коммит успешно создан и влит через прокси-сервер!', 'success');
    return { success: true, steps };
  } catch (e: any) {
    const errorStr = e?.message || String(e);
    addStep(`Сбой соединения с прокси-сервером: ${errorStr}`, 'error');
    
    addStep('Попытка резервной прямой выгрузки с GitHub через браузер...', 'info');
    const fallbackResult = await uploadDirectFromClient(cleanToken, cleanRepo, cleanPath, db);
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
