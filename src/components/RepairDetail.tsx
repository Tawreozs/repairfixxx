import React, { useState } from 'react';
import { ChevronLeft, Edit, Phone, MessageSquare, Archive, CheckCircle2, Trash2, Calendar, User, Save, X } from 'lucide-react';
import { RepairItem } from '../types';

interface RepairDetailProps {
  item: RepairItem;
  onBack: () => void;
  onUpdateItem: (updated: RepairItem) => void;
  onArchiveItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
}

export default function RepairDetail({
  item,
  onBack,
  onUpdateItem,
  onArchiveItem,
  onRestoreItem,
  onDeleteItem
}: RepairDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<RepairItem>>({ ...item });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Номер телефона скопирован в буфер обмена!');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.model?.trim()) {
      alert('Укажите модель!');
      return;
    }
    const updated: RepairItem = {
      ...item,
      ...formData,
      model: formData.model.trim(),
      reason: formData.reason || '',
      contact: formData.contact || '',
      name: formData.name || '',
      comment: formData.comment || ''
    };
    onUpdateItem(updated);
    setIsEditing(false);
    showToast('Запись успешно сохранена!');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121212] text-[#f5f5f5] p-4 sm:p-6 min-h-screen">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e293b] border border-blue-500 text-white px-4 py-2 text-xs font-medium rounded-lg shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={14} className="text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumbs Navigation */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors group cursor-pointer"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Телефоны</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-300 font-medium truncate max-w-xs">{item.model}</span>
        </button>
      </div>

      {/* Main Container Grid */}
      <div className="max-w-4xl w-full mx-auto bg-[#161616] border border-[#222222] rounded-xl overflow-hidden shadow-lg p-4 sm:p-8">
        
        {!isEditing ? (
          <>
            {/* Header section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#242424] mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                  {item.model}
                </h1>
                <p className="text-sm text-[#9e9e9e] font-sans">
                  {item.reason || 'Описание отсутствует'}
                </p>
              </div>

              <button
                onClick={() => {
                  setFormData({ ...item });
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 bg-[#1a5d7c] hover:bg-[#1f6d91] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Edit size={14} />
                <span>Edit</span>
              </button>
            </div>

            {/* Metadata Fields Card Deck */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 bg-[#1a1a1a] p-3 sm:p-4 rounded-xl border border-[#242424] mb-4">
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Модель
                </span>
                <span className="text-sm font-semibold text-neutral-200 mt-1 block">
                  {item.model}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Причина обращения
                </span>
                <span className="text-sm font-medium text-neutral-200 mt-1 block">
                  {item.reason || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Телефон
                </span>
                <span className="text-sm font-mono text-neutral-200 mt-1 block select-all">
                  {item.contact || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Дата приёма
                </span>
                <span className="text-sm font-sans text-neutral-200 mt-1 block flex items-center gap-1">
                  <Calendar size={12} className="text-neutral-500" />
                  {item.date}
                </span>
              </div>
            </div>

            {/* Financial Info Card row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-[#1a1a1a] p-3 sm:p-4 rounded-xl border border-[#242424] mb-8">
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Цена для клиента
                </span>
                <span className="text-sm font-bold text-[#38bdf8] mt-1 block">
                  {item.price !== undefined ? `${item.price.toLocaleString('ru-RU')} ₽` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Запчасть (себестоимость)
                </span>
                <span className="text-sm font-semibold text-[#f59e0b] mt-1 block">
                  {item.partsCost !== undefined ? `${item.partsCost.toLocaleString('ru-RU')} ₽` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Прибыль мастерской
                </span>
                <span className="text-sm font-bold text-[#10b981] mt-1 block">
                  {item.price !== undefined && item.partsCost !== undefined 
                    ? `${(item.price - item.partsCost).toLocaleString('ru-RU')} ₽` 
                    : '—'}
                </span>
              </div>
            </div>

            {/* Middle Contact Action Row */}
            {item.contact && (
              <div className="bg-[#1e1e1e] border border-[#2c2c2c] rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs text-neutral-500 font-mono block mb-1">НОМЕР СВЯЗИ</label>
                  <p
                    onClick={() => handleCopy(item.contact)}
                    className="text-2xl font-bold text-white tracking-wide cursor-pointer hover:text-blue-400 transition-colors select-all"
                    title="Нажмите, чтобы скопировать"
                  >
                    {item.contact}
                  </p>
                  {item.name && (
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1 font-sans">
                      <User size={12} className="text-neutral-500" />
                      Имя клиента: <span className="font-semibold text-neutral-300">{item.name}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${item.contact}`}
                    className="flex items-center gap-1 bg-[#1c1c1c] hover:bg-[#2c2c2c] border border-[#2e2e2e] text-neutral-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Phone size={14} className="text-blue-400" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`sms:${item.contact}`}
                    className="flex items-center gap-1 bg-[#1c1c1c] hover:bg-[#2c2c2c] border border-[#2e2e2e] text-neutral-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <MessageSquare size={14} className="text-[#a3e635]" />
                    <span>SMS</span>
                  </a>
                </div>
              </div>
            )}

            {/* Optional Comment block */}
            {item.comment && (
              <div className="mb-8">
                <h3 className="text-xs uppercase font-mono text-neutral-400 tracking-wider mb-2">
                  Комментарий ремонтника / примечания
                </h3>
                <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-4 text-sm text-neutral-300 leading-relaxed max-w-none prose prose-invert">
                  {item.comment}
                </div>
              </div>
            )}

            {/* Status Change Buttons Card Footer */}
            <div className="pt-6 border-t border-[#242424] flex flex-col gap-3">
              {item.status === 'active' ? (
                <button
                  onClick={() => {
                    onArchiveItem(item.id);
                    showToast('Запись перемещена в архив');
                    onBack();
                  }}
                  className="w-full py-3 px-4 bg-[#1f5975] hover:bg-[#256c8e] text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Archive size={16} />
                  <span>В архив</span>
                </button>
              ) : (
                <div className="flex gap-3">
                  {onRestoreItem && (
                    <button
                      onClick={() => {
                        onRestoreItem(item.id);
                        showToast('Запись возвращена в ремонт');
                        onBack();
                      }}
                      className="flex-1 py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={16} />
                      <span>Вернуть в ремонт</span>
                    </button>
                  )}
                  {onDeleteItem && (
                    <button
                      onClick={() => {
                        if (window.confirm('Вы действительно хотите удалить эту запись навсегда?')) {
                          onDeleteItem(item.id);
                          onBack();
                        }
                      }}
                      className="py-3 px-5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900 border-dashed text-rose-300 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                      <span>Удалить навсегда</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Inline Edit Form mode */
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit size={16} className="text-blue-400" />
                <span>Редактирование записи</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-neutral-500 hover:text-white p-1 rounded hover:bg-[#222222]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Модель <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Например, Honor 9c"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Причина обращения
                </label>
                <input
                  type="text"
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Например, модуль в рамке"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Телефон (Основной контакт)
                </label>
                <input
                  type="text"
                  value={formData.contact || ''}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="895XXXXXXXX"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Имя клиента
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Сергей"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Дата приёма
                </label>
                <input
                  type="text"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Второй контакт (Телефон 2)
                </label>
                <input
                  type="text"
                  value={formData.contact2 || ''}
                  onChange={(e) => setFormData({ ...formData, contact2: e.target.value })}
                  placeholder="Дополнительный номер"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Цена для клиента (₽)
                </label>
                <input
                  type="number"
                  value={formData.price !== undefined ? formData.price : ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) || 0 : undefined })}
                  placeholder="Например, 3500"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Себестоимость детали (₽)
                </label>
                <input
                  type="number"
                  value={formData.partsCost !== undefined ? formData.partsCost : ''}
                  onChange={(e) => setFormData({ ...formData, partsCost: e.target.value ? parseFloat(e.target.value) || 0 : undefined })}
                  placeholder="Например, 1200"
                  className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Комментарий ремонтника (Неисправность, состояние, выполненные работы)
              </label>
              <textarea
                rows={4}
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Запчасть заказана, корпус погнут..."
                className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#242424]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-[#1c1c1c] border border-[#2d2d2d] rounded-lg text-sm text-neutral-300 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-[#1f5975] hover:from-blue-500 hover:to-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
              >
                <Save size={14} />
                <span>Сохранить</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
