"use client"

import * as React from "react"
import { AreaChart, Card, Title, Text, Flex, Badge } from "@tremor/react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface ComparativeAnalysisProps {
  year: string
  baselineData: any[]
}

export function ComparativeAnalysis({ year, baselineData }: ComparativeAnalysisProps) {
  // Generate mock monthly comparison
  const data = [
    { Month: "Jan", [year]: 45, Baseline: 42 },
    { Month: "Feb", [year]: 52, Baseline: 48 },
    { Month: "Mar", [year]: 48, Baseline: 45 },
    { Month: "Apr", [year]: 61, Baseline: 55 },
    { Month: "May", [year]: 145, Baseline: 120 },
    { Month: "Jun", [year]: 480, Baseline: 420 },
    { Month: "Jul", [year]: 850, Baseline: 780 },
    { Month: "Aug", [year]: 1240, Baseline: 1100 },
    { Month: "Sep", [year]: 1560, Baseline: 1450 },
    { Month: "Oct", [year]: 1100, Baseline: 1200 },
    { Month: "Nov", [year]: 450, Baseline: 500 },
    { Month: "Dec", [year]: 120, Baseline: 150 },
  ]

  const totalCurrent = data.reduce((acc, curr) => acc + (curr[year] as number), 0)
  const totalBaseline = data.reduce((acc, curr) => acc + curr.Baseline, 0)
  const pctChange = ((totalCurrent - totalBaseline) / totalBaseline) * 100
  const isHigher = pctChange > 0

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden relative">
      <div className="flex flex-col gap-1 mb-6">
        <Flex className="items-start">
          <div>
            <Title className="text-sm font-black uppercase tracking-tight">Multi-Decadal Benchmarking</Title>
            <Text className="text-[10px] font-medium text-muted-foreground uppercase">{year} vs 10-Year Mean Portfolio</Text>
          </div>
          <Badge color={isHigher ? "red" : "emerald"} icon={isHigher ? TrendingUp : TrendingDown}>
            {Math.abs(pctChange).toFixed(1)}% {isHigher ? "Above" : "Below"} Mean
          </Badge>
        </Flex>
      </div>

      <AreaChart
        className="h-72 mt-4"
        data={data}
        index="Month"
        categories={[year, "Baseline"]}
        colors={["red", "zinc"]}
        valueFormatter={(number: number) => `${number.toLocaleString()} Alerts`}
        showLegend={true}
        showGridLines={false}
        curveType="monotone"
      />

      <div className="mt-6 pt-6 border-t flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase">Peak Variance</p>
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">+110 Alerts (September)</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase">Trend Classification</p>
          <p className="text-sm font-black text-[#235823] uppercase">Climate Escalation Pattern</p>
        </div>
      </div>
    </Card>
  )
}
