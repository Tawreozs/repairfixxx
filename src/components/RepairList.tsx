import React, { useState } from 'react';
import { Search, Plus, MoreHorizontal, CheckCircle2, Archive, Smartphone, Trash2 } from 'lucide-react';
import { RepairItem } from '../types';

interface RepairListProps {
  items: RepairItem[];
  tab: 'phones' | 'archive';
  onSelectItem: (item: RepairItem) => void;
  onAddItemClick?: () => void;
  onArchiveItem?: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
}

export default function RepairList({
  items,
  tab,
  onSelectItem,
  onAddItemClick,
  onArchiveItem,
  onRestoreItem,
  onDeleteItem
}: RepairListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.model.toLowerCase().includes(query) ||
      (item.reason && item.reason.toLowerCase().includes(query)) ||
      (item.contact && item.contact.includes(query)) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.date && item.date.includes(query))
    );
  });

  const toggleDropdown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
    } else {
      setActiveDropdownId(id);
    }
  };

  // Close dropdown on clicking anywhere else
  React.useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#121212] text-[#f5f5f5] p-4 sm:p-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {tab === 'phones' ? 'Телефоны' : 'Архив'}
        </h1>

        {/* Search & Add row */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg pl-9 pr-4 py-1.5 text-sm text-neutral-200 placeholder-neutral-500 font-sans focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {tab === 'phones' && onAddItemClick && (
            <button
              onClick={onAddItemClick}
              className="flex items-center gap-1 bg-[#1a5d7c] hover:bg-[#1f6d91] text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 max-w-5xl w-full">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#1a1a1a] rounded-xl border border-[#262626] text-center">
            <Smartphone className="w-12 h-12 text-neutral-600 mb-3" />
            <p className="text-neutral-400 font-medium">Ничего не найдено</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Попробуйте изменить поисковый запрос или добавить новую запись в список.
            </p>
          </div>
        ) : (
          <div className="bg-[#161616] rounded-xl border border-[#222222] divide-y divide-[#242424] shadow-md">
            {filteredItems.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === filteredItems.length - 1;
              const isNearBottom = filteredItems.length > 2 && index >= filteredItems.length - 2;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`relative flex items-center justify-between p-4 hover:bg-[#1e1e1e] cursor-pointer transition-colors group ${
                    isFirst ? 'rounded-t-xl' : ''
                  } ${isLast ? 'rounded-b-xl' : ''}`}
                >
                  {/* Left content: model, description / reason, phone date */}
                  <div className="flex-1 pr-12">
                    <h3 className="text-[15px] font-semibold text-[#f5f5f5] tracking-tight group-hover:text-white transition-colors">
                      {item.model}
                    </h3>
                    <div className="text-xs text-[#9e9e9e] mt-1 flex flex-wrap items-center gap-1.5">
                      {item.reason && (
                        <>
                          <span className="line-clamp-1">{item.reason}</span>
                          <span className="text-neutral-600 font-bold">·</span>
                        </>
                      )}
                      <span>{item.date}</span>
                      {item.name && (
                        <>
                          <span className="text-neutral-600 font-bold">·</span>
                          <span className="text-neutral-400 font-mono">{item.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={(e) => toggleDropdown(e, item.id)}
                      className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#2b2b2b] transition-colors"
                      title="Действия"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeDropdownId === item.id && (
                      <div className={`absolute right-0 z-20 w-48 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-xl py-1 text-sm font-sans animate-in fade-in duration-100 ${
                        isNearBottom ? 'bottom-8 mb-1 origin-bottom slide-in-from-bottom-2' : 'top-8 mt-1 origin-top slide-in-from-top-2'
                      }`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item);
                            setActiveDropdownId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-neutral-300 hover:bg-[#282828] hover:text-white flex items-center gap-2"
                        >
                          <Smartphone size={14} className="text-blue-400" />
                          <span>Открыть детали</span>
                        </button>

                        {tab === 'phones' && onArchiveItem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveItem(item.id);
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-neutral-300 hover:bg-[#282828] hover:text-white flex items-center gap-2"
                          >
                            <Archive size={14} className="text-[#a3e635]" />
                            <span>В архив</span>
                          </button>
                        )}

                        {tab === 'archive' && onRestoreItem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreItem(item.id);
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-neutral-300 hover:bg-[#282828] hover:text-white flex items-center gap-2"
                          >
                            <CheckCircle2 size={14} className="text-[#a3e635]" />
                            <span>Вернуть в ремонт</span>
                          </button>
                        )}

                        {onDeleteItem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Удалить запись "${item.model}" навсегда?`)) {
                                onDeleteItem(item.id);
                              }
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 flex items-center gap-2 border-t border-[#2d2d2d]"
                          >
                            <Trash2 size={14} />
                            <span>Удалить</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
