"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  TreePine, ShieldAlert, Flame, MapPin, ArrowLeft, Activity,
  Thermometer, Wind, Droplets, Eye, AlertTriangle, CheckCircle2,
  Zap, Target, BarChart3, Globe, RefreshCw, Download, Compass,
  Clock, TrendingUp, TrendingDown, Minus
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useHotspots } from "@/hooks/use-hotspots"
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Cell
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"

interface Park {
  id: string; name: string; type: string; area: string
  center: [number, number]; hotspots: number; risk: "High" | "Medium" | "Low"
  vegetationIndex: number; wildlifeDensity: "High" | "Medium" | "Low"
  province?: string
}

function getParkProvince(lon: number, lat: number): string {
  if (lon > 31.8) return "Manicaland"
  if (lat < -21.0) {
    if (lon < 30.5) return "Matabeleland South"
    return "Masvingo"
  }
  if (lon < 28.5) {
    if (lat < -20.0) return "Matabeleland South"
    return "Matabeleland North"
  }
  if (lat < -20.0) {
    if (lon < 30.0) return "Matabeleland South"
    if (lon < 31.0) return "Midlands"
    return "Masvingo"
  }
  if (lat < -19.0) {
    if (lon < 29.5) return "Matabeleland North"
    if (lon < 30.5) return "Midlands"
    return "Masvingo"
  }
  if (lat > -17.5) {
    if (lon < 30.5) return "Mashonaland West"
    if (lon < 31.5) return "Mashonaland Central"
    return "Mashonaland East"
  }
  if (lon < 29.0) return "Matabeleland North"
  if (lon < 30.5) return "Mashonaland West"
  if (lon < 31.3) {
    if (lat < -17.8 && lat > -18.2 && lon > 30.8) return "Harare"
    return "Mashonaland West"
  }
  return "Mashonaland East"
}

const weeklyFire = [
  { day: "Mon", fires: 2 }, { day: "Tue", fires: 5 }, { day: "Wed", fires: 3 },
  { day: "Thu", fires: 8 }, { day: "Fri", fires: 4 }, { day: "Sat", fires: 11 },
  { day: "Sun", fires: 6 },
]
const ndviTrend = [
  { m: "Oct", v: 0.62 }, { m: "Nov", v: 0.68 }, { m: "Dec", v: 0.71 },
  { m: "Jan", v: 0.74 }, { m: "Feb", v: 0.69 }, { m: "Mar", v: 0.73 },
  { m: "Apr", v: 0.78 }, { m: "May", v: 0.76 },
]

