"use client"

import * as React from "react"
import { DonutChart, Card, Title, Text, List, ListItem, Badge } from "@tremor/react"
import { Database, ShieldCheck, Zap } from "lucide-react"

interface SensorPortfolioProps {
  year: string
}

export function SensorPortfolio({ year }: SensorPortfolioProps) {
  const data = [
    { name: "VIIRS S-NPP", value: 580, color: "rose" },
    { name: "VIIRS NOAA-20", value: 420, color: "orange" },
    { name: "MODIS Terra", value: 150, color: "emerald" },
    { name: "MODIS Aqua", value: 130, color: "blue" },
    { name: "Sentinel-2", value: 45, color: "amber" },
  ]

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-zinc-900">
      <div className="flex flex-col gap-1 mb-6">
        <Title className="text-sm font-black uppercase tracking-tight">Sensor Intelligence Portfolio</Title>
        <Text className="text-[10px] font-medium text-muted-foreground uppercase">Telemetric node distribution for {year}</Text>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        <DonutChart
          className="h-44 w-44"
          data={data}
          category="value"
          index="name"
          colors={["rose", "orange", "emerald", "blue", "amber"]}
          variant="donut"
          showAnimation={true}
        />
        
        <List className="flex-1">
          {data.map((item) => (
            <ListItem key={item.name} className="py-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full bg-${item.color}-500`} />
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{item.name}</span>
              </div>
              <span className="text-[11px] font-black">{Math.round((item.value / 1325) * 100)}%</span>
            </ListItem>
          ))}
        </List>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Optical Validation</p>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <ShieldCheck className="h-3 w-3" /> 92.4% Verified
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Mean Response Latency</p>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <Zap className="h-3 w-3" /> 14.2 Minutes
          </div>
        </div>
      </div>
    </Card>
  )
}
