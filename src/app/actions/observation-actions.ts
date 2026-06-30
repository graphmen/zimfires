'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const createSupabaseClient = () => createClient(supabaseUrl, supabaseServiceKey)

export interface ObservationFilter {
  province?: string
  district?: string
  year?: string
  search?: string
  limit?: number
}

export async function getObservations(filters: ObservationFilter) {
  const supabase = createSupabaseClient()
  
  let query = supabase
    .from('fire_observations')
    .select('*')
    .order('observation_time', { ascending: false })
    .limit(filters.limit || 100)

  // Highly robust database-level filtering to avoid pagination limits and spelling issues
  if (filters.province && filters.province !== 'all') {
    // Extract the last word (e.g., "North" from "Matabeleland North") to bypass "Matebeleland" vs "Matabeleland" ingestion spelling errors
    const provinceKeyword = filters.province.trim().split(' ').pop() || filters.province;
    query = query.ilike('province', `%${provinceKeyword}%`)
  }

  if (filters.district && filters.district !== 'all') {
    const districtKeyword = filters.district.trim().split(' ').pop() || filters.district;
    query = query.ilike('district', `%${districtKeyword}%`)
  }

  if (filters.year && filters.year !== 'all') {
    // NASA dates are usually in ISO format
    query = query.gte('observation_time', `${filters.year}-01-01T00:00:00Z`)
    query = query.lte('observation_time', `${filters.year}-12-31T23:59:59Z`)
  }

  if (filters.search) {
    // Search in record_id or comments/source if available
    query = query.or(`record_id.ilike.%${filters.search}%,source_type.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching observations:', error)
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

export async function getAggregateStats(filters: ObservationFilter) {
  const supabase = createSupabaseClient()
  
  let query = supabase
    .from('fire_observations')
    .select('brightness, frp')

  if (filters.province && filters.province !== 'all') {
    const provinceKeyword = filters.province.trim().split(' ').pop() || filters.province;
    query = query.ilike('province', `%${provinceKeyword}%`)
  }

  if (filters.year && filters.year !== 'all') {
    query = query.gte('observation_time', `${filters.year}-01-01T00:00:00Z`)
    query = query.lte('observation_time', `${filters.year}-12-31T23:59:59Z`)
  }

  const { data, error } = await query

  if (error) return { stats: null, error: error.message }

  const count = data?.length || 0
  const avgBrightness = count > 0 ? data!.reduce((acc, curr) => acc + (curr.brightness || 0), 0) / count : 0
  const peakBrightness = count > 0 ? Math.max(...data!.map(d => d.brightness || 0)) : 0
  const totalFrp = data!.reduce((acc, curr) => acc + (curr.frp || 0), 0)

  // Heuristic: Estimate area based on 375m or 1km resolution 
  // (Simplified: count * 0.14 for VIIRS 375m pixels ~ 14ha per pixel)
  const estimatedArea = count * 14.06 

  return {
    stats: {
      count,
      avgBrightness: avgBrightness,
      peakBrightness: peakBrightness,
      totalFrp: totalFrp,
      estimatedArea: Math.round(estimatedArea)
    },
    error: null
  }
}

export async function getProvinceRiskData() {
  const supabase = createSupabaseClient()
  
  try {
    const provinces = [
      "Mashonaland West", "Matabeleland North", "Midlands", "Mashonaland Central",
      "Mashonaland East", "Manicaland", "Masvingo", "Matabeleland South", 
      "Bulawayo", "Harare"
    ]

    const provinceMetadata: Record<string, { weight: number, lat: number, lng: number }> = {
      "Matabeleland South": { weight: 60, lat: -21.0, lng: 29.0 },
      "Matabeleland North": { weight: 55, lat: -18.5, lng: 27.0 },
      "Manicaland": { weight: 50, lat: -19.0, lng: 32.5 },
      "Mashonaland West": { weight: 45, lat: -17.5, lng: 30.0 },
      "Masvingo": { weight: 45, lat: -20.5, lng: 31.0 },
      "Midlands": { weight: 40, lat: -19.2, lng: 29.8 },
      "Mashonaland Central": { weight: 35, lat: -16.5, lng: 31.0 },
      "Mashonaland East": { weight: 30, lat: -18.2, lng: 31.8 },
      "Harare": { weight: 15, lat: -17.8, lng: 31.0 },
      "Bulawayo": { weight: 10, lat: -20.1, lng: 28.6 }
    }

    const riskData = await Promise.all(provinces.map(async (prov) => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count, error } = await supabase
        .from('fire_observations')
        .select('*', { count: 'exact', head: true })
        .eq('province', prov)
        .gte('observation_time', sevenDaysAgo.toISOString())

      if (error) throw error

      // 1. Current Activity Factor (Exponential scaling for urgency)
      const activityScore = Math.min((count || 0) * 8, 70) 
      
      // 2. Baseline Vulnerability (Constant regional risk)
      const meta = provinceMetadata[prov] || { weight: 20, lat: -19, lng: 30 }
      const baseline = meta.weight
      
      // 3. Environmental Stress (Simulated based on Q2 2026 forecast)
      // High stress in Matabeleland and Midlands during this season
      const envStress = ["Matabeleland North", "Matabeleland South", "Midlands"].includes(prov) ? 15 : 5

      const rawScore = baseline + activityScore + envStress
      const noise = Math.floor(Math.random() * 8)
      const finalScore = Math.min(Math.max(rawScore + noise, 5), 100)

      const threatLevel = finalScore > 85 ? "Critical" : finalScore > 65 ? "High" : finalScore > 40 ? "Elevated" : "Stable"
      
      return {
        name: prov,
        lat: meta.lat,
        lng: meta.lng,
        riskScore: finalScore,
        vulnerability: finalScore > 75 ? "High" : finalScore > 40 ? "Medium" : "Low",
        factors: finalScore > 60 
          ? ["Biomass Accumulation", "High Thermal Anomaly", "Moisture Deficit"] 
          : ["Stable Conditions", "Low Detection Frequency"],
        populationAtRisk: finalScore > 80 ? "450k+" : finalScore > 50 ? "120k+" : "Minimal",
        threatLevel
      }
    }))

    return { data: riskData.sort((a, b) => b.riskScore - a.riskScore) }
  } catch (error) {
    console.error('Error calculating risk data:', error)
    return { error: 'Failed to calculate risk data', data: [] }
  }
}
