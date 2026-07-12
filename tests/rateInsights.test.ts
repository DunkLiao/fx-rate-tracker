import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRateInsightMetrics } from '../src/lib/rateInsights';
import { formatCurrencyOptionLabel } from '../src/lib/currencyLabels';
import { calculateConvertedAmount, calculatePairRate } from '../src/lib/conversion';
import type { AlertThreshold, HistoricalDataPoint } from '../src/types';

const history: HistoricalDataPoint[] = [
  { date: '2026-01-01', rate: 30, displayRate: '30.0000' },
  { date: '2026-01-02', rate: 31, displayRate: '31.0000' },
  { date: '2026-01-03', rate: 32, displayRate: '32.0000' },
  { date: '2026-01-04', rate: 33, displayRate: '33.0000' },
  { date: '2026-01-05', rate: 34, displayRate: '34.0000' },
  { date: '2026-01-06', rate: 35, displayRate: '35.0000' },
];

const alerts: AlertThreshold[] = [
  {
    id: 'above-target',
    fromCurrency: 'USD',
    toCurrency: 'TWD',
    targetRate: 36,
    condition: 'above',
    isTriggered: false,
    createdAt: 1,
  },
  {
    id: 'below-target',
    fromCurrency: 'USD',
    toCurrency: 'TWD',
    targetRate: 29,
    condition: 'below',
    isTriggered: false,
    createdAt: 2,
  },
];

const metrics = buildRateInsightMetrics({
  historicalData: history,
  currentRate: 35,
  alerts,
  fromCurrency: 'USD',
  toCurrency: 'TWD',
});

assert.equal(metrics.currentRate, 35);
assert.equal(metrics.dailyChanges.length, 5);
assert.equal(metrics.dailyChanges[0].changePercent, 3.33);
assert.equal(metrics.movingAverages.short.at(-1)?.value, 33);
assert.equal(metrics.movingAverages.long.at(-1)?.value, 32.5);
assert.equal(metrics.percentileBands.accumulateMax, 31);
assert.equal(metrics.percentileBands.cautionMin, 34);
assert.equal(metrics.position.label, '風險偏高');
assert.equal(metrics.momentum.label, '偏強但留意波動');
assert.equal(metrics.targetDistances.length, 2);
assert.equal(metrics.targetDistances[0].distancePercent, 2.86);
assert.equal(metrics.fallbackDistances.high.distancePercent, 0);

const emptyMetrics = buildRateInsightMetrics({
  historicalData: [],
  currentRate: 0,
  alerts: [],
  fromCurrency: 'USD',
  toCurrency: 'TWD',
});

assert.equal(emptyMetrics.dailyChanges.length, 0);
assert.equal(emptyMetrics.position.label, '資料不足');
assert.equal(emptyMetrics.momentum.label, '資料不足');

assert.equal(
  formatCurrencyOptionLabel({ code: 'USD', name: '美金', symbol: '$', flag: '🇺🇸', locale: 'en-US' }),
  'USD (美金)',
);
assert.equal(
  formatCurrencyOptionLabel({ code: 'TWD', name: '新台幣', symbol: 'NT$', flag: '🇹🇼', locale: 'zh-TW' }),
  'TWD (新台幣)',
);

const rateAlertsSource = readFileSync('src/components/RateAlerts.tsx', 'utf8');
assert.match(rateAlertsSource, /formatCurrencyOptionLabel/);
assert.doesNotMatch(rateAlertsSource, /\{c\.flag\}\s+\{c\.code\}\s+\(\{c\.name\}\)/);
assert.doesNotMatch(rateAlertsSource, /grid grid-cols-2 gap-2/);

const appSource = readFileSync('src/App.tsx', 'utf8');
assert.doesNotMatch(appSource, /setToAmount/);
assert.doesNotMatch(appSource, /const\s+\[toAmount,\s*setToAmount\]/);
assert.match(appSource, /const\s+toAmount\s*=\s*calculateConvertedAmount/);
assert.doesNotMatch(appSource, /React 18|Vite|Express|構建/);

const rates = { USD: 1, TWD: 32.5, JPY: 157 };
assert.equal(calculateConvertedAmount(1000, 'USD', 'TWD', rates), 32500);
assert.equal(calculateConvertedAmount(1000, 'USD', 'JPY', rates), 157000);
assert.equal(calculateConvertedAmount(1000, 'TWD', 'USD', rates), 30.7692);
assert.equal(calculateConvertedAmount(1000, 'USD', 'EUR', rates), 0);
assert.equal(calculatePairRate('USD', 'TWD', rates), 32.5);
assert.equal(calculatePairRate('TWD', 'USD', rates), 0.0308);
assert.equal(calculatePairRate('EUR', 'TWD', rates), 0);

const matrixSource = readFileSync('src/App.tsx', 'utf8');
assert.match(matrixSource, /當前匯率\s*\(對 \{fromCurrency\}\)/);
assert.match(matrixSource, /calculatePairRate\(fromCurrency, c\.code, rates\)/);
assert.doesNotMatch(matrixSource, /\{rates\[c\.code\]\}/);
assert.ok(matrixSource.indexOf('rate-matrix-card') < matrixSource.indexOf('<RateInsightCharts'));

const insightChartsSource = readFileSync('src/components/RateInsightCharts.tsx', 'utf8');
assert.match(insightChartsSource, /匯率分析圖表/);
assert.doesNotMatch(insightChartsSource, /五種匯率判讀圖形/);
assert.match(insightChartsSource, /rounded-full/);
assert.match(insightChartsSource, /flex-wrap/);
assert.doesNotMatch(insightChartsSource, /overflow-x-auto/);
assert.match(insightChartsSource, /role="tablist"/);
assert.match(insightChartsSource, /role="tab"/);

console.log('rateInsights tests passed');