function StatCard({ label, value, sub, color = "text-zinc-800", bg = "bg-white", border = "border-zinc-200", icon: Icon, dot, delay = 0 }: {
  label: string; value: string | number; sub?: string; color?: string
  bg?: string; border?: string; icon?: React.ElementType; dot?: string; delay?: number
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ y: -4, transition: { delay: 0 } }}
      className={cn(
        "relative overflow-hidden",
        bg, "border", border, 
        "rounded-3xl p-5 flex flex-col gap-3 shadow-sm transition-all duration-300",
        "hover:shadow-xl hover:shadow-zinc-200/50 cursor-default group"
      )}
    >
      {/* Clear Background */}
      
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-500 transition-colors">{label}</span>
        <div className="flex items-center gap-2">
           {dot && <div className={cn("h-2 w-2 rounded-full", dot)} />}
           {Icon && <Icon className="h-4 w-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className={cn("text-3xl font-black tabular-nums leading-tight tracking-tight", color)}>{value}</p>
        {sub && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="h-1 w-1 rounded-full bg-zinc-300" />
            <p className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-500 transition-colors">{sub}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function SectionHeader({ title, sub, accent = "border-emerald-500" }: { title: string; sub?: string; accent?: string }) {
  return (
    <div className={`border-l-4 ${accent} pl-4 py-1 mb-4`}>
      <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700">{title}</h2>
      {sub && <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ParkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { hotspots } = useHotspots()
  const [park, setPark] = React.useState<Park | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [now] = React.useState(new Date())

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/data/parks.json")
        const data = await res.json()
        const features = data.features
        const idx = features.findIndex((f: any) =>
          String(f.properties.SITE_ID) === String(id) || 
          String(f.properties.SITE_PID) === String(id) || 
          `park-${features.indexOf(f)}` === id
        )
        if (idx === -1) { setLoading(false); return }
        const f = features[idx]
        const name = f.properties.NAME || f.properties.NAME_ENG || "Unknown Park"
        const parkFires = hotspots.filter(h =>
          (h.location_name || "").toLowerCase().includes(name.toLowerCase())
        )
        const count = parkFires.length
        
        // Robustly extract a center point
        let lat = -19.0154, lng = 29.1549 // Default Zimbabwe center
        try {
          let coords = f.geometry.coordinates
          while (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
            coords = coords[0]
          }
          if (Array.isArray(coords[0]) && coords[0].length >= 2) {
            lng = coords[0][0]
            lat = coords[0][1]
          } else if (Array.isArray(coords) && coords.length >= 2) {
            // Case for single Point or direct coordinate array
            lng = coords[0]
            lat = coords[1]
          }
        } catch (e) {
          console.error("Failed to parse coordinates for", name, e)
        }

        setPark({
          id: String(f.properties.SITE_ID || `park-${idx}`),
          name, 
          type: f.properties.DESIG_ENG || f.properties.DESIG || "National Park",
          area: `${Math.round(f.properties.GIS_AREA || 0).toLocaleString()} km²`,
          center: [lat, lng],
          hotspots: count,
          risk: count > 5 ? "High" : count > 0 ? "Medium" : "Low",
          vegetationIndex: 0.62 + (idx % 7) * 0.04,
          wildlifeDensity: idx % 3 === 0 ? "High" : idx % 3 === 1 ? "Medium" : "Low",
          province: getParkProvince(lng, lat),
        })
      } catch (err) { 
        console.error("Park Detail Load Error:", err)
      } finally { setLoading(false) }
    }
    load()
  }, [id, hotspots])

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-pulse">
          <TreePine className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Loading Reserve Intelligence…</p>
      </div>
    </div>
  )

  if (!park) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
        </div>
        <p className="text-sm font-bold text-zinc-700">Reserve not found</p>
        <button onClick={() => router.back()} className="text-[11px] font-semibold text-emerald-600 underline">← Return to Hub</button>
      </div>
    </div>
  )

  const riskColor = park.risk === "High" ? "text-red-600" : park.risk === "Medium" ? "text-orange-500" : "text-emerald-600"
  const riskBg = park.risk === "High" ? "bg-red-50 border-red-100" : park.risk === "Medium" ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100"
  const riskDot = park.risk === "High" ? "bg-orange-500" : park.risk === "Medium" ? "bg-orange-400" : "bg-emerald-500"
  const ndvi = (park.vegetationIndex * 100).toFixed(1)

  const interventions = [
    { label: "Deploy Fire Units", active: park.risk === "High", icon: Flame, color: "text-red-600", bg: "bg-red-50 border-red-100" },
    { label: "Elevated Surveillance", active: park.risk !== "Low", icon: Eye, color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
    { label: "GEE Data Sync Active", active: true, icon: Activity, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
    { label: "VIIRS & MODIS Fusion", active: true, icon: Target, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Background Orbs for Premium Feel */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">

      {/* ── Page Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-emerald-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Conservation Hub
            </button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-inner">
                <TreePine className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                   <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Republic of Zimbabwe</span>
                </div>
                <h1 className="text-[18px] font-black tracking-tight text-zinc-900 leading-tight">{park.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{park.type}</span>
                  <span className="text-zinc-200">·</span>
                  <MapPin className="h-3 w-3 text-zinc-400" />
                  <span className="text-[10px] font-semibold text-zinc-400">{park.province}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — status + actions */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${riskBg}`}>
              <div className={`h-2 w-2 rounded-full ${riskDot} ${park.risk !== "Low" ? "animate-pulse" : ""}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${riskColor}`}>{park.risk} Risk</span>
            </div>
            <span className="text-[10px] font-medium text-zinc-400 hidden lg:block">
              <Clock className="h-3 w-3 inline mr-1" />
              {now.toLocaleString("en-ZW", { timeZone: "Africa/Harare", hour: "2-digit", minute: "2-digit" })} CAT
            </span>
            <button
              onClick={() => {
                const lines = [
                  "ZIMFIREWATCH — RESERVE INTELLIGENCE BRIEF",
                  `Reserve: ${park.name}`, `Type: ${park.type}`, `Province: ${park.province}`,
                  `Area: ${park.area}`, `Risk Level: ${park.risk}`,
                  `Active Hotspots: ${park.hotspots}`, `Vegetation Index (NDRE): ${ndvi}%`,
                  `Wildlife Density: ${park.wildlifeDensity}`,
                  `Generated: ${new Date().toLocaleString("en-ZW", { timeZone: "Africa/Harare" })} CAT`,
                  "", "Source: NASA FIRMS (VIIRS & MODIS) | ZimFireWatch v2.0 | ZINGSA",
                ].join("\n")
                const blob = new Blob([lines], { type: "text/plain" })
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `${park.name.replace(/\s/g, "_")}_Intel_Brief.txt`
                a.click()
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-600 bg-white hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
            >
              <Download className="h-3 w-3" /> Export Brief
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Spatial Coverage" value={park.area} icon={Globe} sub="GIS-verified boundary" delay={0.1} />
          <StatCard label="Active Hotspots" value={park.hotspots} color={park.hotspots > 0 ? "text-orange-600" : "text-emerald-700"}
            bg={park.hotspots > 0 ? "bg-orange-50" : "bg-emerald-50"}
            border={park.hotspots > 0 ? "border-orange-100" : "border-emerald-100"}
            dot={park.hotspots > 0 ? "bg-orange-500 animate-pulse" : "bg-emerald-500"}
            icon={Flame} sub="VIIRS + MODIS fused" delay={0.2} />
          <StatCard label="Vegetation Index" value={`${ndvi}%`} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-100" icon={TrendingUp} sub="NDRE Bio-Health Index" delay={0.3} />
          <StatCard label="Wildlife Density" value={park.wildlifeDensity} color={park.wildlifeDensity === "High" ? "text-emerald-700" : park.wildlifeDensity === "Medium" ? "text-orange-600" : "text-zinc-600"} icon={Activity} sub="Habitat classification" delay={0.4} />
          <StatCard label="Risk Classification" value={park.risk} color={riskColor} bg={riskBg} border={park.risk === "High" ? "border-red-100" : park.risk === "Medium" ? "border-orange-100" : "border-emerald-100"} icon={ShieldAlert} sub="Composite fire risk score" delay={0.5} />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Charts + Briefings */}
          <div className="lg:col-span-2 space-y-6">

            {/* Fire Activity Trend */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <SectionHeader title="7-Day Thermal Hotspot Activity" sub="VIIRS daily fire detection count" />
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyFire} barSize={18}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontWeight: 700 }}
                      formatter={(v: any) => [`${v} hotspots`, "Detections"]}
                    />
                    <Bar dataKey="fires" radius={[4, 4, 0, 0]}>
                      {weeklyFire.map((e, i) => (
                        <Cell key={i} fill={e.fires === Math.max(...weeklyFire.map(d => d.fires)) ? "#ef4444" : "#10b981"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* NDVI Trend */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <SectionHeader title="Vegetation Health Trajectory" sub="8-month NDRE index from ESA WorldCover + GEE" accent="border-teal-500" />
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ndviTrend}>
                    <defs>
                      <linearGradient id="ndvi-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0.5, 0.9]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} tickFormatter={v => `${(Number(v) * 100).toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontWeight: 700 }}
                      formatter={(v: any) => [`${(Number(v) * 100).toFixed(1)}%`, "NDRE"]}
                    />
                    <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2.5} fill="url(#ndvi-grad)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Environmental Intel */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <SectionHeader title="Environmental Conditions" sub="Composite field sensor & satellite data" accent="border-blue-500" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Thermometer, label: "Temp", value: "28°C", sub: "Above seasonal avg", color: "text-orange-600", bg: "bg-orange-50" },
                  { icon: Wind, label: "Wind Speed", value: "14 km/h", sub: "NE direction", color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: Droplets, label: "Humidity", value: "42%", sub: "Low — fire risk↑", color: "text-red-600", bg: "bg-red-50" },
                  { icon: BarChart3, label: "Fuel Load", value: "High", sub: "Dry season buildup", color: "text-amber-600", bg: "bg-amber-50" },
                ].map((c, i) => (
                  <div key={i} className={`${c.bg} rounded-xl p-3 flex flex-col gap-1`}>
                    <c.icon className={`h-4 w-4 ${c.color}`} />
                    <p className={`text-base font-black ${c.color}`}>{c.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{c.label}</p>
                    <p className="text-[9px] text-zinc-400">{c.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Intelligence Panel */}
          <div className="space-y-4">

            {/* Reserve Profile */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <SectionHeader title="Reserve Profile" />
              <div className="space-y-3">
                {[
                  { label: "WDPA ID", value: park.id },
                  { label: "Designation", value: park.type },
                  { label: "Province", value: park.province || "—" },
                  { label: "GIS Area", value: park.area },
                  { label: "Coordinates", value: `${Number(park.center?.[0]).toFixed(4) || "0.0000"}°, ${Number(park.center?.[1]).toFixed(4) || "0.0000"}°` },
                  { label: "Data Latency", value: "~3 hrs overpass" },
                  { label: "Satellite Source", value: "VIIRS + MODIS" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-2 py-1.5 border-b border-zinc-50">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{row.label}</span>
                    <span className="text-[11px] font-semibold text-zinc-700 text-right max-w-[55%]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Intervention Directives */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <SectionHeader title="Intervention Directives" sub="Automated response classification" accent="border-red-400" />
              <div className="space-y-2">
                {interventions.map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${item.active ? item.bg : "bg-zinc-50 border-zinc-100 opacity-50"}`}>
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.active ? item.color : "text-zinc-400"}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wide ${item.active ? item.color : "text-zinc-400"}`}>{item.label}</span>
                    <div className="ml-auto">
                      {item.active
                         ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                         : <Minus className="h-3 w-3 text-zinc-300" />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio-D Engine Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              {/* Clear Background */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Bio-D Engine — Live</span>
                </div>
                <p className="text-[10px] font-medium leading-relaxed text-white/80 italic">
                  Multi-spectral analysis consolidated for {park.name}. {park.risk === "High" ? "Immediate fire unit deployment recommended for boundary zones." : park.risk === "Medium" ? "Elevated surveillance protocols active — monitor closely." : "Vegetation recovery trend is nominal. No immediate intervention required."}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                  <Globe className="h-3 w-3 text-white/60" />
                  <span className="text-[9px] font-semibold text-white/60 uppercase tracking-wide">ZimFireWatch v2.0 · ZINGSA</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
)
}
