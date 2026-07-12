import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, Compass, ShieldCheck, AlertTriangle, Send, Loader2, ArrowRight } from 'lucide-react';
import { AIAnalysisResponse, SUPPORTED_CURRENCIES } from '../types';

interface AIAssistantProps {
  from: string;
  to: string;
  period: string;
  currentRate: number;
}

export default function AIAssistant({ from, to, period, currentRate }: AIAssistantProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fromInfo = SUPPORTED_CURRENCIES[from];
  const toInfo = SUPPORTED_CURRENCIES[to];

  // Helper to trigger standard analysis
  const handleGenerateAnalysis = async (userQuestion?: string) => {
    setIsLoading(true);
    setError(null);
    setLoadingStep('正在連結 Gemini AI 智慧分析模組...');

    const steps = [
      '正在獲取多國央行近期利差決策與貨幣政策...',
      '正在計算該貨幣歷史波動率與技術阻力位...',
      '正在演算最佳換匯區間與分批布局策略...',
      '正在編排繁體中文報告與操作指引...',
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setLoadingStep(steps[stepIndex]);
        stepIndex++;
      }
    }, 1800);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          period,
          currentRate,
          customQuestion: userQuestion,
        }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        if (userQuestion) {
          // Clear question input on success
          setCustomQuestion('');
        }
      } else {
        throw new Error(data.error || 'AI 分析模組回傳失敗');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '連線錯誤，請稍後再試。');
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handlePresetQuestion = (question: string) => {
    setCustomQuestion(question);
    handleGenerateAnalysis(question);
  };

  const presetQuestions = [
    `我近期要去旅遊，現在換 ${toInfo?.name || to} 划算嗎？`,
    `請問 ${from} 到 ${to} 下半年的長線走勢分析？`,
    `如何對 ${from}/${to} 進行分批換匯以降低持有成本？`,
  ];

  return (
    <div id="ai-assistant" className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl p-6 relative overflow-hidden">
      {/* Decorative ambient neon background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Gemini Pro 智慧大腦</span>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              AI 外匯走勢領航員
            </h3>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            當前對盤：{from} ➡️ {to}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: General Report / Form Trigger */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {!analysis && !isLoading ? (
              /* Empty State Invitation */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 flex flex-col items-center justify-center text-center gap-4 h-full"
              >
                <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Compass className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-200">還沒有走勢評估報告</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                    匯率波動莫測？讓 AI 外匯導師綜合國際總體經濟與近期阻力支撐，為您演算最佳交易水位與建議。
                  </p>
                </div>

                <button
                  id="btn-generate-ai-analysis"
                  onClick={() => handleGenerateAnalysis()}
                  className="mt-2 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 rounded-xl transition shadow-md hover:shadow-indigo-500/20 hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  產生 {from}/{to} AI 走勢分析報告
                </button>
              </motion.div>
            ) : isLoading ? (
              /* Loading State */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center text-center gap-4 h-full"
              >
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">AI 精密演算中...</h4>
                  <p className="text-xs text-indigo-400/80 font-mono animate-pulse min-h-[1.5rem]">
                    {loadingStep}
                  </p>
                </div>
              </motion.div>
            ) : (
              /* Results Panel */
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Trend post & suggested levels */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Trend Indicator */}
                  <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                    {analysis.trend === 'up' && (
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <span className="text-xl">📈</span>
                      </div>
                    )}
                    {analysis.trend === 'down' && (
                      <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                        <span className="text-xl">📉</span>
                      </div>
                    )}
                    {analysis.trend === 'stable' && (
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                        <span className="text-xl">➡️</span>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold tracking-wider">近期趨勢評估</p>
                      <p className="text-sm font-bold text-slate-200">
                        {analysis.trend === 'up' && '看多 (偏強升值)'}
                        {analysis.trend === 'down' && '看空 (偏弱貶值)'}
                        {analysis.trend === 'stable' && '震盪 (持平盤整)'}
                      </p>
                    </div>
                  </div>

                  {/* Level Suggestions */}
                  <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold">建議買進 (支撐)</p>
                      <p className="text-sm font-extrabold font-mono text-emerald-400">
                        {analysis.suggestedLevels.buy}
                      </p>
                    </div>
                    <div className="border-l border-slate-800 pl-3">
                      <p className="text-[10px] text-slate-500 font-bold">建議賣出 (阻力)</p>
                      <p className="text-sm font-extrabold font-mono text-rose-400">
                        {analysis.suggestedLevels.sell}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Depth Summary */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h5 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    專家市場解析報告
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {analysis.summary}
                  </p>
                </div>

                {/* Custom Answer Block (if present) */}
                {analysis.answer && (
                  <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-900/30">
                    <h5 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 mb-2">
                      <MessageSquare className="w-3.5 h-3.5" />
                      專屬問答解答
                    </h5>
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      {analysis.answer}
                    </p>
                  </div>
                )}

                {/* Quick Advice Badge */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 border-l-4 border-l-indigo-500">
                  <h5 className="text-xs font-bold text-indigo-400 mb-1">操作戰術與佈局建議</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysis.advice}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-3 bg-rose-900/20 text-rose-400 rounded-xl border border-rose-900/40 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt re-run analysis */}
          {analysis && !isLoading && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleGenerateAnalysis()}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                重新產生基礎報告
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Factors & Question Panel */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Key economic factors */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              影響走勢 3 大推手
            </h4>
            {analysis && !isLoading ? (
              <ul className="space-y-3">
                {analysis.factors.map((factor, index) => (
                  <li key={index} className="flex gap-2.5 text-xs">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold font-mono">
                      {index + 1}
                    </span>
                    <span className="text-slate-300 leading-relaxed">{factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 py-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2.5 items-center">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-slate-700 flex items-center justify-center font-bold font-mono text-xs">
                      {i}
                    </span>
                    <span className="w-full h-3 bg-slate-900 rounded animate-pulse" />
                  </div>
                ))}
                <p className="text-[11px] text-slate-500 text-center mt-3">生成走勢報告後將同步整理影響因子</p>
              </div>
            )}
          </div>

          {/* Direct Interactive Question Box */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/60 flex-1 flex flex-col justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                詢問專屬外匯問題
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                有特殊的資金需求？直接鍵入您的旅遊天數、換匯用途或觀察點，讓 AI 針對性回答。
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-1.5">
              {presetQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetQuestion(q)}
                  disabled={isLoading}
                  className="text-left text-[11px] text-slate-400 hover:text-indigo-400 hover:bg-slate-900/60 p-2 rounded-lg border border-slate-800/50 transition cursor-pointer disabled:opacity-50"
                >
                  💡 {q}
                </button>
              ))}
            </div>

            {/* Input field */}
            <div className="flex items-center gap-2 relative mt-1">
              <input
                type="text"
                id="ai-question-input"
                placeholder={`問問 AI，例如: 美金還會再升值嗎？`}
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customQuestion.trim()) {
                    handleGenerateAnalysis(customQuestion);
                  }
                }}
                disabled={isLoading}
                className="w-full bg-slate-950 text-xs text-slate-100 placeholder-slate-500 border border-slate-800 rounded-xl py-3 pl-3 pr-10 focus:outline-none focus:border-indigo-500 transition disabled:opacity-60"
              />
              <button
                id="btn-ask-ai"
                onClick={() => {
                  if (customQuestion.trim()) {
                    handleGenerateAnalysis(customQuestion);
                  }
                }}
                disabled={isLoading || !customQuestion.trim()}
                className="absolute right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg transition disabled:text-slate-500 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
