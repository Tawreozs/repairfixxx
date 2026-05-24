import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RepairList from './components/RepairList';
import RepairDetail from './components/RepairDetail';
import PartsManager from './components/PartsManager';
import AddDialog from './components/AddDialog';
import Analytics from './components/Analytics';
import { RepairItem, ActiveTab } from './types';
import { INITIAL_PHONES, INITIAL_ARCHIVE, INITIAL_PARTS } from './initialData';
import { downloadYandexDoc, uploadYandexDoc, mergeDatabases } from './lib/yandexDisk';
import YandexSyncSettings from './components/YandexSyncSettings';
import { Phone, ShoppingCart, Trash2, TrendingUp, Cloud, Cpu } from 'lucide-react';

export default function App() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<ActiveTab>('phones');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RepairItem | null>(null);
  
  // Dialog Open states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isYdOpen, setIsYdOpen] = useState(false);

  // Core Data States with LocalStorage Persistence
  const [items, setItems] = useState<RepairItem[]>(() => {
    const stored = localStorage.getItem('repair_items');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse repair_items from localStorage:', e);
      }
    }
    return [...INITIAL_PHONES, ...INITIAL_ARCHIVE];
  });

  const [partsText, setPartsText] = useState<string>(() => {
    const stored = localStorage.getItem('parts_text');
    return stored !== null ? stored : INITIAL_PARTS;
  });

  // Track hard deleted repair record IDs to avoid syncing them back in
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('deleted_ids');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse deleted_ids from localStorage', e);
      }
    }
    return [];
  });

  // Yandex.Disk Synced Cloud parameters
  const [ydToken, setYdToken] = useState<string>(() => {
    return localStorage.getItem('yandex_disk_token') || '';
  });

  // Dynamic sync status indicator
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'local' | 'error'>('local');

  // Trigger Cloud Sync flow with Yandex Disk
  const triggerCloudSync = async (
    currentItems: RepairItem[],
    currentParts: string,
    currentDeleted: string[],
    tokenToUse?: string
  ) => {
    const token = tokenToUse !== undefined ? tokenToUse : ydToken;
    if (!token) {
      setSyncStatus('local');
      return;
    }

    setSyncStatus('syncing');
    try {
      // 1. Download database from Yandex.Disk
      const remoteDb = await downloadYandexDoc(token);
      
      if (remoteDb) {
        // 2. Perform safe, conflict-free database merge
        const { mergedItems, mergedPartsText, mergedDeletedIds } = mergeDatabases(
          currentItems,
          currentParts,
          currentDeleted,
          remoteDb
        );

        // 3. Update React local states
        setItems(mergedItems);
        setPartsText(mergedPartsText);
        setDeletedIds(mergedDeletedIds);

        // 4. Save newly merged consolidated DB back to cloud
        const uploadSuccess = await uploadYandexDoc(token, {
          items: mergedItems,
          partsText: mergedPartsText,
          deletedIds: mergedDeletedIds,
          updatedAt: Date.now()
        });

        if (uploadSuccess) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } else {
        // First sync on empty disk / file doesn't exist yet: initialize with current state
        const uploadSuccess = await uploadYandexDoc(token, {
          items: currentItems,
          partsText: currentParts,
          deletedIds: currentDeleted,
          updatedAt: Date.now()
        });

        if (uploadSuccess) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      }
    } catch (e) {
      console.error('Error during Yandex.Disk cloud sync:', e);
      setSyncStatus('error');
    }
  };

  // Run backend data loader OR Yandex.Disk sync on load
  useEffect(() => {
    if (ydToken) {
      triggerCloudSync(items, partsText, deletedIds, ydToken);
    } else {
      // Fallback: If no Yandex Disk connected, query the local node server
      const fetchBackendData = async () => {
        setSyncStatus('syncing');
        try {
          const response = await fetch('/api/repairs');
          if (response.ok) {
            const data = await response.json();
            setItems(data);
            
            const partsRes = await fetch('/api/parts');
            if (partsRes.ok) {
              const partsData = await partsRes.json();
              setPartsText(partsData.partsText);
            }
            setSyncStatus('synced');
          } else {
            setSyncStatus('local');
          }
        } catch (e) {
          console.warn('Backend server offline, relying on LocalStorage fallback.', e);
          setSyncStatus('local');
        }
      };
      fetchBackendData();
    }
  }, [ydToken]);

  // Periodic automatic sync with Cloud (every 45 seconds)
  useEffect(() => {
    if (!ydToken) return;

    const interval = setInterval(() => {
      triggerCloudSync(items, partsText, deletedIds, ydToken);
    }, 45000);

    return () => clearInterval(interval);
  }, [ydToken, items, partsText, deletedIds]);

  // Save changes to LocalStorage instantly
  useEffect(() => {
    localStorage.setItem('repair_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('parts_text', partsText);
  }, [partsText]);

  useEffect(() => {
    localStorage.setItem('deleted_ids', JSON.stringify(deletedIds));
  }, [deletedIds]);

  // Handle Yandex Token setup
  const handleSaveYandexToken = async (newToken: string): Promise<boolean> => {
    localStorage.setItem('yandex_disk_token', newToken);
    setYdToken(newToken);
    // Directly run immediate initial synchronization
    await triggerCloudSync(items, partsText, deletedIds, newToken);
    return true;
  };

  const handleClearYandexToken = () => {
    localStorage.removeItem('yandex_disk_token');
    setYdToken('');
    setSyncStatus('local');
  };

  // Derived datasets
  const activeItems = items.filter(item => item.status === 'active');
  const archivedItems = items.filter(item => item.status === 'archived');

  // Handle addition of a new entry
  const handleAddNewItem = async (newData: Omit<RepairItem, 'id' | 'status'>) => {
    const newItem: RepairItem = {
      ...newData,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'active',
      updatedAt: Date.now()
    };
    
    const updatedItems = [newItem, ...items];
    setItems(updatedItems);

    // 1. Save to Yandex Cloud (if token present)
    if (ydToken) {
      triggerCloudSync(updatedItems, partsText, deletedIds, ydToken);
    } else {
      // 2. Save directly to local Node express backend
      try {
        const res = await fetch('/api/repairs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  // Handle editing / saving an existing ticket details
  const handleUpdateItem = async (updated: RepairItem) => {
    const updatedWithTime = { ...updated, updatedAt: Date.now() };
    const updatedItems = items.map(item => item.id === updated.id ? updatedWithTime : item);
    
    setItems(updatedItems);
    setSelectedItem(updatedWithTime);

    if (ydToken) {
      triggerCloudSync(updatedItems, partsText, deletedIds, ydToken);
    } else {
      try {
        const res = await fetch(`/api/repairs/${updated.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedWithTime)
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  // Move a repair ticket to archive state
  const handleArchiveItem = async (id: string) => {
    let targetItem: RepairItem | undefined;
    const updatedItems = items.map(item => {
      if (item.id === id) {
        targetItem = { ...item, status: 'archived' as const, updatedAt: Date.now() };
        return targetItem;
      }
      return item;
    });

    setItems(updatedItems);
    
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(null);
    }

    if (ydToken) {
      triggerCloudSync(updatedItems, partsText, deletedIds, ydToken);
    } else if (targetItem) {
      try {
        const res = await fetch(`/api/repairs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetItem)
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  // Restore repair ticket back to active
  const handleRestoreItem = async (id: string) => {
    let targetItem: RepairItem | undefined;
    const updatedItems = items.map(item => {
      if (item.id === id) {
        targetItem = { ...item, status: 'active' as const, updatedAt: Date.now() };
        return targetItem;
      }
      return item;
    });

    setItems(updatedItems);

    if (ydToken) {
      triggerCloudSync(updatedItems, partsText, deletedIds, ydToken);
    } else if (targetItem) {
      try {
        const res = await fetch(`/api/repairs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetItem)
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  // Hard delete a record from list
  const handleDeleteItem = async (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    const updatedDeleted = Array.from(new Set([...deletedIds, id]));

    setItems(updatedItems);
    setDeletedIds(updatedDeleted);

    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(null);
    }

    if (ydToken) {
      triggerCloudSync(updatedItems, partsText, updatedDeleted, ydToken);
    } else {
      try {
        const res = await fetch(`/api/repairs/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  // Sync parts update
  const handleUpdatePartsText = async (newText: string) => {
    setPartsText(newText);
    
    if (ydToken) {
      triggerCloudSync(items, newText, deletedIds, ydToken);
    } else {
      try {
        const res = await fetch('/api/parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partsText: newText })
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  // DB Backup helpers
  const handleBackupExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ items, partsText, deletedIds }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `repair_db_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleBackupImport = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json && Array.isArray(json.items)) {
          setItems(json.items);
          if (typeof json.partsText === 'string') {
            setPartsText(json.partsText);
          }
          if (Array.isArray(json.deletedIds)) {
            setDeletedIds(json.deletedIds);
          }
          alert('Резервная копия успешно загружена!');
          
          if (ydToken) {
            triggerCloudSync(json.items, json.partsText || '', json.deletedIds || [], ydToken);
          } else {
            setSyncStatus('syncing');
            try {
              const res = await fetch('/api/backup/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json)
              });
              if (res.ok) {
                setSyncStatus('synced');
              } else {
                setSyncStatus('error');
              }
            } catch (err) {
              setSyncStatus('local');
            }
          }
        } else {
          alert('Неверный формат резервной копии. Должен быть JSON файл с полем "items".');
        }
      } catch (err) {
        alert('Ошибка при чтении файла.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex overflow-hidden font-sans select-none selection:bg-blue-500/20">
      
      {/* Mobile Top App Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#161616]/95 border-b border-[#262626] backdrop-blur-md z-40 flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-[1.5px] flex items-center justify-center shadow-md">
            <div className="w-full h-full bg-[#161616] rounded-[5px] flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <span className="font-semibold text-base tracking-tight text-white">
            Repair NEW
          </span>
        </div>

        {/* Yandex Settings shortcut indicator */}
        <button
          onClick={() => setIsYdOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold select-none cursor-pointer duration-300 transition-all ${
            syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            syncStatus === 'syncing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
            syncStatus === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
            'bg-[#1a1a1a] border-[#2b2b2b] text-amber-500'
          }`}
          title="Настройки Яндекс.Диска"
        >
          <Cloud size={14} className={syncStatus === 'syncing' ? 'animate-bounce' : ''} />
          <span className="font-mono text-[9px]">
            {syncStatus === 'synced' ? 'ОК' :
             syncStatus === 'syncing' ? 'СИНК' :
             syncStatus === 'error' ? 'ОШИБКА' :
             'ВЫКЛ'}
          </span>
        </button>
      </header>

      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setSelectedItem(null); // Clear selected item when changing views
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        activeCount={activeItems.length}
        archiveCount={archivedItems.length}
        syncStatus={syncStatus}
        onBackupImport={handleBackupImport}
        onBackupExport={handleBackupExport}
        onOpenYandexSettings={() => setIsYdOpen(true)}
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative pt-14 pb-16 md:pt-0 md:pb-0">
        
        {/* Detail view of custom repair item */}
        {selectedItem ? (
          <RepairDetail
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onUpdateItem={handleUpdateItem}
            onArchiveItem={handleArchiveItem}
            onRestoreItem={handleRestoreItem}
            onDeleteItem={handleDeleteItem}
          />
        ) : (
          /* Normal Tab views selection */
          <>
            {activeTab === 'phones' && (
              <RepairList
                items={activeItems}
                tab="phones"
                onSelectItem={(item) => setSelectedItem(item)}
                onAddItemClick={() => setIsAddOpen(true)}
                onArchiveItem={handleArchiveItem}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {activeTab === 'archive' && (
              <RepairList
                items={archivedItems}
                tab="archive"
                onSelectItem={(item) => setSelectedItem(item)}
                onRestoreItem={handleRestoreItem}
                onDeleteItem={handleDeleteItem}
              />
            )}

             {activeTab === 'purchases' && (
              <PartsManager
                partsText={partsText}
                onUpdateParts={handleUpdatePartsText}
              />
            )}

            {activeTab === 'analytics' && (
              <Analytics items={items} />
            )}
          </>
        )}

        {/* Floating Custom glide badge simulating bottom footer in original */}
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
          <div className="bg-[#1e1e1e]/90 text-neutral-400 text-[10px] font-medium font-sans px-3 py-1.5 rounded-lg border border-[#333333] backdrop-blur flex items-center gap-1.5 shadow-md">
            <span>Powered by</span>
            <span className="font-bold text-white tracking-wide flex items-center gap-0.5">
              <span className="text-blue-400">Glide</span>
              <span className="text-neutral-500">⚡</span>
              <span className="text-amber-500">React</span>
            </span>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#161616]/95 border-t border-[#262626] backdrop-blur-md z-40 flex items-center justify-around px-2 pb-safe md:hidden">
        {[
          { id: 'phones' as ActiveTab, label: 'Телефоны', icon: Phone, count: activeItems.length },
          { id: 'purchases' as ActiveTab, label: 'Покупки', icon: ShoppingCart, count: null },
          { id: 'archive' as ActiveTab, label: 'Архив', icon: Trash2, count: archivedItems.length },
          { id: 'analytics' as ActiveTab, label: 'Аналитика', icon: TrendingUp, count: null }
        ].map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedItem(null);
              }}
              className={`relative flex flex-col items-center justify-center w-16 h-full transition-all cursor-pointer ${
                isActive ? 'text-blue-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <IconComponent size={18} className={isActive ? 'text-blue-400 scale-110 transition-transform' : 'text-neutral-400'} />
                {item.count !== null && item.count > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 min-w-[14px] h-3.5 rounded-full bg-blue-500 text-[8px] font-bold text-white flex items-center justify-center shadow-sm">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-[9px] mt-1 font-medium truncate tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Slide-in form Drawer for creating repairs */}
      <AddDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddNewItem}
      />

      {/* Yandex.Disk Cloud Synchronization Settings Modal */}
      <YandexSyncSettings
        isOpen={isYdOpen}
        onClose={() => setIsYdOpen(false)}
        token={ydToken}
        onSaveToken={handleSaveYandexToken}
        onClearToken={handleClearYandexToken}
        syncStatus={syncStatus}
        onForceSync={() => triggerCloudSync(items, partsText, deletedIds, ydToken)}
      />
    </div>
  );
}
