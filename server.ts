import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Force Node to bypass Russian root certificate errors from Yandex Disk domains
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

// Robust secure fetch wrapper to handle request headers (User-Agent bypass) perfectly
async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

app.use(express.json({ limit: "10mb" }));

// Helper to load DB or initialize with default data
function loadDB() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse db.json, using default data.", e);
    }
  }

  // Fallback initial data
  const defaultData = {
    items: [
      {
        id: '1',
        model: 'Копия айфона',
        reason: 'без ремонта',
        date: '26.02.2026',
        contact: '89534553144',
        contact2: '',
        name: 'Иван',
        comment: 'Срочный заказ',
        status: 'active',
        price: 0,
        partsCost: 0
      },
      {
        id: '2',
        model: 'Honor 9c',
        reason: 'модуль в рамке',
        date: '04.03.2026',
        contact: '89991234567',
        contact2: '',
        name: 'Алексей',
        comment: 'Запчасть заказана',
        status: 'active',
        price: 3500,
        partsCost: 1500
      },
      {
        id: '3',
        model: 'Spark 20',
        reason: 'вода',
        date: '06.03.2026',
        contact: '89001112233',
        contact2: '',
        name: 'Дмитрий',
        comment: 'После залития, разобрать и почистить платы в ультразвуке',
        status: 'active',
        price: 2500,
        partsCost: 400
      },
      {
        id: '4',
        model: 'Колонка',
        reason: 'разъём питания',
        date: '12.05.2026',
        contact: '89123456789',
        contact2: '',
        name: 'Мария',
        comment: 'Замена гнезда Micro-USB',
        status: 'active',
        price: 1200,
        partsCost: 150
      },
      {
        id: 'arch1',
        model: 'Iphone 8',
        reason: 'Разобран клиентом, разорваны шлейфы, ни одного винта',
        date: '18.01.2025',
        contact: '89221112233',
        name: 'Сергей',
        status: 'archived',
        price: 4500,
        partsCost: 1200
      },
      {
        id: 'arch2',
        model: 'Redmi',
        reason: 'FRP',
        date: '20.01.2025',
        contact: '89332223344',
        name: 'Антон',
        status: 'archived',
        price: 1500,
        partsCost: 0
      },
      {
        id: 'arch3',
        model: 'A50',
        reason: 'модуль олед',
        date: '21.01.2025',
        contact: '89443334455',
        status: 'archived',
        price: 4000,
        partsCost: 1800
      }
    ],
    partsText: `8524 разъемы\nирфоны черные\nрадиоприёмник\nP smart 2021 стекло камеры + нижняя плата 500/1500 р. 892286127323\ny8p стекло камеры 89228653148 (100\\400)\nКрышка 12 pro plus 5G 1000 / 2500 р. 89228610735\nгеймпад с курками`
  };

  saveDB(defaultData);
  return defaultData;
}

function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write to db.json", e);
  }
}

// REST API Endpoints
app.get("/api/repairs", (req, res) => {
  const db = loadDB();
  res.json(db.items);
});

app.post("/api/repairs", (req, res) => {
  const db = loadDB();
  const newItem = req.body;
  
  if (!newItem.id) {
    newItem.id = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  
  db.items.unshift(newItem);
  saveDB(db);
  res.json(newItem);
});

app.put("/api/repairs/:id", (req, res) => {
  const db = loadDB();
  const { id } = req.params;
  const updatedItem = req.body;
  
  db.items = db.items.map((item: any) => (item.id === id ? { ...item, ...updatedItem } : item));
  saveDB(db);
  res.json({ success: true, item: updatedItem });
});

app.delete("/api/repairs/:id", (req, res) => {
  const db = loadDB();
  const { id } = req.params;
  
  db.items = db.items.filter((item: any) => item.id !== id);
  saveDB(db);
  res.json({ success: true });
});

app.get("/api/parts", (req, res) => {
  const db = loadDB();
  res.json({ partsText: db.partsText });
});

app.post("/api/parts", (req, res) => {
  const db = loadDB();
  const { partsText } = req.body;
  
  db.partsText = partsText;
  saveDB(db);
  res.json({ success: true });
});

// Full DB Backup Export / Import Endpoints
app.get("/api/backup/export", (req, res) => {
  const db = loadDB();
  res.setHeader("Content-disposition", "attachment; filename=repair_db_backup.json");
  res.setHeader("Content-type", "application/json");
  res.send(JSON.stringify(db, null, 2));
});

app.post("/api/backup/import", (req, res) => {
  const { items, partsText } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Неверный формат резервной копии: поле 'items' должно быть массивом." });
  }
  saveDB({ items, partsText: partsText || "" });
  res.json({ success: true });
});

