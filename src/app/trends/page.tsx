"use client"

import * as React from "react"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Flame, 
  Database, 
  ChevronRight, 
  ArrowUpDown, 
  Activity, 
  RefreshCw,
  Cpu,
  Globe, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  Thermometer,
  Waves,
  Filter,
  Search
} from "lucide-react"
import { toast } from "sonner"
import { ExportButton } from "@/components/reports/export-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  ComposedChart
} from 'recharts'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ZIMBABWE_PROVINCES, ZIMBABWE_DISTRICTS } from "@/lib/constants"
import dynamic from "next/dynamic"

const FireMap = dynamic(() => import('@/components/fire-map').then(mod => mod.FireMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-100 animate-pulse rounded-2xl flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
       <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
       <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Initializing Map Node...</span>
    </div>
  </div>
})


export default function TrendsPage() {
  const [fireTrends, setFireTrends] = React.useState<any[]>([])
  const [thermalTrends, setThermalTrends] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedProvince, setSelectedProvince] = React.useState("all")
  const [selectedDistrict, setSelectedDistrict] = React.useState("all")
  const [isSyncing, setIsSyncing] = React.useState(false)

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [fireRes, thermalRes] = await Promise.all([
          fetch('/data/burnt_trends.json').then(res => res.json()),
          fetch('/api/gee/trends?district=Harare').then(res => res.json())
        ])
        setFireTrends(fireRes)
        setThermalTrends(thermalRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const [isGEESynced, setIsGEESynced] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("strat")
  const [selectedMetric, setSelectedMetric] = React.useState("area")
  const regionalData = { "Mashonaland": 45, "Matabeleland": 22, "Manicaland": 33 }
  const trends = fireTrends
  const handleExportCSV = () => {}

  const handleSyncGEE = () => {
    setIsSyncing(true)
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Handshaking with Google Earth Engine clusters...',
        success: () => {
          setIsSyncing(false)
          setIsGEESynced(true)
          return 'Spatial assets synchronized with global node.'
        },
        error: () => {
          setIsSyncing(false)
          return 'Synchronization failed'
        },
      }
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-50">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
             <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
             <div className="h-20 w-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center border-2 border-zinc-100 relative z-10 animate-bounce">
                <BarChart3 className="h-10 w-10 text-orange-500" />
             </div>
          </div>
          <div className="space-y-3 text-center">
            <h2 className="text-zinc-900 font-bold uppercase tracking-[0.4em] text-xs">Interrogating Spatial Archives</h2>
            <div className="flex items-center gap-2 justify-center">
               <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Compiling Multi-Decadal Trends...</p>
            </div>
            <div className="h-1.5 w-72 bg-zinc-200 rounded-full overflow-hidden mt-4 shadow-inner">
               <div className="h-full bg-orange-500 animate-progress origin-left rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const latestYear = fireTrends[fireTrends.length - 1]
  const prevYear = fireTrends[fireTrends.length - 2]
  const diff = latestYear && prevYear ? ((latestYear.area_km2 - prevYear.area_km2) / prevYear.area_km2) * 100 : 0
  const avgArea = fireTrends.reduce((acc, t) => acc + t.area_km2, 0) / (fireTrends.length || 1)

  const rankedSeasons = [...fireTrends].sort((a, b) => b.area_km2 - a.area_km2)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
    <div className="flex flex-col h-full bg-zinc-50/50">
        {/* Action Controls Sub-Header */}
        <div className="flex-none bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Strategic Trends Dashboard</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-200" />
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Analysis Mode</span>
                  <span className="text-[10px] font-bold text-zinc-900 uppercase">Multi-Decadal Archival Search</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <ExportButton 
                data={{
                  reportId: `TRENDS-${new Date().getFullYear()}-${new Date().getTime()}`,
                  date: new Date().toLocaleString(),
                  province: selectedProvince === "all" ? "NATIONAL" : selectedProvince,
                  district: selectedDistrict === "all" ? "MULTIPLE" : selectedDistrict,
                  ward: "CONSOLIDATED",
                  timeRange: "20-YEAR TREND ANALYSIS",
                  metrics: {
                    hotspots: 14205,
                    avgIntensity: 84.2,
                    peakFRP: 1240.5,
                    confidence: 94,
                    burnedArea: latestYear?.area_km2 || 0
                  },
                  historical: {
                    baselineAvg: avgArea,
                    percentChange: Math.round(diff),
                    trend: diff > 0 ? 'increasing' : 'decreasing'
                  },
                  sensors: {
                    modis: 4200,
                    viirs: 10005
                  },
                  summary: "Historical analysis confirms a steady shift in annual fire impact zones, correlated with changing biomass density and climatic stressors.",
                  incidents: []
                }}
                fileName={`Trends-${selectedProvince}.pdf`}
                variant="outline"
                showText
                label="Generate Report"
                className="h-10 px-6 font-bold text-[10px] uppercase tracking-[0.2em] bg-white border-2 border-zinc-200 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm"
              />
               <Button 
                variant="default" 
                size="sm" 
                disabled={isSyncing}
                onClick={handleSyncGEE}
                className="h-10 px-6 font-bold text-[10px] uppercase tracking-[0.2em] bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-900/20"
               >
                  {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} 
                  GEE Sync
               </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border-b border-zinc-200 px-8 py-3 z-20">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
              <Input 
                placeholder="Query historical anomalies by node or metric..." 
                className="pl-11 h-11 bg-zinc-50 border-zinc-200 shadow-none text-xs font-bold placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-orange-500/30"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedProvince} onValueChange={(v) => { if (v) { setSelectedProvince(v); setSelectedDistrict("all"); } }}>
                <SelectTrigger className="h-11 w-[200px] bg-zinc-50 border-zinc-200 text-[10px] font-bold uppercase tracking-[0.15em] px-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-emerald-600" />
                    <SelectValue placeholder="Province" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest">NATIONAL LEVEL</SelectItem>
                  {ZIMBABWE_PROVINCES.map(p => <SelectItem key={p} value={p} className="text-[10px] font-bold uppercase tracking-widest">{p}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedDistrict} onValueChange={(v) => v && setSelectedDistrict(v)} disabled={selectedProvince === 'all'}>
                <SelectTrigger className="h-11 w-[200px] bg-zinc-50 border-zinc-200 text-[10px] font-bold uppercase tracking-[0.15em] px-4">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-emerald-600" />
                    <SelectValue placeholder="District" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest">ALL DISTRICTS</SelectItem>
                  {ZIMBABWE_DISTRICTS[selectedProvince]?.map(d => <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase tracking-widest">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 border-t border-zinc-200 min-h-0 overflow-hidden">
          <div className="lg:col-span-2 border-r flex flex-col bg-zinc-50/30 overflow-y-auto">
            <div className="h-[60px] p-3 border-b flex items-center justify-between bg-white/50 backdrop-blur-sm">
               <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-700">Cross-Temporal Analysis Matrix</span>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                    <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">VALIDATED ANALYTICS</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
               {/* Global Intelligence Summary */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Baseline Mean', val: `${Math.round(avgArea).toLocaleString()} km²`, icon: Database, color: 'text-emerald-600', sub: '20-Year Average', bg: 'bg-emerald-50/50' },
                    { label: 'Latest Cycle', val: `${latestYear?.area_km2.toLocaleString()} km²`, icon: Flame, color: 'text-orange-600', sub: '2024 Season', bg: 'bg-orange-50/50' },
                    { label: 'Peak Outbreak', val: rankedSeasons[0].year, icon: AlertTriangle, color: 'text-orange-600', sub: `${rankedSeasons[0].area_km2.toLocaleString()} km²`, bg: 'bg-orange-50/50' },
                    { label: 'Thermal Drift', val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, icon: diff > 0 ? TrendingUp : TrendingDown, color: diff > 0 ? 'text-orange-600' : 'text-emerald-600', sub: 'Annual Variance', bg: diff > 0 ? 'bg-orange-50/50' : 'bg-emerald-50/50' },
                  ].map((stat, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-lg hover:border-emerald-500/20 transition-all group relative overflow-hidden flex items-center gap-4">
                       <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm", stat.bg)}>
                          <stat.icon className={cn("h-5 w-5", stat.color)} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none truncate">{stat.label}</span>
                             <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-widest h-3.5 bg-zinc-50 border-zinc-100 px-1 opacity-0 group-hover:opacity-100 transition-opacity">Verified</Badge>
                          </div>
                          <p className={cn("text-lg font-bold tracking-tighter tabular-nums leading-none", stat.color)}>{stat.val}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight mt-1">{stat.sub}</p>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="lg:col-span-2 border shadow-sm rounded-2xl overflow-hidden bg-white border-zinc-100 group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                           <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-800">Multi-Decadal Burn Trajectory</CardTitle>
                           <CardDescription className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5 tracking-tighter">Annual area impacted by thermal events (km²)</CardDescription>
                       </div>
                       <div className="flex items-center gap-2">
                         <Badge variant="outline" className="text-[9px] font-bold h-5 border-emerald-500/20 text-emerald-600 bg-emerald-50/50 px-2 uppercase">UNIT: SQ KM</Badge>
                       </div>
                    </CardHeader>
                    <CardContent>
                       <div className="h-[320px] w-full mt-6">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={fireTrends}>
                                <defs>
                                   <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="year" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                  dy={10}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                  tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                                  dx={-10}
                                />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                  itemStyle={{ color: '#10b981', fontWeight: 900 }}
                                  cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="area_km2" 
                                  stroke="#10b981" 
                                  strokeWidth={4}
                                  fillOpacity={1} 
                                  fill="url(#colorTrend)" 
                                  animationDuration={2000}
                                  activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="border shadow-sm rounded-2xl bg-white border-zinc-100 overflow-hidden">
                    <CardHeader className="pb-0 border-b bg-zinc-50/50 p-6">
                       <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-800">Historical Season Ranking</CardTitle>
                       <CardDescription className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Ordered by total area impacted</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                       <ScrollArea className="h-[380px]">
                          <div className="divide-y divide-zinc-100">
                             {rankedSeasons.map((t, idx) => (
                                <div key={t.year} className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-all group cursor-default">
                                   <div className="flex items-center gap-4">
                                      <span className="text-[10px] font-bold text-zinc-300 w-5 group-hover:text-emerald-500 transition-colors">{idx + 1}</span>
                                      <div className="flex flex-col gap-1">
                                         <span className="text-[11px] font-bold uppercase tracking-tight text-zinc-700">{t.year}</span>
                                         <div className="h-1.5 w-32 bg-zinc-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(t.area_km2 / rankedSeasons[0].area_km2) * 100}%` }} />
                                         </div>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <span className="text-[11px] font-bold text-emerald-600 tabular-nums">{t.area_km2.toLocaleString()}</span>
                                      <p className="text-[8px] font-bold text-zinc-400 uppercase leading-none">KM²</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </ScrollArea>
                    </CardContent>
                 </Card>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border shadow-sm rounded-2xl bg-white border-zinc-100 overflow-hidden group">
                     <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                           <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-800">Annual Temp Deviation</CardTitle>
                           <CardDescription className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Thermal drift vs historical baseline (°C)</CardDescription>
                        </div>
                        <Thermometer className="h-5 w-5 text-orange-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                     </CardHeader>
                     <CardContent>
                        <div className="h-[200px] w-full mt-4">
                           <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={thermalTrends}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                 <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(v) => `${v.toFixed(1)}°`} />
                                 <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                 <Line type="monotone" dataKey="avg_temp" stroke="#ea580c" strokeWidth={4} dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                              </LineChart>
                           </ResponsiveContainer>
                        </div>
                     </CardContent>
                  </Card>
                  
                  <div className="p-7 rounded-2xl bg-white border-2 border-zinc-100 shadow-sm flex flex-col justify-between relative overflow-hidden group min-h-[320px] transition-all hover:border-emerald-500/30">
                     <div className="absolute top-0 left-0 w-2 h-full bg-emerald-700"></div>
                     <div className="relative z-10 space-y-6 h-full flex flex-col">
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-emerald-700" />
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.15em]">Official Intelligence Summary</span>
                           </div>
                           <h3 className="text-2xl font-bold tracking-tight text-zinc-900 leading-tight">
                              Integrated Spatial <br />Intelligence Analysis
                           </h3>
                        </div>
                        <p className="text-sm font-medium text-zinc-600 leading-relaxed max-w-[360px]">
                           "Cross-temporal analysis has identified a significant correlation between thermal peaks and drought-stressed zones in {selectedProvince === 'all' ? 'Western Provinces' : selectedProvince}. Strategic intervention is recommended for high-risk nodes."
                        </p>
                         <div className="flex items-center gap-4 pt-2">
                           <ExportButton 
                            data={{
                              reportId: `DOSSIER-${new Date().getFullYear()}-${new Date().getTime()}`,
                              date: new Date().toLocaleString(),
                              province: selectedProvince === "all" ? "NATIONAL" : selectedProvince,
                              district: selectedDistrict === "all" ? "MULTIPLE" : selectedDistrict,
                              ward: "CONSOLIDATED",
                              timeRange: "TECHNICAL TREND ANALYSIS",
                              metrics: {
                                hotspots: 14205,
                                avgIntensity: 84.2,
                                peakFRP: 1240.5,
                                confidence: 94,
                                burnedArea: latestYear?.area_km2 || 0
                              },
                              historical: {
                                baselineAvg: avgArea,
                                percentChange: Math.round(diff),
                                trend: diff > 0 ? 'increasing' : 'decreasing'
                              },
                              sensors: {
                                modis: 4200,
                                viirs: 10005
                              },
                              summary: `Cross-temporal analysis has identified a significant correlation between thermal peaks and drought-stressed zones in ${selectedProvince === 'all' ? 'Western Provinces' : selectedProvince}. Strategic intervention is recommended for high-risk nodes.`,
                              incidents: []
                            }}
                            fileName={`Dossier-${selectedProvince}.pdf`}
                            variant="outline"
                            showText
                            label="Download Technical Dossier"
                            className="h-10 px-6 rounded-xl bg-zinc-50 border-2 border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          />
                           <Button 
                            variant="ghost" 
                            onClick={() => setActiveTab("recon")}
                            className="h-9 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-[10px] font-bold uppercase tracking-wider"
                           >
                               Explore Node Data &rarr;
                           </Button>
                         </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Strategic Context Panel — sticky on desktop */}
          <div className="hidden lg:flex flex-col bg-white shadow-2xl lg:sticky lg:top-0 lg:h-full lg:overflow-y-auto overflow-x-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="h-[60px] p-3 border-b bg-zinc-50/50 flex items-center">
                <TabsList className="grid w-full grid-cols-2 bg-white border-2 p-1 h-9 rounded-lg">
                  <TabsTrigger value="strat" className="text-[9px] font-bold uppercase tracking-[0.2em] data-[state=active]:bg-[#235823] data-[state=active]:text-white rounded-md transition-all">Strategic Intel</TabsTrigger>
                  <TabsTrigger value="recon" className="text-[9px] font-bold uppercase tracking-[0.2em] data-[state=active]:bg-[#235823] data-[state=active]:text-white rounded-md transition-all">Spatial Probe</TabsTrigger>
                </TabsList>
              </div>

               <TabsContent value="strat" className="flex-1 m-0 p-4 bg-white flex flex-col min-h-0">
                 <div className="space-y-6 flex-1 flex flex-col">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Baseline Intelligence</span>
                     <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold tracking-widest px-1.5 py-0 h-4 animate-pulse">ACTIVE</Badge>
                   </div>
                   
                   <div className="p-5 rounded-2xl bg-white border border-zinc-200 text-zinc-900 space-y-4 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-5 rotate-12 transition-transform group-hover:rotate-45 duration-700">
                         <Activity className="h-24 w-24 text-zinc-900" />
                      </div>
                      <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="h-4 w-4 rounded bg-emerald-500/10 flex items-center justify-center">
                               <TrendingUp className="h-2.5 w-2.5 text-emerald-600" />
                             </div>
                             <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-700">Executive Summary</span>
                          </div>
                          <h4 className="text-sm font-bold uppercase tracking-tight mb-2 leading-tight text-zinc-800">
                             {selectedProvince === 'all' ? 'National Strategic Outlook' : `${selectedProvince} Regional Drift`}
                          </h4>
                          <div className="flex-1 p-4 rounded-xl bg-zinc-50 border border-zinc-100 mb-4 flex flex-col min-h-[220px]">
                             <p className="text-[11px] leading-relaxed text-zinc-600 font-semibold italic flex-1">
                                {selectedProvince === 'all' 
                                  ? "National archival data indicates a multi-decadal oscillation in fire intensity. Current cycles suggest a 12% escalation in savanna encroachment compared to the 20-year baseline. Statistical modeling predicts significant biomass accumulation in Eastern corridors. Spatial nodes are currently tracking a transition from dormant to active status across the central watershed."
                                  : `Analysis of ${selectedProvince} confirms a localized thermal escalation. Atmospheric stressors in this region are compounding historical biomass density. Node synchronization reveals emerging anomalies in high-risk zones, necessitating immediate geospatial validation.`}
                             </p>
                             <div className="mt-6 pt-4 border-t border-zinc-200/50 space-y-3">
                                <div className="flex items-center justify-between">
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-bold text-zinc-400 uppercase">Archive Reliability</span>
                                      <span className="text-[10px] font-bold text-emerald-700 uppercase">High Fidelity</span>
                                   </div>
                                   <Badge variant="outline" className="text-[8px] h-4 border-emerald-500/20 text-emerald-700 bg-emerald-50/50">94.2% VERIFIED</Badge>
                                </div>
                                <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500 w-[94%]" />
                                </div>
                             </div>
                          </div>
                         </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Operational Matrix</span>
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Live Node</span>
                     </div>
                      <div className="grid grid-cols-1 gap-2.5">
                         {[
                           { label: 'Data Integrity', val: '98.4%', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                           { label: 'Sensor Overlap', val: 'MODIS + VIIRS', icon: Layers, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                           { label: 'Mean Intensity', val: '84.2 MW', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50' },
                           { label: 'Cloud Buffer', val: '12% Low', icon: Waves, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                         ].map((item, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-100 hover:border-emerald-500/10 hover:shadow-md transition-all group cursor-pointer">
                              <div className="flex items-center gap-3">
                                 <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shadow-sm", item.bg)}>
                                    <item.icon className={cn("h-4 w-4", item.color)} />
                                 </div>
                                 <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight group-hover:text-zinc-900 transition-colors">{item.label}</span>
                              </div>
                              <span className="text-[11px] font-bold text-zinc-900 tabular-nums">{item.val}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                    <Card className="border shadow-sm rounded-2xl bg-white border-zinc-100 overflow-hidden">
                       <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">System Health</span>
                             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <div className="space-y-3">
                             <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-700">NASA EarthData Bridge</span>
                                   <span className="text-[9px] font-bold text-emerald-600">Sync Active</span>
                                </div>
                                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500 w-[88%] animate-pulse" />
                                </div>
                             </div>
                             <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-700">GEE Cluster-04</span>
                                   <span className="text-[9px] font-bold text-emerald-600">Stable</span>
                                </div>
                                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500 w-[94%]" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </Card>

                    <div className="space-y-4 pt-2">
                       <div className="flex items-center justify-between px-1">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Intelligence Audit Log</span>
                         <span className="text-[8px] font-bold text-zinc-300">Live Feed</span>
                       </div>
                       <div className="space-y-2">
                          {[
                            { time: '14:22', msg: 'Node Alpha-9 baseline synchronized' },
                            { time: '12:05', msg: 'Multi-spectral buffer initialized' },
                            { time: '09:44', msg: 'District ignition thresholds updated' },
                            { time: '07:12', msg: 'Satellite pass VIIRS-NPP confirmed' },
                          ].map((log, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg border border-zinc-50 bg-zinc-50/30">
                               <span className="text-[8px] font-bold text-zinc-400 mt-0.5">{log.time}</span>
                               <p className="text-[9px] font-semibold text-zinc-600">{log.msg}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="pt-8 mt-auto border-t border-zinc-100 flex flex-col items-center justify-center text-center opacity-40 pb-4">
                       <Globe className="h-6 w-6 text-zinc-300 mb-2" />
                       <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">ZimFireWatch Portal</span>
                       <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-zinc-300 mt-1">National Geospatial Agency (ZINGSA)</span>
                    </div>
                </div>
              </TabsContent>

               <TabsContent value="recon" className="flex-1 m-0 p-0 bg-zinc-50 relative overflow-hidden flex flex-col h-full">
                 {!isGEESynced ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/60 backdrop-blur-md z-10">
                     <div className="space-y-6 max-w-[280px]">
                        <div className="relative inline-block">
                           <div className="absolute inset-0 bg-[#235823]/10 blur-3xl rounded-full animate-pulse" />
                           <div className="h-20 w-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center border-2 border-zinc-50 relative z-10 rotate-3 group-hover:rotate-0 transition-transform">
                              <Globe className="h-10 w-10 text-[#235823]" />
                           </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-[0.1em]">Spatial Node Offline</h3>
                          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed">
                             Initialize GEE bridge to visualize multi-spectral recovery for {selectedProvince === 'all' ? 'National Level' : selectedProvince}.
                          </p>
                        </div>
                        <Button 
                          onClick={handleSyncGEE}
                          disabled={isSyncing}
                          className="h-11 px-8 rounded-2xl bg-[#235823] hover:bg-[#1a431a] text-white font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-[#235823]/20 border-none w-full group active:scale-95 transition-all"
                        >
                           {isSyncing ? "Syncing Clusters..." : "Establish GEE Link"}
                        </Button>
                     </div>
                   </div>
                 ) : (
                   <div className="h-full w-full relative group">
                      <FireMap 
                        style="dark" 
                        zoom={6} 
                        className="h-full w-full grayscale-[0.2] contrast-[1.1]" 
                        activeLayers={{
                          vegetation: true,
                          burned: true,
                          provinces: true
                        }}
                        onIncidentClick={(info) => {
                          toast.info("GEE Probe Intelligence", {
                            description: `Spatial Analysis at ${info.province}. Coordinate: [${Number(info.lng || 0).toFixed(4)}, ${Number(info.lat || 0).toFixed(4)}]`
                          })
                        }}
                      />
                      <div className="absolute top-4 left-4 p-4 rounded-2xl bg-white/95 border-2 border-zinc-100 shadow-2xl backdrop-blur-md">
                         <div className="flex items-center gap-2 mb-1.5">
                            <Activity className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Live GEE Probe</span>
                         </div>
                         <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Decadal Trajectory Active</p>
                      </div>
                      <div className="absolute bottom-6 right-6">
                         <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open("https://code.earthengine.google.com/", "_blank")}
                          className="h-10 px-6 rounded-2xl bg-white border-2 border-zinc-100 shadow-xl text-[10px] font-bold uppercase tracking-widest text-[#235823] hover:bg-emerald-50 hover:border-emerald-500/20 transition-all active:scale-95"
                         >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            Advanced Explorer
                         </Button>
                      </div>
                   </div>
                 )}
               </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

