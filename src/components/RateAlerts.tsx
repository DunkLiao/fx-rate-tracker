import React, { useState } from 'react';
import { Bell, Trash2, Plus, BellRing, Info, ShieldCheck } from 'lucide-react';
import { AlertThreshold, SUPPORTED_CURRENCIES } from '../types';

interface RateAlertsProps {
  alerts: AlertThreshold[];
  onAddAlert: (from: string, to: string, targetRate: number, condition: 'above' | 'below') => void;
  onDeleteAlert: (id: string) => void;
  currentRates: Record<string, number>;
}

export default function RateAlerts({ alerts, onAddAlert, onDeleteAlert, currentRates }: RateAlertsProps) {
  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('TWD');
  const [targetRate, setTargetRate] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (fromCode === toCode) {
      setErrorMessage('請選擇不同的原始幣別與目標幣別！');
      return;
    }

    const rateNum = parseFloat(targetRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setErrorMessage('請輸入正確的匯率目標數值！');
      return;
    }

    onAddAlert(fromCode, toCode, rateNum, condition);
    setTargetRate('');
  };

  // Get current rate for selected pair to help the user configure
  const fromRateInUSD = currentRates[fromCode] || 1;
  const toRateInUSD = currentRates[toCode] || 1;
  const currentPairRate = Number((toRateInUSD / fromRateInUSD).toFixed(4));

  return (
    <div id="alerts-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-4">
        <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">匯率到價通知</h3>
          <p className="text-xs text-slate-400">當達到您設定的預期目標時，系統將即時通知您</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Add Alert Form */}
        <form onSubmit={handleAdd} className="md:col-span-5 space-y-4 bg-slate-50/40 p-4 rounded-xl border border-slate-100/50">
          <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
            設定到價條件
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">原始幣別</label>
              <select
                id="alert-select-from"
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg p-2 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">目標幣別</label>
              <select
                id="alert-select-to"
                value={toCode}
                onChange={(e) => setToCode(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg p-2 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">當前匯率：</span>
            <span className="font-bold text-slate-700">
              1 {fromCode} = {currentPairRate} {toCode}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-400">觸發條件</label>
            <div className="flex bg-white p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                id="alert-cond-below"
                onClick={() => setCondition('below')}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded ${
                  condition === 'below'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                低於 (≤)
              </button>
              <button
                type="button"
                id="alert-cond-above"
                onClick={() => setCondition('above')}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded ${
                  condition === 'above'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                高於 (≥)
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-400">目標匯率數值</label>
            <div className="relative">
              <input
                type="number"
                id="alert-rate-input"
                step="0.0001"
                min="0.0001"
                placeholder={`如 ${Number((currentPairRate * 0.98).toFixed(4))}`}
                value={targetRate}
                onChange={(e) => setTargetRate(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-700 font-semibold font-mono rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">{toCode}</span>
            </div>
          </div>

          {errorMessage && (
            <p className="text-[11px] text-rose-500 font-medium">{errorMessage}</p>
          )}

          <button
            type="submit"
            id="btn-add-alert"
            className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            新增到價提醒
          </button>
        </form>

        {/* Right column: Alerts List */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-rose-500" />
              目前追蹤清單 ({alerts.length})
            </p>

            {alerts.length === 0 ? (
              <div className="h-[180px] border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
                <Bell className="w-8 h-8 text-slate-200" />
                <p className="text-xs text-slate-400">尚未設定任何提醒。可點擊左側表單設定。</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {alerts.map((alert) => {
                  const fromFlag = SUPPORTED_CURRENCIES[alert.fromCurrency]?.flag || '';
                  const toFlag = SUPPORTED_CURRENCIES[alert.toCurrency]?.flag || '';
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                        alert.isTriggered
                          ? 'bg-rose-50/50 border-rose-200 shadow-inner'
                          : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg flex items-center justify-center ${
                          alert.isTriggered ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-500'
                        }`}>
                          <Bell className={`w-3.5 h-3.5 ${alert.isTriggered ? 'animate-bounce' : ''}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-700">
                              {fromFlag} {alert.fromCurrency} ➡️ {toFlag} {alert.toCurrency}
                            </span>
                            {alert.isTriggered && (
                              <span className="text-[9px] bg-rose-500 text-white font-semibold px-1.5 py-0.5 rounded-full">
                                已到價
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            當匯率 {alert.condition === 'below' ? '低於 (≤)' : '高於 (≥)'}{' '}
                            <span className="font-bold text-slate-600">{alert.targetRate}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start gap-1.5 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50 mt-4 text-[11px] text-indigo-700/80 leading-relaxed">
            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>溫馨提醒：</strong>系統會每隔 30 秒自動取得即時匯率進行監控，並在到價時跳出即時通知。您也可以點擊主面板的「手動刷新」立即對比！
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
