import React, { useState } from 'react';
import { Edit2, Save, X, Search, PlusCircle, Copy, Check, PhoneCall, DollarSign } from 'lucide-react';

interface PartsManagerProps {
  partsText: string;
  onUpdateParts: (newText: string) => void;
}

export default function PartsManager({ partsText, onUpdateParts }: PartsManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(partsText);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [newPartLine, setNewPartLine] = useState('');

  const handleSave = () => {
    onUpdateParts(draftText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftText(partsText);
    setIsEditing(false);
  };

  const handleAddLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartLine.trim()) return;
    const updatedText = partsText ? `${partsText}\n${newPartLine.trim()}` : newPartLine.trim();
    onUpdateParts(updatedText);
    setDraftText(updatedText);
    setNewPartLine('');
  };

  const lines = partsText.split('\n').filter(line => line.trim() !== '');

  const filteredLines = lines.filter(line => 
    line.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper function to extract potential phone number and price strings
  const parseLineDetails = (text: string) => {
    const phoneRegex = /(89\d{9})/g;
    const priceRegex = /(\d+[\/\d+]*\s*р\.)/gi;

    let displayHTML: React.ReactNode[] = [];
    let telNumber: string | null = null;
    let priceMatch: string | null = null;

    const phones = text.match(phoneRegex);
    if (phones && phones.length > 0) {
      telNumber = phones[0];
    }

    const prices = text.match(priceRegex);
    if (prices && prices.length > 0) {
      priceMatch = prices[0];
    }

    return { telNumber, priceMatch };
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121212] text-[#f5f5f5] p-4 sm:p-6 min-h-screen">
      {/* Header element */}
      <div className="flex items-center justify-between mb-6 max-w-4xl w-full">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Запчасти</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Список необходимых покупок, деталей и комплектующих
          </p>
        </div>

        <button
          onClick={() => {
            if (!isEditing) {
              setDraftText(partsText);
            }
            setIsEditing(!isEditing);
          }}
          className="p-2 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] hover:bg-[#2b2b2b] text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title={isEditing ? 'Закрыть редактор' : 'Редактировать список'}
        >
          {isEditing ? (
            <>
              <X size={14} className="text-rose-400" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <Edit2 size={14} className="text-blue-400" />
              <span>Edit</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-4xl w-full">
        {isEditing ? (
          /* Plain Multi-line Text Area Editor matching Screenshot 2 */
          <div className="bg-[#161616] border border-[#222222] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#242424]">
              <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                Прямой редактор (одна запчасть в строке)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-[#121212] hover:bg-[#222222] border border-[#2e2e2e] rounded-md text-xs text-neutral-300 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-[#1a5d7c] hover:bg-[#1f6d91] text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Save size={12} />
                  <span>Сохранить</span>
                </button>
              </div>
            </div>

            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={22}
              className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg p-4 font-mono text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all leading-relaxed"
              placeholder="Добавьте запчасти по одной в строке..."
            />
          </div>
        ) : (
          /* interactive visual list view with search, copy and deep phone integrations */
          <div className="space-y-4">
            {/* Search Input and Add item Inline bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск деталей или номеров..."
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <form onSubmit={handleAddLine} className="flex gap-2">
                <input
                  type="text"
                  value={newPartLine}
                  onChange={(e) => setNewPartLine(e.target.value)}
                  placeholder="Быстро добавить позицию..."
                  className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all min-w-[200px]"
                />
                <button
                  type="submit"
                  className="bg-[#242424] hover:bg-[#2d2d2d] border border-[#333333] text-blue-400 p-2 rounded-lg transition-all"
                  title="Добавить запчасть"
                >
                  <PlusCircle size={18} />
                </button>
              </form>
            </div>

            {/* List block */}
            <div className="bg-[#161616] border border-[#222222] rounded-xl overflow-hidden shadow-md">
              {filteredLines.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 text-sm">
                  {searchQuery ? 'Ничего не найдено по этому запросу' : 'Список запчастей пуст'}
                </div>
              ) : (
                <div className="divide-y divide-[#242424] font-sans">
                  {filteredLines.map((line, idx) => {
                    const { telNumber, priceMatch } = parseLineDetails(line);
                    return (
                      <div
                        key={idx}
                        className="p-4 hover:bg-[#1b1b1b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-colors"
                      >
                        {/* Part text details */}
                        <div className="flex-1">
                          <p className="text-[#e2e8f0] text-sm leading-relaxed font-medium">
                            {line}
                          </p>
                          
                          {/* Rich parser chips (Phone, price) */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {priceMatch && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-mono border border-amber-500/20">
                                <DollarSign size={10} />
                                {priceMatch}
                              </span>
                            )}
                            {telNumber && (
                              <a
                                href={`tel:${telNumber}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:text-blue-300 text-[10px] font-mono border border-blue-500/20 active:scale-95 transition-all"
                              >
                                <PhoneCall size={10} />
                                Позвонить {telNumber}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Interactive cell elements (Copy, delete) */}
                        <div className="flex items-center gap-1 self-end sm:self-auto opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(line, idx)}
                            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#2b2b2b] transition-all"
                            title="Скопировать строчку"
                          >
                            {copiedIndex === idx ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          
                          <button
                            onClick={() => {
                              if (window.confirm(`Удалить эту строчку?\n"${line}"`)) {
                                const newLines = lines.filter((_, itemIdx) => itemIdx !== idx);
                                const updated = newLines.join('\n');
                                onUpdateParts(updated);
                                setDraftText(updated);
                              }
                            }}
                            className="p-1.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all"
                            title="Удалить строку"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hint bar in footer */}
            <div className="p-3 bg-[#161616]/50 rounded-xl border border-[#222222] text-[11px] text-neutral-500 flex items-center justify-between font-mono">
              <span>СТРОК ВСЕГО: {lines.length}</span>
              <span>Двойной клик на деталях копирует текст</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
