import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

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

// Yandex Disk Proxy APIs to completely eliminate client-side CORS / sandbox issues
app.get("/api/yandex/test", async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Токен отсутствует' });
  }

  try {
    // 1. Try general info check
    const infoRes = await fetch('https://cloud-api.yandex.net/v1/disk/', {
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
    const appRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
      headers: { 'Authorization': `OAuth ${token}` }
    });
    if (appRes.ok) {
      return res.json({ success: true, username: 'Пользователь (папка софта)' });
    }

    // 3. Try disk:/ folder check
    const diskRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=disk:/', {
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
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ error: 'Токен отсутствует' });
  }

  try {
    let path = 'app:/repair_db.json';
    let metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
      headers: { 'Authorization': `OAuth ${token}` }
    });

    if (metaRes.status === 403) {
      path = 'disk:/repair_db.json';
      metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`, {
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

    const fileRes = await fetch(href);
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
  if (!token || !db) {
    return res.status(400).json({ error: 'Токен или данные отсутствуют' });
  }

  try {
    let path = 'app:/repair_db.json';
    let metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
      headers: { 'Authorization': `OAuth ${token}` }
    });

    if (metaRes.status === 403) {
      path = 'disk:/repair_db.json';
      metaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
        headers: { 'Authorization': `OAuth ${token}` }
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

    const uploadRes = await fetch(href, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
