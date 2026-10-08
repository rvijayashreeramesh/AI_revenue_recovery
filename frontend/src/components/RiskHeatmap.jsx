import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  Sliders,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Cpu,
  BarChart3,
} from 'lucide-react';

/**
 * Format numerical values to Indian Rupee (INR)
 */
const formatINR = (val) => {
  const num = Math.round(Number(val) || 0);
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Clean White / Light Theme Tooltip for Recharts
 */
const CustomRechartsTooltip = ({ active, payload, label, isCurrency = true }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-md font-mono text-xs z-50">
      <div className="text-[11px] font-semibold text-slate-700 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between gap-4">
        <span className="text-cyan-700 font-bold">{label}</span>
        <span className="text-[10px] text-slate-400 uppercase font-sans">TELEMETRY WINDOW</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const formattedVal = isCurrency
            ? formatINR(entry.value)
            : `${Number(entry.value).toFixed(1)}%`;

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shadow-xs"
                  style={{ backgroundColor: entry.color || entry.fill || '#059669' }}
                />
                <span className="text-slate-600 font-sans">{entry.name}:</span>
              </div>
              <span className="font-bold text-slate-900 font-mono tabular-nums">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RiskHeatmap = ({ cases = [] }) => {
  // Chart visual type toggle: 'area' vs 'stackedBar'
  const [chartType, setChartType] = useState('area');

  // SBI Health Degradation State
  const [sbiSuccessRate, setSbiSuccessRate] = useState(66.4);
  const [sbiLatency, setSbiLatency] = useState(385);

  // Exact 5 interactive cards per user prompt
  const [banksData, setBanksData] = useState([
    {
      id: 'hdfc',
      name: 'HDFC Bank',
      code: 'HDFC',
      rail: 'UPI / IMPS Core Rail',
      latency: 146,
      successRate: 94.4,
      status: 'OPTIMAL',
    },
    {
      id: 'sbi',
      name: 'State Bank of India',
      code: 'SBI',
      rail: 'UPI 2.0 Switch',
      latency: 385,
      successRate: 66.4,
      status: 'DEGRADED',
    },
    {
      id: 'icici',
      name: 'ICICI Bank',
      code: 'ICICI',
      rail: 'UPI / Cards / NetBanking',
      latency: 110,
      successRate: 96.4,
      status: 'OPTIMAL',
    },
    {
      id: 'axis',
      name: 'Axis Bank',
      code: 'AXIS',
      rail: 'UPI / PG Gateway Rail',
      latency: 164,
      successRate: 91.4,
      status: 'OPTIMAL',
    },
    {
      id: 'npci',
      name: 'NPCI Switch',
      code: 'NPCI',
      rail: 'National UPI Switch Core',
      latency: 287,
      successRate: 85.8,
      status: 'OPTIMAL',
    },
  ]);

  // Keep SBI data in sync with state
  useEffect(() => {
    setBanksData((prev) =>
      prev.map((b) => {
        if (b.code === 'SBI') {
          const isDegraded = sbiSuccessRate < 70;
          return {
            ...b,
            successRate: sbiSuccessRate,
            latency: sbiLatency,
            status: isDegraded ? 'DEGRADED' : 'OPTIMAL',
          };
        }
        return b;
      })
    );
  }, [sbiSuccessRate, sbiLatency]);

  // 2. Revenue Risk by Category Timeline (Last 24 Hours)
  const categoryRiskTimeline = useMemo(() => {
    return [
      {
        time: '00:00',
        failedPayments: 38000,
        abandonedCarts: 18500,
        subscriptions: 12400,
        overdueInvoices: 52000,
        total: 120900,
      },
      {
        time: '04:00',
        failedPayments: 24000,
        abandonedCarts: 11200,
        subscriptions: 9800,
        overdueInvoices: 45000,
        total: 90000,
      },
      {
        time: '08:00',
        failedPayments: 62000,
        abandonedCarts: 31000,
        subscriptions: 24500,
        overdueInvoices: 78000,
        total: 195500,
      },
      {
        time: '12:00',
        failedPayments: 94000,
        abandonedCarts: 48000,
        subscriptions: 31200,
        overdueInvoices: 142000,
        total: 315200,
      },
      {
        time: '16:00',
        failedPayments: 112000,
        abandonedCarts: 54000,
        subscriptions: 38900,
        overdueInvoices: 110000,
        total: 314900,
      },
      {
        time: '20:00',
        failedPayments: 84000,
        abandonedCarts: 42000,
        subscriptions: 28000,
        overdueInvoices: 95000,
        total: 249000,
      },
      {
        time: '24:00',
        failedPayments: 51000,
        abandonedCarts: 26500,
        subscriptions: 19800,
        overdueInvoices: 65000,
        total: 162300,
      },
    ];
  }, []);

  // 3. Recovery Efficiency Curve: Predicted Probability vs Actual Recovery Rates
  const recoveryEfficiencyData = useMemo(() => {
    return [
      { probabilityBracket: '10-20%', predictedRate: 15.0, actualRate: 22.4 },
      { probabilityBracket: '20-30%', predictedRate: 25.0, actualRate: 31.8 },
      { probabilityBracket: '30-40%', predictedRate: 35.0, actualRate: 42.1 },
      { probabilityBracket: '40-50%', predictedRate: 45.0, actualRate: 53.6 },
      { probabilityBracket: '50-60%', predictedRate: 55.0, actualRate: 64.2 },
      { probabilityBracket: '60-70%', predictedRate: 65.0, actualRate: 72.8 },
      { probabilityBracket: '70-80%', predictedRate: 75.0, actualRate: 81.5 },
      { probabilityBracket: '80-90%', predictedRate: 85.0, actualRate: 89.4 },
      { probabilityBracket: '90-100%', predictedRate: 95.0, actualRate: 96.8 },
    ];
  }, []);

  const isSbiDegraded = sbiSuccessRate < 70;

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. INDIAN BANKING & PAYMENT RAIL HEALTH MATRIX                        */}
      {/* ===================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
                <span>Indian Banking & Payment Rail Health Matrix</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  REAL-TIME SWITCH
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Live monitoring across primary issuer switches, gateway nodes, and NPCI UPI rails
              </p>
            </div>
          </div>

          {/* Interactive Simulation Toggle for SBI Degradation */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                if (isSbiDegraded) {
                  // Restore
                  setSbiSuccessRate(89.5);
                  setSbiLatency(172);
                } else {
                  // Degrade below 70%
                  setSbiSuccessRate(66.4);
                  setSbiLatency(385);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border flex items-center gap-1.5 transition-all shadow-xs ${
                isSbiDegraded
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Click to toggle SBI health degradation below 70% threshold"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>{isSbiDegraded ? 'Restore SBI Health (>70%)' : 'Simulate SBI Degradation (<70%)'}</span>
            </button>
          </div>
        </div>

        {/* Degradation Warning Banner: SBI Core Banking Timeout */}
        <AnimatePresence>
          {isSbiDegraded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg p-3.5 bg-amber-50 border border-amber-300/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-100 text-amber-800 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-sans font-bold text-amber-900 tracking-tight flex items-center gap-2">
                      <span>Degradation Warning: SBI Core Banking Timeout. Auto-switching to ICICI/HDFC rails active.</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                        {sbiSuccessRate}% SUCCESS (&lt;70% FLOOR)
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-sans mt-0.5">
                      SBI issuer node latency spiked to {sbiLatency}ms. Autonomous policy triggered: Traffic rerouting
                      to secondary alternate UPI rails and delayed retry schedule active.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-white text-slate-800 border border-amber-300 font-semibold shadow-xs">
                    Reroute Rail: ICICI / HDFC
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5 Bank Status Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {banksData.map((bank) => {
            const isDegraded = bank.status === 'DEGRADED';
            const latencyColor =
              bank.latency < 150
                ? 'text-[#059669]'
                : bank.latency < 280
                ? 'text-[#D97706]'
                : 'text-[#E11D48]';

            return (
              <div
                key={bank.id}
                className={`p-3.5 rounded-xl border bg-white relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                  isDegraded
                    ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                    : 'border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Header: Bank Code & Status Pill */}
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                    {bank.code}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                      isDegraded
                        ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {bank.status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 font-sans font-medium truncate mt-1">
                  {bank.name}
                </div>

                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {bank.rail}
                </div>

                {/* Metrics: Latency & Success Rate */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Latency:
                    </span>
                    <span className={`font-bold tabular-nums ${latencyColor}`}>{bank.latency}ms</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 font-sans">Success Rate:</span>
                      <span
                        className={`font-bold tabular-nums ${
                          bank.successRate >= 85
                            ? 'text-[#059669]'
                            : bank.successRate >= 70
                            ? 'text-[#D97706]'
                            : 'text-[#E11D48]'
                        }`}
                      >
                        {bank.successRate}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bank.successRate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          bank.successRate >= 85
                            ? 'bg-[#059669]'
                            : bank.successRate >= 70
                            ? 'bg-[#D97706]'
                            : 'bg-[#E11D48]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ===================================================================== */}
      {/* 2 & 3. DUAL CHARTS GRID (REVENUE RISK TIMELINE & EFFICIENCY CURVE)   */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* =================================================================== */}
        {/* MODULE 2: REVENUE RISK BY CATEGORY CHART (LAST 24 HOURS)            */}
        {/* =================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header & Chart Type Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight font-sans">
                    Revenue Risk by Category (24H)
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Financial exposure distributed by payment failure archetype
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono">
                <button
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                    chartType === 'area'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 text-cyan-600" />
                  <span>Area</span>
                </button>
                <button
                  onClick={() => setChartType('stackedBar')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                    chartType === 'stackedBar'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-3 h-3 text-amber-600" />
                  <span>Stacked</span>
                </button>
              </div>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 mb-2 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">FAILED PAYMENTS</span>
                <span className="font-bold text-[#E11D48] tabular-nums">{formatINR(112000)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">ABANDONED CARTS</span>
                <span className="font-bold text-[#D97706] tabular-nums">{formatINR(54000)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">SUBSCRIPTIONS</span>
                <span className="font-bold text-[#0891B2] tabular-nums">{formatINR(38900)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">OVERDUE INVOICES</span>
                <span className="font-bold text-[#059669] tabular-nums">{formatINR(142000)}</span>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-64 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={categoryRiskTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E11D48" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorInvoices" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCarts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891B2" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0891B2" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="time"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      fontFamily="JetBrains Mono, monospace"
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                      fontFamily="JetBrains Mono, monospace"
                    />
                    <Tooltip content={<CustomRechartsTooltip isCurrency={true} />} />
                    <Area
                      type="monotone"
                      dataKey="overdueInvoices"
                      name="Overdue Invoices"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorInvoices)"
                    />
                    <Area
                      type="monotone"
                      dataKey="failedPayments"
                      name="Failed Payments"
                      stroke="#E11D48"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFailed)"
                    />
                    <Area
                      type="monotone"
                      dataKey="abandonedCarts"
                      name="Abandoned Carts"
                      stroke="#D97706"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCarts)"
                    />
                    <Area
                      type="monotone"
                      dataKey="subscriptions"
                      name="Subscriptions"
                      stroke="#0891B2"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSubs)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={categoryRiskTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="time"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      fontFamily="JetBrains Mono, monospace"
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                      fontFamily="JetBrains Mono, monospace"
                    />
                    <Tooltip content={<CustomRechartsTooltip isCurrency={true} />} />
                    <Bar dataKey="failedPayments" name="Failed Payments" stackId="a" fill="#E11D48" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="abandonedCarts" name="Abandoned Carts" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="subscriptions" name="Subscriptions" stackId="a" fill="#0891B2" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="overdueInvoices" name="Overdue Invoices" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-100 mt-3">
            <span>Peak Incident Window: 16:00 IST</span>
            <span className="text-cyan-800 font-semibold tabular-nums">Total 24H At Risk: {formatINR(1643800)}</span>
          </div>
        </motion.div>

        {/* =================================================================== */}
        {/* MODULE 3: RECOVERY EFFICIENCY CURVE                                 */}
        {/* =================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header & Alpha Outperformance Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight font-sans">
                    Recovery Efficiency Curve
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Predicted Model Probability vs Empirical Actual Recovery Rate
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-semibold">
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>AI Alpha: +7.8% Outperformance</span>
              </div>
            </div>

            {/* Calibration Metrics Strip */}
            <div className="grid grid-cols-3 gap-2 mt-3.5 mb-2 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">MODEL CALIBRATION</span>
                <span className="font-bold text-cyan-800">96.4% Alignment</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">BRIER ACCURACY</span>
                <span className="font-bold text-emerald-700">0.038 (Institutional)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] font-sans">VERIFIED RUNS</span>
                <span className="font-bold text-slate-900">2,109 Cases</span>
              </div>
            </div>

            {/* Recharts Line Chart */}
            <div className="h-64 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recoveryEfficiencyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="probabilityBracket"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    fontFamily="JetBrains Mono, monospace"
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={(val) => `${val}%`}
                    domain={[0, 100]}
                    fontFamily="JetBrains Mono, monospace"
                  />
                  <Tooltip content={<CustomRechartsTooltip isCurrency={false} />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                  {/* Predicted Probability Line */}
                  <Line
                    type="monotone"
                    dataKey="predictedRate"
                    name="Predicted Probability"
                    stroke="#0891B2"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#0891B2' }}
                    activeDot={{ r: 5, fill: '#0891B2', stroke: '#fff', strokeWidth: 2 }}
                  />
                  {/* Actual Empirical Recovery Line */}
                  <Line
                    type="monotone"
                    dataKey="actualRate"
                    name="Actual Recovery Rate"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-100 mt-3">
            <span>Validation: Monte Carlo Walk-Forward</span>
            <span className="text-emerald-700 font-semibold">High Confidence Decile: 96.8% Success</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RiskHeatmap;
