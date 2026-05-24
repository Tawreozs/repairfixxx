import React, { useState, useEffect } from 'react';
import { X, Calendar, PlusCircle } from 'lucide-react';
import { RepairItem } from '../types';

interface AddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newItem: Omit<RepairItem, 'id' | 'status'>) => void;
}

export default function AddDialog({ isOpen, onClose, onSave }: AddDialogProps) {
  const [model, setModel] = useState('');
  const [reason, setReason] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [contact, setContact] = useState('');
  const [contact2, setContact2] = useState('');
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [price, setPrice] = useState('');
  const [partsCost, setPartsCost] = useState('');

  // Auto-generate Acceptance Timestamp
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Format: DD.MM.YYYY, HH:MM:SS (e.g., "24.05.2026, 9:42:40")
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      setDateStr(`${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      alert('Поле "Модель" является обязательным!');
      return;
    }

    onSave({
      model: model.trim(),
      reason: reason.trim(),
      date: dateStr.trim(),
      contact: contact.trim(),
      contact2: contact2.trim(),
      name: name.trim(),
      comment: comment.trim(),
      price: price ? parseFloat(price) || 0 : undefined,
      partsCost: partsCost ? parseFloat(partsCost) || 0 : undefined
    });

    // Reset fields
    setModel('');
    setReason('');
    setContact('');
    setContact2('');
    setName('');
    setComment('');
    setPrice('');
    setPartsCost('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Dark Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg h-full bg-[#1c1c1c] text-[#f5f5f5] shadow-2xl flex flex-col z-10 border-l border-[#2e2e2e] animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2d2d2d]">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Добавить позицию
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#2b2b2b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Model input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-neutral-400">Модель</span>
              <span className="text-rose-500 font-normal">Обязательное</span>
            </div>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Например: Honor 9c"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            />
          </div>

          {/* Reason input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-400">
              Причина обращения
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: модуль в рамке, вода"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            />
          </div>

          {/* Date Acceptance input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                <Calendar size={12} />
                Дата приёма
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                placeholder="ДД.ММ.ГГГГ, ЧЧ:ММ:СС"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const day = String(now.getDate()).padStart(2, '0');
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const year = now.getFullYear();
                  const hours = String(now.getHours()).padStart(2, '0');
                  const minutes = String(now.getMinutes()).padStart(2, '0');
                  const seconds = String(now.getSeconds()).padStart(2, '0');
                  setDateStr(`${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300 font-sans cursor-pointer"
                title="Текущее время"
              >
                Сейчас
              </button>
            </div>
          </div>

          {/* Contact (Phone) input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-400">
              Контакт (Телефон)
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="89XXXXXXXXX"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          {/* Contact 2 input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-400">
              Контакт 2
            </label>
            <input
              type="text"
              value={contact2}
              onChange={(e) => setContact2(e.target.value)}
              placeholder="Дополнительный номер связи"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          {/* Name input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-400">
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите имя заказчика"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all font-sans"
            />
          </div>

          {/* Price & Parts Cost Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-400">
                Цена для клиента
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="₽ Например: 3500"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-400">
                Себестоимость детали
              </label>
              <input
                type="number"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                placeholder="₽ Например: 1200"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Comment description textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-400">
              Комментарий
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные примечания по аппарату..."
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all font-sans leading-relaxed"
            />
          </div>
        </form>

        {/* Footer Container */}
        <div className="p-5 border-t border-[#2d2d2d] bg-[#171717] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#242424] hover:bg-[#2f2f2f] border border-[#333333] text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Отменить
          </button>
          
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-[#1a5d7c] hover:bg-[#1f6d91] text-white text-sm font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Отправить</span>
          </button>
        </div>
      </div>
    </div>
  );
}
