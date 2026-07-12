import React from 'react';
import { History, Trash2, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { ConversionRecord, SUPPORTED_CURRENCIES } from '../types';

interface ConversionHistoryProps {
  records: ConversionRecord[];
  onClearHistory: () => void;
  onApplyPair: (from: string, to: string, amount: number) => void;
}

export default function ConversionHistory({ records, onClearHistory, onApplyPair }: ConversionHistoryProps) {
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <div id="history-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">最近計算紀錄</h3>
            <p className="text-xs text-slate-400">快速檢索並套用您最近做過的幣別與金額對折計算</p>
          </div>
        </div>
        {records.length > 0 && (
          <button
            id="btn-clear-history"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-semibold py-1.5 px-3 hover:bg-rose-50 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清除紀錄
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="h-[140px] border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center text-slate-400">
          <History className="w-8 h-8 text-slate-200 animate-pulse" />
          <p className="text-xs">尚無計算紀錄。在上方進行換匯轉換後，將自動留存紀錄！</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {records.map((record) => {
            const fromInfo = SUPPORTED_CURRENCIES[record.fromCurrency];
            const toInfo = SUPPORTED_CURRENCIES[record.toCurrency];
            return (
              <div
                key={record.id}
                className="group p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200/80 hover:shadow-sm flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-50/50 text-indigo-500 rounded-lg text-xs font-semibold">
                    {fromInfo?.flag || '🏳️'} ➡️ {toInfo?.flag || '🏳️'}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {record.fromAmount.toLocaleString()} {record.fromCurrency}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">等於</span>
                      <span className="text-xs font-extrabold font-mono text-indigo-600">
                        {record.toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {record.toCurrency}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {formatTime(record.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-slate-300" />
                        匯率: {record.rate}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyPair(record.fromCurrency, record.toCurrency, record.fromAmount)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 group-hover:border-indigo-100 py-1.5 px-3 rounded-lg border border-slate-100 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  套用
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
