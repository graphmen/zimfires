"use client"

import * as React from "react"
import { motion } from "framer-motion"

interface RiskGaugeProps {
  value: number // 0 to 100
  mini?: boolean
}

const levels = [
  { threshold: 0, color: "#10b981", label: "Low Risk", description: "Minimal fire threat detected in current conditions." },
  { threshold: 25, color: "#059669", label: "Moderate Risk", description: "Vigilance recommended; environmental stability maintained." },
  { threshold: 50, color: "#f97316", label: "High Risk", description: "Significant threat of rapid fire propagation." },
  { threshold: 75, color: "#ea580c", label: "Extreme Risk", description: "Critical threat to environment and infrastructure." },
]

export function RiskGauge({ value, mini = false }: RiskGaugeProps) {
  const current = [...levels].reverse().find(l => value >= l.threshold) || levels[0]
  const rotation = (value / 100) * 180 - 90

  if (mini) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-6 overflow-hidden">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <motion.path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke={current.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="125.6"
              initial={{ strokeDashoffset: 125.6 }}
              animate={{ strokeDashoffset: 125.6 - (value / 100) * 125.6 }}
              transition={{ duration: 1.5, ease: "circOut" }}
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-zinc-900 leading-none">{current.label}</span>
          <span className="text-[8px] font-bold text-zinc-400 uppercase tabular-nums mt-0.5">{value}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-72 h-36 overflow-hidden">
        {/* Gauge Background */}
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Gauge Segment */}
          <motion.path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={current.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6"
            initial={{ strokeDashoffset: 125.6 }}
            animate={{ strokeDashoffset: 125.6 - (value / 100) * 125.6 }}
            transition={{ duration: 2, ease: "circOut" }}
          />
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 w-0.5 h-28 origin-bottom -translate-x-1/2 z-10"
          style={{ rotate: rotation, background: `linear-gradient(to top, transparent, ${current.color}, #18181b)` }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 2, ease: "circOut" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-800 shadow-sm border border-white" />
        </motion.div>
        
        {/* Hub */}
        <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center z-20">
           <div className="text-sm font-black text-zinc-900 tabular-nums tracking-tighter">{value}</div>
        </div>
      </div>

      <div className="mt-8 text-center space-y-2">
        <div className="text-4xl font-black uppercase tracking-tighter" style={{ color: current.color }}>
          {current.label}
        </div>
        <div className="flex items-center justify-center gap-4">
           <div className="h-px w-12 bg-zinc-100" />
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">
              Intensity Index
           </p>
           <div className="h-px w-12 bg-zinc-100" />
        </div>
        <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-[300px] italic">
          "{current.description}"
        </p>
      </div>
    </div>
  )
}
