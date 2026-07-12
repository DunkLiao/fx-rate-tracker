import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, Gauge, Goal, Layers3, LineChart, TrendingDown, TrendingUp } from 'lucide-react';
import type { AlertThreshold, HistoricalDataPoint } from '../types';
import { buildRateInsightMetrics, type DerivedRateMetrics, type RateSignalLevel } from '../lib/rateInsights';

interface RateInsightChartsProps {
  from: string;
  to: string;
  currentRate: number;
  historicalData: HistoricalDataPoint[];
  alerts: AlertThreshold[];
  isLoading: boolean;
}

type ChartKey = 'trend' | 'zone' | 'volatility' | 'momentum' | 'targets';

const CHARTS: Array<{ key: ChartKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'trend', label: '均線趨勢', icon: LineChart },
  { key: 'zone', label: '進出場區間', icon: Layers3 },
  { key: 'volatility', label: '每日波動', icon: BarChart3 },
  { key: 'momentum', label: '動能儀表', icon: Gauge },
  { key: 'targets', label: '目標距離', icon: Goal },
];

const signalClasses: Record<RateSignalLevel, string> = {
  accumulate: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  caution: 'bg-rose-50 text-rose-700 border-rose-100',
  watch: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  neutral: 'bg-slate-50 text-slate-700 border-slate-100',
  insufficient: 'bg-slate-50 text-slate-400 border-slate-100',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildPath = (values: Array<{ date: string; value: number }>, min: number, max: number) => {
  const width = 560;
  const height = 170;
  const left = 48;
  const top = 28;
  const range = max - min || 1;

  return values
    .map((point, index) => {
      const x = left + (values.length <= 1 ? 0 : (index / (values.length - 1)) * width);
      const y = top + height - ((point.value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

function EmptyState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="h-[230px] flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-center">
      <Activity className={`w-8 h-8 text-slate-300 ${isLoading ? 'animate-pulse' : ''}`} />
      <p className="text-xs font-semibold text-slate-400">{isLoading ? '正在整理判讀圖形...' : '資料不足，暫時無法產生圖形。'}</p>
    </div>
  );
}

function SignalBadge({ metrics }: { metrics: DerivedRateMetrics }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${signalClasses[metrics.position.level]}`}>
      <p className="text-[11px] font-bold">目前位置：{metrics.position.label}</p>
      <p className="text-[11px] leading-relaxed opacity-80">{metrics.position.detail}</p>
    </div>
  );
}

function TrendChart({ metrics, from, to }: { metrics: DerivedRateMetrics; from: string; to: string }) {
  const rates = metrics.movingAverages.short.map((point, index) => ({
    date: point.date,
    value: metrics.movingAverages.long[index] ? metrics.movingAverages.long[index].value : point.value,
    raw: metrics.movingAverages.short[index],
  }));
  const allValues = [
    ...metrics.movingAverages.short.map((point) => point.value),
    ...metrics.movingAverages.long.map((point) => point.value),
    ...rates.map((point) => point.raw.value),
  ].filter((value) => Number.isFinite(value) && value > 0);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const rawPath = buildPath(rates.map((point) => ({ date: point.date, value: point.raw.value })), min, max);
  const shortPath = buildPath(metrics.movingAverages.short, min, max);
  const longPath = buildPath(metrics.movingAverages.long, min, max);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-800">趨勢均線圖</h4>
          <p className="text-xs text-slate-400 mt-1">比較原始匯率、短均線與長均線，快速判斷方向是否延續。</p>
        </div>
        <SignalBadge metrics={metrics} />
      </div>
      <svg viewBox="0 0 640 240" className="w-full h-auto overflow-visible">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="48" x2="608" y1={28 + line * 56} y2={28 + line * 56} stroke="#f1f5f9" strokeWidth="1.5" />
        ))}
        <path d={rawPath} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={longPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={shortPath} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="48" y="222" className="fill-slate-400 text-[11px] font-semibold">
          {from}/{to}
        </text>
        <text x="608" y="222" textAnchor="end" className="fill-slate-400 text-[11px] font-semibold">
          短均線高於長均線代表動能偏強
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300" />原始匯率</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-600" />短均線</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" />長均線</span>
      </div>
    </div>
  );
}

function ZoneChart({ metrics }: { metrics: DerivedRateMetrics }) {
  const { low, high, average, accumulateMax, cautionMin } = metrics.percentileBands;
  const range = high - low || 1;
  const pointer = clamp(((metrics.currentRate - low) / range) * 100, 0, 100);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-black text-slate-800">進出場區間帶</h4>
        <p className="text-xs text-slate-400 mt-1">用歷史低檔、中段與高檔區間，提示可觀察位置。</p>
      </div>
      <div className="relative pt-8 pb-8">
        <div className="h-10 overflow-hidden rounded-xl border border-slate-100 flex">
          <div className="bg-emerald-100 w-1/5" />
          <div className="bg-slate-100 flex-1" />
          <div className="bg-rose-100 w-1/5" />
        </div>
        <div className="absolute top-0 -translate-x-1/2" style={{ left: `${pointer}%` }}>
          <div className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-sm whitespace-nowrap">
            目前 {metrics.currentRate}
          </div>
          <div className="mx-auto h-10 w-0.5 bg-slate-900" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-semibold">
          <span className="text-emerald-700">分批觀察 ≤ {accumulateMax}</span>
          <span className="text-center text-slate-500">均值 {average}</span>
          <span className="text-right text-rose-700">風險升高 ≥ {cautionMin}</span>
        </div>
      </div>
      <SignalBadge metrics={metrics} />
    </div>
  );
}

function VolatilityChart({ metrics }: { metrics: DerivedRateMetrics }) {
  const changes = metrics.dailyChanges.slice(-30);
  const maxAbs = Math.max(0.1, ...changes.map((change) => Math.abs(change.changePercent)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-800">每日波動柱狀圖</h4>
          <p className="text-xs text-slate-400 mt-1">紅綠柱顯示日變動率，波動放大時不宜只看單日價格。</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">
          波動率 {metrics.volatility}%
        </div>
      </div>
      <div className="h-[210px] flex items-center gap-1 border-b border-slate-100 px-1">
        {changes.map((change) => {
          const height = Math.max(8, (Math.abs(change.changePercent) / maxAbs) * 88);
          return (
            <div key={change.date} className="flex-1 h-full flex flex-col justify-center">
              <div
                title={`${change.date} ${change.changePercent}%`}
                className={`w-full rounded-sm ${change.changePercent >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ height: `${height}px`, opacity: 0.35 + (height / 88) * 0.55 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span>近期 {changes.length} 筆日變動</span>
        <span>綠色代表匯率上升，紅色代表下降</span>
      </div>
    </div>
  );
}

function MomentumGauge({ metrics }: { metrics: DerivedRateMetrics }) {
  const score = clamp(metrics.momentumScore, -5, 5);
  const pointer = ((score + 5) / 10) * 100;

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-black text-slate-800">動能儀表圖</h4>
        <p className="text-xs text-slate-400 mt-1">以短均線相對長均線的差距估算動能，搭配波動率做保守提醒。</p>
      </div>
      <div className="relative py-8">
        <div className="h-5 rounded-full bg-gradient-to-r from-emerald-400 via-slate-200 to-rose-400" />
        <div className="absolute top-3 -translate-x-1/2" style={{ left: `${pointer}%` }}>
          <div className="h-14 w-1 rounded-full bg-slate-900 shadow-sm" />
        </div>
        <div className="mt-4 flex justify-between text-[11px] font-bold text-slate-500">
          <span>偏弱可觀察</span>
          <span>盤整</span>
          <span>偏強留意</span>
        </div>
      </div>
      <div className={`rounded-xl border p-4 ${signalClasses[metrics.momentum.level]}`}>
        <div className="flex items-center gap-2">
          {metrics.momentumScore >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <p className="text-sm font-black">{metrics.momentum.label}</p>
          <span className="ml-auto text-xs font-mono">{metrics.momentumScore}%</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed opacity-80">{metrics.momentum.detail}</p>
      </div>
    </div>
  );
}

function TargetDistanceChart({ metrics }: { metrics: DerivedRateMetrics }) {
  const distances =
    metrics.targetDistances.length > 0
      ? metrics.targetDistances
      : [metrics.fallbackDistances.low, metrics.fallbackDistances.average, metrics.fallbackDistances.high];
  const maxDistance = Math.max(1, ...distances.map((distance) => distance.distancePercent));

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-slate-800">目標價距離圖</h4>
        <p className="text-xs text-slate-400 mt-1">
          {metrics.targetDistances.length > 0 ? '依照目前到價通知，顯示還差多少百分比。' : '尚未設定通知，先以期間高點、均值與低點做參考。'}
        </p>
      </div>
      <div className="space-y-3">
        {distances.map((distance) => {
          const width = clamp((distance.distancePercent / maxDistance) * 100, 2, 100);
          return (
            <div key={distance.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 truncate">{distance.label}</span>
                <span className={`font-mono font-bold ${distance.isReached ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {distance.isReached ? '已達標' : `${distance.distancePercent}%`}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${distance.isReached ? 'bg-emerald-500' : distance.condition === 'above' ? 'bg-indigo-500' : 'bg-rose-500'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                目標 {distance.targetRate}，目前 {metrics.currentRate}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RateInsightCharts({
  from,
  to,
  currentRate,
  historicalData,
  alerts,
  isLoading,
}: RateInsightChartsProps) {
  const [activeChart, setActiveChart] = useState<ChartKey>('trend');
  const metrics = useMemo(
    () => buildRateInsightMetrics({ historicalData, currentRate, alerts, fromCurrency: from, toCurrency: to }),
    [alerts, currentRate, from, historicalData, to],
  );

  const hasData = historicalData.length >= 2 && currentRate > 0;

  const renderChart = () => {
    if (!hasData || isLoading) return <EmptyState isLoading={isLoading} />;
    if (activeChart === 'trend') return <TrendChart metrics={metrics} from={from} to={to} />;
    if (activeChart === 'zone') return <ZoneChart metrics={metrics} />;
    if (activeChart === 'volatility') return <VolatilityChart metrics={metrics} />;
    if (activeChart === 'momentum') return <MomentumGauge metrics={metrics} />;
    return <TargetDistanceChart metrics={metrics} />;
  };

  return (
    <section id="rate-insight-charts" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      <div className="flex flex-col gap-4 mb-5">
        <div>
          <p className="text-xs font-black text-indigo-500 uppercase tracking-wider">Rate Decision Views</p>
          <h3 className="text-base font-black text-slate-800 mt-1">匯率分析圖表</h3>
          <p className="text-xs text-slate-400 mt-1">用規則式圖形快速檢查趨勢、區間、波動、動能與目標距離。</p>
        </div>
        <div
          role="tablist"
          aria-label="匯率判讀圖形選單"
          className="flex w-full flex-wrap gap-1 rounded-3xl border border-slate-200 bg-slate-100 p-1 sm:inline-flex sm:w-auto sm:rounded-full"
        >
          {CHARTS.map((chart) => {
            const Icon = chart.icon;
            const isActive = activeChart === chart.key;
            return (
              <button
                key={chart.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveChart(chart.key)}
                className={`min-w-[7rem] flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition sm:flex-none ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                    : 'text-slate-500 hover:bg-white/70 hover:text-indigo-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {chart.label}
              </button>
            );
          })}
        </div>
      </div>
      {renderChart()}
      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        圖形僅依目前頁面匯率資料做規則式整理，適合作為換匯觀察輔助，不構成投資或交易建議。
      </p>
    </section>
  );
}
