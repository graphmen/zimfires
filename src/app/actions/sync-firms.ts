"use server"

import { supabase as defaultSupabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import fs from 'fs'
import path from 'path'
import * as turf from '@turf/turf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : defaultSupabase

const FIRMS_BBOX = '25.2,-22.4,33.1,-15.6' // Zimbabwe
const REST_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'

// Load spatial data for tagging
function loadSpatialData() {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data')
    const provinces = JSON.parse(fs.readFileSync(path.join(dataPath, 'provinces.json'), 'utf8'))
    const districts = JSON.parse(fs.readFileSync(path.join(dataPath, 'districts.json'), 'utf8'))
    const wards = JSON.parse(fs.readFileSync(path.join(dataPath, 'wards.json'), 'utf8'))
    const parks = JSON.parse(fs.readFileSync(path.join(dataPath, 'parks.json'), 'utf8'))
    return { provinces, districts, wards, parks }
  } catch (e) {
    console.error("Error loading spatial tagging data:", e)
    return null
  }
}

const spatialData = loadSpatialData()

async function getActiveRules() {
  const { data } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('is_active', true)
  return data || []
}

async function triggerAlert(rule: any, fire: any, location: string) {
  const { error } = await supabase
    .from('triggered_alerts')
    .insert([{
      rule_id: rule.id,
      fire_id: fire.firms_id,
      location_name: location,
      severity: rule.severity,
      frp: fire.frp,
      confidence: fire.confidence,
      detected_at: fire.observation_time
    }])
  if (error) console.error("Error triggering alert:", error)
}

export async function syncFirmsData() {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY
  let totalProcessed = 0
  let sourceMethod = 'NASA API'
  const rules = await getActiveRules()

  let syncError = null;

  // 1. Attempt Live NASA Sync if Key is Present
  if (mapKey && mapKey !== 'your-nasa-map-key') {
    const sources = ['VIIRS_SNPP_NRT', 'MODIS_NRT']
    for (const src of sources) {
      try {
        const url = `${REST_BASE}/${mapKey}/${src}/${FIRMS_BBOX}/1`
        const resp = await fetch(url)
        if (!resp.ok) continue

        const csv = await resp.text()
        let records = parseCSV(csv, src)

        if (records.length > 0) {
          // Spatial Tagging & Alert Evaluation
          records = records.map(record => {
            const point = turf.point([
              parseFloat(record.geom.match(/\((.*) /)![1]),
              parseFloat(record.geom.match(/ (.*)\)/)![1])
            ])

            let province = "Unknown"
            let district = "Unknown"
            let ward = "Unknown"
            let park = "None"

            if (spatialData) {
              // Tag Province
              for (const f of spatialData.provinces.features) {
                if (turf.booleanPointInPolygon(point, f)) {
                  province = f.properties.province_n || f.properties.NAME_1 || province
                  break
                }
              }
              // Tag District
              for (const f of spatialData.districts.features) {
                if (turf.booleanPointInPolygon(point, f)) {
                  district = f.properties.district_n || f.properties.NAME_2 || district
                  break
                }
              }
              // Tag Ward
              if (spatialData.wards) {
                for (const f of spatialData.wards.features) {
                  if (turf.booleanPointInPolygon(point, f)) {
                    const p = f.properties
                    ward = p.wardnumber !== undefined ? `Ward ${p.wardnumber}` : (p.ward_no || p.WARD_NO || p.WARD_NAME || p.NAME_3 || p.ward || ward)
                    break
                  }
                }
              }
              // Tag Park
              for (const f of spatialData.parks.features) {
                if (turf.booleanPointInPolygon(point, f)) {
                  park = f.properties.NAME || f.properties.name || park
                  break
                }
              }
            }

            const locationName = park !== "None" 
              ? park 
              : (ward !== "Unknown" ? `${district}, ${province} (${ward})` : `${district}, ${province}`)

            const taggedRecord = {
              ...record,
              metadata: { location_name: locationName, province, district, ward, park },
              province,
              district,
              ward,
              park
            }

            // Evaluate Rules
            rules.forEach(rule => {
              const matchesConfidence = !rule.min_confidence ||
                (rule.min_confidence === 'high' && record.confidence === 'high') ||
                (rule.min_confidence === 'nominal' && ['high', 'nominal'].includes(record.confidence)) ||
                (rule.min_confidence === 'low')

              const matchesFRP = !rule.min_frp || record.frp >= rule.min_frp
              const matchesPark = !rule.park_only || park !== "None"
              const matchesProvince = !rule.province_filter || rule.province_filter === "All Provinces" || province === rule.province_filter

              if (matchesConfidence && matchesFRP && matchesPark && matchesProvince) {
                triggerAlert(rule, taggedRecord, locationName)
              }
            })

            return taggedRecord
          })

          const { error } = await supabase
            .from('fire_observations')
            .upsert(records, { onConflict: 'firms_id' })

          if (error) {
            console.error(`Supabase upsert error for ${src}:`, error)
            syncError = error.message
            continue
          }
          totalProcessed += records.length
        }
      } catch (e) {
        console.error(`Error syncing ${src} from NASA:`, e)
        syncError = (e as Error).message
      }
    }
  }

  // 2. FALLBACK DISABLED: Strictly using live NASA telemetry.
  if (totalProcessed === 0 && (!mapKey || mapKey === 'your-nasa-map-key')) {
    syncError = "Invalid NASA_FIRMS_MAP_KEY. Please provide a valid key in .env.local."
  }

  return {
    success: !syncError,
    processed: totalProcessed,
    method: sourceMethod,
    note: syncError || (totalProcessed === 0 ? "No active fires detected in last 24h." : undefined)
  }
}

function parseCSV(csv: string, source: string) {
  const lines = csv.trim().split('\n')
  if (lines.length <= 1) return []

  const headers = lines[0].split(',')
  const records = []

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].split(',')
    if (raw.length < headers.length) continue

    const data: any = {}
    headers.forEach((h, idx) => data[h] = raw[idx])

    let sensor = 'VIIRS_S-NPP'
    if (source.includes('MODIS')) sensor = 'MODIS_AQUA'

    records.push({
      firms_id: `FIRMS_${source}_${data.acq_date}_${data.acq_time}_${data.latitude}_${data.longitude}`,
      geom: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
      observation_time: `${data.acq_date}T${data.acq_time.padStart(4, '0').replace(/(..)(..)/, '$1:$2:00Z')}`,
      sensor: sensor,
      dataset: source,
      source_type: 'real-time',
      brightness: parseFloat(data.bright_ti4 || data.brightness),
      confidence: translateConfidence(data.confidence, source),
      frp: parseFloat(data.frp) || 0,
      acquisition_date: data.acq_date,
      country_code: 'ZW'
    })
  }

  return records
}

function translateConfidence(conf: string, source: string) {
  if (source.includes('VIIRS')) {
    if (conf === 'h') return 'high'
    if (conf === 'l') return 'low'
    return 'nominal'
  } else {
    const val = parseInt(conf)
    if (isNaN(val)) return 'nominal'
    if (val >= 80) return 'high'
    if (val <= 30) return 'low'
    return 'nominal'
  }
}

