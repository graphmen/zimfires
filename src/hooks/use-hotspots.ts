"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"

export interface Hotspot {
  id: string
  latitude: number
  longitude: number
  observation_time: string
  sensor: string
  confidence: string
  frp: number
  location_name?: string
  province?: string
  district?: string
  ward?: string
  park?: string
  hours_ago?: number
}

export function useHotspots(days: number = 3) {
  const [hotspots, setHotspots] = React.useState<Hotspot[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchHotspots = React.useCallback(async () => {
    try {
      setLoading(true)
      
      let firmsHotspots: Hotspot[] = []
      try {
        const res = await fetch(`/api/firms?days=${days}`)
        if (res.ok) {
          const data = await res.json()
          firmsHotspots = data.map((row: any) => {
            const dateStr = row.acq_date
            const timeStr = row.acq_time?.padStart(4, '0') || '0000'
            const observation_time = new Date(`${dateStr}T${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:00Z`).toISOString()
            
            // Map NASA's cryptic satellite codes
            let sensor = row.instrument || row.satellite
            if (row.satellite === 'N') sensor = 'VIIRS S-NPP'
            if (row.satellite === '1') sensor = 'VIIRS NOAA-20'
            if (row.satellite === 'Aqua' || row.satellite === 'Terra') sensor = `MODIS ${row.satellite}`

            // Map NASA's cryptic confidence codes
            let confidence = row.confidence
            if (confidence === 'n') confidence = 'nominal'
            if (confidence === 'l') confidence = 'low'
            if (confidence === 'h') confidence = 'high'
            
            let location_name = "Zimbabwe (NASA FIRMS)"
            if (row.province && row.district) {
              location_name = `${row.district} District, ${row.province}`
              if (row.ward) location_name += ` (Ward ${row.ward})`
            }

            return {
              id: `firms-${row.latitude}-${row.longitude}-${timeStr}`,
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              observation_time,
              sensor,
              confidence,
              frp: parseFloat(row.frp),
              location_name,
              province: row.province,
              district: row.district,
              ward: row.ward,
              park: row.park || 'None',
              source: 'NASA_FIRMS',
              hours_ago: isNaN(new Date(observation_time).getTime()) ? 0 : Math.floor((Date.now() - new Date(observation_time).getTime()) / (1000 * 60 * 60)),
              ...row
            }
          })
        }
      } catch (err) {
        console.error("Failed to fetch FIRMS API:", err)
      }

      // Combine Supabase local DB with FIRMS Live Feed
      setHotspots(firmsHotspots);
      setLoading(false);

      // Attempt to fetch additional Supabase data without blocking FIRMS data
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project')) {
        try {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('fire_observations')
            .select('*')
            .gte('observation_time', twentyFourHoursAgo)
            .order('observation_time', { ascending: false })
            .limit(100);

          if (!supabaseError && supabaseData) {
            const supabaseHotspots = supabaseData.map(transformSupabaseHotspot);
            // Deduplicate if needed, but for now just combine
            setHotspots(prev => {
              const existingIds = new Set(prev.map(h => h.id));
              const uniqueNew = supabaseHotspots.filter(h => !existingIds.has(h.id));
              return [...prev, ...uniqueNew];
            });
          }
        } catch (sbErr) {
          console.warn("Supabase fetch failed or timed out, continuing with FIRMS data only.");
        }
      }
    } catch (err: any) {
      console.error("Error fetching hotspots:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  React.useEffect(() => {
    fetchHotspots()

    // Real-time subscription
    const subscription = supabase
      .channel('hotspots_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public',
        table: 'fire_observations' 
      }, (payload: any) => {
        const newHotspot = transformSupabaseHotspot(payload.new)
        setHotspots(prev => [newHotspot, ...prev].slice(0, 100))
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchHotspots])

  return { hotspots, loading, error, refresh: fetchHotspots }
}

function transformSupabaseHotspot(row: any): Hotspot {
  // If lat/long are directly available in metadata or columns, use them
  // Otherwise try to extract from geom string "POINT(long lat)"
  let lat = row.latitude || 0
  let lng = row.longitude || 0

  if ((!lat || !lng) && row.geom) {
    const match = row.geom.match(/POINT\((.*) (.*)\)/)
    if (match) {
      lng = parseFloat(match[1])
      lat = parseFloat(match[2])
    }
  }

  return {
    id: row.id || row.firms_id,
    latitude: lat,
    longitude: lng,
    observation_time: row.observation_time,
    sensor: row.sensor,
    confidence: row.confidence,
    frp: row.frp,
    location_name: row.metadata?.location_name || row.location_name || "Unknown Location",
    province: row.metadata?.province || row.province,
    district: row.metadata?.district || row.district,
    ward: row.metadata?.ward || row.ward,
    park: row.metadata?.park || row.park || 'None',
    hours_ago: row.observation_time ? (isNaN(new Date(row.observation_time).getTime()) ? 0 : Math.floor((Date.now() - new Date(row.observation_time).getTime()) / (1000 * 60 * 60))) : 0
  }
}


