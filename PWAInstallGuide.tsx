import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Smartphone, 
  RefreshCw, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  TrendingDown,
  Wrench,
  HelpCircle,
  PiggyBank
} from 'lucide-react';
import { RepairItem } from '../types';

interface AnalyticsProps {
  items: RepairItem[];
}

export default function Analytics({ items }: AnalyticsProps) {
  // Let's filter active and archived to understand status
  const totalRepairsCount = items.length;
  const activeRepairsCount = items.filter(i => i.status === 'active').length;
  const archivedRepairsCount = items.filter(i => i.status === 'archived').length;

  // Global financial calculations
  const totalRevenue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price || 0), 0);
  }, [items]);

  const totalPartsCost = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.partsCost || 0), 0);
  }, [items]);

  const totalProfit = useMemo(() => {
    return totalRevenue - totalPartsCost;
  }, [totalRevenue, totalPartsCost]);

  const avgProfitMargin = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return (totalProfit / totalRevenue) * 100;
  }, [totalRevenue, totalProfit]);

  const averageTicket = useMemo(() => {
    const monetizationRepairs = items.filter(i => (i.price || 0) > 0);
    if (monetizationRepairs.length === 0) return 0;
    return totalRevenue / monetizationRepairs.length;
  }, [items, totalRevenue]);

  // -- Calculator State --
  const [calcPrice, setCalcPrice] = useState<number>(3500);
  const [calcPartsCost, setCalcPartsCost] = useState<number>(1200);
  const [calcOtherExpenses, setCalcOtherExpenses] = useState<number>(150);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  // Realistic scenario presets
  const presets = [
    { id: 'screen', name: 'Замена дисплея', price: 5000, parts: 2000, other: 150 },
    { id: 'battery', name: 'Замена АКБ', price: 1800, parts: 500, other: 50 },
    { id: 'connector', name: 'Разъем питания', price: 1200, parts: 100, other: 30 },
    { id: 'software', name: 'FRP / Прошивка', price: 1500, parts: 0, other: 0 },
    { id: 'water', name: 'Чистка после воды', price: 2500, parts: 0, other: 200 }
  ];

  const handleApplyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCalcPrice(preset.price);
      setCalcPartsCost(preset.parts);
      setCalcOtherExpenses(preset.other);
      setSelectedPreset(presetId);
    }
  };

  // Calculator helper outputs
  const calcNetProfit = calcPrice - calcPartsCost - calcOtherExpenses;
  const calcMargin = calcPrice > 0 ? (calcNetProfit / calcPrice) * 100 : 0;
  const calcROI = (calcPartsCost + calcOtherExpenses) > 0 
    ? (calcNetProfit / (calcPartsCost + calcOtherExpenses)) * 100 
    : 100;

  // Recommendation builder based on Margin
  const getRecommendation = (margin: number) => {
    if (margin <= 0) {
      return {
        style: 'border-red-500/30 bg-red-950/20 text-red-400',
        icon: <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />,
        text: 'Убыточный заказ! Стоимость расходников и запчастей превышает цену ремонта. Рекомендуем пересчитать условия с клиентом.'
      };
    }
    if (margin < 30) {
      return {
        style: 'border-yellow-500/30 bg-yellow-950/20 text-yellow-400',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />,
        text: 'Низкая маржинальность (меньше 30%). Это рискованно в случае брака детали. Попробуйте поднять стоимость работы или найти более дешевого поставщика.'
      };
    }
    if (margin < 60) {
      return {
        style: 'border-blue-500/30 bg-blue-950/20 text-blue-400',
        icon: <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />,
        text: 'Стандартная рыночная маржинальность (30-60%). Хороший баланс цены для клиента и заработка мастера.'
      };
    }
    return {
      style: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
      text: 'Великолепная рентабельность! (более 60%). Высокодоходный ремонт. Такие заказы приносят основную долю чистой прибыли мастерской.'
    };
  };

  const recommendation = getRecommendation(calcMargin);

  // Group stats by Device Brand/Model keywords
  const brandStats = useMemo(() => {
    const brands: Record<string, { count: number; revenue: number; cost: number; profit: number }> = {};
    
    items.forEach(item => {
      // Find Brand Name (First word in uppercase)
      const modelClean = item.model.trim();
      let brand = modelClean.split(' ')[0] || 'Другое';
      // Normalize common names
      brand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
      if (brand === 'Iphone' || brand === 'Копия') brand = 'Apple';
      if (brand === 'A50' || brand === 'A40' || brand === 'A32') brand = 'Samsung';
      if (brand === 'A207' || brand === 'A20s' || brand === 'A31') brand = 'Samsung';
      if (brand === 'Y8p') brand = 'Huawei';
      if (brand === 'Spark') brand = 'Tecno';
      
      const price = item.price || 0;
      const cost = item.partsCost || 0;
      const profit = price - cost;

      if (!brands[brand]) {
        brands[brand] = { count: 0, revenue: 0, cost: 0, profit: 0 };
      }

      brands[brand].count += 1;
      brands[brand].revenue += price;
      brands[brand].cost += cost;
      brands[brand].profit += profit;
    });

    return Object.entries(brands)
      .map(([name, data]) => ({
        name,
        ...data,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [items]);

  // Find highest profit item
  const topProfitItem = useMemo(() => {
    let bestItem: RepairItem | null = null;
    let maxProfit = -999999;
    items.forEach(i => {
      const p = (i.price || 0) - (i.partsCost || 0);
      if (p > maxProfit) {
        maxProfit = p;
        bestItem = i;
      }
    });
    return bestItem ? { ...bestItem, profit: maxProfit } : null;
  }, [items]);

  return (
    <div className="flex-1 flex flex-col bg-[#121212] text-[#f5f5f5] p-4 sm:p-6 min-h-screen">
      {/* Header bar */}
      <div className="mb-6 max-w-5xl w-full">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Финансовая аналитика</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Контроль за оборотом, затратами, рентабельностью ремонтной мастерской и моделирование прибыли
        </p>
      </div>

      {/* Grid of Key stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-5xl w-full font-sans">
        {/* Total Revenue */}
        <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">ОБЩАЯ ВЫРУЧКА</span>
            <p className="text-xl sm:text-2xl font-bold text-[#f5f5f5] tracking-tight mt-1">
              {totalRevenue.toLocaleString('ru-RU')} ₽
            </p>
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1 font-mono">
              Общий оборот
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Total Parts Cost */}
        <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">ЗАТРАТЫ (ДЕТАЛИ)</span>
            <p className="text-xl sm:text-2xl font-bold text-neutral-300 tracking-tight mt-1">
              {totalPartsCost.toLocaleString('ru-RU')} ₽
            </p>
            <span className="text-[11px] text-neutral-500 flex items-center gap-1 mt-1 font-mono">
              Себестоимость
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <TrendingDown size={20} />
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-[#161616] border border-blue-900/30 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">ЧИСТАЯ ПРИБЫЛЬ</span>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight mt-1">
              {totalProfit.toLocaleString('ru-RU')} ₽
            </p>
            <span className="text-[11px] text-emerald-500/80 flex items-center gap-1 mt-1 font-mono">
              Чистыми на руки
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <PiggyBank size={20} />
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">РЕНТАБЕЛЬНОСТЬ</span>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {avgProfitMargin.toFixed(1)}%
            </p>
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1 font-mono">
              Средняя маржа
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Percent size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl w-full mb-8">
        {/* LEFT COLUMN: BRAND BREAKDOWN ANALYSIS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Custom SVG Bar Chart */}
          <div className="bg-[#161616] border border-[#222222] rounded-xl p-5 shadow-md">
            <h3 className="text-sm font-semibold text-white tracking-tight mb-4 flex items-center gap-1.5 font-sans">
              <TrendingUp size={16} className="text-blue-400" />
              <span>Распределение прибыли по брендам</span>
            </h3>

            {brandStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-neutral-500 text-xs">
                Нет данных для построения диаграммы
              </div>
            ) : (
              <div className="space-y-4">
                {brandStats.slice(0, 5).map((brand, index) => {
                  // Calculate percentage width based on highest profit
                  const maxProfit = Math.max(...brandStats.map(b => b.profit), 1);
                  const widthPercent = (brand.profit / maxProfit) * 100;
                  
                  return (
                    <div key={brand.name} className="space-y-2">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-[#e2e8f0] font-medium flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {brand.name}
                          <span className="text-[#a3e635] text-[10px] font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded ml-1 font-mono">
                            {brand.margin.toFixed(0)}% маржа
                          </span>
                        </span>
                        <span className="text-neutral-400 font-mono">
                          {brand.profit.toLocaleString('ru-RU')} ₽{' '}
                          <span className="text-neutral-600 text-[10px]">({brand.count} шт.)</span>
                        </span>
                      </div>
                      
                      {/* Bar container */}
                      <div className="h-2 w-full bg-[#242424] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(widthPercent, 4)}%` }}
                          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                            index === 0 ? 'from-blue-600 to-cyan-500' :
                            index === 1 ? 'from-cyan-500 to-emerald-500' :
                            index === 2 ? 'from-emerald-500 to-amber-500' :
                            'from-neutral-500 to-neutral-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Brands table / Statistics details */}
          <div className="bg-[#161616] border border-[#222222] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#1a1a1a] border-b border-[#242424] flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
                Рейтинг рентабельности по производителям
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono uppercase">
                Всего брендов: {brandStats.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-neutral-500 font-semibold uppercase font-mono">
                    <th className="p-3">Производитель</th>
                    <th className="p-3 text-center">Кол-во</th>
                    <th className="p-3 text-right">Выручка</th>
                    <th className="p-3 text-right">Запчасти</th>
                    <th className="p-3 text-right text-emerald-400">Чистая прибыль</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242424] text-neutral-300 font-sans">
                  {brandStats.map((brand) => (
                    <tr key={brand.name} className="hover:bg-[#1e1e1e]/60 transition-colors">
                      <td className="p-3 font-medium text-white">{brand.name}</td>
                      <td className="p-3 text-center font-mono">{brand.count}</td>
                      <td className="p-3 text-right font-mono">{brand.revenue.toLocaleString('ru-RU')} ₽</td>
                      <td className="p-3 text-right font-mono text-neutral-400">{brand.cost.toLocaleString('ru-RU')} ₽</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                        +{brand.profit.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Record performance block */}
          {topProfitItem && (
            <div className="bg-gradient-to-r from-blue-950/20 via-indigo-950/10 to-transparent border border-blue-900/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase block">САМЫЙ ПРИБЫЛЬНЫЙ РЕМОНТ</span>
                <p className="text-sm font-semibold text-white mt-1 leading-snug">
                  {topProfitItem.model} — {topProfitItem.reason}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Выручка: {topProfitItem.price?.toLocaleString('ru-RU')} ₽ · 
                  Запчасть: {topProfitItem.partsCost?.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-neutral-500 uppercase block">ПРИБЫЛЬ</span>
                <span className="text-emerald-400 font-bold text-lg">
                  +{topProfitItem.profit.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE PROFIT CALCULATOR (5 COLS) */}
        <div className="lg:col-span-5">
          <div className="bg-[#161616] border border-blue-900/20 rounded-xl p-5 shadow-lg flex flex-col h-full">
            <div className="flex items-center gap-2 pb-4 border-b border-[#242424] mb-4">
              <Calculator className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Калькулятор прибыли</h3>
                <p className="text-[11px] text-neutral-500">Симуляция стоимости и оценка прибыльности ремонта</p>
              </div>
            </div>

            {/* Quick Presets row */}
            <div className="mb-4">
              <label className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block mb-2">ПОПУЛЯРНЫЕ ШАБЛОНЫ</label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`px-2 py-1 rounded text-xs transition-all ${
                      selectedPreset === preset.id
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-[#222222] text-neutral-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4 flex-1">
              {/* Expected customer Price */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-neutral-400">Стоимость для клиента (Выручка)</span>
                  <span className="text-blue-400 font-mono">{calcPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-500">₽</span>
                  <input
                    type="number"
                    value={calcPrice}
                    onChange={(e) => {
                      setCalcPrice(Math.max(0, parseInt(e.target.value) || 0));
                      setSelectedPreset('custom');
                    }}
                    className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg pl-8 pr-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="15000"
                  step="100"
                  value={calcPrice}
                  onChange={(e) => {
                    setCalcPrice(parseInt(e.target.value) || 0);
                    setSelectedPreset('custom');
                  }}
                  className="w-full mt-2 accent-blue-500"
                />
              </div>

              {/* Spare parts cost */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-neutral-400">Цена запчасти (Себестоимость)</span>
                  <span className="text-amber-500 font-mono">{calcPartsCost.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-500">₽</span>
                  <input
                    type="number"
                    value={calcPartsCost}
                    onChange={(e) => {
                      setCalcPartsCost(Math.max(0, parseInt(e.target.value) || 0));
                      setSelectedPreset('custom');
                    }}
                    className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg pl-8 pr-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="8000"
                  step="100"
                  value={calcPartsCost}
                  onChange={(e) => {
                    setCalcPartsCost(parseInt(e.target.value) || 0);
                    setSelectedPreset('custom');
                  }}
                  className="w-full mt-2 accent-amber-500"
                />
              </div>

              {/* Other Expenses */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-neutral-400">Варка, доставка, флюс и пр.</span>
                  <span className="text-neutral-400 font-mono">{calcOtherExpenses.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-500">₽</span>
                  <input
                    type="number"
                    value={calcOtherExpenses}
                    onChange={(e) => {
                      setCalcOtherExpenses(Math.max(0, parseInt(e.target.value) || 0));
                      setSelectedPreset('custom');
                    }}
                    className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg pl-8 pr-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Calculations outputs block */}
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-4 mt-6 space-y-3 font-sans">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#242424]">
                <span className="text-neutral-400">Окупаемость (ROI):</span>
                <span className="font-semibold text-neutral-200">
                  {calcROI === 100 && (calcPartsCost + calcOtherExpenses) === 0 ? 'Без расходов' : `${calcROI.toFixed(0)}%`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#242424]">
                <span className="text-neutral-400">Рентабельность (Маржа):</span>
                <span className={`font-semibold ${calcMargin >= 50 ? 'text-[#a3e635]' : 'text-yellow-400'}`}>
                  {calcMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-medium text-white">Расчетная чистая прибыль:</span>
                <span className={`text-xl font-bold font-mono ${calcNetProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {calcNetProfit.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

            {/* Recommendations based on analysis */}
            <div className={`mt-4 border p-3 rounded-lg flex gap-3 text-[11px] leading-relaxed transition-all ${recommendation.style}`}>
              {recommendation.icon}
              <p>{recommendation.text}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial info helper note footer */}
      <div className="max-w-5xl w-full p-4 bg-[#161616]/40 rounded-xl border border-[#222222] text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left font-serif lg:font-sans">
        <p className="flex items-center gap-1.5 select-text">
          <Wrench size={12} />
          <span>Все данные сохраняются автоматически в ваше браузерное хранилище LocalStorage.</span>
        </p>
        <span className="font-mono text-[10px]">VER: 1.2 · FIN_CALC_ACTIVE</span>
      </div>
    </div>
  );
}
