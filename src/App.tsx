import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw,
  ArrowUpDown,
  Search,
  CheckCircle,
  Bell,
  Coins,
  History,
  TrendingUp,
  AlertCircle,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  ExchangeRates,
  HistoricalDataPoint,
  HistoricalRatesResponse,
  ConversionRecord,
  AlertThreshold,
} from './types';
import CurrencyChart from './components/CurrencyChart';
import RateInsightCharts from './components/RateInsightCharts';
import RateAlerts from './components/RateAlerts';
import ConversionHistory from './components/ConversionHistory';
import { calculateConvertedAmount, calculatePairRate } from './lib/conversion';

export default function App() {
  // --- States ---
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('TWD');
  const [fromAmount, setFromAmount] = useState<number>(1000);
  
  // Rate monitoring & loading
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error'>('connected');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Chart state
  const [period, setPeriod] = useState('1M');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [historicalStats, setHistoricalStats] = useState({ max: 0, min: 0, avg: 0, changePercent: 0 });
  const [historicalLoading, setHistoricalLoading] = useState(true);

  // Alerts & History logs (Persisted in localStorage)
  const [alerts, setAlerts] = useState<AlertThreshold[]>(() => {
    const saved = localStorage.getItem('exchange_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [records, setRecords] = useState<ConversionRecord[]>(() => {
    const saved = localStorage.getItem('exchange_records');
    return saved ? JSON.parse(saved) : [];
  });

  // Floating notifications & toasts
  const [activeToast, setActiveToast] = useState<{ id: string; message: string; type: 'success' | 'alert' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Core Rate Fetching ---
  const fetchLiveRates = useCallback(async (quiet = false) => {
    if (!quiet) setRatesLoading(true);
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/rates');
      const data = await response.json();
      if (data.success && data.rates) {
        setRates(data.rates);
        const formatTime = () => {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        };
        setLastUpdated(formatTime());
        setConnectionStatus('connected');
        
        // Check rate alerts whenever we get new live rates
        checkRateAlerts(data.rates);
      } else {
        throw new Error('Rates loading error');
      }
    } catch (error) {
      console.error(error);
      setConnectionStatus('error');
      // If server/API fails, fall back to stable baselines internally for client calculations
      const fallbackBaselines = {
        USD: 1.0, TWD: 32.48, JPY: 156.45, EUR: 0.93, GBP: 0.79,
        AUD: 1.51, CNY: 7.25, HKD: 7.81, KRW: 1385.0, SGD: 1.35
      };
      setRates(fallbackBaselines);
      setLastUpdated(new Date().toISOString().replace('T', ' ').split('.')[0]);
    } finally {
      setRatesLoading(false);
      setIsRefreshing(false);
    }
  }, [alerts]);

  // --- Historical Trend Fetching ---
  const fetchHistoricalRates = useCallback(async () => {
    setHistoricalLoading(true);
    try {
      const response = await fetch(`/api/history?from=${fromCurrency}&to=${toCurrency}&period=${period}`);
      const data = await response.json();
      if (data.success && data.data) {
        setHistoricalData(data.data);
        setHistoricalStats(data.stats);
      } else {
        throw new Error(data.error || 'History fetch failed');
      }
    } catch (error) {
      console.error('Failed to load historical trends:', error);
    } finally {
      setHistoricalLoading(false);
    }
  }, [fromCurrency, toCurrency, period]);

  // --- Sync Effects ---
  useEffect(() => {
    fetchLiveRates();
    // Auto-poll exchange rates every 30 seconds
    const interval = setInterval(() => fetchLiveRates(true), 30000);
    return () => clearInterval(interval);
  }, [fetchLiveRates]);

  useEffect(() => {
    if (rates[fromCurrency] && rates[toCurrency]) {
      fetchHistoricalRates();
    }
  }, [fromCurrency, toCurrency, period, rates, fetchHistoricalRates]);

  // Persist alerts & logs
  useEffect(() => {
    localStorage.setItem('exchange_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('exchange_records', JSON.stringify(records));
  }, [records]);

  const toAmount = calculateConvertedAmount(fromAmount, fromCurrency, toCurrency, rates);

  // --- Handlers & Helpers ---
  const triggerToast = (message: string, type: 'success' | 'alert' = 'success') => {
    const id = Date.now().toString();
    setActiveToast({ id, message, type });
    setTimeout(() => {
      setActiveToast(null);
    }, 5000);
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    triggerToast('已對調原始與目標幣別！', 'success');
  };

  const handlePresetAmount = (amount: number) => {
    setFromAmount(amount);
  };

  // Log calculation details as a local historical record
  const handleLogConversion = () => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return;
    const rate = Number((rates[toCurrency] / rates[fromCurrency]).toFixed(4));
    const newRecord: ConversionRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      rate,
    };
    setRecords((prev) => [newRecord, ...prev.slice(0, 19)]); // Keep up to 20 records
    triggerToast(`成功記錄此折算：${fromAmount} ${fromCurrency} ➡️ ${toAmount} ${toCurrency}`, 'success');
  };

  // Clear conversion logs
  const handleClearHistory = () => {
    setRecords([]);
    triggerToast('歷史計算紀錄已清空', 'success');
  };

  // Re-apply a historical conversion pair
  const handleApplyHistoricalPair = (from: string, to: string, amount: number) => {
    setFromCurrency(from);
    setToCurrency(to);
    setFromAmount(amount);
    triggerToast('已套用歷史設定！', 'success');
  };

  // Alerts Management
  const handleAddAlert = (from: string, to: string, targetRate: number, condition: 'above' | 'below') => {
    const newAlert: AlertThreshold = {
      id: Date.now().toString(),
      fromCurrency: from,
      toCurrency: to,
      targetRate,
      condition,
      isTriggered: false,
      createdAt: Date.now(),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    triggerToast(`成功新增警報：當 ${from}/${to} ${condition === 'below' ? '低於' : '高於'} ${targetRate} 時通知。`, 'success');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    triggerToast('已刪除到價提醒警報。', 'success');
  };

  // Perform active target monitoring and trigger notifications
  const checkRateAlerts = (latestRates: Record<string, number>) => {
    setAlerts((prevAlerts) => {
      let changed = false;
      const updated = prevAlerts.map((alert) => {
        if (alert.isTriggered) return alert;

        const fromRate = latestRates[alert.fromCurrency];
        const toRate = latestRates[alert.toCurrency];
        if (!fromRate || !toRate) return alert;

        const currentPairRate = toRate / fromRate;
        let isMatched = false;

        if (alert.condition === 'below' && currentPairRate <= alert.targetRate) {
          isMatched = true;
        } else if (alert.condition === 'above' && currentPairRate >= alert.targetRate) {
          isMatched = true;
        }

        if (isMatched) {
          changed = true;
          // Trigger visual notification overlay
          triggerToast(
            `🔔 到價通知！您設定的 ${alert.fromCurrency} 兌 ${alert.toCurrency} 匯率已達目標 ${alert.targetRate} (當前匯率：${currentPairRate.toFixed(4)})！`,
            'alert'
          );
          return { ...alert, isTriggered: true };
        }
        return alert;
      });
      return changed ? updated : prevAlerts;
    });
  };

  // Reset alert status so it can be triggered again
  const handleResetTriggeredAlerts = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isTriggered: false })));
    triggerToast('已重設所有已觸發到價警報，重新進入監控狀態。', 'success');
  };

  // Calculate current single rate for cross conversion
  const currentCrossRate = rates[fromCurrency] && rates[toCurrency]
    ? Number((rates[toCurrency] / rates[fromCurrency]).toFixed(4))
    : 1.0;

  const currentInvertedRate = rates[fromCurrency] && rates[toCurrency]
    ? Number((rates[fromCurrency] / rates[toCurrency]).toFixed(4))
    : 1.0;

  // Filter comparison matrix table based on query
  const filteredCurrencies = Object.values(SUPPORTED_CURRENCIES).filter((c) => {
    const term = searchQuery.toLowerCase();
    return c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-700 antialiased font-sans flex flex-col justify-between">
      {/* Dynamic Toast System Overlay */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
          >
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur ${
                activeToast.type === 'alert'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              <div className="mt-0.5">
                {activeToast.type === 'alert' ? (
                  <span className="text-xl animate-bounce inline-block">🔔</span>
                ) : (
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold leading-relaxed">{activeToast.message}</p>
              </div>
              <button
                onClick={() => setActiveToast(null)}
                className="text-xs font-semibold hover:underline opacity-60 hover:opacity-100"
              >
                關閉
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6 flex-1">
        {/* Elegant Dashboard Header */}
        <div id="app-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/10">
                <Coins className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                換匯走勢小工具
              </h1>
              <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Live 監控
              </span>
            </div>
            <p className="text-sm text-slate-400">
              即時跨國匯率折算與歷史趨勢分析，整合到價即時通知與換算紀錄。
            </p>
          </div>

          {/* Controls & Server Status indicators */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            {/* Server Status Indicators */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60 text-[11px] font-semibold text-slate-500">
              <Wifi className={`w-3.5 h-3.5 ${connectionStatus === 'connected' ? 'text-emerald-500' : 'text-rose-500'}`} />
              <span>{connectionStatus === 'connected' ? '外匯伺服器：連線正常' : '外匯伺服器：斷線 (本地)'}</span>
            </div>

            {/* Manual Refresh Button */}
            <button
              id="btn-manual-refresh"
              onClick={() => fetchLiveRates()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-xs py-2 px-3.5 rounded-xl border border-slate-200 shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              手動刷新匯率
            </button>
          </div>
        </div>

        {/* Outer Desktop Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: MAIN CALCULATOR & COMPARISONS (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* PRIMARY CURRENCY CONVERTER CARD */}
            <div id="calculator-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              {/* Header Title inside card */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-500" />
                  實時匯率轉換折算
                </h2>
                <div className="text-right text-[11px] text-slate-400 font-mono">
                  最後更新：{ratesLoading ? '刷新中...' : lastUpdated}
                </div>
              </div>

              {/* Conversion Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                
                {/* From currency card */}
                <div className="md:col-span-5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 focus-within:border-indigo-500/40 transition">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">原始金額 (From)</label>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      id="input-from-amount"
                      min="0"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(Number(e.target.value))}
                      className="w-full bg-transparent text-xl font-black font-mono text-slate-800 focus:outline-none placeholder-slate-300"
                      placeholder="請輸入折算金額..."
                    />
                    <select
                      id="select-from-currency"
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value)}
                      className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg p-2 focus:outline-none font-bold"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-semibold">
                    {SUPPORTED_CURRENCIES[fromCurrency]?.name}
                  </div>
                </div>

                {/* Swap button center */}
                <div className="md:col-span-1 flex justify-center">
                  <button
                    id="btn-swap-currencies"
                    type="button"
                    onClick={handleSwap}
                    className="p-3 rounded-full bg-slate-100 hover:bg-indigo-600 text-slate-500 hover:text-white border border-slate-200 hover:border-indigo-500 shadow-sm transition active:scale-95 hover:rotate-180 duration-300 cursor-pointer"
                    title="對調貨幣"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>

                {/* To currency card */}
                <div className="md:col-span-5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">折算結果 (To)</label>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      id="input-to-amount"
                      value={toAmount}
                      readOnly
                      className="w-full bg-transparent text-xl font-black font-mono text-indigo-600 focus:outline-none"
                    />
                    <select
                      id="select-to-currency"
                      value={toCurrency}
                      onChange={(e) => setToCurrency(e.target.value)}
                      className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg p-2 focus:outline-none font-bold"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-semibold">
                    {SUPPORTED_CURRENCIES[toCurrency]?.name}
                  </div>
                </div>

              </div>

              {/* Quick Preset buttons */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-4">
                <span className="text-xs font-bold text-slate-400 mr-1">快捷金額：</span>
                {[100, 1000, 10000, 50000].map((amt) => (
                  <button
                    key={amt}
                    id={`btn-preset-${amt}`}
                    onClick={() => handlePresetAmount(amt)}
                    className="text-xs font-bold font-mono py-1.5 px-3 border border-slate-200 text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Conversion Statistics output box */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-slate-400 font-medium">實時折算匯率</p>
                  <p className="text-sm font-extrabold font-mono text-slate-700">
                    1 {fromCurrency} = {currentCrossRate} {toCurrency}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    1 {toCurrency} = {currentInvertedRate} {fromCurrency}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    id="btn-log-conversion"
                    onClick={handleLogConversion}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/10 transition active:scale-[0.98] cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    記錄此計算
                  </button>
                </div>
              </div>

            </div>

            {/* CURRENCY CHART (RENDERED AS CUSTOM COMPONENT) */}
            <CurrencyChart
              from={fromCurrency}
              to={toCurrency}
              period={period}
              setPeriod={setPeriod}
              historicalData={historicalData}
              stats={historicalStats}
              isLoading={historicalLoading}
            />

            {/* QUICK CROSS-RATES REFERENCE MATRIX */}
            <div id="rate-matrix-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">各國幣別快捷對比</h3>
                  <p className="text-xs text-slate-400">
                    以 {fromAmount.toLocaleString()} {fromCurrency} 為基準，折算各國主要貨幣的實時價值對比表
                  </p>
                </div>
                {/* Search input to filter matrix */}
                <div className="relative mt-2 sm:mt-0 w-full sm:w-48">
                  <input
                    type="text"
                    id="search-matrix"
                    placeholder="搜尋幣別或國家..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Rates table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2 pb-3">貨幣</th>
                      <th className="py-2 pb-3">全名</th>
                      <th className="py-2 pb-3 text-right">當前匯率 (對 {fromCurrency})</th>
                      <th className="py-2 pb-3 text-right">折算金額</th>
                      <th className="py-2 pb-3 text-right">動作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ratesLoading ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">數據加載中...</td>
                      </tr>
                    ) : filteredCurrencies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">沒有找到相符的幣別。</td>
                      </tr>
                    ) : (
                      filteredCurrencies.map((c) => {
                        const valueInTarget = calculateConvertedAmount(fromAmount, fromCurrency, c.code, rates);
                        const directRate = calculatePairRate(fromCurrency, c.code, rates);

                        const isBase = c.code === fromCurrency;
                        const isTarget = c.code === toCurrency;

                        return (
                          <tr
                            key={c.code}
                            className={`hover:bg-slate-50/50 transition duration-150 ${
                              isBase ? 'bg-indigo-50/20' : isTarget ? 'bg-slate-50/40' : ''
                            }`}
                          >
                            <td className="py-3 font-bold font-mono flex items-center gap-2 text-slate-800">
                              <span>{c.flag}</span>
                              <span>{c.code}</span>
                            </td>
                            <td className="py-3 text-slate-500 font-semibold">{c.name}</td>
                            <td className="py-3 text-right font-mono text-slate-600">
                              {directRate}
                            </td>
                            <td className="py-3 text-right font-bold font-mono">
                              {isBase ? (
                                <span className="text-slate-400">基準幣別</span>
                              ) : (
                                <span className="text-indigo-600">
                                  {c.symbol} {valueInTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isBase) {
                                    setToCurrency(c.code);
                                    triggerToast(`已將對盤目標切換至 ${c.code} (${c.name})！`, 'success');
                                  }
                                }}
                                disabled={isBase}
                                className={`text-[10px] font-bold py-1 px-2.5 rounded border transition cursor-pointer ${
                                  isBase
                                    ? 'bg-slate-100 text-slate-300 border-slate-100'
                                    : isTarget
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-100 hover:text-indigo-600 hover:bg-indigo-50'
                                }`}
                              >
                                {isTarget ? '對盤中' : '設定目標'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <RateInsightCharts
              from={fromCurrency}
              to={toCurrency}
              currentRate={currentCrossRate}
              historicalData={historicalData}
              alerts={alerts}
              isLoading={historicalLoading}
            />

          </div>

          {/* RIGHT PANEL: HISTORY & ALERTS (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* DYNAMIC RATE TRIGGER ALERTS MANAGER */}
            <RateAlerts
              alerts={alerts}
              onAddAlert={handleAddAlert}
              onDeleteAlert={handleDeleteAlert}
              currentRates={rates}
            />

            {/* Clear/Reset Triggered Alerts Helper Box (visible only when there are active/triggered alerts) */}
            {alerts.some((a) => a.isTriggered) && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📢</span>
                  <p className="text-xs text-rose-800 font-bold">
                    已有到價警報被觸發！是否重新啟動監控？
                  </p>
                </div>
                <button
                  id="btn-reset-triggered-alerts"
                  onClick={handleResetTriggeredAlerts}
                  className="text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3.5 rounded-lg shadow-sm transition active:scale-95"
                >
                  重設警報
                </button>
              </div>
            )}

            {/* RECENT CALCULATION HISTORY LOG */}
            <ConversionHistory
              records={records}
              onClearHistory={handleClearHistory}
              onApplyPair={handleApplyHistoricalPair}
            />

          </div>

        </div>
      </div>

      {/* Elegant Footer with Project Metadata */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 mt-12 relative">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium">
            © 2026 換匯走勢小工具
          </p>
          <div className="flex items-center gap-4 text-slate-400 font-semibold">
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              匯率監控上線中
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
