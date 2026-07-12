import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Calendar, Maximize2, Activity, Info } from 'lucide-react';
import { HistoricalDataPoint, SUPPORTED_CURRENCIES } from '../types';

interface CurrencyChartProps {
  from: string;
  to: string;
  period: string;
  setPeriod: (period: string) => void;
  historicalData: HistoricalDataPoint[];
  stats: {
    max: number;
    min: number;
    avg: number;
    changePercent: number;
  };
  isLoading: boolean;
}

export default function CurrencyChart({
  from,
  to,
  period,
  setPeriod,
  historicalData,
  stats,
  isLoading,
}: CurrencyChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Handle resizing of container to make chart responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(Math.max(300, entry.contentRect.width));
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const fromInfo = SUPPORTED_CURRENCIES[from];
  const toInfo = SUPPORTED_CURRENCIES[to];

  // SVG dimensions
  const height = 280;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find min and max for scaling
  const rates = historicalData.map((d) => d.rate);
  const maxVal = stats.max;
  const minVal = stats.min;
  const valRange = maxVal - minVal || 1;

  // Add 5% padding to the top and bottom of the chart to look better
  const paddedMin = minVal - valRange * 0.05;
  const paddedMax = maxVal + valRange * 0.05;
  const paddedRange = paddedMax - paddedMin || 1;

  // Get coordinates for index
  const getCoords = (index: number, val: number) => {
    if (historicalData.length <= 1) return { x: paddingLeft, y: paddingTop };
    const x = paddingLeft + (index / (historicalData.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((val - paddedMin) / paddedRange) * chartHeight;
    return { x, y };
  };

  // Generate SVG Path
  let linePath = '';
  let areaPath = '';

  if (historicalData.length > 1) {
    historicalData.forEach((dp, index) => {
      const { x, y } = getCoords(index, dp.rate);
      if (index === 0) {
        linePath += `M ${x} ${y}`;
        areaPath += `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
        areaPath += ` L ${x} ${y}`;
      }

      if (index === historicalData.length - 1) {
        areaPath += ` L ${x} ${paddingTop + chartHeight} Z`;
      }
    });
  }

  // Handle mouse move to find closest data point (crosshair tracking)
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || historicalData.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - paddingLeft;
    
    // Calculate index based on mouse position
    const relativeX = Math.max(0, Math.min(chartWidth, mouseX));
    const percent = relativeX / chartWidth;
    const index = Math.round(percent * (historicalData.length - 1));
    
    if (index >= 0 && index < historicalData.length) {
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Generate Y-axis grid values (4 lines)
  const yGridTicks = 4;
  const yTicks = Array.from({ length: yGridTicks }).map((_, i) => {
    const val = paddedMin + (i / (yGridTicks - 1)) * paddedRange;
    const y = paddingTop + chartHeight - (i / (yGridTicks - 1)) * chartHeight;
    return { val, y };
  });

  // Generate X-axis labels (3 to 5 labels depending on size)
  const getXTicks = () => {
    if (historicalData.length < 2) return [];
    const ticks = [];
    const count = containerWidth > 500 ? 5 : 3;
    const interval = Math.floor((historicalData.length - 1) / (count - 1));
    
    for (let i = 0; i < count; i++) {
      const index = Math.min(historicalData.length - 1, i * interval);
      const dp = historicalData[index];
      if (dp) {
        const dateObj = new Date(dp.date);
        let formattedDate = '';
        if (period === '1W') {
          // Mon, Tue... or MM/DD
          formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        } else if (period === '1M') {
          formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        } else {
          // Year
          formattedDate = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}`;
        }
        ticks.push({
          label: formattedDate,
          x: getCoords(index, dp.rate).x,
        });
      }
    }
    return ticks;
  };

  const xTicks = getXTicks();

  // Active or hovered data point details
  const activeIndex = hoveredIndex !== null ? hoveredIndex : historicalData.length - 1;
  const activePoint = historicalData[activeIndex];
  const isRising = stats.changePercent >= 0;

  return (
    <div id="chart-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      {/* Stats Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              歷史走勢圖表
            </span>
            <span className="text-xs px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full font-mono border border-slate-100">
              {fromInfo?.flag} {from} / {toInfo?.flag} {to}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800">
            {fromInfo?.name} 兌 {toInfo?.name} 走勢分析
          </h3>
        </div>

        {/* Period Selector Toggle */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 self-start md:self-center">
          {['1W', '1M', '1Y'].map((p) => (
            <button
              key={p}
              id={`btn-period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                period === p
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p === '1W' ? '1 週' : p === '1M' ? '1 個月' : '1 年'}
            </button>
          ))}
        </div>
      </div>

      {/* Numerical Stats Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/60 rounded-xl mb-6 border border-slate-100/50">
        <div id="stat-max">
          <p className="text-xs text-slate-400 font-medium mb-1">最高匯率</p>
          <p className="text-base font-bold font-mono text-slate-700">
            {isLoading ? '---' : stats.max}
          </p>
        </div>
        <div id="stat-min">
          <p className="text-xs text-slate-400 font-medium mb-1">最低匯率</p>
          <p className="text-base font-bold font-mono text-slate-700">
            {isLoading ? '---' : stats.min}
          </p>
        </div>
        <div id="stat-avg">
          <p className="text-xs text-slate-400 font-medium mb-1">平均匯率</p>
          <p className="text-base font-bold font-mono text-slate-700">
            {isLoading ? '---' : stats.avg}
          </p>
        </div>
        <div id="stat-change">
          <p className="text-xs text-slate-400 font-medium mb-1">區間漲跌</p>
          <div className="flex items-center gap-1">
            {isLoading ? (
              <span className="text-base font-bold font-mono text-slate-700">---</span>
            ) : (
              <span
                className={`text-base font-bold font-mono flex items-center gap-0.5 ${
                  isRising ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isRising ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isRising ? '+' : ''}
                {stats.changePercent}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SVG Interactive Plot Container */}
      <div ref={containerRef} className="relative w-full">
        {isLoading ? (
          <div className="h-[280px] flex flex-col items-center justify-center gap-3 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400 font-medium">匯率數據加載中...</p>
          </div>
        ) : (
          <div className="relative">
            {/* Top Interactive Banner on Hover */}
            <AnimatePresence mode="popLayout">
              {activePoint && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-2 left-14 z-10 bg-slate-800/90 text-white text-xs px-3 py-1.5 rounded-lg font-mono flex items-center gap-3 backdrop-blur shadow-sm"
                >
                  <span className="text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {activePoint.date}
                  </span>
                  <span className="w-px h-3 bg-slate-600" />
                  <span className="text-indigo-300 font-semibold">
                    1 {from} = {activePoint.displayRate} {to}
                  </span>
                  {hoveredIndex !== null && (
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      動態追蹤
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <svg
              ref={svgRef}
              width={containerWidth}
              height={height}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="overflow-visible select-none cursor-crosshair"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2864a0" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#2864a0" stopOpacity="0.00" />
                </linearGradient>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2864a0" floodOpacity="0.18" />
                </filter>
              </defs>

              {/* Grid Lines (Y-Axis) */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={tick.y}
                    x2={containerWidth - paddingRight}
                    y2={tick.y}
                    stroke="#c7d6e7"
                    strokeWidth="1.5"
                    strokeDasharray={i === 0 ? '0' : '4 4'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="#4a5568"
                    className="font-mono text-[10px] font-medium"
                  >
                    {tick.val.toFixed(2)}
                  </text>
                </g>
              ))}

              {/* Chart Paths */}
              {historicalData.length > 1 && (
                <>
                  {/* Fill Area */}
                  <path d={areaPath} fill="url(#chart-gradient)" />

                  {/* Stroke Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2864a0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#shadow)"
                  />
                </>
              )}

              {/* Grid Lines & Labels (X-Axis) */}
              {xTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={tick.x}
                    y1={paddingTop}
                    x2={tick.x}
                    y2={paddingTop + chartHeight}
                    stroke="#d9e4f1"
                    strokeWidth="1.5"
                  />
                  <text
                    x={tick.x}
                    y={paddingTop + chartHeight + 18}
                    textAnchor="middle"
                    fill="#4a5568"
                    className="text-[10px] font-medium"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Hover Indicator Crosshair */}
              {hoveredIndex !== null && (
                <g>
                  {(() => {
                    const dp = historicalData[hoveredIndex];
                    const { x, y } = getCoords(hoveredIndex, dp.rate);
                    return (
                      <>
                        {/* Vertical line */}
                        <line
                          x1={x}
                          y1={paddingTop}
                          x2={x}
                          y2={paddingTop + chartHeight}
                          stroke="#796996"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                        {/* Circle highlight */}
                        <circle cx={x} cy={y} r="6" fill="#f0b860" stroke="#ffffff" strokeWidth="2" />
                        <circle cx={x} cy={y} r="10" fill="#f0b860" fillOpacity="0.18" />
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Bottom solid baseline */}
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight}
                x2={containerWidth - paddingRight}
                y2={paddingTop + chartHeight}
                stroke="#4a5568"
                strokeWidth="1"
              />
            </svg>

            {/* Disclaimer */}
            <div className="flex items-center gap-1.5 mt-2 justify-end text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-300" />
              <span>圖表數值僅供參考，實際交易以承作銀行當下報價為準</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