// GitHub Proxy APIs to completely eliminate client-side CORS, network, or sandbox issues
app.get("/api/github/test", async (req, res) => {
  const token = (req.query.token as string)?.trim();
  const repo = (req.query.repo as string)?.trim();
  if (!token || !repo) {
    return res.status(400).json({ success: false, error: 'Токен или репозиторий отсутствует' });
  }

  try {
    // 1. Check user auth
    const userRes = await secureFetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`
      }
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return res.json({ success: false, error: 'Ошибка 401: Токен GitHub недействителен или истек.' });
      }
      return res.json({ success: false, error: `GitHub вернул код ${userRes.status} при проверке пользователя.` });
    }

    const userData: any = await userRes.json();
    const username = userData.login || 'Пользователь';

    // 2. Check repo access
    const repoRes = await secureFetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`
      }
    });

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return res.json({ success: false, error: `Внимание: репозиторий "${repo}" не найден. Убедитесь, что репозиторий создан в GitHub и токен имеет права доступа.` });
      }
      return res.json({ success: false, error: `Репозиторий недоступен: код ${repoRes.status}` });
    }

    const repoData: any = await repoRes.json();
    const permissions = repoData.permissions;

    if (permissions && !permissions.push) {
      return res.json({
        success: true,
        username: `${username} (Чтение/Ограниченный доступ)`,
        error: 'Внимание: у токена нет прав на запись (push) в репозиторий!'
      });
    }

    return res.json({ success: true, username: `${username} (Полный доступ)` });
  } catch (e: any) {
    console.error("Github test error on server:", e);
    res.json({ success: false, error: e?.message || 'Сетевая ошибка при связи с GitHub' });
  }
});

app.get("/api/github/download", async (req, res) => {
  const token = (req.query.token as string)?.trim();
  const repo = (req.query.repo as string)?.trim();
  const pathVal = (req.query.path as string)?.trim() || 'repair_db.json';

  if (!token || !repo) {
    return res.status(400).json({ error: 'Токен или репозиторий отсутствует' });
  }

  try {
    const resFile = await secureFetch(`https://api.github.com/repos/${repo}/contents/${pathVal}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (resFile.status === 404) {
      return res.json({ exists: false });
    }

    if (!resFile.ok) {
      let errMessage = `Код ответа GitHub: ${resFile.status}`;
      try {
        const errorJson = await resFile.json();
        errMessage = errorJson.message || errMessage;
      } catch {}
      return res.status(resFile.status).json({ error: errMessage });
    }

    const fileMeta: any = await resFile.json();
    if (fileMeta.type !== 'file') {
      return res.status(400).json({ error: `Путь "${pathVal}" ведет не к файлу, а к ${fileMeta.type}` });
    }

    return res.json({ 
      exists: true, 
      content: fileMeta.content || '', 
      sha: fileMeta.sha || '' 
    });
  } catch (e: any) {
    console.error("GitHub download error on server:", e);
    res.status(500).json({ error: e?.message || 'Ошибка сервера при скачивании с GitHub.' });
  }
});

app.post("/api/github/upload", async (req, res) => {
  const { token, repo, path: pathVal, content, sha } = req.body;
  const cleanToken = token?.trim();
  const cleanRepo = repo?.trim();
  const cleanPath = pathVal?.trim() || 'repair_db.json';

  if (!cleanToken || !cleanRepo || !content) {
    return res.status(400).json({ error: 'Параметры отсутствуют или некорректны' });
  }

  try {
    const body: any = {
      message: `Sync service update: ${new Date().toLocaleString('ru-RU')}`,
      content: content
    };

    if (sha) {
      body.sha = sha;
    }

    const resCommit = await secureFetch(`https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Authorization': `token ${cleanToken}`
      },
      body: JSON.stringify(body)
    });

    if (!resCommit.ok) {
      let errMessage = `Статус ${resCommit.status}`;
      try {
        const errJson = await resCommit.json();
        errMessage = errJson.message || errMessage;
      } catch {}
      return res.status(resCommit.status).json({ error: errMessage });
    }

    const resData: any = await resCommit.json();
    return res.json({ 
      success: true, 
      sha: resData.content?.sha || '' 
    });
  } catch (e: any) {
    console.error("GitHub upload error on server:", e);
    res.status(500).json({ error: e?.message || 'Ошибка сервера при записи коммита на GitHub.' });
  }
});

