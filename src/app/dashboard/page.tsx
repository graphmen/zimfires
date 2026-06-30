"use client"

import * as React from "react"
import { 
  Flame, 
  Zap, 
  TreePine, 
  Map as MapIcon, 
  Target, 
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Globe,
  Database,
  Cpu,
  RefreshCw,
  Search,
  ExternalLink,
  History
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
const FireMap = dynamic(() => import("@/components/fire-map").then(mod => mod.FireMap), { ssr: false })
import { AreaChart, DonutChart, BarList } from "@tremor/react"
import { RiskGauge } from "@/components/dashboard/risk-gauge"
import { ClimateTrends } from "@/components/dashboard/climate-trends"
import { ReportBuilder } from "@/components/dashboard/report-builder"
import { useHotspots } from "@/hooks/use-hotspots"
import { formatDistanceToNow } from "date-fns"
import { getAlertRules, getTriggeredAlerts } from "@/app/actions/alert-actions"
import { syncFirmsData } from "@/app/actions/sync-firms"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getObservations, getAggregateStats } from "@/app/actions/observation-actions"

export default function DashboardPage() {
  const { hotspots, loading: hotspotsLoading } = useHotspots()
  const [alertRulesCount, setAlertRulesCount] = React.useState(0)
  const [triggeredAlerts, setTriggeredAlerts] = React.useState<any[]>([])
  const [liveStats, setLiveStats] = React.useState<any>(null)
  const [recentObs, setRecentObs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    try {
      const [rules, alerts, stats, obs] = await Promise.all([
        getAlertRules(),
        getTriggeredAlerts(),
        getAggregateStats({}),
        getObservations({ limit: 10 })
      ])
      setAlertRulesCount(rules.filter(r => r.is_active).length)
      setTriggeredAlerts(alerts)
      setLiveStats(stats.stats)
      setRecentObs(obs.data)
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGlobalFeed = async () => {
    setIsSyncing(true)
    toast.promise(
      syncFirmsData(),
      {
        loading: 'Connecting to global satellite feed clusters...',
        success: (result) => {
          setIsSyncing(false)
          fetchData() // Refresh dashboard stats
          return result.success 
            ? `Global feed synchronized: ${result.processed} live records ingested.`
            : `Sync complete: No new detections in current area.`
        },
        error: (err) => {
          setIsSyncing(false)
          return `Link establishment failed: ${err.message}`
        },
      }
    )
  }

  // Calculate Risk Score (0-100)
  const riskScore = React.useMemo(() => {
    if (hotspots.length === 0) return 5
    const highConf = hotspots.filter(h => h.confidence === 'high').length
    const score = Math.min(100, (hotspots.length / 2) + (highConf * 2))
    return Math.round(score)
  }, [hotspots])

  const riskLevel = riskScore > 75 ? "extreme" : riskScore > 50 ? "high" : riskScore > 25 ? "moderate" : "low"

  const regionalData = React.useMemo(() => {
    const provinces = [
      "Manicaland", "Mashonaland Central", "Mashonaland East", 
      "Mashonaland West", "Masvingo", "Matabeleland North", 
      "Matabeleland South", "Midlands", "Harare", "Bulawayo"
    ]
    
    const counts: Record<string, number> = {}
    provinces.forEach(p => counts[p] = 0)
    
    hotspots.forEach(h => {
      let prov = h.province || "Unknown"
      if (prov === "Unknown") return
      
      // Normalize to match our provinces list
      const matchedProv = provinces.find(p => p.toLowerCase() === prov.toLowerCase())
      if (matchedProv) {
        counts[matchedProv] += 1
      }
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  }, [hotspots])

  const confidenceData = React.useMemo(() => {
    const counts = { high: 0, nominal: 0, low: 0 }
    hotspots.forEach(h => {
      if (h.confidence === 'high') counts.high++
      else if (h.confidence === 'low') counts.low++
      else counts.nominal++
    })
    return [
      { name: "High", value: counts.high },
      { name: "Nominal", value: counts.nominal },
      { name: "Low", value: counts.low },
    ]
  }, [hotspots])

  if (loading && hotspots.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-2xl animate-pulse">
               <Flame className="h-10 w-10 text-white fill-white/20" />
            </div>
            <div className="absolute -inset-4 bg-emerald-900/10 blur-2xl -z-10 rounded-full" />
          </div>
          <div className="space-y-3 text-center">
             <div className="flex items-center justify-center gap-2">
               <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
               <p className="text-primary font-heading font-black uppercase tracking-[0.3em] text-sm">Initializing Command Center</p>
             </div>
             <div className="h-1.5 w-64 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
               <div className="h-full bg-primary animate-progress origin-left" />
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50">
        {/* Action Controls Sub-Header */}
        <div className="flex-none bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Live Tactical Monitoring</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-200" />
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Active Node</span>
                  <span className="text-[10px] font-bold text-zinc-900">HQ_PRIMARY_HARARE</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Last Sync</span>
                  <span className="text-[10px] font-bold text-zinc-900">{formatDistanceToNow(new Date())} ago</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg border border-zinc-200">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">FIRMS_LINK: ACTIVE</span>
              </div>
             <ReportBuilder />
              <Button 
                onClick={handleGlobalFeed}
                disabled={isSyncing}
                className="h-9 px-6 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-orange-900/20 transition-all active:scale-95"
              >
                 <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isSyncing && "animate-spin")} /> {isSyncing ? "SYNCING..." : "SYNC SATELLITE FEED"}
              </Button>
          </div>
        </div>

        {/* Main Operational Body */}
        <div className="flex-1 flex">
          {/* Main Visualizer Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-8 space-y-8">
                {/* Executive Summary List Style */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4 border-l-4 border-primary pl-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-zinc-900 tracking-tighter">{hotspots.length}</span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Events Logged</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l-4 border-orange-500 pl-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-zinc-900 tracking-tighter">{alertRulesCount}</span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Extreme Alerts</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l-4 border-orange-500 pl-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-zinc-900 tracking-tighter">
                          {liveStats?.peakBrightness !== undefined ? `${Number(liveStats.peakBrightness).toFixed(1)}K` : "---"}
                        </span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Peak Intensity</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l-4 border-[#2d7a31] pl-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-zinc-900 tracking-tighter">
                          {liveStats?.estimatedArea ? `${liveStats.estimatedArea} Ha` : "---"}
                        </span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Burned Area</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l-4 border-zinc-400 pl-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-zinc-900 tracking-tighter">
                          {liveStats?.avgBrightness !== undefined ? `${Number(liveStats.avgBrightness).toFixed(1)}K` : "---"}
                        </span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Mean Intensity</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest opacity-70">
                    • 2024 SEASON — TACTICAL INTELLIGENCE
                  </div>
                </div>

                {/* Primary Intelligence Grid */}
                <div className="grid grid-cols-12 gap-8">
                  {/* Left Column: Spatial Distribution */}
                  <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Intelligence Hub Table Section */}
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col h-[700px]">
                      {/* Table Dark Header */}
                      <div className="bg-primary text-white p-6 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                               <Database className="h-5 w-5 text-white" />
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-heading font-black uppercase tracking-tight">Archive Intelligence Hub</h3>
                                  <Badge className="bg-emerald-400 text-primary text-[8px] font-black px-1.5 py-0 border-none">LIVE</Badge>
                               </div>
                               <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">
                                  • OP NODE: ZIM-HRE-01 &nbsp; • LATENCY: 124MS
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10">
                               <ExternalLink className="mr-2 h-3 w-3" /> Export Manifest
                            </Button>
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10">
                               <Cpu className="mr-2 h-3 w-3" /> API Access
                            </Button>
                         </div>
                      </div>

                      {/* Tactical Tabs */}
                      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                          <div className="flex items-center gap-2 w-full max-w-md">
                            <div className="relative flex-1 group">
                               <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 h-3 w-3 text-zinc-400 group-focus-within:text-primary" />
                               <input 
                                 placeholder="Search by ID, Province, or District..." 
                                 className="w-full bg-white border border-zinc-200 rounded-lg py-2 pl-9 pr-4 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-300"
                               />
                            </div>
                            <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                               <Button variant="ghost" className="h-7 text-[9px] font-black uppercase px-4 bg-zinc-100 text-zinc-900">All</Button>
                               <Button variant="ghost" className="h-7 text-[9px] font-black uppercase px-4 text-zinc-400 hover:text-zinc-600">All</Button>
                               <Button variant="ghost" className="h-7 text-[9px] font-black uppercase px-4 text-zinc-400 hover:text-zinc-600">All</Button>
                            </div>
                            <Button className="h-9 px-6 bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90">
                               Execute Query
                            </Button>
                          </div>
                         <div className="flex items-center gap-1 bg-zinc-200/50 p-1 rounded-xl border border-zinc-200">
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase px-8 text-zinc-400 hover:text-zinc-600">Spatial Probe</Button>
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase px-8 bg-white text-zinc-900 shadow-sm">Impact Matrix</Button>
                         </div>
                      </div>

                      {/* Table Content */}
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/30">
                              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Identifier</th>
                              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Timestamp</th>
                              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jurisdiction</th>
                              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">District</th>
                              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Extent (HA)</th>
                              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {recentObs.map((obs, i) => (
                              <tr key={i} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-6 text-[11px] font-black text-zinc-900">{obs.record_id}</td>
                                <td className="p-6 text-[10px] font-bold text-zinc-400">{new Date(obs.observation_time).toLocaleDateString()}</td>
                                <td className="p-6 text-[11px] font-black text-zinc-900 uppercase">{obs.province}</td>
                                <td className="p-6 text-[10px] font-bold text-zinc-400 uppercase">{obs.district}</td>
                                <td className="p-6 text-[11px] font-black text-zinc-900 tabular-nums">{Math.floor(obs.frp || 0)}</td>
                                <td className="p-6 text-right">
                                  <Badge className={cn("text-[8px] font-black px-3 py-1 border rounded-full bg-orange-50 text-orange-600 border-orange-100")}>
                                    ACTIVE
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* Regional Leaderboard */}
                       <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-8">
                          <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-4">
                            <div>
                              <h3 className="text-sm font-heading font-black text-zinc-900 uppercase tracking-tight">Regional Distribution</h3>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Provincial Impact Ranking</p>
                            </div>
                            <div className="p-2 bg-zinc-50 rounded-lg">
                               <MapIcon className="h-4 w-4 text-zinc-400" />
                            </div>
                          </div>
                          <BarList 
                            data={regionalData} 
                            className="mt-2" 
                            color="emerald"
                            showAnimation={true}
                          />
                       </div>

                       {/* Risk Assessment */}
                       <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-8 flex flex-col">
                          <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-4">
                            <div>
                              <h3 className="text-sm font-heading font-black text-zinc-900 uppercase tracking-tight">Threat Assessment</h3>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Composite Risk Indicator</p>
                            </div>
                            <div className="p-2 bg-orange-50 rounded-lg">
                               <ShieldCheck className="h-4 w-4 text-orange-600" />
                            </div>
                          </div>
                          <div className="flex-1 flex items-center justify-center pt-4">
                             <RiskGauge value={riskScore} />
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Right Column: Tactical Intelligence Summary */}
                  <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* Tactical Tabs */}
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col">
                       <div className="p-1 bg-zinc-50 border-b border-zinc-100 flex items-center gap-1">
                          <Button variant="ghost" className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm text-zinc-900">Spatial Recap</Button>
                          <Button variant="ghost" className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600">Strategic Intelligence</Button>
                       </div>
                       <div className="p-8 space-y-8">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Geo-Spatial Reconstruction</span>
                             </div>
                             <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-black px-3 py-1">2024</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <h4 className="text-xl font-black text-zinc-900 leading-none">100%</h4>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Zone Coverage</p>
                                <p className="text-[8px] font-bold text-emerald-600 uppercase mt-1">Zimbabwe National</p>
                             </div>
                             <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <h4 className="text-xl font-black text-zinc-900 leading-none">HIGH</h4>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Fire Density</p>
                                <p className="text-[8px] font-bold text-orange-600 uppercase mt-1">Central Plateau</p>
                             </div>
                             <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <h4 className="text-xl font-black text-zinc-900 leading-none">
                                  {liveStats?.estimatedArea !== undefined ? `${liveStats.estimatedArea} Ha` : "---"}
                                </h4>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Burn Scars</p>
                                <p className="text-[8px] font-bold text-orange-600 uppercase mt-1">Detected</p>
                             </div>
                             <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <h4 className="text-xl font-black text-zinc-900 leading-none">98.4%</h4>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Sensor Pass</p>
                                <p className="text-[8px] font-bold text-[#235823] uppercase mt-1">Coverage</p>
                             </div>
                          </div>

                          <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-start gap-4">
                             <div className="p-2 bg-primary rounded-xl shadow-lg shadow-emerald-900/20 mt-1">
                                <Database className="h-4 w-4 text-white" />
                             </div>
                             <div>
                                <h5 className="text-[10px] font-heading font-black text-primary uppercase tracking-widest mb-1">Active Archive Layer</h5>
                                <p className="text-[10px] font-medium text-zinc-600 leading-relaxed">
                                   Synthesizing historical observation data for the 2024 season. Multi-spectral MODIS + VIIRS fusion active.
                                </p>
                             </div>
                          </div>

                          <div>
                             <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Thermal Hotspot Distribution</h5>
                             <BarList 
                               data={regionalData} 
                               className="mt-2" 
                               color="emerald"
                               showAnimation={true}
                             />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

        </div>
      </div>
    </div>
  )
}
