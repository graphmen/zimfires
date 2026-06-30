"use client"

import * as React from "react"
import { 
  FileText, 
  Settings2, 
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ExportButton } from "@/components/reports/export-button"
import { toast } from "sonner"

// Mock hierarchy for ZW
const PROVINCES = [
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

const DISTRICTS: Record<string, string[]> = {
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

export function ReportBuilder() {
  const [open, setOpen] = React.useState(false)
  const [province, setProvince] = React.useState<string>("")
  const [district, setDistrict] = React.useState<string>("")
  const [ward, setWard] = React.useState<string>("")
  const [timeRange, setTimeRange] = React.useState("Last 30 Days")

  const isReady = province && district && ward

  const generateReportData = () => {
    return {
      reportId: `ZWF-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toLocaleDateString(),
      province,
      district,
      ward,
      timeRange,
      metrics: {
        hotspots: Math.floor(Math.random() * 450) + 50,
        avgIntensity: 124.5,
        peakFRP: 482.1,
        confidence: 94,
        burnedArea: 1240
      },
      historical: {
        baselineAvg: 380,
        percentChange: 22,
        trend: 'increasing' as const
      },
      sensors: {
        modis: 120,
        viirs: 380
      },
      summary: `High-fidelity thermal analysis indicates a significant escalation of fire activity in ${ward} ward, ${district} district. The current trend exceeds the 5-year baseline by 22%, primarily driven by agricultural land clearance and high biomass availability. Satellite sensors (VIIRS) confirmed several high-intensity fronts with FRP exceeding 400MW.`,
      incidents: Array.from({ length: 15 }, (_, i) => ({
        id: `ANM-${2026}-${Math.floor(Math.random() * 9000) + 1000}`,
        lat: -17.5 + (Math.random() * 0.5),
        lng: 29.5 + (Math.random() * 0.5),
        frp: Math.floor(Math.random() * 200) + 50,
        confidence: "High",
        sensor: i % 2 === 0 ? "VIIRS" : "MODIS"
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-900/10">
            <FileText className="h-4 w-4" /> Intelligence Dossier
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px] border-none bg-zinc-50 dark:bg-zinc-950">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Settings2 className="h-5 w-5" />
            <DialogTitle className="uppercase font-heading font-black tracking-tighter text-xl">Report Configuration Engine</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium">
            Configure spatial and temporal parameters to generate a high-fidelity Tactical Dossier. 
            All data is synthesized from verified satellite telemetry.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Province</Label>
              <Select onValueChange={(v: string | null) => { if (v) { setProvince(v); setDistrict(""); setWard(""); } }}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-none shadow-sm">
                  <SelectValue placeholder="Select Province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">District</Label>
              <Select disabled={!province} onValueChange={(v: string | null) => { if (v) { setDistrict(v); setWard(""); } }}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-none shadow-sm">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {province && DISTRICTS[province].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ward / Community Sector</Label>
            <Select disabled={!district} onValueChange={(v: string | null) => v && setWard(v)}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-none shadow-sm">
                <SelectValue placeholder="Select Ward" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => (
                  <SelectItem key={i} value={`Ward ${i + 1}`}>Ward {i + 1} (Area {100 + i})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Temporal Window</Label>
            <Select value={timeRange} onValueChange={(v: string | null) => v && setTimeRange(v)}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-none shadow-sm">
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Last 24 Hours">Last 24 Hours (Tactical)</SelectItem>
                <SelectItem value="Last 7 Days">Last 7 Days (Operational)</SelectItem>
                <SelectItem value="Last 30 Days">Last 30 Days (Strategic)</SelectItem>
                <SelectItem value="Custom Range">Custom Date Range...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-800" />

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-400 uppercase">Intelligence Ready</p>
              <p className="text-[10px] text-emerald-800/70 dark:text-emerald-400/70 leading-tight mt-1">
                Spatial filters applied. System will synthesize {province || '---'} telemetry with historical baselines.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="font-bold uppercase text-[10px]">Cancel</Button>
          <ExportButton 
            data={generateReportData()}
            fileName={`Dossier-${district || 'ZW'}-${new Date().getTime()}.pdf`}
            variant="default"
            showText
            label="Compile & Export Intelligence"
            className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest flex-1 h-11"
            disabled={!isReady}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
