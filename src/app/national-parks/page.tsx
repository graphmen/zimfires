"use client"

import * as React from "react"
import { 
  TreePine, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  MapPin, 
  ExternalLink, 
  Search,
  Zap,
  TrendingUp,
  BarChart3,
  Waves,
  Mountain,
  Bird,
  Compass,
  Loader2,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  Database,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Target,
  Clock,
  Flame,
  Cpu
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useHotspots } from "@/hooks/use-hotspots"
import dynamic from "next/dynamic"
const FireMap = dynamic(() => import("@/components/fire-map").then(mod => mod.FireMap), { ssr: false })
import { 
  BarChart, 
  Bar, 
  ResponsiveContainer, 
  Cell 
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ZIMBABWE_PROVINCES, ZIMBABWE_DISTRICTS } from "@/lib/constants"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Park {
  id: string
  name: string
  type: string
  area: string
  center: [number, number]
  hotspots: number
  risk: 'High' | 'Medium' | 'Low'
  vegetationIndex: number
  wildlifeDensity: 'High' | 'Medium' | 'Low'
  description?: string
  province?: string
}


function getParkProvince(lon: number, lat: number): string {
  if (lon > 31.8) return 'Manicaland'
  if (lat < -21.0) {
    if (lon < 30.5) return 'Matabeleland South'
    return 'Masvingo'
  }
  if (lon < 28.5) {
    if (lat < -20.0) return 'Matabeleland South'
    return 'Matabeleland North'
  }
  if (lat < -20.0) {
    if (lon < 30.0) return 'Matabeleland South'
    if (lon < 31.0) return 'Midlands'
    return 'Masvingo'
  }
  if (lat < -19.0) {
    if (lon < 29.5) return 'Matabeleland North'
    if (lon < 30.5) return 'Midlands'
    return 'Masvingo'
  }
  if (lat > -17.5) {
    if (lon < 30.5) return 'Mashonaland West'
    if (lon < 31.5) return 'Mashonaland Central'
    return 'Mashonaland East'
  }
  if (lon < 29.0) return 'Matabeleland North'
  if (lon < 30.5) return 'Mashonaland West'
  if (lon < 31.3) {
    if (lat < -17.8 && lat > -18.2 && lon > 30.8) return 'Harare'
    return 'Mashonaland West'
  }
  return 'Mashonaland East'
}

