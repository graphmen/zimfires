"use client"

import * as React from "react"
import {
  TriangleAlert,
  ShieldAlert,
  Wind,
  Droplets,
  Thermometer,
  Map as MapIcon,
  ChevronRight,
  Activity,
  Users,
  Building2,
  Info,
  TrendingUp,
  AlertCircle,
  Flame,
  Search,
  Calendar,
  Globe,
  Filter,
  RefreshCw,
  Cpu,
  Download,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProvinceRiskData } from "@/app/actions/observation-actions"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from "next/dynamic"
import { pdf } from '@react-pdf/renderer'
import { TacticalDossier } from '@/components/reports/tactical-dossier'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"

const FireMap = dynamic(() => import("@/components/fire-map").then(mod => mod.FireMap), { ssr: false })


export default function RiskZonesPage() {
  const [riskZones, setRiskZones] = React.useState<any[]>([])
  const [activeZone, setActiveZone] = React.useState<any>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)

  // Initial data load
  React.useEffect(() => {
    fetchRiskData()
  }, [])

  const fetchRiskData = async () => {
    setIsLoading(true)
    try {
      const result = await getProvinceRiskData()
      if (result.error) throw new Error(result.error)
      console.log('Risk Data Fetched:', result.data)
      setRiskZones(result.data)
      if (result.data.length > 0) {
        setActiveZone(result.data[0])
      }
    } catch (error) {
      console.error(error)
      toast.error("Risk Sync Failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setIsGenerating(true)
      const fileName = `Risk_Dossier_${(activeZone?.name || 'Zimbabwe').replace(/\s+/g, '_')}.pdf`

      const dossierData = {
        reportId: `TR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        date: new Date().toLocaleDateString(),
        province: "Zimbabwe",
        district: activeZone.name,
        ward: "Central Sector",
        timeRange: "Last 24 Hours",
        metrics: {
          hotspots: Math.floor(activeZone.riskScore / 10),
          avgIntensity: activeZone.riskScore,
          peakFRP: activeZone.riskScore * 1.5,
          confidence: 85,
        },
        historical: {
          baselineAvg: 5,
          percentChange: 12,
          trend: 'increasing' as const,
        },
        sensors: {
          modis: 4,
          viirs: 8,
        },
        summary: `Strategic risk assessment for ${activeZone?.name || 'Zimbabwe'}. The current risk score of ${activeZone?.riskScore || 0} indicates ${activeZone?.threatLevel || 'Stable'} threat levels due to ${(activeZone?.factors || []).join(', ')}. population of ${activeZone?.populationAtRisk || 'Unknown'} is potentially exposed.`,
        incidents: [
          { id: 'ANOM-01', lat: -18.2, lng: 31.1, frp: 45, confidence: 'High', sensor: 'VIIRS' },
          { id: 'ANOM-02', lat: -18.25, lng: 31.15, frp: 32, confidence: 'Nominal', sensor: 'MODIS' }
        ]
      }

      const doc = <TacticalDossier data={dossierData as any} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Dossier Generation Error:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      {/* Refined Contextual Header */}
      <div className="px-6 py-4 border-b bg-white dark:bg-zinc-900 z-20 border-zinc-200 dark:border-zinc-800">
        <div className="max-w-full mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <div className="space-y-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-heading font-black tracking-tighter text-zinc-900 dark:text-white uppercase leading-none">
                    Risk Intelligence HUB
                  </h1>
                  <Badge variant="outline" className="bg-orange-500 text-white border-none text-[8px] font-black tracking-[0.1em] px-1.5 py-0.5 h-3.5 animate-pulse uppercase">Predictive</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1 w-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1 w-1 bg-[#ea580c]"></span>
                    </span>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Node: RISK-ALPHA-01</span>
                  </div>
                  <span className="text-zinc-300 font-thin">|</span>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-sans">94.2% Confidence</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 mr-2">
                {[
                  { icon: Wind, val: '24', unit: 'km/h', label: 'Wind' },
                  { icon: Droplets, val: '12', unit: '%', label: 'Humidity' },
                  { icon: Thermometer, val: '34', unit: '°C', label: 'Temp' },
                ].map((w, idx) => (
                  <div key={idx} className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2.5 shadow-sm transition-all hover:bg-zinc-100">
                    <div className="p-1 rounded-md bg-orange-500/5">
                      <w.icon className="h-3 w-3 text-orange-600" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-black tracking-tight text-zinc-900 dark:text-white font-sans">{w.val}</span>
                        <span className="text-[8px] font-bold text-zinc-400">{w.unit}</span>
                      </div>
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none font-sans">{w.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 h-9 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 font-black text-[9px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-primary hover:bg-white dark:hover:bg-zinc-900 shadow-sm font-sans"
                  onClick={handleExport}
                  disabled={isGenerating}
                >
                  <Download className={`mr-2 h-3 w-3 text-primary ${isGenerating ? 'animate-pulse' : ''}`} />
                  {isGenerating ? 'Syncing...' : 'Export'}
                </Button>


                <Dialog>
                  <DialogTrigger render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 font-black text-[9px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-orange-600 hover:bg-white dark:hover:bg-zinc-900 shadow-sm font-sans"
                    >
                      <Cpu className="mr-2 h-3 w-3 text-orange-500" />
                      Neural
                    </Button>
                  } />

                  <DialogContent className="sm:max-w-[500px] bg-zinc-900/98 backdrop-blur-xl border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="relative p-8 overflow-hidden border-b border-white/5">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-30"></div>
                      <DialogTitle className="relative flex items-center gap-3 text-orange-500 font-heading font-bold tracking-tighter uppercase text-2xl">
                        <Cpu className="h-7 w-7" />
                        Neural Insights
                      </DialogTitle>
                      <DialogDescription className="relative text-zinc-400 text-xs uppercase font-black tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse"></span>
                        AI-Driven Predictive Analytics: {activeZone?.name || 'Selecting Zone...'}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Risk Trajectory</span>
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 uppercase text-[10px] font-black tracking-widest">Ascending</Badge>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                          <p className="text-xs text-zinc-300 leading-relaxed italic">
                            "Neural engine indicates a 22% increase in ignition probability for " + (activeZone?.name || 'the region') + " over the next 48 hours due to anomalous wind patterns and significant fuel load accumulation."
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-1">Stability Factor</span>
                          <span className="text-lg font-heading font-bold text-white tracking-tighter">42.8%</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-1">Threat Velocity</span>
                          <span className="text-lg font-heading font-bold text-white tracking-tighter">High</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest text-center">
                          Strategic Recommendation: Deploy aerial reconnaissance and update firebreaks in vulnerable sectors.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row bg-muted/30">
        {/* Sidebar Controls - Now Light/Consistent */}
        <div className={`${isSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[380px] opacity-100'} border-r bg-white dark:bg-zinc-950 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
          <div className="p-4 border-b flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-heading font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Vulnerability Rankings
              </h3>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-sans">Active Monitoring Matrix</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-4 text-[10px] font-black uppercase tracking-widest border-2 hover:bg-primary hover:text-white active:scale-95 transition-all font-sans"
              onClick={fetchRiskData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing...' : 'Refresh'}
            </Button>
          </div>
          <div className="flex-1 bg-zinc-50/30 dark:bg-zinc-950/30">
            <div className="p-6 grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: '700px' }}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                ))
              ) : riskZones.map((zone) => (
                <Card
                  key={zone.name}
                  className={`group cursor-pointer transition-all duration-300 relative overflow-hidden ${activeZone?.name === zone.name
                    ? 'bg-white dark:bg-zinc-900 border-[#235823] border-2 shadow-xl shadow-emerald-900/10'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#235823]/50'
                    }`}
                  onClick={() => setActiveZone(zone)}
                >
                  {activeZone?.name === zone.name && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#235823]/5 rounded-bl-full flex items-start justify-end p-2">
                      <ChevronRight className="h-4 w-4 text-[#235823]" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className={`text-sm font-heading font-black tracking-tight uppercase ${activeZone?.name === zone.name ? 'text-primary' : 'text-zinc-900'}`}>
                          {zone.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${zone.riskScore > 80 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Risk Factor: {zone.riskScore}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-heading font-bold tracking-tighter ${zone.riskScore > 80 ? 'text-red-600' : 'text-[#235823]'}`}>
                          {zone.riskScore}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {zone.factors.slice(0, 2).map((factor: string) => (
                        <Badge key={factor} variant="secondary" className="text-[8px] font-black uppercase tracking-tighter py-0.5 px-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {factor}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-400">
                        <span>Intensity</span>
                        <span>{zone.riskScore}%</span>
                      </div>
                      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${zone.riskScore > 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${zone.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </div>

        {/* Main Visualizer - Now consistent with the Map pattern */}
        <div className="flex-1 flex flex-col relative bg-zinc-100 dark:bg-zinc-900 transition-all duration-300 ease-in-out overflow-hidden">
          {activeZone && (
            <div className="absolute top-8 right-8 z-10">
              <Card className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-6 w-80 ring-1 ring-black/5 dark:ring-white/10">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Active Focus</span>
                      <h3 className="text-xl font-heading font-bold tracking-tighter uppercase text-zinc-900 dark:text-zinc-100">{activeZone?.name || 'National Overview'}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-orange-600 animate-pulse" />
                    </div>
                  </div>
                  <Separator className="bg-zinc-200 dark:bg-zinc-800" />
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Population</span>
                      </div>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{activeZone?.populationAtRisk || '---'}</span>
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="flex items-center gap-2 text-zinc-400 justify-end">
                        <Building2 className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Assets</span>
                      </div>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">12 High-Value</span>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Primary Risk Vectors</span>
                    <div className="flex flex-wrap gap-2">
                      {(activeZone?.factors || []).map((f: string) => (
                        <Badge key={f} variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 border-none transition-colors hover:bg-orange-500/10 hover:text-orange-600">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="flex-1 relative overflow-hidden bg-white dark:bg-zinc-950">
            <FireMap 
              className="h-full w-full grayscale-[0.2] contrast-[1.1]" 
              zoom={7} 
              style="satellite"
              activeLayers={{
                provinces: true,
                districts: true,
                fires: true,
                landcover: true
              }}
              riskZones={riskZones}
            />
          </div>
          <div className="h-44 border-t bg-white dark:bg-zinc-950 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Ignition Probability</span>
                  </div>
                  <span className="text-sm font-black tracking-tighter text-red-600">74.2%</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner">
                  <div className="h-full bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all duration-1000" style={{ width: '74%' }} />
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Model: TR-2026-BETA | 12h Window</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#235823]" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Moisture Profile</span>
                  </div>
                  <span className="text-sm font-black tracking-tighter text-[#235823]">18.5%</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner">
                  <div className="h-full bg-[#235823] rounded-full shadow-[0_0_15px_rgba(35,88,35,0.3)] transition-all duration-1000" style={{ width: '18%' }} />
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Status: CRITICAL DESICCATION</p>
              </div>

              <div className="flex items-center justify-center">
                <Button
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-emerald-900/20 rounded-xl group transition-all hover:scale-105 active:scale-95 font-sans"
                  onClick={handleExport}
                  disabled={isGenerating}
                >
                  <Download className="mr-3 h-4.5 w-4.5 transition-transform group-hover:rotate-12" />
                  {isGenerating ? 'Generating...' : 'Export Full Report'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
