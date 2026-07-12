import type { AlertThreshold, HistoricalDataPoint } from '../types';

export type RateSignalLevel = 'watch' | 'accumulate' | 'caution' | 'neutral' | 'insufficient';

export interface DailyRateChange {
  date: string;
  rate: number;
  change: number;
  changePercent: number;
}

export interface MovingAveragePoint {
  date: string;
  value: number;
}

export interface PercentileBands {
  low: number;
  high: number;
  average: number;
  accumulateMax: number;
  cautionMin: number;
}

export interface RateSignal {
  level: RateSignalLevel;
  label: string;
  detail: string;
}

export interface TargetDistance {
  id: string;
  label: string;
  targetRate: number;
  condition: 'above' | 'below';
  distance: number;
  distancePercent: number;
  isReached: boolean;
}

export interface DerivedRateMetrics {
  currentRate: number;
  dailyChanges: DailyRateChange[];
  movingAverages: {
    short: MovingAveragePoint[];
    long: MovingAveragePoint[];
  };
  percentileBands: PercentileBands;
  volatility: number;
  momentumScore: number;
  momentum: RateSignal;
  position: RateSignal;
  targetDistances: TargetDistance[];
  fallbackDistances: {
    low: TargetDistance;
    average: TargetDistance;
    high: TargetDistance;
  };
}

interface BuildRateInsightMetricsInput {
  historicalData: HistoricalDataPoint[];
  currentRate: number;
  alerts: AlertThreshold[];
  fromCurrency: string;
  toCurrency: string;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const percentile = (values: number[], ratio: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
};

const movingAverage = (data: HistoricalDataPoint[], windowSize: number): MovingAveragePoint[] =>
  data.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = data.slice(start, index + 1).map((item) => item.rate);
    return {
      date: point.date,
      value: round(average(window), 4),
    };
  });

const buildDistance = (
  id: string,
  label: string,
  targetRate: number,
  condition: 'above' | 'below',
  currentRate: number,
): TargetDistance => {
  const distance = targetRate - currentRate;
  const isReached = condition === 'above' ? currentRate >= targetRate : currentRate <= targetRate;
  return {
    id,
    label,
    targetRate: round(targetRate, 4),
    condition,
    distance: round(distance, 4),
    distancePercent: currentRate === 0 ? 0 : round(Math.abs(distance / currentRate) * 100),
    isReached,
  };
};

const buildPositionSignal = (currentRate: number, bands: PercentileBands): RateSignal => {
  if (!currentRate || !bands.high) {
    return { level: 'insufficient', label: '資料不足', detail: '需要歷史匯率後才能判讀目前位置。' };
  }

  if (currentRate <= bands.accumulateMax) {
    return { level: 'accumulate', label: '接近分批區', detail: '目前位於期間相對低檔，可列入分批觀察。' };
  }

  if (currentRate >= bands.cautionMin) {
    return { level: 'caution', label: '風險偏高', detail: '目前位於期間相對高檔，追價前應留意回落風險。' };
  }

  return { level: 'neutral', label: '中性區間', detail: '目前位於歷史中段，適合搭配目標價等待確認。' };
};

const buildMomentumSignal = (score: number, volatility: number, hasEnoughData: boolean): RateSignal => {
  if (!hasEnoughData) {
    return { level: 'insufficient', label: '資料不足', detail: '需要更多資料點才能判讀短中期動能。' };
  }

  if (score >= 1.5) {
    return {
      level: volatility > 2 ? 'caution' : 'watch',
      label: volatility > 2 ? '偏強但波動高' : '偏強但留意波動',
      detail: '短期均線高於長期均線，仍需觀察波動是否擴大。',
    };
  }

  if (score <= -1.5) {
    return { level: 'accumulate', label: '偏弱可觀察', detail: '短期均線低於長期均線，可等待止跌或分批條件。' };
  }

  return { level: 'neutral', label: '盤整觀察', detail: '短中期均線差距不大，尚未形成明確方向。' };
};

export function buildRateInsightMetrics({
  historicalData,
  currentRate,
  alerts,
  fromCurrency,
  toCurrency,
}: BuildRateInsightMetricsInput): DerivedRateMetrics {
  const rates = historicalData.map((point) => point.rate);
  const low = rates.length ? Math.min(...rates) : 0;
  const high = rates.length ? Math.max(...rates) : 0;
  const avg = average(rates);
  const short = movingAverage(historicalData, 5);
  const long = movingAverage(historicalData, 20);

  const dailyChanges = historicalData.slice(1).map((point, index) => {
    const previous = historicalData[index];
    const change = point.rate - previous.rate;
    return {
      date: point.date,
      rate: point.rate,
      change: round(change, 4),
      changePercent: previous.rate === 0 ? 0 : round((change / previous.rate) * 100),
    };
  });

  const changePercents = dailyChanges.map((change) => change.changePercent);
  const changeAverage = average(changePercents);
  const variance = average(changePercents.map((value) => (value - changeAverage) ** 2));
  const volatility = round(Math.sqrt(variance));
  const latestShort = short.at(-1)?.value ?? 0;
  const latestLong = long.at(-1)?.value ?? 0;
  const momentumScore = latestLong === 0 ? 0 : round(((latestShort - latestLong) / latestLong) * 100);

  const percentileBands: PercentileBands = {
    low: round(low, 4),
    high: round(high, 4),
    average: round(avg, 4),
    accumulateMax: round(percentile(rates, 0.2), 4),
    cautionMin: round(percentile(rates, 0.8), 4),
  };

  const activeAlerts = alerts.filter(
    (alert) => alert.fromCurrency === fromCurrency && alert.toCurrency === toCurrency,
  );

  const targetDistances = activeAlerts
    .map((alert) =>
      buildDistance(
        alert.id,
        `${alert.condition === 'above' ? '高於' : '低於'} ${alert.targetRate}`,
        alert.targetRate,
        alert.condition,
        currentRate,
      ),
    )
    .sort((a, b) => a.distancePercent - b.distancePercent);

  return {
    currentRate,
    dailyChanges,
    movingAverages: { short, long },
    percentileBands,
    volatility,
    momentumScore,
    momentum: buildMomentumSignal(momentumScore, volatility, historicalData.length >= 3),
    position: buildPositionSignal(currentRate, percentileBands),
    targetDistances,
    fallbackDistances: {
      low: buildDistance('period-low', '期間低點', low, 'below', currentRate),
      average: buildDistance('period-average', '期間均值', avg, currentRate >= avg ? 'below' : 'above', currentRate),
      high: buildDistance('period-high', '期間高點', high, 'above', currentRate),
    },
  };
}
