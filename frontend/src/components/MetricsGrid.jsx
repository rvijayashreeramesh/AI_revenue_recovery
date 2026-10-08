import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

import { useCountUp } from '../hooks/useCountUp';
import { useSocket } from '../hooks/useSocket';

/**
 * Formats a numerical value into standard Indian currency format (e.g. ₹12,84,200)
 */
export const formatINR = (val) => {
  const num = Math.round(Number(val) || 0);
  return `₹${num.toLocaleString('en-IN')}`;
};

export const MetricsGrid = ({ metrics, isNewFailureInjected = false }) => {
  const { lastEvent } = useSocket();

  // Baseline fintech default telemetry metrics per prompt spec
  const totalAtRisk = metrics?.totalAtRisk || 386100; // ₹3,86,100
  const totalRecovered = metrics?.totalRecovered || 1284200; // ₹12,84,200
  const recoveryRate = metrics?.recoveryRate || 69.7; // 69.7%
  const activeCasesCount = metrics?.activeCasesCount || 9; // 9 active
  const runningPipelines = 3;
  const avgSpeedSeconds = 134; // 2m 14s clearing loop

  // Animated Count-Up Counters
  const animatedRisk = useCountUp(totalAtRisk, 1000, 0);
  const animatedRecovered = useCountUp(totalRecovered, 1000, 0);
  const animatedRate = useCountUp(recoveryRate, 1000, 1);
  const animatedActiveCases = useCountUp(activeCasesCount, 800, 0);

  // Red Border Alert Flash State
  const [riskAlertFlash, setRiskAlertFlash] = useState(false);
  const prevRecoveredRef = useRef(totalRecovered);

  // Trigger red flash when new failure is injected
  useEffect(() => {
    if (isNewFailureInjected || (lastEvent && lastEvent.type === 'case:new')) {
      setRiskAlertFlash(true);
      const timer = setTimeout(() => setRiskAlertFlash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNewFailureInjected, lastEvent]);

  // Trigger micro-confetti on significant revenue recoveries
  useEffect(() => {
    if (totalRecovered > prevRecoveredRef.current) {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.25, x: 0.35 },
        colors: ['#059669', '#10B981', '#06B6D4'],
        ticks: 120,
        gravity: 1.2,
      });
      prevRecoveredRef.current = totalRecovered;
    }
  }, [totalRecovered]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* ===================================================================== */}
      {/* CARD 1: Revenue At Risk (₹3,86,100 in vivid crimson with pulse dot)   */}
      {/* ===================================================================== */}
      <motion.div
        animate={
          riskAlertFlash
            ? {
                borderColor: ['rgba(225, 29, 72, 0.4)', 'rgba(225, 29, 72, 1)', 'rgba(225, 29, 72, 0.3)'],
                backgroundColor: ['#FFFFFF', '#FFF1F2', '#FFFFFF'],
              }
            : {}
        }
        transition={{ duration: 1.2, repeat: riskAlertFlash ? 1 : 0 }}
        className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Crimson pulse indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
            </span>
            <span className="text-xs font-sans font-semibold text-slate-600 uppercase tracking-wide">
              Revenue At Risk
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-2xl 2xl:text-3xl font-mono font-extrabold text-[#E11D48] tracking-tight tabular-nums">
            {formatINR(animatedRisk)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80">
              <ArrowUpRight className="w-3 h-3" />
              +18.4% velocity spike
            </span>
          </div>
        </div>

        {/* Micro risk progress rail */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Failed Queue: ₹3.86L</span>
          <span className="text-rose-600 font-semibold">Immediate Action</span>
        </div>
      </motion.div>

      {/* ===================================================================== */}
      {/* CARD 2: Recovered Revenue (₹12,84,200 in deep emerald bold mono)      */}
      {/* ===================================================================== */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs font-sans font-semibold text-slate-600 uppercase tracking-wide">
              Recovered Revenue
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-2xl 2xl:text-3xl font-mono font-extrabold text-[#059669] tracking-tight tabular-nums">
            {formatINR(animatedRecovered)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <ArrowUpRight className="w-3 h-3" />
              +₹42,800 today
            </span>
          </div>
        </div>

        {/* Autonomous Yield Note */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Autonomous Yield</span>
          <span className="text-emerald-700 font-semibold">99.2% Unassisted</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CARD 3: Recovery Success Rate (69.7% with integrated progress bar)    */}
      {/* ===================================================================== */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-xs font-sans font-semibold text-slate-600 uppercase tracking-wide">
              Recovery Success Rate
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl 2xl:text-3xl font-mono font-extrabold text-slate-900 tracking-tight tabular-nums">
              {animatedRate}%
            </span>
            <span className="text-xs font-mono text-slate-400">/ 75.0% target</span>
          </div>

          {/* Integrated Horizontal Progress Bar */}
          <div className="mt-2 space-y-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (animatedRate / 75) * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-emerald-600 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Current: {animatedRate}%</span>
              <span className="text-emerald-700 font-semibold">+3.4% vs SLA</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Stripe / NPCI Benchmark</span>
          <span className="text-slate-700 font-semibold">Tier-1 Optimal</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CARD 4: Active Cases (9 active, 3 pipelines running)                  */}
      {/* ===================================================================== */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-600" />
            <span className="text-xs font-sans font-semibold text-slate-600 uppercase tracking-wide">
              Active Cases
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-100">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-2xl 2xl:text-3xl font-mono font-extrabold text-slate-900 tracking-tight tabular-nums flex items-baseline gap-2">
            <span>{animatedActiveCases}</span>
            <span className="text-xs font-sans font-medium text-slate-500">active items</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200/80">
              <Zap className="w-3 h-3 text-cyan-600" />
              {runningPipelines} pipelines running
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              6 queued
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Concurrency Load</span>
          <span className="text-cyan-800 font-semibold">18.4% capacity</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CARD 5: Avg. Recovery Speed (2m 14s clearing loop)                    */}
      {/* ===================================================================== */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-sans font-semibold text-slate-600 uppercase tracking-wide">
              Avg. Recovery Speed
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-2xl 2xl:text-3xl font-mono font-extrabold text-slate-900 tracking-tight tabular-nums flex items-baseline gap-1.5">
            <span>2m 14s</span>
            <span className="text-xs font-sans font-medium text-slate-400">clearing loop</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <ArrowDownRight className="w-3 h-3" />
              -18s vs baseline
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              (SLA: &lt;5m)
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Fast Clearing Zone</span>
          <span className="text-emerald-700 font-semibold">94.2% within SLA</span>
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid;
