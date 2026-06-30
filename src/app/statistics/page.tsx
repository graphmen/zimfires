"use client"

import * as React from "react"
import { BarChart3, TrendingUp, Map as MapIcon, Calendar, Download, Filter, Flame, RefreshCw, Activity, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AreaChart, BarChart, DonutChart } from "@tremor/react"
import dynamic from "next/dynamic"
const FireMap = dynamic(() => import("@/components/fire-map").then(mod => mod.FireMap), { ssr: false })
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const years = Array.from({ length: 26 }, (_, i) => 2026 - i)

const monthlyTrendData = [
  { month: "Jan", "2024": 12, "Average": 15 },
  { month: "Feb", "2024": 8, "Average": 10 },
  { month: "Mar", "2024": 15, "Average": 12 },
  { month: "Apr", "2024": 45, "Average": 35 },
  { month: "May", "2024": 142, "Average": 120 },
  { month: "Jun", "2024": 0, "Average": 350 },
  { month: "Jul", "2024": 0, "Average": 600 },
  { month: "Aug", "2024": 0, "Average": 850 },
  { month: "Sep", "2024": 0, "Average": 900 },
  { month: "Oct", "2024": 0, "Average": 750 },
  { month: "Nov", "2024": 0, "Average": 300 },
  { month: "Dec", "2024": 0, "Average": 50 },
]

const provinceData = [
  { name: "Matabeleland North", fires: 1240 },
  { name: "Mashonaland West", fires: 850 },
  { name: "Midlands", fires: 620 },
  { name: "Manicaland", fires: 410 },
  { name: "Masvingo", fires: 380 },
  { name: "Mashonaland Central", fires: 320 },
  { name: "Matabeleland South", fires: 290 },
  { name: "Mashonaland East", fires: 250 },
]

export default function StatisticsPage() {
  const [selectedYear, setSelectedYear] = React.useState("2024")

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Precision Slim Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-md z-20 shadow-sm">
        <div className="max-w-full mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-heading font-black tracking-tighter text-primary dark:text-emerald-400 uppercase leading-none">
                    Statistics & Analysis
                  </h1>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black tracking-widest px-1.5 py-0 h-4 animate-pulse">RECON ACTIVE</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                     <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                     </span>
                     <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Intelligence Node: STAT-ANALYST-01</span>
                  </div>
                  <span className="text-zinc-300">|</span>
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Spatial Pattern Analytics Hub</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
                <SelectTrigger className="h-9 w-40 bg-background border-none shadow-none text-[10px] font-black uppercase tracking-widest">
                  <Calendar className="mr-2 h-3 w-3 text-primary" />
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()} className="text-[10px] font-bold">{y}</SelectItem>
                  ))}
                </SelectContent>
               </Select>
               <Button variant="outline" size="sm" className="h-8 font-black text-[9px] uppercase tracking-widest border-2 active:scale-95">
                  <Download className="mr-2 h-3 w-3" />
                  Export Data
               </Button>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
             <Card className="md:col-span-2 border shadow-sm overflow-hidden rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/5 border-b py-4">
                   <div>
                      <CardTitle className="text-sm font-heading font-black uppercase tracking-widest text-primary">Seasonal Fire Trend</CardTitle>
                      <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase">Active fire detections compared to 20-year average</CardDescription>
                   </div>
                   <Badge variant="outline" className="font-black text-[9px] bg-primary/5 text-primary border-primary/20 tracking-tighter">YEAR {selectedYear}</Badge>
                </CardHeader>
                <CardContent className="pt-6">
                   <AreaChart
                     className="h-80"
                     data={monthlyTrendData}
                     index="month"
                     categories={[selectedYear, "Average"]}
                     colors={["emerald", "slate"]}
                     valueFormatter={(number) => Intl.NumberFormat("us").format(number).toString()}
                     showLegend={true}
                     showYAxis={true}
                     showGridLines={false}
                     curveType="monotone"
                   />
                </CardContent>
             </Card>

             <Card className="border shadow-sm rounded-2xl">
                <CardHeader className="bg-muted/5 border-b py-4">
                   <CardTitle className="text-sm font-heading font-black uppercase tracking-widest text-primary">Regional Impact</CardTitle>
                   <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase">Top 5 provinces by fire count</CardDescription>
                </CardHeader>
                <CardContent>
                   <DonutChart
                     className="h-80 mt-4"
                     data={provinceData.slice(0, 5)}
                     category="fires"
                     index="name"
                     colors={["emerald", "green", "lime", "slate", "gray"]}
                     showAnimation={true}
                   />
                </CardContent>
             </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
             <Card className="border shadow-sm rounded-2xl">
                <CardHeader className="bg-muted/5 border-b py-4">
                   <CardTitle className="text-sm font-heading font-black uppercase tracking-widest text-primary">Historical Comparison</CardTitle>
                   <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase">Annual fire counts across the selected decade</CardDescription>
                </CardHeader>
                <CardContent>
                   <BarChart
                     className="h-72 mt-4"
                     data={years.slice(0, 10).map(y => ({ year: y.toString(), "Fires": Math.floor(Math.random() * 5000) + 1000 })).reverse()}
                     index="year"
                     categories={["Fires"]}
                     colors={["emerald"]}
                     showLegend={false}
                     showGridLines={false}
                   />
                </CardContent>
             </Card>

             <Card className="border shadow-sm overflow-hidden rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/5 border-b py-4">
                   <div>
                      <CardTitle className="text-sm font-heading font-black uppercase tracking-widest text-primary">Spatial Distribution</CardTitle>
                      <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase">Heatmap of fire density for {selectedYear}</CardDescription>
                   </div>
                   <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 transition-colors">
                      <MapIcon className="mr-2 h-3.5 w-3.5" />
                      Full Map
                   </Button>
                </CardHeader>
                <CardContent className="p-0 relative h-[320px]">
                   <FireMap className="h-full w-full" zoom={5.5} />
                   <div className="absolute bottom-4 right-4 z-10 p-2 bg-background/80 backdrop-blur-md rounded-lg border border-border/50 text-[10px] font-black uppercase tracking-widest text-primary">
                      Density Heatmap Active
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
