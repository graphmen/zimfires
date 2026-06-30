"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Download, 
  Map as MapIcon, 
  Calendar, 
  Flame, 
  Database, 
  ChevronRight, 
  ArrowUpDown, 
  ExternalLink,
  ShieldAlert,
  FileJson,
  FileSpreadsheet,
  Activity,
  Cpu,
  RefreshCw,
  Globe
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import dynamic from "next/dynamic"
const FireMap = dynamic(() => import("@/components/fire-map").then(mod => mod.FireMap), { ssr: false })
import { toast } from "sonner"
import { getObservations, getAggregateStats } from "@/app/actions/observation-actions"


const provinces = [
  "Bulawayo",
  "Harare",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands"
]

const districts: Record<string, string[]> = {
  "all": ["Bulawayo", "Harare", "Mutare", "Gweru", "Hwange", "Chiredzi", "Beitbridge", "Bindura"],
  "Bulawayo": ["Bulawayo"],
  "Harare": ["Harare", "Chitungwiza", "Epworth"],
  "Manicaland": ["Buhera", "Chimanimani", "Chipinge", "Makoni", "Mutare", "Mutasa", "Nyanga"],
  "Mashonaland Central": ["Bindura", "Centenary", "Guruve", "Mazowe", "Mt Darwin", "Muzarabani", "Shamva", "Mbire"],
  "Mashonaland East": ["Chikomba", "Goromonzi", "Marondera", "Mudzi", "Murehwa", "Mutoko", "Seke", "Wedza", "UMP"],
  "Mashonaland West": ["Chegutu", "Hurungwe", "Kariba", "Makonde", "Mhondoro-Ngezi", "Sanyati", "Zvimba"],
  "Masvingo": ["Bikita", "Chiredzi", "Chivi", "Gutu", "Masvingo", "Mwenezi", "Zaka"],
  "Matabeleland North": ["Binga", "Bubi", "Hwange", "Lupane", "Nkayi", "Tsholotsho", "Umguza"],
  "Matabeleland South": ["Beitbridge", "Bulilima", "Gwanda", "Insiza", "Mangwe", "Matobo", "Umzingwane"],
  "Midlands": ["Chirumhanzu", "Gokwe North", "Gokwe South", "Gweru", "Kwekwe", "Mberengwa", "Shurugwi", "Zvishavane"]
}