// Yandex Disk Proxy APIs to completely eliminate client-side CORS / sandbox issues
app.get("/api/yandex/test", async (req, res) => {
  const token = (req.query.token as string)?.trim();
  if (!token) {
    return res.status(400).json({ success: false, error: 'Токен отсутствует' });
  }

  try {
    // 1. Try general info check
    const infoRes = await secureFetch('https://cloud-api.yandex.net/v1/disk/', {
      headers: { 'Authorization': `OAuth ${token}` }
    });

    if (infoRes.ok) {
      const data: any = await infoRes.json();
      return res.json({ success: true, username: data.user?.login || 'Пользователь' });
    }

    if (infoRes.status === 401) {
      return res.json({ success: false, error: 'Ошибка 401: Недействительный или истекший токен.' });
    }

    // 2. Try app:/ folder check
    const appRes = await secureFetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
      headers: { 'Authorization': `OAuth ${token}` }
    });
    if (appRes.ok) {
      return res.json({ success: true, username: 'Пользователь (папка софта)' });
    }

    // 3. Try disk:/ folder check
    const diskRes = await secureFetch('https://cloud-api.yandex.net/v1/disk/resources?path=disk:/', {
      headers: { 'Authorization': `OAuth ${token}` }
    });
    if (diskRes.ok) {
      return res.json({ success: true, username: 'Пользователь (общий Диск)' });
    }

    res.json({
      success: false,
      error: `Ошибка доступа (код ${infoRes.status || 403}). Проверьте права токена в Яндексе.`
    });
  } catch (e: any) {
    console.error("Yandex test error on server:", e);
    res.json({ success: false, error: e?.message || 'Сетевая ошибка при связи с Яндексом' });
  }
});

app.get("/api/yandex/download", async (req, res) => {
  const token = (req.query.token as string)?.trim();
  if (!token) {
    return res.status(400).json({ error: 'Токен отсутствует' });
  }

  try {
    let path = 'app:/repair_db.json';
    let metaRes = await secureFetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
      headers: { 'Authorization': `OAuth ${token}` }
    });

    if (metaRes.status === 403) {
      path = 'disk:/repair_db.json';
      metaRes = await secureFetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
        headers: { 'Authorization': `OAuth ${token}` }
      });
    }

    if (!metaRes.ok) {
      if (metaRes.status === 404) {
        return res.json({ exists: false });
      }
      return res.status(metaRes.status).json({
        error: `Яндекс вернул статус ${metaRes.status} при получении ссылки на скачивание.`
      });
    }

    const metaData: any = await metaRes.json();
    const href = metaData.href;
    if (!href) {
      return res.status(500).json({ error: 'Не получен URL для скачивания от Яндекса' });
    }

    // Download with the OAuth Authorization header and standard User-Agent via secureFetch
    const fileRes = await secureFetch(href, {
      headers: { 'Authorization': `OAuth ${token}` }
    });
    if (!fileRes.ok) {
      return res.status(fileRes.status).json({ error: `Ошибка при скачивании файла: код ${fileRes.status}` });
    }

    const text = await fileRes.text();
    if (text.trim().startsWith('<') || text.includes('<!doctype') || text.includes('<html')) {
      return res.status(400).json({ error: 'Яндекс вернул HTML-страницу авторизации вместо JSON-файла. Вероятно, ваш токен недействителен, истек или требует повторного подтверждения прав.' });
    }

    try {
      const data = JSON.parse(text);
      return res.json({ exists: true, data });
    } catch {
      return res.status(500).json({ error: 'Неверный формат базы данных на Яндексе (ошибка JSON)' });
    }
  } catch (e: any) {
    console.error("Yandex download error on server:", e);
    res.status(500).json({ error: e?.message || 'Ошибка сервера во время скачивания с Яндекса.' });
  }
});

app.post("/api/yandex/upload", async (req, res) => {
  const { token, db } = req.body;
  const cleanToken = token?.trim();
  if (!cleanToken || !db) {
    return res.status(400).json({ error: 'Токен или данные отсутствуют' });
  }

  try {
    let path = 'app:/repair_db.json';
    let metaRes = await secureFetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
      headers: { 'Authorization': `OAuth ${cleanToken}` }
    });

    if (metaRes.status === 403) {
      path = 'disk:/repair_db.json';
      metaRes = await secureFetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
        headers: { 'Authorization': `OAuth ${cleanToken}` }
      });
    }

    if (!metaRes.ok) {
      return res.status(metaRes.status).json({ error: `Проблема с правами записи на Яндекс (код ${metaRes.status}).` });
    }

    const metaData: any = await metaRes.json();
    const href = metaData.href;
    if (!href) {
      return res.status(500).json({ error: 'Не получен URL для загрузки от Яндекса' });
    }

    const uploadRes = await secureFetch(href, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `OAuth ${cleanToken}`
      },
      body: JSON.stringify(db, null, 2)
    });

    if (uploadRes.ok) {
      return res.json({ success: true });
    } else {
      return res.status(uploadRes.status).json({ error: `Ошибка отправки PUT-запроса на Яндекс: статус ${uploadRes.status}` });
    }
  } catch (e: any) {
    console.error("Yandex upload error on server:", e);
    res.status(500).json({ error: e?.message || 'Ошибка сервера при отправке файла на Яндекс.' });
  }
});

// Serve frontend with Vite inside Express
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK] Server successfully running at http://localhost:${PORT}`);
  });
}

bootstrap();
