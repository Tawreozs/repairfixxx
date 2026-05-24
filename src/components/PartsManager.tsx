import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Copy, Check } from 'lucide-react';

interface PartsManagerProps {
  partsText: string;
  onUpdateParts: (newText: string) => void;
}

export default function PartsManager({ partsText, onUpdateParts }: PartsManagerProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(partsText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCardClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121212] text-[#f5f5f5] p-4 sm:p-6 min-h-screen select-none">
      {/* Header element */}
      <div className="mb-4 max-w-4xl w-full">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Запчасти</h1>
      </div>

      <div className="max-w-4xl w-full flex-1 flex flex-col">
        <div 
          onClick={handleCardClick}
          className="bg-[#161616] border border-[#222222] rounded-xl shadow-lg p-6 sm:p-8 relative flex-1 flex flex-col min-h-[500px] cursor-text group"
        >
          {/* Top Panel Bar */}
          <div className="flex items-center justify-between pb-1 select-none">
            <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 flex items-center gap-2">
              <span>Покупки</span>
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" title="Автосохранение включено"></span>
              <span className="text-[9px] text-neutral-600 font-normal lowercase tracking-normal">автосохранение</span>
            </span>
            
            {/* Options Menu Container */}
            <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-[#222222] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Опции"
              >
                <MoreHorizontal size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-[#1a1a1a] border border-[#2b2b2b] rounded-lg shadow-2xl z-30 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-neutral-200 hover:text-white hover:bg-[#222222] transition-colors cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Copy size={13} className="text-neutral-400" />
                      <span>Скопировать список</span>
                    </span>
                    {copied && (
                      <Check size={13} className="text-emerald-500" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dash separator line */}
          <div className="border-t border-dashed border-[#242424] mb-4 select-none"></div>

          {/* The Live Note Editor Textarea */}
          <textarea
            ref={textareaRef}
            value={partsText}
            onChange={(e) => onUpdateParts(e.target.value)}
            className="w-full flex-1 bg-transparent text-neutral-200 text-sm leading-8 font-sans tracking-wide border-0 outline-none focus:outline-none focus:ring-0 resize-none p-0 placeholder-neutral-600 self-stretch min-h-[400px] select-text"
            placeholder="Напишите список покупок здесь или вставьте скопированный текст. Каждая позиция сохраняется автоматически."
          />
        </div>
      </div>
    </div>
  );
}
