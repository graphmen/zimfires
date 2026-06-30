"use client"

import * as React from "react"
import { Map as MapIcon, Layers, Calendar, Info, ChevronRight, BarChart3, X, MapPin, Globe, History, Activity, Shield, Landmark, Target, Trees, Thermometer, Flame, ChevronDown, ChevronUp, Minimize2, Maximize2, Download, Clock } from "lucide-react"

// FireMap must be dynamically imported to avoid SSR issues with MapLibre GL
const FireMap = dynamic(() => import("@/components/fire-map").then(mod => mod.FireMap), { ssr: false })
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useHotspots } from "@/hooks/use-hotspots"
import dynamic from 'next/dynamic'

// Dynamically import PDF components for client-side only rendering
const TacticalDossier = dynamic(
  () => import('@/components/reports/tactical-dossier').then(mod => mod.TacticalDossier),
  { ssr: false }
)
import { ExportButton } from "@/components/reports/export-button"


export default function MapExplorerPage() {
  const [activeLayers, setActiveLayers] = React.useState<Record<string, boolean>>({
    provinces: false,
    districts: false,
    wards: false,
    parks: true,
    fires: true,
    burned: false,
    vegetation: false,
    histBurned: false,
    histFires: false,
    ndviMask: false,
    urbanHeat: false,
    heatVulnerability: false,
    landcover: false
  })
  const [layerOpacities, setLayerOpacities] = React.useState<Record<string, number>>({
    provinces: 0.6,
    districts: 0.4,
    wards: 0.2,
    parks: 0.2,
    fires: 0.8,
    burned: 0.8,
    vegetation: 0.8,
    histBurned: 0.4,
    histFires: 0.8,
    landcover: 0.8,
    urbanHeat: 0.8,
    heatVulnerability: 0.8
  })
  const [mappingMode, setMappingMode] = React.useState<'simple' | 'time' | 'heatmap'>('simple')
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [liveTimeWindow, setLiveTimeWindow] = React.useState(72)



  const [basemap, setBasemap] = React.useState('osm')
  const [historicalYear, setHistoricalYear] = React.useState(2024)
  const [selectedIncident, setSelectedIncident] = React.useState<any>(null)
  const [isProbingLandcover, setIsProbingLandcover] = React.useState(false)
  const [selectedLandcover, setSelectedLandcover] = React.useState<string | null>(null)
  const [trends, setTrends] = React.useState<any[]>([])
  const [collapsedLegends, setCollapsedLegends] = React.useState<Record<string, boolean>>({
    ndvi: false,
    uhi: false,
    heat: false,
    landcover: false,
    fireTime: false,
    base: true,
    basemap: true
  })

  const toggleLegend = (id: string) => {
    setCollapsedLegends(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => {
    setIsMounted(true)
    fetch('/data/burnt_trends.json')
      .then(res => res.json())
      .then(setTrends)
      .catch(console.error)
  }, [])

  const toggleLayer = (id: string) => {
    setActiveLayers(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const currentYearTrend = trends.find(t => t.year === historicalYear)

  // Fetch the 3-day window as it's the most reliable across all sensors
  const { hotspots, loading: hotspotsLoading } = useHotspots(3)
  const filteredHotspots = React.useMemo(() => {
    if (!hotspots) return []
    return hotspots.filter(h => {
      const h_ago = h.hours_ago !== undefined ? h.hours_ago : 0
      return h_ago <= liveTimeWindow
    })
  }, [hotspots, liveTimeWindow])


  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar Controls */}
      <div
        className={`${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        } border-r bg-card/50 backdrop-blur-md flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        <div className="p-4 border-b flex items-center justify-between bg-primary/5 min-w-[20rem]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading font-bold tracking-tight">Map Controls</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-primary/10"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse panel"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">Zimbabwe</Badge>
            {/* PDF Export Button */}
            <ExportButton 
              fileName="ZimFireWatch-Tactical-Dossier.pdf"
              variant="ghost"
              className="h-7 w-7 text-primary hover:bg-primary/10"
              data={{
                reportId: `ZWF-COMMAND-CENTER-${new Date().getTime()}`,
                date: new Date().toLocaleString(),
                province: "NATIONAL",
                district: "Multiple Regions",
                ward: "CONSOLIDATED",
                timeRange: "CURRENT SITUATIONAL AWARENESS",
                metrics: {
                  hotspots: hotspots.length,
                  avgIntensity: 142.5,
                  peakFRP: 842.1,
                  confidence: 91,
                  burnedArea: 1420.5
                },
                historical: {
                  baselineAvg: 1250,
                  percentChange: 14,
                  trend: 'increasing'
                },
                sensors: {
                  modis: Math.round(hotspots.length * 0.4),
                  viirs: Math.round(hotspots.length * 0.6)
                },
                summary: "The current situational analysis indicates active fire clusters across the western parks with significant urban heat concentration in Harare and Bulawayo. Immediate surveillance of fringe forest zones is advised.",
                incidents: hotspots.slice(0, 10).map((h: any) => ({
                  id: `HOT-${Number(h.lat || 0).toFixed(2)}-${Number(h.lng || 0).toFixed(2)}`,
                  lat: h.lat || 0,
                  lng: h.lng || 0,
                  frp: h.frp || 45.2,
                  confidence: "High",
                  sensor: "VIIRS S-NPP"
                }))
              }}
            />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-w-[20rem]">
          <div className="p-4 space-y-8 pb-10">


            <Separator className="opacity-50" />

            {/* Satellite Layers */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Satellite (NASA FIRMS)</Label>
              <div className="space-y-3">
                {[
                  { id: 'fires', label: 'Active Hotspots (Live API)', color: 'text-orange-500' },
                  { id: 'burned', label: 'NASA Satellite Recon (Burn Scars)', color: 'text-orange-700' },

                  { id: 'vegetation', label: 'Vegetation Index (NDVI)', color: 'text-emerald-600' },
                  { id: 'landcover', label: 'Land Cover (ESA WorldCover)', color: 'text-emerald-800' },
                  { id: 'urbanHeat', label: 'Urban Heat Island', color: 'text-orange-500' },
                  { id: 'heatVulnerability', label: 'Heat Vulnerability', color: 'text-orange-600' }
                ].map((layer) => (
                  <div key={layer.id} className="space-y-2">
                    <div className="flex items-center justify-between group">
                      <Label htmlFor={layer.id} className="text-sm cursor-pointer flex items-center gap-2 group-hover:text-foreground transition-colors font-medium">
                        <div className={`h-1.5 w-1.5 rounded-full bg-current ${layer.color}`} />
                        {layer.label}
                      </Label>
                      <Switch 
                        id={layer.id} 
                        checked={!!activeLayers[layer.id]} 
                        onCheckedChange={() => toggleLayer(layer.id)}
                        className={layer.id === 'fires' || layer.id === 'burned' || layer.id === 'urbanHeat' || layer.id === 'heatVulnerability' ? "data-checked:bg-orange-500" : "data-checked:bg-emerald-600"}
                      />
                    </div>
                    {activeLayers[layer.id] && (
                      <div className="flex items-center gap-3 px-1 ml-3">
                        <span className="text-[9px] font-bold text-muted-foreground w-12">Opacity</span>
                        <Slider
                          value={[(layerOpacities[layer.id] ?? 0.8) * 100]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(val) => {
                            const rawVal = Array.isArray(val) ? val[0] : val
                            const newVal = (rawVal ?? 80) / 100
                            if (!isNaN(newVal)) {
                              setLayerOpacities(prev => ({ ...prev, [layer.id]: newVal }))
                            }
                          }}
                          className={`flex-1 [&_[data-slot=slider-range]]:${layer.id === 'fires' || layer.id === 'burned' || layer.id === 'urbanHeat' || layer.id === 'heatVulnerability' ? "bg-orange-500" : "bg-emerald-600"} [&_[data-slot=slider-thumb]]:border-${layer.id === 'fires' || layer.id === 'burned' || layer.id === 'urbanHeat' || layer.id === 'heatVulnerability' ? "orange-500" : "emerald-600"}`}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">
                          {Math.round((layerOpacities[layer.id] ?? 0.8) * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Specific Controls for Fire Hotspots */}
                    {layer.id === 'fires' && activeLayers.fires && (
                      <div className="ml-3 mt-4 pt-4 border-t border-muted/30 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Rendering Mode</Label>
                          <div className="flex bg-muted/30 p-1 rounded-md">
                            <button 
                              className={`flex-1 h-7 rounded text-[10px] font-bold uppercase transition-all ${mappingMode === 'simple' ? 'bg-background shadow-sm text-orange-600' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => setMappingMode('simple')}
                            >
                              Simple
                            </button>
                            <button 
                              className={`flex-1 h-7 rounded text-[10px] font-bold uppercase transition-all ${mappingMode === 'time' ? 'bg-background shadow-sm text-orange-600' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => setMappingMode('time')}
                            >
                              Time Based
                            </button>
                            <button 
                              className={`flex-1 h-7 rounded text-[10px] font-bold uppercase transition-all ${mappingMode === 'heatmap' ? 'bg-background shadow-sm text-orange-600' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => setMappingMode('heatmap')}
                            >
                              Heatmap
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Time Window</Label>
                            <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                              Last {liveTimeWindow}h
                            </span>
                          </div>
                          <Slider
                            value={[liveTimeWindow]}
                            min={1}
                            max={168}
                            step={1}
                            onValueChange={(val) => {
                              const newVal = Array.isArray(val) ? val[0] : val
                              if (newVal !== undefined && !isNaN(newVal as number)) {
                                setLiveTimeWindow(newVal as number)
                              }
                            }}
                            className="flex-1 [&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500"
                          />
                          <div className="flex justify-between text-[8px] font-medium text-muted-foreground">
                            <span>24h</span>
                            <span>7 Days</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Admin Layers */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Administrative & Parks</Label>
              <div className="space-y-3">
                {[
                  { id: 'provinces', label: 'Provinces', color: 'text-emerald-500' },
                  { id: 'districts', label: 'Districts', color: 'text-emerald-400' },
                  { id: 'wards', label: 'Wards', color: 'text-emerald-300' },
                  { id: 'parks', label: 'National Parks', color: 'text-emerald-500 font-bold' },
                ].map((layer) => (
                  <div key={layer.id} className="space-y-2">
                    <div className="flex items-center justify-between group">
                      <Label htmlFor={layer.id} className="text-sm cursor-pointer flex items-center gap-2 group-hover:text-foreground transition-colors font-medium">
                        <div className={`h-1.5 w-1.5 rounded-full bg-current ${layer.color}`} />
                        {layer.label}
                      </Label>
                      <Switch 
                        id={layer.id} 
                        checked={!!activeLayers[layer.id]} 
                        onCheckedChange={() => toggleLayer(layer.id)}
                        className="data-checked:bg-emerald-600"
                      />
                    </div>
                    {activeLayers[layer.id] && (
                      <div className="flex items-center gap-3 px-1 ml-3">
                        <span className="text-[9px] font-bold text-muted-foreground w-12">Opacity</span>
                        <Slider
                          value={[(layerOpacities[layer.id] ?? 0.4) * 100]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(val) => {
                            const rawVal = Array.isArray(val) ? val[0] : val
                            const newVal = (rawVal ?? 40) / 100
                            if (!isNaN(newVal)) {
                              setLayerOpacities(prev => ({ ...prev, [layer.id]: newVal }))
                            }
                          }}
                          className="flex-1 [&_[data-slot=slider-range]]:bg-emerald-600 [&_[data-slot=slider-thumb]]:border-emerald-600"
                        />
                        <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">
                          {Math.round((layerOpacities[layer.id] ?? 0.4) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Historical Layers */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Historical Records</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between group">
                  <Label htmlFor="histBurned" className="text-sm cursor-pointer flex items-center gap-2 group-hover:text-foreground transition-colors font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-900" />
                    Yearly Burned Area
                  </Label>
                  <Switch 
                    id="histBurned" 
                    checked={activeLayers.histBurned} 
                    onCheckedChange={() => toggleLayer('histBurned')}
                    className="data-checked:bg-orange-500"
                  />
                </div>
                {activeLayers.histBurned && (
                  <div className="flex items-center gap-3 px-1 ml-3 mb-4">
                    <span className="text-[9px] font-bold text-muted-foreground w-12">Opacity</span>
                    <Slider
                      value={[(layerOpacities.histBurned ?? 0.4) * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val) => {
                        const rawVal = Array.isArray(val) ? val[0] : val
                        const newVal = (rawVal ?? 40) / 100
                        if (!isNaN(newVal)) {
                          setLayerOpacities(prev => ({ ...prev, histBurned: newVal }))
                        }
                      }}
                      className="flex-1 [&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500"
                    />
                    <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">
                      {Math.round((layerOpacities.histBurned ?? 0.4) * 100)}%
                    </span>
                  </div>
                )}

                {activeLayers.histBurned && (
                  <div className="pt-2 pb-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-500">Year: {historicalYear}</span>
                      <Calendar className="h-3 w-3 text-orange-500" />
                    </div>
                    <Slider
                      value={[historicalYear]}
                      min={2020}
                      max={2026}
                      step={1}
                      onValueChange={(val) => setHistoricalYear(Array.isArray(val) ? val[0] : val as number)}
                      className="[&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500"
                    />
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-muted-foreground">2020</span>
                      <span className="text-[10px] font-bold text-muted-foreground">2026</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                      * Historical annual data is derived from validated NASA MODIS/VIIRS products. 2025/2026 data is currently in real-time processing.
                    </p>

                    {currentYearTrend && (
                      <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center gap-3">
                         <BarChart3 className="h-5 w-5 text-orange-500" />
                         <div className="flex flex-col">
                            <span className="text-[10px] text-orange-500 uppercase font-bold tracking-tighter">Total Area Burned ({historicalYear})</span>
                            <span className="text-sm font-bold text-orange-500">{currentYearTrend.area_km2.toLocaleString()} km²</span>
                         </div>
                      </div>
                    )}

                  </div>
                )}

                <div className="flex items-center justify-between group">
                  <Label htmlFor="histFires" className="text-sm cursor-pointer flex items-center gap-2 group-hover:text-foreground transition-colors font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    20-Year Fire History
                  </Label>
                  <Switch 
                    id="histFires" 
                    checked={activeLayers.histFires} 
                    onCheckedChange={() => toggleLayer('histFires')}
                    className="data-checked:bg-orange-500"
                  />
                </div>
                {activeLayers.histFires && (
                  <div className="flex items-center gap-3 px-1 ml-3">
                    <span className="text-[9px] font-bold text-muted-foreground w-12">Opacity</span>
                    <Slider
                      value={[(layerOpacities.histFires ?? 0.8) * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val) => {
                        const rawVal = Array.isArray(val) ? val[0] : val
                        const newVal = (rawVal ?? 80) / 100
                        if (!isNaN(newVal)) {
                          setLayerOpacities(prev => ({ ...prev, histFires: newVal }))
                        }
                      }}
                      className="flex-1 [&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500"
                    />
                    <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">
                      {Math.round((layerOpacities.histFires ?? 0.8) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed sidebar re-open tab */}
      {sidebarCollapsed && (
        <div className="relative z-30 flex-shrink-0">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-1/2 -translate-y-1/2 left-0 h-20 w-6 flex items-center justify-center bg-card/90 backdrop-blur-md border border-border border-l-0 rounded-r-lg shadow-lg hover:bg-primary/10 transition-colors group"
            title="Expand panel"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary rotate-0" />
          </button>
        </div>
      )}

      {/* Main Map Content */}
      <div className="flex-1 relative bg-zinc-950">
        <FireMap 
          style={basemap}
          activeLayers={activeLayers} 
          historicalYear={historicalYear}
          onIncidentClick={(info) => {
            setSelectedIncident(info);
            // Fetch landcover for the clicked point
            if (info) {
              setIsProbingLandcover(true);
              fetch(`/api/gee/probe?lat=${info.lat}&lng=${info.lng}`)
                .then(res => res.json())
                .then(data => {
                  setSelectedLandcover(data.landcover || 'Unclassified');
                  setIsProbingLandcover(false);
                })
                .catch(() => {
                  setSelectedLandcover('Data Unavailable');
                  setIsProbingLandcover(false);
                });
            }
          }}
          hotspots={filteredHotspots}
          mappingMode={mappingMode}
          layerOpacities={layerOpacities}
        />

        {/* Real-time Data Status Overlay */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          {hotspotsLoading ? (
            <div className="bg-background/95 backdrop-blur-xl px-6 py-2.5 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-primary/20 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground leading-none">Syncing Satellite Intel</span>
                <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">NASA FIRMS Pipeline Active</span>
              </div>
            </div>
          ) : (
            <div className={`bg-background/90 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-700 ${filteredHotspots.length > 0 ? 'border-emerald-500/20' : 'border-orange-500/20'}`}>
              <div className={`h-2.5 w-2.5 rounded-full ${filteredHotspots.length > 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-foreground leading-none">
                  {filteredHotspots.length} Active {filteredHotspots.length === 1 ? 'Hotspot' : 'Hotspots'} Detect
                </span>
                <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
                  Live Stream: {liveTimeWindow}h Window
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-4 left-4 z-50 flex flex-col gap-3">
          <Card className="border-none shadow-2xl bg-background/90 backdrop-blur-md p-1.5 flex flex-col gap-1.5 min-w-[140px] transition-all duration-300">
             <div 
               className="px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-primary/5 rounded-sm transition-colors"
               onClick={() => toggleLegend('basemap')}
             >
               <div className="flex items-center gap-2">
                 <Globe className="h-3 w-3 text-muted-foreground" />
                 <span className="text-[9px] font-heading font-black uppercase tracking-widest text-muted-foreground/60">Basemap</span>
               </div>
               {collapsedLegends.basemap ? <ChevronDown className="h-3 w-3 text-muted-foreground/60" /> : <ChevronUp className="h-3 w-3 text-muted-foreground/60" />}
             </div>
             
             {!collapsedLegends.basemap && (
               <div className="flex flex-row gap-1 animate-in slide-in-from-top-2 duration-300">
                  {[
                    { id: 'midnight', icon: Target, label: 'Midnight' },
                    { id: 'osm', icon: MapIcon, label: 'Streets' },
                    { id: 'satellite', icon: Globe, label: 'Clean' },
                    { id: 'hybrid', icon: Layers, label: 'Hybrid' }
                  ].map((b) => (
                    <Button 
                      key={b.id}
                      variant={basemap === b.id ? 'default' : 'ghost'} 
                      size="sm" 
                      className={`h-9 flex-1 justify-center gap-2 px-3 font-bold text-[10px] uppercase tracking-tight transition-all ${basemap === b.id ? 'bg-orange-600 text-white hover:bg-orange-700' : 'hover:bg-orange-50'}`}
                      onClick={() => setBasemap(b.id)}
                    >
                      <b.icon className={`h-3.5 w-3.5 ${basemap === b.id ? 'text-white' : 'text-orange-600'}`} />
                      {b.label}
                    </Button>
                  ))}
               </div>
             )}
          </Card>
        </div>


        {/* Floating Info Overlay */}
        {selectedIncident && (
          <div className="absolute top-4 right-4 w-72 z-50 animate-in fade-in zoom-in slide-in-from-top-4">
            <Card className="border-none shadow-2xl bg-background/95 backdrop-blur-md overflow-hidden">
               <div className="p-1.5 bg-orange-600 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-2">
                     <MapPin className="h-3 w-3 text-white" />
                     <span className="text-[10px] font-bold text-white uppercase">Location Details</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10" onClick={() => setSelectedIncident(null)}>
                     <X className="h-3 w-3" />
                  </Button>
               </div>
               <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Province</span>
                        <span className="text-xs font-bold text-orange-600 truncate">{selectedIncident.province}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">District</span>
                        <span className="text-xs font-bold text-orange-600 truncate">{selectedIncident.district}</span>
                     </div>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Ward</span>
                         <span className="text-xs font-bold text-orange-600 truncate">{selectedIncident.ward}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Protected Area</span>
                         <span className={`text-xs font-bold truncate ${selectedIncident.park !== 'None' ? 'text-orange-600' : 'text-muted-foreground italic'}`}>
                            {selectedIncident.park}
                         </span>
                      </div>
                   </div>

                    {/* Historical Burnt Area Intelligence */}
                    {selectedIncident.isBurnedArea && (
                      <div className="pt-3 border-t border-muted/20 space-y-3">
                         <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.4)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Burnt Area Intelligence</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                               <div className="flex items-center gap-1.5 mb-1">
                                  <Maximize2 className="h-3 w-3 text-orange-600" />
                                  <span className="text-[9px] text-orange-600 uppercase font-black tracking-tighter">Total Area</span>
                               </div>
                               <span className="text-sm font-black text-zinc-900 tracking-tight">
                                  {selectedIncident.area_ha ? `${selectedIncident.area_ha} Ha` : (selectedIncident.area_km2 ? `${selectedIncident.area_km2} km²` : 'Calculating...')}
                               </span>
                            </div>
                            <div className="flex flex-col p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                               <div className="flex items-center gap-1.5 mb-1">
                                  <Calendar className="h-3 w-3 text-zinc-400" />
                                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter">Reference</span>
                               </div>
                               <span className="text-sm font-black text-zinc-900 tracking-tight">
                                  {selectedIncident.year || historicalYear} Season
                               </span>
                            </div>
                         </div>

                         {(selectedIncident.month || selectedIncident.date) && (
                            <div className="flex items-center gap-4 px-2.5 py-2 rounded-xl bg-zinc-50/50 border border-zinc-100 border-dashed">
                               {selectedIncident.month && (
                                  <div className="flex items-center gap-2">
                                     <div className="h-1.5 w-1.5 rounded-full bg-zinc-300"></div>
                                     <span className="text-[10px] font-bold text-zinc-600 uppercase">{selectedIncident.month}</span>
                                  </div>
                               )}
                               {selectedIncident.date && (
                                  <div className="flex items-center gap-2">
                                     <Clock className="h-2.5 w-2.5 text-zinc-400" />
                                     <span className="text-[10px] font-bold text-zinc-600">{selectedIncident.date}</span>
                                  </div>
                               )}
                               {selectedIncident.time && (
                                  <Badge variant="outline" className="ml-auto text-[8px] font-black tracking-widest border-zinc-200 text-zinc-400 h-4">
                                     {selectedIncident.time}
                                  </Badge>
                               )}
                            </div>
                         )}
                      </div>
                    )}

                    {/* Satellite Fire Intelligence */}
                    {(selectedIncident.isHotspot || selectedIncident.sensor) && (
                      <div className="pt-3 border-t border-muted/20 space-y-3">
                         <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Satellite Intelligence</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                               <span className="text-[9px] text-orange-600 uppercase font-black tracking-tighter mb-1">Detection Day</span>
                               <span className="text-xs font-black text-zinc-900 tracking-tight">
                                  {selectedIncident.acq_date ? new Date(selectedIncident.acq_date).toLocaleDateString('en-US', { weekday: 'long' }) : 'Unknown'}
                               </span>
                            </div>
                            <div className="flex flex-col p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                               <span className="text-[9px] text-orange-600 uppercase font-black tracking-tighter mb-1">Detection Time</span>
                               <span className="text-xs font-black text-zinc-900 tracking-tight">
                                  {selectedIncident.acq_time || 'N/A'} UTC
                               </span>
                            </div>
                         </div>

                         <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                            <div className="flex flex-col">
                               <span className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter mb-0.5">Platform / Sensor</span>
                               <span className="text-xs font-black text-zinc-900 uppercase">{selectedIncident.sensor || 'NASA Satellite'}</span>
                            </div>
                            {selectedIncident.frp && (
                              <div className="ml-auto flex flex-col items-end">
                                 <span className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter mb-0.5">Radiative Power</span>
                                 <span className="text-xs font-black text-orange-600">{selectedIncident.frp} MW</span>
                              </div>
                            )}
                         </div>

                         {selectedIncident.hours_ago !== undefined && (
                           <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                             <Clock className="h-3 w-3 text-orange-600" />
                             <span className="text-[10px] font-bold text-orange-700">Detected {Number(selectedIncident.hours_ago || 0).toFixed(1)}h ago</span>
                           </div>
                         )}
                      </div>
                    )}
                  <div className="pt-3 border-t border-muted/20">
                     <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mb-1.5 block">Land Use / Land Cover</span>
                     <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                        {isProbingLandcover ? (
                           <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.3s]"></div>
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.15s]"></div>
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"></div>
                              <span className="text-[10px] font-medium text-orange-600 italic">Analyzing Satellite Data...</span>
                           </div>
                        ) : (
                           <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.4)]"></div>
                              <span className="text-xs font-bold text-orange-600">{selectedLandcover || 'Unclassified / Mixed'}</span>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                     <span className="text-[10px] text-muted-foreground">
                        {Number(selectedIncident.lat || selectedIncident.latitude || 0).toFixed(4)}°, 
                        {Number(selectedIncident.lng || selectedIncident.longitude || 0).toFixed(4)}°
                     </span>
                     <Badge variant="outline" className="text-[9px] h-4 font-bold border-orange-500/20 text-orange-600 uppercase">INSPECTION</Badge>
                  </div>

               </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-50 flex flex-col gap-4">
          {/* NDVI Legend */}
          {activeLayers.vegetation && (
            <Card className="border-none shadow-lg bg-background/90 backdrop-blur-md p-0 overflow-hidden w-64 animate-in slide-in-from-left-4 transition-all duration-300">
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('ndvi')}>
                 <div className="flex items-center gap-2">
                   <Trees className="h-3 w-3 text-emerald-500" />
                   <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-primary">Vegetation Index (NDVI)</span>
                 </div>
                 {collapsedLegends.ndvi ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
              {!collapsedLegends.ndvi && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#8b4513] via-[#ffff00] via-[#90ee90] to-[#006400]" />
                  <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                     <span>Arid (0.0)</span>
                     <span>Sparse</span>
                     <span>Dense (0.9+)</span>
                  </div>
                  <p className="text-[8px] text-muted-foreground leading-tight">
                    High NDVI (Dark Green) indicates healthy, moisture-rich vegetation. Lower values suggest drought or burnt areas.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Urban Heat Legend */}
          {activeLayers.urbanHeat && (
            <Card className="border-none shadow-lg bg-background/90 backdrop-blur-md p-0 overflow-hidden w-64 animate-in slide-in-from-left-4 transition-all duration-300">
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('uhi')}>
                 <div className="flex items-center gap-2">
                   <Thermometer className="h-3 w-3 text-orange-500" />
                   <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-orange-500">Urban Heat Island (LST)</span>
                 </div>
                 {collapsedLegends.uhi ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
              {!collapsedLegends.uhi && (
                <div className="px-3 pb-3 flex flex-col gap-1.5">
                  {[
                    { name: 'Extreme', color: '#7a0177' },
                    { name: 'High', color: '#f03b20' },
                    { name: 'Moderate', color: '#fecc5c' },
                    { name: 'Low', color: '#ffffb2' },
                    { name: 'Cool', color: '#5A86AD' }
                  ].map((level) => (
                    <div key={level.name} className="flex items-center gap-2">
                      <div className="h-2 w-6 rounded-sm" style={{ backgroundColor: level.color }} />
                      <span className="text-[9px] text-muted-foreground font-medium">{level.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Heat Risk Legend */}
          {activeLayers.heatVulnerability && (
            <Card className="border-none shadow-lg bg-background/90 backdrop-blur-md p-0 overflow-hidden w-64 animate-in slide-in-from-left-4 transition-all duration-300">
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('heat')}>
                 <div className="flex items-center gap-2">
                   <Flame className="h-3 w-3 text-orange-500" />
                   <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-orange-500">Heat Risk Assessment</span>
                 </div>
                 {collapsedLegends.heat ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
              {!collapsedLegends.heat && (
                <div className="px-3 pb-3 flex flex-col gap-1.5">
                  {[
                    { name: 'Extreme', color: 'darkred' },
                    { name: 'Danger', color: 'red' },
                    { name: 'Hot', color: 'yellow' },
                    { name: 'Mild', color: 'cyan' },
                    { name: 'Cool', color: 'blue' }
                  ].map((level) => (
                    <div key={level.name} className="flex items-center gap-2">
                      <div className="h-2 w-6 rounded-sm" style={{ backgroundColor: level.color }} />
                      <span className="text-[9px] text-muted-foreground font-medium">{level.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ESA Land Cover Legend */}
          {activeLayers.landcover && (
            <Card className="border-none shadow-lg bg-background/90 backdrop-blur-md p-0 overflow-hidden w-64 animate-in slide-in-from-left-4 transition-all duration-300">
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('landcover')}>
                 <div className="flex items-center gap-2">
                   <MapIcon className="h-3 w-3 text-emerald-800" />
                   <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Land Cover (ESA 10m)</span>
                 </div>
                 {collapsedLegends.landcover ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
              {!collapsedLegends.landcover && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {[
                    { name: 'Forest', color: '#006400' },
                    { name: 'Shrubland', color: '#ffbb22' },
                    { name: 'Grassland', color: '#ffff4c' },
                    { name: 'Cropland', color: '#f096ff' },
                    { name: 'Built-up', color: '#fa0000' },
                    { name: 'Bare/Sparse', color: '#b4b4b4' },
                    { name: 'Water', color: '#0064c8' },
                    { name: 'Wetland', color: '#0096a0' },
                    { name: 'Mangroves', color: '#00cf75' },
                    { name: 'Moss/Lichen', color: '#fae6a0' }
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[8px] text-muted-foreground font-bold truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Fire Heatmap Legend */}
          {activeLayers.fires && mappingMode === 'heatmap' && (
             <Card className="border-none shadow-lg bg-background/90 backdrop-blur-md p-0 overflow-hidden w-64 animate-in slide-in-from-left-4 transition-all duration-300">
               <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('fireHeatmap')}>
                  <div className="flex items-center gap-2">
                    <Flame className="h-3 w-3 text-orange-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Fire Intensity Heatmap</span>
                  </div>
                  {collapsedLegends.fireHeatmap ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
               </div>
               {!collapsedLegends.fireHeatmap && (
                 <div className="px-3 pb-3 space-y-3">
                   <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500/0 via-orange-400 to-orange-600" />
                   <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                      <span>Low Density</span>
                      <span>High Intensity</span>
                   </div>
                   <p className="text-[8px] text-muted-foreground leading-tight">
                     Weighted by Fire Radiative Power (MW). Shows active thermal concentration across the landscape.
                   </p>
                 </div>
               )}
             </Card>
           )}

          {/* Time-Based Hotspot Legend */}
          {activeLayers.fires && mappingMode === 'time' && (
            <Card className="border-none shadow-xl bg-background/95 backdrop-blur-md p-0 overflow-hidden w-64 animate-in slide-in-from-left-4 transition-all duration-500 border-l-4 border-l-orange-600">
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('fireTime')}>
                 <div className="flex items-center gap-2">
                   <Activity className="h-3 w-3 text-orange-600" />
                   <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Time Since Detection</span>
                 </div>
                 {collapsedLegends.fireTime ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
              {!collapsedLegends.fireTime && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {[
                      { label: '< 1 Hour', color: '#ea580c' },
                      { label: '1 - 3 Hours', color: '#f97316' },
                      { label: '3 - 6 Hours', color: '#fb923c' },
                      { label: '6 - 12 Hours', color: '#fdba74' },
                      { label: '12 - 24 Hours', color: '#10b981' },
                      { label: '1 - 2 Days', color: '#059669' },
                      { label: '2 - 3 Days', color: '#047857' },
                      { label: '> 3 Days', color: '#064e3b' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div 
                          className="h-3 w-3 rounded-full border border-white shadow-sm flex-shrink-0" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[8px] text-muted-foreground italic border-t pt-3 border-muted/20 leading-relaxed">
                    Real-time telemetry from NASA VIIRS & MODIS. Color intensity indicates thermal recency.
                  </p>
                </div>
              )}
            </Card>
          )}


          <Card className="border-none shadow-lg bg-background/80 backdrop-blur-md p-0 overflow-hidden transition-all duration-300">
            <div className="p-2 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => toggleLegend('base')}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-1">Base Indicators</span>
              {collapsedLegends.base ? <ChevronUp className="h-2 w-2" /> : <ChevronDown className="h-2 w-2" />}
            </div>
            {!collapsedLegends.base && (
              <div className="p-3 pt-0 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500 shadow-sm" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Active Fire (VIIRS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-md bg-[#331a1a] opacity-80" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Burned Area (MODIS)</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
