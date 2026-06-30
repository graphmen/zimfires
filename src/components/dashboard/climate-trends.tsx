"use client"

import * as React from "react"
import { AreaChart, Title, Text, Badge } from "@tremor/react"
import { Loader2, Thermometer } from "lucide-react"

export function ClimateTrends() {
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchTrends() {
      try {
        const res = await fetch('/api/gee/trends?district=Zimbabwe')
        if (res.ok) {
          const json = await res.json()
          // Format data for Tremor
          const formatted = json.data.map((item: any) => ({
            Year: item.year.toString(),
            "Avg Temp": parseFloat(item.avg_temp.toFixed(2))
          }))
          setData(formatted)
        }
      } catch (err) {
        console.error("Failed to fetch climate trends:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrends()
  }, [])

  if (loading) {
    return (
      <div className="h-72 flex flex-col items-center justify-center gap-4 text-zinc-500 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Querying Satellite Clusters...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="h-4 w-4 text-emerald-600" />
            <Title className="text-sm font-black uppercase tracking-tight text-zinc-900">Thermal Deviation Matrix</Title>
          </div>
          <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Annual LST Median (MODIS 2014-2024)</Text>
        </div>
        <Badge className="text-[8px] font-black border-none bg-emerald-600 text-white px-2">GEOSPATIAL_ANALYSIS</Badge>
      </div>
      
      <AreaChart
        className="h-64 mt-4"
        data={data}
        index="Year"
        categories={["Avg Temp"]}
        colors={["emerald"]}
        showLegend={false}
        showGridLines={true}
        startEndOnly={false}
        valueFormatter={(number: number) => `${number}°C`}
      />
      
      <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/[0.01] to-emerald-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <p className="text-[10px] leading-relaxed text-zinc-600 font-medium italic relative z-10">
          * Intelligence Note: Regional thermal baseline shows a sustained +1.4°C shift, significantly escalating wildfire propagation probability in the Zambezi basin.
        </p>
      </div>
    </div>
  )
}