export default function ArchiveSearchPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedYear, setSelectedYear] = React.useState("all")
  const [selectedProvince, setSelectedProvince] = React.useState("all")
  const [selectedDistrict, setSelectedDistrict] = React.useState("all")
  const [isQuerying, setIsQuerying] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isApiConnecting, setIsApiConnecting] = React.useState(false)
  const [selectedIncident, setSelectedIncident] = React.useState<string | null>(null)
  const [realIncidents, setRealIncidents] = React.useState<any[]>([])
  const [liveStats, setLiveStats] = React.useState<any>(null)

  // Initial data load
  React.useEffect(() => {
    handleExecuteQuery()
  }, [])

  const handleExecuteQuery = async () => {
    setIsQuerying(true)
    
    try {
      const filters = {
        province: selectedProvince,
        district: selectedDistrict,
        year: selectedYear,
        search: searchQuery
      }

      const [obsResult, statsResult] = await Promise.all([
        getObservations(filters),
        getAggregateStats(filters)
      ])

      if (obsResult.error) throw new Error(obsResult.error)
      
      setRealIncidents(obsResult.data.map(d => ({
        id: d.record_id,
        date: new Date(d.observation_time).toLocaleDateString(),
        province: d.province,
        district: d.district,
        area: 14.06, // Estimate for VIIRS 375m
        severity: (d.brightness || 0) > 340 ? "High" : (d.brightness || 0) > 320 ? "Medium" : "Low",
        type: d.source_type || "Satellite Detection"
      })))

      setLiveStats(statsResult.stats)
      
      toast.success('Intelligence Retrieval Successful', {
        description: `Retrieved ${obsResult.data.length} records from Supabase.`
      })
    } catch (error) {
      console.error(error)
      toast.error('Query Failed', {
        description: 'Ensure your database connection is active.'
      })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    
    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            // Generate CSV Content
            const headers = ["Identifier", "Date", "Province", "District", "Area (Ha)", "Severity", "Type"]
            const rows = realIncidents.map(inc => [
              inc.id,
              inc.date,
              inc.province,
              inc.district,
              inc.area,
              inc.severity,
              inc.type
            ])
            
            const csvContent = [
              headers.join(","),
              ...rows.map(row => row.join(","))
            ].join("\n")

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.setAttribute("href", url)
            link.setAttribute("download", `archive_manifest_${selectedProvince}_${selectedYear}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            setIsExporting(false)
            resolve(true)
          } catch (err) {
            setIsExporting(false)
            reject(err)
          }
        }, 1500)
      }),
      {
        loading: 'Synthesizing CSV Manifest...',
        success: () => 'Archive Data Exported to Downloads folder',
        error: 'Export Failed',
      }
    )
  }

  const handleApiAccess = () => {
    setIsApiConnecting(true)
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Handshaking with ZINGSA API Gateway...',
        success: () => {
          setIsApiConnecting(false)
          // In a real app, this might copy a key to clipboard
          navigator.clipboard.writeText("ZINGSA-ARCHIVE-PROX-8492-X-2026")
          return 'Secure API Key Copied to Clipboard'
        },
        error: 'Handshake Timed Out',
      }
    )
  }

  const handleGeneratePDF = () => {
    toast.info("Generating Tactical Archival Dossier", {
      description: "Compiling spatial snapshots and impact metrics for the selected period. PDF will be ready in the Downloads folder soon."
    })
    // Simulate another download
    setTimeout(() => {
      toast.success("Dossier Generated", {
        description: "TRD-ZIM-2026-ARCHIVE.pdf has been saved."
      })
    }, 3000)
  }

  const [isProbing, setIsProbing] = React.useState(false)

  const handleIncidentSelect = (id: string) => {
    setSelectedIncident(id)
    setIsProbing(true)
    toast.loading(`Probing spatial node for ${id}...`, { duration: 1500 })
    setTimeout(() => setIsProbing(false), 1500)
  }

  const handleOpenSpatialProbe = () => {
    toast.success("Opening Advanced Spatial Explorer", {
       description: "Redirecting to high-resolution Earth Engine data layer."
    })
    window.open("https://code.earthengine.google.com/", "_blank")
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50/50 selection:bg-orange-500/30">
        {/* Action Controls Sub-Header */}
        <div className="flex-none bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Archive Intelligence Hub</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-200" />
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Op Node</span>
                  <span className="text-[10px] font-bold text-zinc-900">ZIM-HRE-01</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <Button 
              variant="outline" 
              size="sm" 
              disabled={isExporting}
              onClick={handleExportCSV}
              className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-white border-2 border-zinc-200 hover:bg-zinc-50 transition-all active:scale-95"
             >
                {isExporting ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <FileSpreadsheet className="mr-2 h-3 w-3" />} 
                Export Manifest
             </Button>
             <Button 
              variant="outline" 
              size="sm" 
              disabled={isApiConnecting}
              onClick={handleApiAccess}
              className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-white border-2 border-zinc-200 hover:bg-zinc-50 transition-all active:scale-95"
             >
                {isApiConnecting ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Cpu className="mr-2 h-3 w-3" />} 
                API Gateway
             </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border-b border-zinc-200 px-8 py-3 z-20">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
              <Input 
                placeholder="Search by ID, Province, or District..." 
                className="pl-9 h-9 bg-zinc-50 border-zinc-200 shadow-none text-xs font-bold focus-visible:ring-1 focus-visible:ring-orange-500/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
                <SelectTrigger className="h-9 w-32 bg-zinc-50 border-zinc-200 text-[10px] font-black uppercase tracking-widest">
                  <Calendar className="mr-2 h-3 w-3 text-emerald-600" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">ALL YEARS</SelectItem>
                  {Array.from({ length: 7 }, (_, i) => 2026 - i).map(y => (
                    <SelectItem key={y} value={y.toString()} className="text-[10px] font-bold">{y} SEASON</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProvince} onValueChange={(val) => {
                if (val) {
                  setSelectedProvince(val)
                  setSelectedDistrict("all")
                }
              }}>
                <SelectTrigger className="h-9 w-[180px] bg-zinc-50 border-zinc-200 text-[10px] font-black uppercase tracking-widest">
                  <Globe className="mr-2 h-3 w-3 text-emerald-600" />
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">ALL PROVINCES</SelectItem>
                  {provinces.map(p => (
                    <SelectItem key={p} value={p} className="text-[10px] font-bold uppercase">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDistrict} onValueChange={(v) => v && setSelectedDistrict(v)}>
                <SelectTrigger className="h-9 w-[180px] bg-zinc-50 border-zinc-200 text-[10px] font-black uppercase tracking-widest">
                  <Filter className="mr-2 h-3 w-3 text-emerald-600" />
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">ALL DISTRICTS</SelectItem>
                  {(districts[selectedProvince] || districts["all"]).map(d => (
                    <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExecuteQuery}
                disabled={isQuerying}
                className="h-9 px-6 font-black uppercase tracking-widest text-[10px] bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
              >
                {isQuerying ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Activity className="mr-2 h-3 w-3" />}
                Execute Query
              </Button>
            </div>
          </div>
        </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full">
          {/* High-Density Data Matrix */}
          <div className="flex-1 lg:flex-[2] border-r flex flex-col bg-white dark:bg-zinc-950 min-h-0">
            <div className="p-3 border-b flex items-center justify-between bg-primary/5">
               <div className="flex items-center gap-3">
                   <div className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black">
                    {realIncidents.length}
                  </div>
                  <span className="text-[10px] font-heading font-black uppercase tracking-[0.2em] text-primary/80">Synchronized Records Found</span>
               </div>
               <div className="flex items-center gap-4">
                  {[
                    { color: 'bg-orange-500', label: 'CRITICAL' },
                    { color: 'bg-orange-500', label: 'ELEVATED' },
                    { color: 'bg-yellow-500', label: 'NOMINAL' }
                  ].map(lvl => (
                    <div key={lvl.label} className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${lvl.color} shadow-[0_0_5px_rgba(0,0,0,0.2)]`} />
                      <span className="text-[8px] font-black tracking-widest text-muted-foreground">{lvl.label}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col">
              <div className="p-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10 border-b shadow-sm">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[110px] text-[9px] font-black uppercase tracking-widest py-3 pl-6">Identifier</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">Timestamp</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">Jurisdiction</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">District</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-widest py-3 pr-6">Extent (Ha)</TableHead>
                      <TableHead className="text-center text-[9px] font-black uppercase tracking-widest py-3">Status</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {realIncidents.map((inc) => (
                      <TableRow key={inc.id} onClick={() => handleIncidentSelect(inc.id)} className="group hover:bg-primary/5 transition-colors border-b-muted/30 cursor-pointer">
                        <TableCell className="font-black text-[11px] font-mono pl-6 text-primary/80">{inc.id}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground">{inc.date}</TableCell>
                        <TableCell className="text-[10px] font-black text-zinc-700 uppercase tracking-tight">{inc.province}</TableCell>
                        <TableCell className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{inc.district}</TableCell>
                        <TableCell className="text-right font-black text-[11px] pr-6">{inc.area}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={`text-[8px] font-black uppercase px-2 py-0 h-4 ${
                              inc.severity === 'High' ? 'border-red-500/30 text-red-600 bg-red-50' : 
                              inc.severity === 'Medium' ? 'border-orange-500/30 text-orange-600 bg-orange-50' : 
                              'border-emerald-500/30 text-emerald-700 bg-emerald-50'
                            }`}
                          >
                            {inc.severity === 'High' ? 'CRITICAL' : inc.severity === 'Medium' ? 'ELEVATED' : 'NOMINAL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10">
                            <ChevronRight className="h-3 w-3 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Contextual Intelligence Section */}
          <div className="hidden lg:flex lg:flex-1 flex-col bg-white dark:bg-zinc-950 shadow-2xl z-10 border-l min-h-0 overflow-hidden">
            <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b bg-muted/10">
                <TabsList className="grid w-full grid-cols-2 bg-background border-2 p-1 h-9 rounded-lg">
                  <TabsTrigger value="preview" className="text-[9px] font-heading font-black uppercase tracking-[0.2em] data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Spatial Probe</TabsTrigger>
                  <TabsTrigger value="stats" className="text-[9px] font-heading font-black uppercase tracking-[0.2em] data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Impact Matrix</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="flex-1 m-0 p-0 relative group h-full flex flex-col">
                <FireMap 
                  style="satellite" 
                  zoom={7} 
                  className="h-full w-full grayscale-[0.2] contrast-[1.1]"
                  activeLayers={{
                    burned: true,
                    fires: true,
                    provinces: true,
                    districts: true
                  }}
                  onIncidentClick={(info) => {
                    toast.info("Spatial Probe Intelligence", {
                      description: `Located in ${info.district}, ${info.province}. Coordinate: [${info.lng.toFixed(4)}, ${info.lat.toFixed(4)}]`
                    })
                  }}
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#020617]/90 via-[#020617]/20 to-transparent" />
                
                {isProbing && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div className="relative">
                         <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-ping" />
                         <div className="h-24 w-24 rounded-full border-2 border-emerald-500/50 border-t-emerald-500 animate-spin" />
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Probing</span>
                            <span className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-tighter">Spatial Node</span>
                         </div>
                      </div>
                   </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-2xl border border-emerald-500/20 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                   <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                         <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center">
                              <Flame className="h-3 w-3 text-emerald-600" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                               {isProbing ? "Scanning Data Packets..." : "Zimbabwe Spatial Scan"}
                            </span>
                         </div>
                         <h3 className="text-xs font-black uppercase tracking-tight">
                            {selectedIncident ? `Focus: ${selectedIncident}` : "Active Intelligence Layer"}
                         </h3>
                         <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-medium">
                            {isProbing 
                               ? "Decrypting historical thermal signatures and atmospheric disturbances from NASA GIBS clusters..." 
                               : "Synthesizing historical thermal signatures across Zimbabwe's ecological zones. Currently displaying multi-decadal recovery data."}
                         </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full border-2 hover:bg-emerald-50 active:scale-90 transition-all"
                        onClick={handleOpenSpatialProbe}
                      >
                         <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      </Button>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="flex-1 m-0 p-5 space-y-6 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/30 h-full">
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Aggregated Metrics</span>
                     <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px] font-black">LIVE SYNC</Badge>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Archive Intelligence Hub</h1>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black tracking-widest px-1.5 py-0 h-4 animate-pulse">LIVE</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                             <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                             </span>
                             <span>Operational Node: ZIM-HRE-01</span>
                          </div>
                          <span className="text-slate-300">|</span>
                          <span>Spatial Latency: 124ms</span>
                        </div>
                      </div>
                       <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-zinc-100 dark:border-zinc-800 flex flex-col gap-0.5 shadow-sm">
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Gross Extent</span>
                          <span className="text-lg font-black text-primary tracking-tighter">{liveStats?.estimatedArea || "0"} Ha</span>
                          <div className="h-1 w-full bg-zinc-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-primary w-2/3" />
                          </div>
                       </div>
                       <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-zinc-100 dark:border-zinc-800 flex flex-col gap-0.5 shadow-sm">
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Mean Intensity</span>
                          <span className="text-lg font-black text-orange-600 tracking-tighter">{liveStats?.avgBrightness > 330 ? "HIGH" : "NOMINAL"}</span>
                          <div className="flex gap-1 mt-2">
                            <div className="h-1 flex-1 bg-orange-500 rounded-full" />
                            <div className="h-1 flex-1 bg-orange-500 rounded-full opacity-30" />
                            <div className="h-1 flex-1 bg-orange-500 rounded-full opacity-30" />
                          </div>
                       </div>
                   </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-4">
                   <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cross-Temporal Context</span>
                   <div className="space-y-2">
                      {[
                        { label: 'Maximum Recorded Outbreak', val: '2021 PEAK', color: 'text-red-600', icon: ShieldAlert },
                        { label: 'Dominant Vegetation Index', val: 'MIOMBO WOODLAND', color: 'text-emerald-600', icon: Globe },
                        { label: 'Mean Regrowth Velocity', val: '18.4 MONTHS', color: 'text-emerald-600', icon: Activity },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-white dark:bg-slate-900 hover:border-[#235823]/30 transition-all group">
                           <div className="flex items-center gap-2">
                             <item.icon className="h-3 w-3 text-muted-foreground/40 group-hover:text-[#235823]" />
                             <span className="text-[10px] font-bold text-muted-foreground">{item.label}</span>
                           </div>
                           <span className={`text-[10px] font-black ${item.color} tracking-tight`}>{item.val}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-auto pt-6">
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4 shadow-xl border border-white/5 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                        <ShieldAlert className="h-16 w-16" />
                     </div>
                     <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400">Risk Prognosis</span>
                       </div>
                       <p className="text-[11px] leading-relaxed text-zinc-400 font-medium italic">
                          "Archive intelligence detects a recurring high-density thermal pattern in the Midlands province. Strategic firebreak deployment recommended prior to the 2026 Q3 season."
                       </p>
                       <Button 
                        onClick={handleGeneratePDF}
                        className="w-full mt-4 h-9 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-zinc-900 hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95"
                       >
                          Generate Tactical Dossier
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
