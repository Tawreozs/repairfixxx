export interface RepairItem {
  id: string;
  model: string;
  reason: string;
  date: string; // formats as DD.MM.YYYY, optionally HH:MM:SS
  contact: string;
  contact2?: string;
  name?: string;
  comment?: string;
  status: 'active' | 'archived';
  price?: number;     // Стоимость ремонта для клиента (выручка)
  partsCost?: number; // Себестоимость запчастей
  updatedAt?: number;  // Временная метка для бесконфликтной синхронизации
}

export type ActiveTab = 'phones' | 'purchases' | 'archive' | 'analytics';
