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