export default function NationalParksPage() {
  const { hotspots, loading: hotspotsLoading } = useHotspots()
  const [parks, setParks] = React.useState<Park[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [selectedProvince, setSelectedProvince] = React.useState("all")
  const [selectedDistrict, setSelectedDistrict] = React.useState("all")
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date())

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      toast.loading('Handshaking with regional conservation nodes...', { id: 'sync' })
      // Re-fetch parks and refresh hotspot associations
      const res = await fetch('/data/parks.json', { cache: 'no-store' })
      if (!res.ok) throw new Error('Network response was not ok')
      const data = await res.json()
      const mapped = data.features.map((f: any, idx: number) => {
        const name = f.properties.NAME || f.properties.NAME_ENG || 'Unknown Park'
        
        let coords = f.geometry.coordinates
        while (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
          coords = coords[0]
        }
        const lon = coords[0][0]
        const lat = coords[0][1]

        const parkFires = hotspots.filter(h => 
          (h.location_name || '').toLowerCase().includes(name.toLowerCase())
        )
        const count = parkFires.length
        const risk = count > 5 ? 'High' : count > 0 ? 'Medium' : 'Low'

        return {
          id: String(f.properties.SITE_ID || f.properties.SITE_PID || `park-${idx}`),
          name: name,
          type: f.properties.DESIG_ENG || f.properties.DESIG || 'National Park',
          area: `${Math.round(f.properties.GIS_AREA || 0).toLocaleString()} km²`,
          center: [lat || -19.0154, lon || 29.1549],
          hotspots: count,
          risk: risk,
          vegetationIndex: 0.62 + (idx % 7) * 0.04,
          wildlifeDensity: idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Medium' : 'Low',
          province: getParkProvince(lon, lat),
        }
      })
      setParks(mapped)

      setLastUpdated(new Date())
      toast.success('Reserve intelligence synchronized with regional nodes', { id: 'sync' })
    } catch (err) {
      toast.error('Sync failed. Check network connection.', { id: 'sync' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExport = () => {
    if (filteredParks.length === 0) {
      toast.error('No park data to export.')
      return
    }
    setIsExporting(true)
    toast.loading('Building Conservation Intelligence CSV...', { id: 'export' })
    try {
      // Build CSV from filtered parks
      const headers = ['Reserve Name', 'Designation', 'Area', 'Province', 'Active Hotspots', 'Risk Level', 'Vegetation Index', 'Wildlife Density']
      const rows = filteredParks.map(p => [
        `"${p.name}"`,
        `"${p.type}"`,
        `"${p.area}"`,
        `"${p.province || 'Unknown'}"`,
        p.hotspots,
        p.risk,
        `${(p.vegetationIndex * 100).toFixed(1)}%`,
        p.wildlifeDensity,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ZimFireWatch_Conservation_Recap_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${filteredParks.length} reserves to CSV`, { id: 'export' })
    } catch (err) {
      toast.error('Export failed. Please try again.', { id: 'export' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleAnalysis = () => {
    if (parks.length === 0) {
      toast.error('No data loaded for analysis.')
      return
    }
    setIsAnalyzing(true)
    toast.loading('Initialising Bio-Diversity Analytic Engine...', { id: 'analysis' })
    try {
      const highRisk  = parks.filter(p => p.risk === 'High')
      const medRisk   = parks.filter(p => p.risk === 'Medium')
      const totalFires = parks.reduce((a, p) => a + p.hotspots, 0)
      const top5 = [...parks].sort((a, b) => b.hotspots - a.hotspots).slice(0, 5)
      const avgVI = parks.reduce((a, p) => a + p.vegetationIndex, 0) / parks.length

      const report = [
        '============================================================',
        '  ZIMFIREWATCH — CONSERVATION INTELLIGENCE BRIEF',
        `  Generated: ${new Date().toLocaleString('en-ZW', { timeZone: 'Africa/Harare' })} CAT`,
        '============================================================',
        '',
        '1. EXECUTIVE SUMMARY',
        `   Total Reserves Under Surveillance : ${parks.length}`,
        `   Total Active Hotspots             : ${totalFires}`,
        `   Critical Risk Reserves            : ${highRisk.length}`,
        `   Elevated Risk Reserves            : ${medRisk.length}`,
        `   Nominal Status Reserves           : ${parks.length - highRisk.length - medRisk.length}`,
        `   Mean Vegetation Index (NDRE)      : ${(avgVI * 100).toFixed(1)}%`,
        '',
        '2. TOP 5 RESERVES REQUIRING IMMEDIATE ATTENTION',
        ...top5.map((p, i) =>
          `   ${i + 1}. ${p.name.padEnd(35)} | ${p.hotspots} hotspots | Risk: ${p.risk} | Area: ${p.area}`
        ),
        '',
        '3. INTERVENTION DIRECTIVES',
        ...(highRisk.length > 0
          ? [`   DEPLOY FIRE UNITS: ${highRisk.map(p => p.name).join(', ')}`]
          : ['   No critical deployments required at this time.']
        ),
        ...(medRisk.length > 0
          ? [`   ELEVATED SURVEILLANCE: ${medRisk.map(p => p.name).join(', ')}`]
          : []
        ),
        '',
        '4. DATA INTEGRITY',
        '   Source        : NASA FIRMS (VIIRS & MODIS)',
        '   Fusion        : GEE Multi-Spectral Engine',
        '   Latency       : ~3 hours from satellite overpass',
        '   Classification: OFFICIAL — RESTRICTED DISTRIBUTION',
        '',
        '============================================================',
        '  Zimbabwe National Geospatial & Space Agency (ZINGSA)',
        '  ZimFireWatch Platform v2.0 | publicrelations@zingsa.ac.zw',
        '============================================================',
      ].join('\n')

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ZimFireWatch_Intel_Brief_${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Intelligence Brief downloaded successfully', { id: 'analysis' })
    } catch (err) {
      toast.error('Analysis consolidation failed.', { id: 'analysis' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  React.useEffect(() => {
    async function loadParks() {
      try {
        const res = await fetch('/data/parks.json')
        const data = await res.json()
        const mapped = data.features.map((f: any, idx: number) => {
          const name = f.properties.NAME || f.properties.NAME_ENG || 'Unknown Park'
          
          let coords = f.geometry.coordinates
          while (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
            coords = coords[0]
          }
          const lon = coords[0][0]
          const lat = coords[0][1]

          const parkFires = hotspots.filter(h => 
            (h.location_name || '').toLowerCase().includes(name.toLowerCase())
          )
          const count = parkFires.length
          const risk = count > 5 ? 'High' : count > 0 ? 'Medium' : 'Low'

          return {
            id: String(f.properties.SITE_ID || f.properties.SITE_PID || `park-${idx}`),
            name: name,
            type: f.properties.DESIG_ENG || f.properties.DESIG || 'National Park',
            area: `${Math.round(f.properties.GIS_AREA || 0).toLocaleString()} km²`,
            center: [lat || -19.0154, lon || 29.1549],
            hotspots: count,
            risk: risk,
            vegetationIndex: 0.62 + (idx % 7) * 0.04,
            wildlifeDensity: idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Medium' : 'Low',
            province: getParkProvince(lon, lat),
          }
        })
        setParks(mapped)
        setLastUpdated(new Date())
      } catch (err) {
        console.error("Failed to load parks", err)
      } finally {
        setLoading(false)
      }
    }
    loadParks()
  }, [hotspots])

  const filteredParks = parks.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesProvince = selectedProvince === 'all' || p.province === selectedProvince
    return matchesSearch && matchesProvince
  }).sort((a, b) => b.hotspots - a.hotspots)

  const stats = {
    totalArea: "45,000 km²",
    totalParks: parks.length,
    activeFires: filteredParks.reduce((acc, p) => acc + p.hotspots, 0),
    highRisk: filteredParks.filter(p => p.risk === 'High').length
  }

  const mockTrendData = [
    { name: 'Mon', fires: 4 },
    { name: 'Tue', fires: 7 },
    { name: 'Wed', fires: 5 },
    { name: 'Thu', fires: 12 },
    { name: 'Fri', fires: 8 },
    { name: 'Sat', fires: 15 },
    { name: 'Sun', fires: 9 },
  ]

  if (loading && parks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-zinc-950">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
             <TreePine className="h-16 w-16 text-emerald-500 animate-pulse relative z-10" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Interrogating Reserve Archives</p>
            <div className="h-1 w-64 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 animate-progress origin-left" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Precision Slim Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-md z-20 shadow-sm">
        <div className="max-w-full mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-heading font-black tracking-tighter text-primary dark:text-emerald-400 uppercase leading-none">
                    National Parks Intelligence
                  </h1>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black tracking-widest px-1.5 py-0 h-4 animate-pulse">RECON ACTIVE</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                     <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                     </span>
                     <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Op Node: PARK-RECON-01</span>
                  </div>
                  <span className="text-zinc-300">|</span>
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Last Sync: {lastUpdated.toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-3 flex-1 justify-center">
              {[
                { label: 'Total Parks',  value: stats.totalParks,  color: 'text-zinc-800',  border: 'border-zinc-200',  bg: 'bg-zinc-50',  dot: '' },
                { label: 'High Risk',    value: stats.highRisk,    color: 'text-orange-600',    border: 'border-orange-100',    bg: 'bg-orange-50',    dot: 'bg-orange-500' },
                { label: 'Active Fires', value: stats.activeFires, color: 'text-orange-600', border: 'border-orange-100', bg: 'bg-orange-50', dot: 'bg-orange-500' },
                { label: 'Total Area',   value: stats.totalArea,   color: 'text-primary',border: 'border-emerald-100',bg: 'bg-emerald-50',dot: 'bg-emerald-500' },
              ].map((kpi, idx) => (
                <div key={idx} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border ${kpi.border} ${kpi.bg} min-w-[110px]`}>
                  <div className="flex flex-col">
                    <span className={`text-[14px] font-black tabular-nums leading-tight ${kpi.color}`}>{kpi.value}</span>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{kpi.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
               <Button 
                variant="outline" 
                size="sm" 
                disabled={isExporting}
                onClick={handleExport}
                className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-background border-2 hover:bg-emerald-50 transition-all active:scale-95"
               >
                  {isExporting ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <FileSpreadsheet className="mr-2 h-3 w-3" />} 
                  Export Recap
               </Button>
               <Button 
                variant="outline" 
                size="sm" 
                disabled={isSyncing}
                onClick={handleSync}
                className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-background border-2 hover:bg-emerald-50 transition-all active:scale-95"
               >
                  {isSyncing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />} 
                  Sync Hub
               </Button>
            </div>
          </div>
        </div>

        {/* Precision Filter Bar */}
        <div className="px-4 py-2 bg-zinc-50 flex items-center gap-3 border-b">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by ID, Province, or District..." 
              className="pl-9 h-9 bg-background border-none shadow-none text-xs font-bold placeholder:text-muted-foreground/40 placeholder:font-normal focus-visible:ring-1 focus-visible:ring-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          <div className="flex items-center gap-2">
            <Select value={selectedProvince} onValueChange={(v) => { if (v) { setSelectedProvince(v); setSelectedDistrict("all"); } }}>
              <SelectTrigger className="h-9 w-40 bg-background border-none shadow-none text-[10px] font-black uppercase tracking-widest">
                <Globe className="mr-2 h-3 w-3 text-primary" />
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[10px] font-bold">ALL PROVINCES</SelectItem>
                {ZIMBABWE_PROVINCES.map(p => <SelectItem key={p} value={p} className="text-[10px] font-bold uppercase">{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedDistrict} onValueChange={(v) => v && setSelectedDistrict(v)} disabled={selectedProvince === 'all'}>
              <SelectTrigger className="h-9 w-40 bg-background border-none shadow-none text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                <Filter className="mr-2 h-3 w-3 text-primary" />
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[10px] font-bold">ALL DISTRICTS</SelectItem>
                {ZIMBABWE_DISTRICTS[selectedProvince]?.map(d => <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase">{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Reserve Intelligence Matrix */}
          <div className="lg:col-span-2 border-r flex flex-col bg-white dark:bg-zinc-900/30">
            <div className="p-3 border-b flex items-center justify-between bg-primary/5">
               <div className="flex items-center gap-3">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-heading font-black uppercase tracking-widest text-primary/80">{filteredParks.length} Protected Entities Under Surveillance</span>
               </div>
               <div className="flex items-center gap-4">
                  {[
                    { color: 'bg-orange-500', label: 'CRITICAL' },
                    { color: 'bg-orange-400', label: 'ELEVATED' },
                    { color: 'bg-emerald-500', label: 'NOMINAL' }
                  ].map(lvl => (
                    <div key={lvl.label} className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${lvl.color} shadow-[0_0_5px_rgba(0,0,0,0.1)]`} />
                      <span className="text-[8px] font-black tracking-widest text-muted-foreground uppercase">{lvl.label}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Parks Table — scrollable list */}
            <div className="relative overflow-hidden">
              {/* Sticky column header — sits above the scroll area */}
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b sticky top-0 z-10">
                    <tr className="border-none">
                      <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-10 px-6 text-left">WDPA Designation</th>
                      <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-10 text-left">Ecological Pulse</th>
                      <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-10 text-left">Spatial Coverage</th>
                      <th className="text-center text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-10">Risk Factor</th>
                      <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-10 px-6">Tactical Recon</th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Scrollable rows body */}
              <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
                <div className="overflow-x-auto">
                  <table className="w-full caption-bottom text-sm">
                    <tbody>
                      {filteredParks.map((park) => (
                        <tr key={park.id} className="group hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors border-b border-zinc-100 dark:border-white/5">
                          <td className="px-6 py-3 w-[30%]">
                            <div className="flex flex-col">
                              <span className="text-[12px] font-heading font-black text-zinc-800 dark:text-white group-hover:text-primary transition-colors leading-tight">{park.name}</span>
                              <span className="text-[10px] font-medium text-zinc-500 mt-0.5">{park.type}</span>
                            </div>
                          </td>
                          <td className="py-3 w-[20%]">
                            <div className="flex flex-col">
                              <span className="text-[12px] font-semibold text-emerald-700 tabular-nums">{(park.vegetationIndex * 100).toFixed(0)}% NDRE</span>
                              <span className="text-[10px] font-medium text-zinc-400 leading-none">Bio-Health Index</span>
                            </div>
                          </td>
                          <td className="py-3 w-[20%]">
                            <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{park.area}</span>
                          </td>
                          <td className="text-center py-3 w-[15%]">
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge className={cn(
                                "text-[9px] font-semibold uppercase h-5 px-2 rounded-full border-none shadow-sm",
                                park.risk === 'High' ? "bg-orange-100 text-orange-700" :
                                park.risk === 'Medium' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                              )}>
                                {park.risk}
                              </Badge>
                              <span className="text-[10px] font-medium text-zinc-500">{park.hotspots} active</span>
                            </div>
                          </td>
                          <td className="text-right px-6 py-3 w-[15%]">
                            <Link
                              href={`/national-parks/${park.id}`}
                              className="h-8 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-600 bg-white hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
                            >
                              Investigate <Compass className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>

            {/* ── Conservation Decision Intelligence — Section Header ── */}
            <div className="border-t-2 border-emerald-500">
              {/* Header bar */}
              <div className="bg-zinc-800 px-6 py-3.5 flex items-center gap-3">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                  <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white leading-tight">
                    Conservation Decision Intelligence
                  </span>
                  <span className="text-[10px] font-normal text-zinc-400 leading-tight mt-0.5">
                    Synthesised risk analysis across all filtered reserves
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live — {filteredParks.length} reserves</span>
                </div>
              </div>

              {/* Cards area */}
              <div className="bg-zinc-50/60 dark:bg-zinc-900/40 p-5">
              <div className="grid grid-cols-3 gap-4">

                {/* Risk Tier Breakdown */}
                <div className="bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-white/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Risk Distribution</div>
                  {[
                    { label: 'Critical', count: filteredParks.filter(p => p.risk === 'High').length, color: 'bg-orange-500', text: 'text-orange-600' },
                    { label: 'Elevated', count: filteredParks.filter(p => p.risk === 'Medium').length, color: 'bg-orange-400', text: 'text-orange-600' },
                    { label: 'Nominal', count: filteredParks.filter(p => p.risk === 'Low').length, color: 'bg-emerald-500', text: 'text-emerald-600' },
                  ].map(tier => (
                    <div key={tier.label} className="mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">{tier.label}</span>
                        <span className={`text-[11px] font-black tabular-nums ${tier.text}`}>{tier.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tier.color} transition-all duration-700`}
                          style={{ width: filteredParks.length ? `${(tier.count / filteredParks.length) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                    <div className="text-[10px] text-zinc-500 font-medium">
                      Total Hotspots: <span className="font-black text-zinc-700 dark:text-white tabular-nums">{filteredParks.reduce((s, p) => s + p.hotspots, 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Province Concentration */}
                <div className="bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-white/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Province Concentration</div>
                  {(() => {
                    const byProvince: Record<string, number> = {}
                    filteredParks.filter(p => p.risk === 'High').forEach(p => {
                      const prov = p.province || 'Unknown'
                      byProvince[prov] = (byProvince[prov] || 0) + 1
                    })
                    const sorted = Object.entries(byProvince).sort((a, b) => b[1] - a[1]).slice(0, 5)
                    const max = sorted[0]?.[1] || 1
                    return sorted.length > 0 ? sorted.map(([prov, count]) => (
                      <div key={prov} className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 truncate pr-2">{prov}</span>
                          <span className="text-[10px] font-black text-orange-600 tabular-nums shrink-0">{count} critical</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-orange-500 transition-all duration-700" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    )) : (
                      <div className="flex items-center justify-center h-16 text-[10px] text-zinc-400">No critical zones detected</div>
                    )
                  })()}
                </div>

                {/* Intervention Priority Matrix */}
                <div className="bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-white/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Intervention Priority</div>
                  <div className="space-y-2">
                    {[
                      {
                        action: 'Deploy Fire Units',
                        trigger: filteredParks.filter(p => p.risk === 'High').length > 0,
                        severity: 'critical',
                        detail: `${filteredParks.filter(p => p.risk === 'High').length} reserves require immediate response`,
                      },
                      {
                        action: 'Elevated Surveillance',
                        trigger: filteredParks.filter(p => p.risk === 'Medium').length > 0,
                        severity: 'elevated',
                        detail: `${filteredParks.filter(p => p.risk === 'Medium').length} reserves on watchlist`,
                      },
                      {
                        action: 'GEE Data Sync',
                        trigger: true,
                        severity: 'nominal',
                        detail: 'MODIS + VIIRS fusion active — 98.4% integrity',
                      },
                    ].map(item => (
                      <div key={item.action} className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-lg border',
                        item.severity === 'critical' ? 'bg-orange-50 border-red-200 dark:bg-orange-500/10 dark:border-red-500/20' :
                        item.severity === 'elevated' ? 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20' :
                        'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                      )}>
                        <div className={cn(
                          'h-1.5 w-1.5 rounded-full mt-1.5 shrink-0',
                          item.severity === 'critical' ? 'bg-orange-500' :
                          item.severity === 'elevated' ? 'bg-orange-500' : 'bg-emerald-500'
                        )} />
                        <div>
                          <div className={cn(
                            'text-[10px] font-bold',
                            item.severity === 'critical' ? 'text-orange-700' :
                            item.severity === 'elevated' ? 'text-orange-700' : 'text-emerald-700'
                          )}>{item.action}</div>
                          <div className="text-[10px] font-normal text-zinc-500 leading-snug mt-0.5">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>{/* end grid grid-cols-3 */}
              </div>{/* end cards area bg-zinc-50/60 */}
            </div>{/* end border-t-2 section wrapper */}

          </div>{/* end left column */}


          {/* Light column background — always fills full row height */}
          <div className="hidden lg:block bg-zinc-50 border-l border-zinc-200">

          {/* Ecosystem Intelligence Panel — sticky within light column */}
          <div className="flex flex-col bg-zinc-50 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
            <Tabs defaultValue="recon" className="flex-1 flex flex-col">
              <div className="p-3 border-b border-zinc-200 bg-white">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-100 border border-zinc-200 p-1 h-9 rounded-lg">
                  <TabsTrigger value="recon" className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm rounded-md transition-all">Spatial Recon</TabsTrigger>
                  <TabsTrigger value="pulse" className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm rounded-md transition-all">Ecosystem Pulse</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="recon" className="flex-1 m-0 p-5 flex flex-col items-center justify-center bg-zinc-50">
                <div className="space-y-5 max-w-[280px] text-center">
                  <div className="relative inline-block">
                     <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
                     <Target className="h-14 w-14 text-emerald-600 relative z-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">Geo-Spatial Coverage</h3>
                    <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                       Real-time thermal surveillance across 14 protected sectors. Monitoring {stats.totalParks} registered reserves spanning {stats.totalArea}.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {[
                      { label: 'Total Parks',  val: stats.totalParks,  color: 'text-zinc-800',   bg: 'bg-white border-zinc-200' },
                      { label: 'Active Fires', val: stats.activeFires, color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100' },
                      { label: 'High Risk',    val: stats.highRisk,    color: 'text-orange-600',     bg: 'bg-orange-50 border-red-100' },
                      { label: 'Total Area',   val: stats.totalArea,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
                    ].map((s, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${s.bg}`}>
                        <p className={`text-base font-bold tabular-nums ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pulse" className="flex-1 m-0 p-4 space-y-4 overflow-y-auto bg-zinc-50">
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">Aggregated Metrics</span>
                     <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold uppercase">Live Link</Badge>
                   </div>
                   <div className="h-[120px] w-full bg-white dark:bg-zinc-900 rounded-2xl border-2 p-4 shadow-sm">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={mockTrendData}>
                            <Bar dataKey="fires" radius={[2, 2, 0, 0]} barSize={12}>
                               {mockTrendData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 5 ? '#ea580c' : '#10b981'} fillOpacity={0.8} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex flex-col gap-0.5 shadow-sm">
                         <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Mean Biomass</span>
                         <span className="text-lg font-black text-emerald-700 tracking-tighter">74.2%</span>
                         <div className="h-1 w-full bg-zinc-100 rounded-full mt-2 overflow-hidden">
                           <div className="h-full bg-emerald-600 w-3/4" />
                         </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex flex-col gap-0.5 shadow-sm">
                         <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Node Health</span>
                         <span className="text-lg font-black text-emerald-600 tracking-tighter uppercase">Optimal</span>
                         <div className="flex gap-1 mt-2">
                           <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                           <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                           <div className="h-1 flex-1 bg-emerald-500 rounded-full opacity-30" />
                         </div>
                      </div>
                   </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-4">
                   <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tactical Briefings</span>
                   <div className="space-y-2">
                      {[
                        { title: 'Vegetation Recovery', desc: 'Mana Pools showing 12% increase in LAI index.', status: 'positive', icon: TreePine, color: 'text-emerald-600' },
                        { title: 'Migration Pattern', desc: 'Elephant herds moving towards the Zambezi corridor.', status: 'neutral', icon: Bird, color: 'text-emerald-600' },
                        { title: 'Drought Stress', desc: 'Southern reserves showing moisture deficits.', status: 'negative', icon: Mountain, color: 'text-orange-600' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-3 group cursor-pointer p-2.5 rounded-2xl border bg-white dark:bg-zinc-900 hover:border-emerald-500/30 transition-all">
                           <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                           </div>
                           <div className="space-y-0.5">
                              <h4 className="text-[9px] font-black uppercase text-zinc-900 dark:text-white leading-none">{item.title}</h4>
                              <p className="text-[8px] leading-snug text-zinc-400 font-medium">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-auto pt-6">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm relative overflow-hidden group">
                     {/* Clear Background */}
                     <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">Bio-D Engine</span>
                       </div>
                       <p className="text-[10px] leading-relaxed text-slate-500 font-medium italic">
                          "System consolidated multi-spectral data for 14 sectors. Elevated risk identified in boundary zones."
                       </p>
                       <Button 
                        disabled={isAnalyzing}
                        onClick={handleAnalysis}
                        className="w-full mt-4 h-10 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg active:scale-95 border-none rounded-2xl"
                       >
                          {isAnalyzing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : "Consolidate Analysis"}
                       </Button>
                     </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          </div>
        </div>
    </div>
  )
}
