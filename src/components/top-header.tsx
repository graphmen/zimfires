"use client"

import * as React from "react"
import { 
  Search, 
  Bell, 
  Menu, 
  BarChart3, 
  Flame, 
  AlertTriangle, 
  Cloud, 
  Info, 
  ShieldAlert,
  Database,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { DataPortal } from "./data-portal"

export function TopHeader() {
  const [currentTime, setCurrentTime] = React.useState<string>("")
  const [currentDate, setCurrentDate] = React.useState<string>("")

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("en-ZW", {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + " CAT")
      
      setCurrentDate(now.toLocaleDateString("en-ZW", {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between gap-4 bg-primary px-6 text-white shadow-xl border-b border-white/10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-white/60 hover:bg-white/10" />
        
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 shadow-lg border border-white/5 backdrop-blur-sm">
            <Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-heading font-black tracking-tighter leading-none text-white drop-shadow-sm">ZimFireWatch</h1>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-1 leading-[1.4] max-w-[240px]">
              Near-Realtime Veld Fire Monitoring <br /> & Early Response Dashboard
            </p>
          </div>
        </div>

      </div>

      <div className="flex items-center gap-6">
        {/* Status Badge */}
        <div className="hidden lg:flex items-center gap-2 rounded-full bg-black/20 border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          LIVE — VIIRS & MODIS
        </div>

        {/* Date/Time Section */}
        <div className="hidden xl:flex flex-col items-end text-right">
          <p className="text-[10px] font-black tracking-widest text-white/60 uppercase">{currentDate}</p>
          <p className="text-sm font-black tabular-nums tracking-tighter text-white">{currentTime || "00:00:00 CAT"}</p>
        </div>

        <div className="flex items-center gap-2">
           <Dialog>
              <DialogTrigger 
                  render={
                     <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-500 border-2 border-primary"></span>
                     </Button>
                  }
               />
              <DialogContent className="sm:max-w-[450px] bg-zinc-900/98 backdrop-blur-xl border-white/20 text-white p-0 overflow-hidden shadow-2xl">
                 <DialogHeader className="relative p-8 overflow-hidden border-b border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-30"></div>
                    <DialogTitle className="relative flex items-center gap-3 text-orange-500 font-black tracking-tighter uppercase text-2xl">
                       <ShieldAlert className="h-7 w-7" />
                       Intelligence Protocol
                    </DialogTitle>
                    <DialogDescription className="relative text-zinc-400 text-[10px] uppercase font-black tracking-[0.2em] mt-2 flex items-center gap-2">
                       <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse"></span>
                       Strategic Operational Notice
                    </DialogDescription>
                 </DialogHeader>
                 
                 <div className="px-8 py-8 space-y-8">
                    {/* Data Validation Section */}
                    <div className="space-y-3">
                       <div className="flex items-center gap-2">
                          <div className="h-4 w-1 bg-orange-500 rounded-full"></div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-200">Data Integrity & Evolution</span>
                       </div>
                       <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                          Certain spatial datasets are currently undergoing intensive <span className="text-orange-400 font-bold">ground-truthing and field validation</span>. ZimFireWatch is an evolving platform; users should expect continuous analytical improvements as system intelligence matures.
                       </p>
                    </div>

                    {/* Operational Limitations */}
                    <div className="grid grid-cols-1 gap-4">
                       <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 space-y-2">
                          <div className="flex items-center gap-2 text-orange-500">
                             <AlertTriangle className="h-4 w-4" />
                             <span className="text-[10px] font-black uppercase tracking-wider">Tactical Restriction</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 leading-snug">
                             This system is not intended for the immediate preservation of life or property. Satellite-derived thermal anomalies contain inherent spatial and temporal latencies.
                          </p>
                       </div>
                    </div>

                    {/* Response Agency Section */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Emergency Response</span>
                             <span className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Authorized Agencies</span>
                          </div>
                          <Info className="h-4 w-4 text-zinc-500" />
                       </div>
                       
                       <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 transition-colors hover:bg-orange-500/15">
                             <div className="h-8 w-8 rounded-lg bg-orange-500/30 flex items-center justify-center">
                                <ShieldAlert className="h-4 w-4 text-orange-500" />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase leading-none">Civil Protection Unit</span>
                                <span className="text-[9px] text-zinc-300 font-bold mt-1">Department of Response (CPU)</span>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-colors hover:bg-emerald-500/15">
                             <div className="h-8 w-8 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                                <Flame className="h-4 w-4 text-emerald-500" />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase leading-none">EMA Zimbabwe</span>
                                <span className="text-[9px] text-zinc-300 font-bold mt-1">Environmental Management Agency</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-4">
                          <Cloud className="h-5 w-5 text-emerald-500 shrink-0" />
                          <p className="text-xs text-zinc-300 leading-relaxed">
                             Cloud cover, heavy smoke, and thick canopy levels may obscure satellite sensors and prevent active fire detections.
                          </p>
                       </div>

                       <p className="text-[10px] text-zinc-400 italic text-center px-4">
                          ZINGSA provides strategic monitoring and research data only. We are not a first-response agency.
                       </p>
                    </div>
                 </div>
              </DialogContent>
           </Dialog>
           <DataPortal>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                 <Database className="h-5 w-5" />
              </Button>
           </DataPortal>
        </div>
      </div>
    </header>
  )
}
