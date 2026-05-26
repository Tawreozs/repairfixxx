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
import { downloadGithubDoc, uploadGithubDoc } from './lib/githubSync';
import YandexSyncSettings from './components/YandexSyncSettings';
import PWAInstallGuide from './components/PWAInstallGuide';
import { Phone, ShoppingCart, Trash2, TrendingUp, Cloud, Cpu, RefreshCw, CheckCircle2, Smartphone } from 'lucide-react';

export default function App() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<ActiveTab>('phones');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RepairItem | null>(null);
  
  // Dialog Open states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isYdOpen, setIsYdOpen] = useState(false);
  const [isPwaOpen, setIsPwaOpen] = useState(false);

  // PWA installation trigger references
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen to app installed event
    window.addEventListener('appinstalled', () => {
      showToast('Приложение успешно установлено на устройство!', 'success');
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

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

  // Cloud Synchronization Provider choice
  const [syncProvider, setSyncProvider] = useState<'yandex' | 'github' | 'manual'>(() => {
    return (localStorage.getItem('cloud_sync_provider') as 'yandex' | 'github' | 'manual') || 'yandex';
  });

  // Yandex.Disk Synced Cloud parameters
  const [ydToken, setYdToken] = useState<string>(() => {
    return localStorage.getItem('yandex_disk_token') || '';
  });

  // GitHub Synced Cloud parameters
  const [ghToken, setGhToken] = useState<string>(() => {
    return localStorage.getItem('github_sync_token') || '';
  });

  const [ghRepo, setGhRepo] = useState<string>(() => {
    return localStorage.getItem('github_sync_repo') || '';
  });

  const [ghPath, setGhPath] = useState<string>(() => {
    return localStorage.getItem('github_sync_path') || 'repair_db.json';
  });

  // Dynamic sync status indicator
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'local' | 'error'>('local');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string>('');
  const [syncSteps, setSyncSteps] = useState<any[]>(() => {
    const stored = localStorage.getItem('yandex_sync_steps');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Simple, elegant global toast system
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const isCloudActive = () => {
    if (syncProvider === 'github') {
      return !!(ghToken && ghRepo);
    }
    return !!ydToken;
  };

  // Trigger Cloud Sync flow with active provider
  const triggerCloudSync = async (
    currentItems: RepairItem[],
    currentParts: string,
    currentDeleted: string[],
    overrideToken?: string,
    overrideRepo?: string,
    overridePath?: string
  ) => {
    const provider = syncProvider;
    
    if (provider === 'github') {
      const token = overrideToken !== undefined ? overrideToken : ghToken;
      const repo = overrideRepo !== undefined ? overrideRepo : ghRepo;
      const pathValue = overridePath !== undefined ? overridePath : ghPath;

      if (!token || !repo) {
        setSyncStatus('local');
        return;
      }

      setSyncStatus('syncing');
      setSyncErrorMessage('');
      let downloadResult: any = null;
      try {
        // 1. Download database from GitHub
        downloadResult = await downloadGithubDoc(token, repo, pathValue);
        
        if (downloadResult.steps) {
          setSyncSteps(downloadResult.steps);
          localStorage.setItem('yandex_sync_steps', JSON.stringify(downloadResult.steps));
        }

        if (!downloadResult.success) {
          console.warn('GitHub pull failed. Aborting upload to avoid dataloss.', downloadResult.error);
          setSyncStatus('error');
          setSyncErrorMessage(downloadResult.error || 'Не удалось получить данные с GitHub.');
          showToast('Ошибка репозитория. Синхронизация отложена.', 'error');
          return;
        }

        let finalSteps = downloadResult.steps || [];

        if (downloadResult.exists && downloadResult.data) {
          const remoteDb = downloadResult.data;
          const remoteItems = remoteDb.items || [];
          const remotePartsText = remoteDb.partsText || '';
          const localIds = new Set(currentItems.map(i => i.id));
          const hasNewIncomingItems = remoteItems.length === 0 ? false : remoteItems.some(item => !localIds.has(item.id));
          const hasNewPartsText = remotePartsText !== currentParts && remotePartsText !== '';

          // 2. Perform safe database merge
          const { mergedItems, mergedPartsText, mergedDeletedIds } = mergeDatabases(
            currentItems,
            currentParts,
            currentDeleted,
            remoteDb
          );

          // 3. Update states
          setItems(mergedItems);
          setPartsText(mergedPartsText);
          setDeletedIds(mergedDeletedIds);

          // 4. Save consolidated back to GitHub
          const uploadResult = await uploadGithubDoc(token, repo, pathValue, {
            items: mergedItems,
            partsText: mergedPartsText,
            deletedIds: mergedDeletedIds,
            updatedAt: Date.now()
          });

          if (uploadResult.steps) {
            finalSteps = [...finalSteps, ...uploadResult.steps];
            setSyncSteps(finalSteps);
            localStorage.setItem('yandex_sync_steps', JSON.stringify(finalSteps));
          }

          if (uploadResult.success) {
            setSyncStatus('synced');
            setSyncErrorMessage('');
            if (hasNewIncomingItems || hasNewPartsText) {
              showToast('GitHub: получены новые записи!', 'success');
            }
          } else {
            setSyncStatus('error');
            setSyncErrorMessage(uploadResult.error || 'Не удалось записать изменения в GitHub.');
          }
        } else {
          // Initialize empty
          const uploadResult = await uploadGithubDoc(token, repo, pathValue, {
            items: currentItems,
            partsText: currentParts,
            deletedIds: currentDeleted,
            updatedAt: Date.now()
          });

          if (uploadResult.steps) {
            finalSteps = [...finalSteps, ...uploadResult.steps];
            setSyncSteps(finalSteps);
            localStorage.setItem('yandex_sync_steps', JSON.stringify(finalSteps));
          }

          if (uploadResult.success) {
            setSyncStatus('synced');
            setSyncErrorMessage('');
          } else {
            setSyncStatus('error');
            setSyncErrorMessage(uploadResult.error || 'Не удалось создать базу данных в репозитории на GitHub.');
          }
        }
      } catch (e: any) {
        console.error('Error during GitHub cloud sync:', e);
        setSyncStatus('error');
        setSyncErrorMessage(e?.message || 'Неизвестная ошибка во время синхронизации.');
        const errStep = {
          time: new Date().toLocaleTimeString('ru-RU'),
          message: `Критический сбой синхронизации GitHub: ${e?.message || 'Неизвестная ошибка'}`,
          status: 'error' as const
        };
        const updated = [...(downloadResult?.steps || []), errStep];
        setSyncSteps(updated);
        localStorage.setItem('yandex_sync_steps', JSON.stringify(updated));
      }
    } else {
      // Yandex Provider flow
      const token = overrideToken !== undefined ? overrideToken : ydToken;
      if (!token) {
        setSyncStatus('local');
        return;
      }

      setSyncStatus('syncing');
      setSyncErrorMessage('');
      let downloadResult: any = null;
      try {
        // 1. Download database from Yandex.Disk
        downloadResult = await downloadYandexDoc(token);
        
        if (downloadResult.steps) {
          setSyncSteps(downloadResult.steps);
          localStorage.setItem('yandex_sync_steps', JSON.stringify(downloadResult.steps));
        }

        if (!downloadResult.success) {
          console.warn('Yandex.Disk pull failed (network or request error). Aborting upload to avoid dataloss.', downloadResult.error);
          setSyncStatus('error');
          setSyncErrorMessage(downloadResult.error || 'Не удалось получить данные с Яндекс.Диска.');
          showToast('Ошибка сетевого диска. Синхронизация отложена.', 'error');
          return;
        }

        let finalSteps = downloadResult.steps || [];

        if (downloadResult.exists && downloadResult.data) {
          const remoteDb = downloadResult.data;
          const remoteItems = remoteDb.items || [];
          const remotePartsText = remoteDb.partsText || '';
          const localIds = new Set(currentItems.map(i => i.id));
          const hasNewIncomingItems = remoteItems.length === 0 ? false : remoteItems.some(item => !localIds.has(item.id));
          const hasNewPartsText = remotePartsText !== currentParts && remotePartsText !== '';

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
          const uploadResult = await uploadYandexDoc(token, {
            items: mergedItems,
            partsText: mergedPartsText,
            deletedIds: mergedDeletedIds,
            updatedAt: Date.now()
          });

          if (uploadResult.steps) {
            finalSteps = [...finalSteps, ...uploadResult.steps];
            setSyncSteps(finalSteps);
            localStorage.setItem('yandex_sync_steps', JSON.stringify(finalSteps));
          }

          if (uploadResult.success) {
            setSyncStatus('synced');
            setSyncErrorMessage('');
            if (hasNewIncomingItems || hasNewPartsText) {
              showToast('Облако: получены новые записи!', 'success');
            }
          } else {
            setSyncStatus('error');
            setSyncErrorMessage(uploadResult.error || 'Не удалось отправить обновленные данные на Диск.');
          }
        } else {
          // First sync on empty disk / file doesn't exist yet: initialize with current state
          const uploadResult = await uploadYandexDoc(token, {
            items: currentItems,
            partsText: currentParts,
            deletedIds: currentDeleted,
            updatedAt: Date.now()
          });

          if (uploadResult.steps) {
            finalSteps = [...finalSteps, ...uploadResult.steps];
            setSyncSteps(finalSteps);
            localStorage.setItem('yandex_sync_steps', JSON.stringify(finalSteps));
          }

          if (uploadResult.success) {
            setSyncStatus('synced');
            setSyncErrorMessage('');
          } else {
            setSyncStatus('error');
            setSyncErrorMessage(uploadResult.error || 'Не удалось создать базу данных в папке приложения на Диске.');
          }
        }
      } catch (e: any) {
        console.error('Error during Yandex.Disk cloud sync:', e);
        setSyncStatus('error');
        setSyncErrorMessage(e?.message || 'Неизвестная ошибка во время синхронизации.');
        const errStep = {
          time: new Date().toLocaleTimeString('ru-RU'),
          message: `Критический сбой синхронизации: ${e?.message || 'Неизвестная ошибка'}`,
          status: 'error' as const
        };
        const updated = [...(downloadResult?.steps || []), errStep];
        setSyncSteps(updated);
        localStorage.setItem('yandex_sync_steps', JSON.stringify(updated));
      }
    }
  };

  // Run Cloud sync on load (if configured)
  useEffect(() => {
    if (isCloudActive()) {
      triggerCloudSync(items, partsText, deletedIds);
    } else {
      setSyncStatus('local');
    }
  }, [ydToken, ghToken, ghRepo, syncProvider]);

  // Sync immediately when the app becomes visible or the browser tab is focused (crucial for mobile wake-up)
  useEffect(() => {
    if (!isCloudActive()) return;

    const handleFocusSync = () => {
      // Only trigger if document is fully visible to prevent background spamming
      if (document.visibilityState === 'visible') {
        triggerCloudSync(items, partsText, deletedIds);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [ydToken, ghToken, ghRepo, syncProvider, items, partsText, deletedIds]);

  // Periodic automatic sync with Cloud (every 45 seconds)
  useEffect(() => {
    if (!isCloudActive()) return;

    const interval = setInterval(() => {
      triggerCloudSync(items, partsText, deletedIds);
    }, 45000);

    return () => clearInterval(interval);
  }, [ydToken, ghToken, ghRepo, syncProvider, items, partsText, deletedIds]);

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

  // Handle Cloud provider swap
  const handleSetSyncProvider = (provider: 'yandex' | 'github' | 'manual') => {
    localStorage.setItem('cloud_sync_provider', provider);
    setSyncProvider(provider);
  };

  // Handle Yandex Token setup
  const handleSaveYandexToken = async (newToken: string): Promise<boolean> => {
    localStorage.setItem('yandex_disk_token', newToken);
    setYdToken(newToken);
    // Directly run immediate initial synchronization with updated provider config
    await triggerCloudSync(items, partsText, deletedIds, newToken);
    return true;
  };

  const handleClearYandexToken = () => {
    localStorage.removeItem('yandex_disk_token');
    setYdToken('');
    setSyncStatus('local');
  };

  // Handle GitHub params setup
  const handleSaveGhParams = async (newToken: string, newRepo: string, newPath: string): Promise<boolean> => {
    localStorage.setItem('github_sync_token', newToken);
    localStorage.setItem('github_sync_repo', newRepo);
    localStorage.setItem('github_sync_path', newPath);
    setGhToken(newToken);
    setGhRepo(newRepo);
    setGhPath(newPath);
    // Directly run immediate initial synchronization
    await triggerCloudSync(items, partsText, deletedIds, newToken, newRepo, newPath);
    return true;
  };

  const handleClearGhParams = () => {
    localStorage.removeItem('github_sync_token');
    localStorage.removeItem('github_sync_repo');
    localStorage.removeItem('github_sync_path');
    setGhToken('');
    setGhRepo('');
    setGhPath('repair_db.json');
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

    // Save to Cloud (if active)
    if (isCloudActive()) {
      triggerCloudSync(updatedItems, partsText, deletedIds);
    } else {
      setSyncStatus('synced');
    }
  };

  // Handle editing / saving an existing ticket details
  const handleUpdateItem = async (updated: RepairItem) => {
    const updatedWithTime = { ...updated, updatedAt: Date.now() };
    const updatedItems = items.map(item => item.id === updated.id ? updatedWithTime : item);
    
    setItems(updatedItems);
    setSelectedItem(updatedWithTime);

    if (isCloudActive()) {
      triggerCloudSync(updatedItems, partsText, deletedIds);
    } else {
      setSyncStatus('synced');
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

    if (isCloudActive()) {
      triggerCloudSync(updatedItems, partsText, deletedIds);
    } else {
      setSyncStatus('synced');
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

    if (isCloudActive()) {
      triggerCloudSync(updatedItems, partsText, deletedIds);
    } else {
      setSyncStatus('synced');
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

    if (isCloudActive()) {
      triggerCloudSync(updatedItems, partsText, updatedDeleted);
    } else {
      setSyncStatus('synced');
    }
  };

  // Sync parts update
  const handleUpdatePartsText = async (newText: string) => {
    setPartsText(newText);
    
    if (isCloudActive()) {
      triggerCloudSync(items, newText, deletedIds);
    } else {
      setSyncStatus('synced');
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
          
          if (ydToken || ghToken) {
            triggerCloudSync(json.items, json.partsText || '', json.deletedIds || [], ydToken || undefined);
          } else {
            setSyncStatus('synced');
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

        {/* Yandex Sync Buttons and Indicators */}
        <div className="flex items-center gap-2">
          {/* Mobile Install PWA Button */}
          <button
            onClick={() => setIsPwaOpen(true)}
            className="p-2 rounded-lg bg-[#222222] border border-[#2d2d2d] text-amber-500 hover:text-amber-400 cursor-pointer transition-all active:scale-95 flex items-center justify-center"
            title="Установить как приложение"
          >
            <Smartphone size={14} className={deferredPrompt ? "animate-pulse" : ""} />
          </button>

          {ydToken && (
            <button
              onClick={async () => {
                showToast('Синхронизация...', 'info');
                await triggerCloudSync(items, partsText, deletedIds, ydToken);
                showToast('Синхронизировано!', 'success');
              }}
              className={`p-2 rounded-lg bg-[#222222] border border-[#2d2d2d] text-neutral-300 hover:text-white cursor-pointer transition-all active:scale-95 flex items-center justify-center ${
                syncStatus === 'syncing' ? 'opacity-60' : ''
              }`}
              title="Синхронизировать сейчас"
            >
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin text-blue-400' : ''} />
            </button>
          )}

          {/* Yandex Settings shortcut indicator */}
          <button
            onClick={() => setIsYdOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold select-none cursor-pointer duration-300 transition-all active:scale-95 ${
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
        </div>
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
        onOpenPwaInstaller={() => setIsPwaOpen(true)}
        onForceSync={ydToken ? async () => {
          showToast('Синхронизация...', 'info');
          await triggerCloudSync(items, partsText, deletedIds, ydToken);
          showToast('Синхронизировано!', 'success');
        } : undefined}
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

      {/* Cloud Synchronization Settings Modal (supports Yandex, GitHub, & Manual JSON) */}
      <YandexSyncSettings
        isOpen={isYdOpen}
        onClose={() => setIsYdOpen(false)}
        syncProvider={syncProvider}
        onSetSyncProvider={handleSetSyncProvider}
        items={items}
        partsText={partsText}
        deletedIds={deletedIds}
        onImportDb={(newItems, newParts, newDeleted) => {
          setItems(newItems);
          setPartsText(newParts);
          setDeletedIds(newDeleted);
          showToast('База успешно импортирована!', 'success');
        }}
        token={ydToken}
        onSaveToken={handleSaveYandexToken}
        onClearToken={handleClearYandexToken}
        ghToken={ghToken}
        ghRepo={ghRepo}
        ghPath={ghPath}
        onSaveGhParams={handleSaveGhParams}
        onClearGhParams={handleClearGhParams}
        syncStatus={syncStatus}
        syncErrorMessage={syncErrorMessage}
        syncSteps={syncSteps}
        onForceSync={() => triggerCloudSync(items, partsText, deletedIds)}
      />

      {/* PWA Installer Assistant and Guide Booklet */}
      <PWAInstallGuide
        isOpen={isPwaOpen}
        onClose={() => setIsPwaOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          showToast('Спасибо за установку приложения!', 'success');
          setIsPwaOpen(false);
        }}
      />

      {/* Elegant Toast Alert System */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          <div className={`px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border bg-[#141414]/95 backdrop-blur-md ${
            toast.type === 'success' ? 'border-emerald-500/20 text-emerald-400' :
            toast.type === 'error' ? 'border-rose-500/20 text-rose-400' :
            'border-blue-500/20 text-blue-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-400 animate-pulse' :
              toast.type === 'error' ? 'bg-rose-400' :
              'bg-blue-400'
            }`}></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
