"use client"

import * as React from "react"
import { 
  Download, 
  Map as MapIcon, 
  Database, 
  FileJson, 
  Search, 
  Archive, 
  Layers, 
  Globe, 
  Activity,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Flame,
  TreePine,
  ThermometerSun,
  LayoutDashboard
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Dataset {
  id: string;
  name: string;
  description: string;
  format: string;
  size: string;
  category: string;
  type: 'root' | 'burnt' | 'gee';
  file?: string;
}

const datasets: Dataset[] = [
  // Administrative
  { id: 'districts', name: 'District Boundaries', description: 'National district polygons of Zimbabwe.', format: 'GeoJSON', size: '628 KB', category: 'Administrative', type: 'root', file: 'District.geojson' },
  { id: 'provinces', name: 'Provincial Boundaries', description: 'High-resolution provincial administration limits.', format: 'GeoJSON', size: '274 KB', category: 'Administrative', type: 'root', file: 'Provincial.geojson' },
  { id: 'wards', name: 'Ward Boundaries', description: 'Detailed ward-level administrative polygons.', format: 'GeoJSON', size: '27.6 MB', category: 'Administrative', type: 'root', file: 'Wards.geojson' },
  { id: 'parks', name: 'National Parks & Safaris', description: 'ZPWMA managed protected areas and boundaries.', format: 'GeoJSON', size: '863 KB', category: 'Administrative', type: 'root', file: 'parks.geojson' },

  // Fire Intelligence
  { id: 'active-fires', name: 'Active Fire Hotspots', description: 'Current detection hotspots (MODIS/VIIRS).', format: 'GeoJSON', size: '2.1 MB', category: 'Fire Intelligence', type: 'root', file: 'fires.geojson' },
  { id: 'burned-areas', name: 'Cumulative Burned Areas', description: 'Seasonal fire scars and impact mapping.', format: 'GeoJSON', size: '2.4 MB', category: 'Fire Intelligence', type: 'root', file: 'burned_areas.geojson' },
  { id: 'fire-trends', name: 'Historical Fire Trends', description: 'Annual count statistics from 2001-2024.', format: 'JSON', size: '1 KB', category: 'Fire Intelligence', type: 'root', file: 'historical_trend.json' },

  // GEE Datasets (Requested placeholders/Future)
  { id: 'ndvi', name: 'NDVI Vegetation Index', description: 'Normalized Difference Vegetation Index (Terra/MODIS).', format: 'GeoTIFF/CSV', size: 'Dynamic', category: 'Environmental', type: 'gee' },
  { id: 'lulc', name: 'Landcover Classification', description: 'ESA WorldCover 10m global land cover product.', format: 'GeoTIFF/CSV', size: 'Dynamic', category: 'Environmental', type: 'gee' },
  { id: 'uhi', name: 'Urban Heat Island (UHI)', description: 'Surface Urban Heat Island intensity mapping.', format: 'GeoTIFF/CSV', size: 'Dynamic', category: 'Climate', type: 'gee' },
  { id: 'heat-vuln', name: 'Heat Vulnerability Index', description: 'Integrated climate and socioeconomic vulnerability.', format: 'GeoJSON', size: 'Dynamic', category: 'Climate', type: 'gee' },
  { id: 'landcover-stats', name: 'Land Cover Statistics', description: 'Tabular area breakdown by cover type.', format: 'CSV/PDF', size: '154 KB', category: 'Environmental', type: 'root', file: 'landcover_stats.csv' },
];

// Historical Archives (2001-2024)
const historicalArchives: Dataset[] = Array.from({ length: 24 }, (_, i) => {
  const year = 2001 + i;
  return {
    id: `fire-${year}`,
    name: `Zimbabwe Fire Archive ${year}`,
    description: `Historical fire scar records for the ${year} season.`,
    format: 'GeoJSON',
    size: '3-5 MB',
    category: 'Historical Archive',
    type: 'burnt',
    file: `Zimbabwe_Fire_${year}.geojson`
  } as Dataset;
}).reverse();

export function DataPortal({ children }: { children: React.ReactElement }) {
  const [search, setSearch] = React.useState("")
  const [downloading, setDownloading] = React.useState<string | null>(null)
  const [completed, setCompleted] = React.useState<string | null>(null)

  const handleDownload = async (dataset: Dataset) => {
    if (dataset.type === 'gee') {
      alert("This satellite dataset requires custom regional clipping. Please contact the ZINGSA data team for a specific export.")
      return
    }

    setDownloading(dataset.id)
    try {
      const response = await fetch(`/api/download?file=${dataset.file}&type=${dataset.type}`)
      if (!response.ok) throw new Error("Download failed")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dataset.file!
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      setCompleted(dataset.id)
      setTimeout(() => setCompleted(null), 3000)
    } catch (error: any) {
      console.error('[Download Error]', error);
      alert(`Download Failed: ${error.message || 'Unknown Error'}. Please ensure the server is responding on port 3001 and the file exists.`);
    } finally {
      setDownloading(null)
    }
  }

  const filteredDatasets = datasets.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = historicalArchives.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[850px] h-[85vh] bg-white border-zinc-200 text-zinc-900 p-0 overflow-hidden shadow-2xl flex flex-col rounded-3xl">
        <DialogHeader className="p-6 border-b border-primary/20 bg-primary relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md shadow-lg shadow-black/5">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none">Intelligence Hub</DialogTitle>
              <DialogDescription className="text-white/80 text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5">Foundational & Strategic Archives</DialogDescription>
            </div>
          </div>
          <div className="relative z-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
            <Input 
              placeholder="Search Intelligence Hub..." 
              className="pl-11 bg-black/10 border-white/30 text-white placeholder:text-white/50 focus-visible:ring-white/40 h-11 rounded-2xl text-[11px] font-medium tracking-tight transition-all backdrop-blur-md shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </DialogHeader>

        <Tabs defaultValue="standard" className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200/80 shrink-0">
            <TabsList className="bg-zinc-200/50 p-1.5 rounded-2xl h-auto flex w-fit gap-2">
              <TabsTrigger 
                value="standard" 
                className="rounded-xl px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-zinc-500 hover:text-primary"
              >
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current"></div>
                  Foundational
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-xl px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-600/20 text-zinc-500 hover:text-orange-600"
              >
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current"></div>
                  Archives (01-24)
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="standard" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 md:p-8 space-y-12">
                {/* Categorized Layout */}
                {['Administrative', 'Fire Intelligence', 'Environmental', 'Climate'].map(cat => {
                  const catDatasets = filteredDatasets.filter(d => d.category === cat)
                  if (catDatasets.length === 0) return null
                  
                  return (
                    <div key={cat} className="space-y-6">
                      <div className="flex items-center gap-4">
                         <div className={`h-6 w-1.5 rounded-full ${cat === 'Fire Intelligence' ? 'bg-orange-500' : 'bg-primary'}`}></div>
                         <span className="text-[12px] font-black uppercase tracking-[0.4em] text-zinc-400">{cat}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {catDatasets.map(dataset => (
                          <DatasetCard 
                            key={dataset.id} 
                            dataset={dataset} 
                            onDownload={handleDownload}
                            downloading={downloading === dataset.id}
                            completed={completed === dataset.id}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredHistory.map(dataset => (
                    <DatasetCard 
                      key={dataset.id} 
                      dataset={dataset} 
                      onDownload={handleDownload}
                      downloading={downloading === dataset.id}
                      completed={completed === dataset.id}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-6 bg-white border-t border-zinc-200 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-20">
           <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                 <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(35,88,35,0.4)]"></div>
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.1em]">Verified Integrity</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold tracking-tight">Support: <span className="text-primary">geospatial@zingsa.ac.zw</span></p>
           </div>
           <Button 
            variant="default" 
            size="sm" 
            onClick={() => window.open('mailto:geospatial@zingsa.ac.zw?subject=Custom Data Export Request')}
            className="h-9 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
           >
             Custom Clipping
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DatasetCard({ dataset, onDownload, downloading, completed }: { 
  dataset: Dataset, 
  onDownload: (d: Dataset) => void,
  downloading: boolean,
  completed: boolean
}) {
  const Icon = dataset.category === 'Fire Intelligence' ? Flame : 
               dataset.category === 'Environmental' ? TreePine :
               dataset.category === 'Climate' ? ThermometerSun : 
               MapIcon

  return (
    <div className="group relative bg-zinc-50/40 border border-zinc-100 rounded-2xl p-5 transition-all hover:bg-white hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-orange-50 border border-orange-100 text-orange-500 transition-all group-hover:scale-110 group-hover:shadow-orange-500/10">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-900 group-hover:text-primary transition-colors">{dataset.name}</h4>
            <p className="text-[11px] text-zinc-500 leading-snug font-medium line-clamp-2">{dataset.description}</p>
            <div className="flex items-center gap-3 mt-4">
              <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-500 text-[9px] font-black tracking-widest uppercase rounded-lg h-5 px-2 group-hover:border-primary/30">
                {dataset.format}
              </Badge>
              <span className="text-[10px] text-zinc-400 font-bold tracking-tight">{dataset.size}</span>
              {dataset.type === 'gee' && (
                <Badge className="bg-orange-500 text-white border-none text-[8px] font-black h-4 px-1.5 uppercase tracking-tighter">SATELLITE API</Badge>
              )}
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          disabled={downloading}
          onClick={() => onDownload(dataset)}
          className={`h-10 w-10 rounded-xl transition-all shadow-sm ${
            completed 
              ? 'bg-primary/10 text-primary border-primary/30' 
              : 'bg-white text-zinc-600 hover:bg-primary hover:text-white border-zinc-200 hover:border-primary/30'
          } border active:scale-90`}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : completed ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
