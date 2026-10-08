import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShieldAlert, Cpu, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

const sparklineData = [
  { val: 62 },
  { val: 68 },
  { val: 71 },
  { val: 69 },
  { val: 77 },
  { val: 82 },
  { val: 89 },
];

export const Metrics = ({ metrics }) => {
  const {
    totalAtRisk = 66200,
    totalRecovered = 4500,
    recoveryRate = 74.8,
    statusCounts = { action_required: 2, retrying: 1, diagnosing: 1, recovered: 1, escalated: 1 },
    avgRiskScore = 61,
    avgConfidence = 94.6,
  } = metrics || {};

  const cards = [
    {
      id: 'recovered',
      title: 'Recovered Revenue',
      value: `₹${totalRecovered.toLocaleString()}`,
      delta: '+24.8% vs last week',
      subtext: 'Algorithmic smart-retry & interactive collections',
      icon: CheckCircle2,
      color: 'text-recovered',
      glow: 'shadow-glow-emerald',
      gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      borderColor: 'border-recovered/30',
      badgeColor: 'bg-recovered/10 text-recovered border-recovered/30',
      sparkColor: '#10B981',
    },
    {
      id: 'at-risk',
      title: 'Volume At Risk (Pipeline)',
      value: `₹${(totalAtRisk - totalRecovered).toLocaleString()}`,
      delta: '5 Active interventions',
      subtext: 'Flagged by issuer declines & 3DS challenges',
      icon: ShieldAlert,
      color: 'text-risk',
      glow: 'shadow-glow-crimson',
      gradient: 'from-risk/20 via-risk/5 to-transparent',
      borderColor: 'border-risk/30',
      badgeColor: 'bg-risk/10 text-risk border-risk/30',
      sparkColor: '#EF4444',
    },
    {
      id: 'recovery-rate',
      title: 'Net Recovery Efficiency',
      value: `${recoveryRate}%`,
      delta: '+6.2% over target',
      subtext: 'Target benchmark: 68.0%',
      icon: TrendingUp,
      color: 'text-diagnosis',
      glow: 'shadow-glow-cyan',
      gradient: 'from-diagnosis/20 via-diagnosis/5 to-transparent',
      borderColor: 'border-diagnosis/30',
      badgeColor: 'bg-diagnosis/10 text-diagnosis border-diagnosis/30',
      sparkColor: '#06B6D4',
    },
    {
      id: 'ai-confidence',
      title: 'AI Diagnostic Confidence',
      value: `${avgConfidence}%`,
      delta: 'Llama 3.3 & Gemini 2.5',
      subtext: `Avg risk velocity score: ${avgRiskScore}/100`,
      icon: Cpu,
      color: 'text-amber-400',
      glow: 'shadow-glow-amber',
      gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
      borderColor: 'border-amber-500/30',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      sparkColor: '#F59E0B',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className={`relative group overflow-hidden rounded-xl border bg-carbon-850/90 p-5 backdrop-blur-md transition-all duration-300 hover:border-translucent-high ${card.borderColor}`}
          >
            {/* Subtle animated radial gradient behind card */}
            <div
              className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${card.gradient} blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
            />

            {/* 1px Fintech scanning laser line during active diagnostic telemetry */}
            {(card.id === 'ai-confidence' || card.id === 'at-risk') && (
              <div className="fintech-scanline" />
            )}

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  {card.title}
                </span>
                <div
                  className={`p-2 rounded-lg bg-carbon-900 border border-white/5 ${card.color} ${card.glow}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-mono font-bold tracking-tight text-white">
                    {card.value}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${card.badgeColor}`}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      {card.delta}
                    </span>
                  </div>
                </div>

                {/* Micro Sparkline */}
                <div className="w-20 h-10 opacity-70 group-hover:opacity-100 transition-opacity">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke={card.sparkColor}
                        strokeWidth={1.8}
                        fill={card.sparkColor}
                        fillOpacity={0.15}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 truncate font-sans">
                {card.subtext}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Metrics;
