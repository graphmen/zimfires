"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import fs from "fs"
import path from "path"
import * as turf from "@turf/turf"

const alertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  severity: z.enum(["critical", "high", "medium", "info"]),
  alert_type: z.enum(["FIRE", "UHI", "HEAT_RISK"]).default("FIRE"),
  province_filter: z.string().optional().nullable(),
  park_filter: z.string().optional().nullable(),
  district_id: z.string().optional().nullable(),
  min_frp: z.number().min(0).optional().nullable(),
  min_confidence: z.string().optional().nullable(),
  thermal_threshold: z.number().optional().nullable(),
  park_only: z.boolean().default(false),
  channels: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
})

export type AlertRule = z.infer<typeof alertRuleSchema> & { id?: string }

export async function getAlertRules() {
  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching alert rules:", error)
    return []
  }
  return data
}

export async function createAlertRule(formData: AlertRule) {
  const validated = alertRuleSchema.parse(formData)
  
  // Always remove ID for new records to let Supabase generate a valid UUID
  const { id: _, ...insertData } = validated

  const { data, error } = await supabase
    .from('alert_rules')
    .insert([insertData])
    .select()

  if (error) {
    console.error("Supabase Error:", error)
    throw error
  }
  
  revalidatePath('/alerts')
  return data[0]
}

export async function deleteAlertRule(id: string) {
  const { error } = await supabase
    .from('alert_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
  
  revalidatePath('/alerts')
}

export async function toggleAlertRule(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('alert_rules')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw error
  
  revalidatePath('/alerts')
}

export async function updateAlertRule(id: string, formData: AlertRule) {
  const validated = alertRuleSchema.parse(formData)

  // Remove ID from validated data to prevent primary key update issues
  const { id: _, ...updateData } = validated

  const { data, error } = await supabase
    .from('alert_rules')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) throw error
  
  revalidatePath('/alerts')
  return data[0]
}

let spatialDataCache: any = null

function getSpatialData() {
  if (spatialDataCache) return spatialDataCache
  try {
    const dataPath = (r: string) => path.join(process.cwd(), "public", "data", r)
    const provinces = JSON.parse(fs.readFileSync(dataPath('provinces.json'), 'utf8'))
    const districts = JSON.parse(fs.readFileSync(dataPath('districts.json'), 'utf8'))
    const parks = JSON.parse(fs.readFileSync(dataPath('parks.json'), 'utf8'))
    spatialDataCache = { provinces, districts, parks }
    return spatialDataCache
  } catch (e) {
    console.error("Failed to load spatial data in alert actions:", e)
    return null
  }
}

function parseWkbPoint(wkbHex: string) {
  try {
    const buf = Buffer.from(wkbHex, 'hex')
    const isLittleEndian = buf[0] === 1
    const typeVal = isLittleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1)
    const hasSrid = (typeVal & 0x20000000) !== 0
    const offset = hasSrid ? 9 : 5
    const lon = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset)
    const lat = isLittleEndian ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8)
    return { lon, lat }
  } catch (e) {
    console.error("Failed to parse WKB point:", e)
    return null
  }
}

function resolveSpatialTag(lon: number, lat: number) {
  const spatialData = getSpatialData()
  if (!spatialData) return { province: "BORDER ZONE", district: "BORDER BUFFER", park: "None", location_name: "Outside Zimbabwe Boundary" }

  const point = turf.point([lon, lat])
  let province = "Unknown"
  let district = "Unknown"
  let park = "None"

  for (const f of spatialData.provinces.features) {
    if (turf.booleanPointInPolygon(point, f)) {
      province = f.properties.province_n || f.properties.NAME_1 || province
      break;
    }
  }

  for (const f of spatialData.districts.features) {
    if (turf.booleanPointInPolygon(point, f)) {
      district = f.properties.district_n || f.properties.NAME_2 || district
      break;
    }
  }

  for (const f of spatialData.parks.features) {
    if (turf.booleanPointInPolygon(point, f)) {
      park = f.properties.NAME || f.properties.name || park
      break;
    }
  }

  let location_name = ""
  if (province !== 'Unknown' || district !== 'Unknown') {
    location_name = park !== "None" ? park : `${district}, ${province}`
  } else {
    province = "BORDER ZONE"
    district = "BORDER BUFFER"
    location_name = "Outside Zimbabwe Boundary"
  }

  return { province, district, park, location_name }
}

function parseCoordsFromFirmsId(firmsId: string) {
  try {
    const parts = firmsId.split('_')
    if (parts.length >= 6) {
      const lon = parseFloat(parts[parts.length - 1])
      const lat = parseFloat(parts[parts.length - 2])
      if (!isNaN(lon) && !isNaN(lat) && lat < 0 && lon > 0) {
        return { lon, lat }
      }
    }
  } catch (e) {
    console.error("Failed to parse coords from firms_id:", e)
  }
  return null
}

export async function getTriggeredAlerts() {
  const { data, error } = await supabase
    .from('triggered_alerts')
    .select('*, alert_rules(name, severity)')
    .order('triggered_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching triggered alerts:", error)
    return []
  }

  // Resolve matching fire observations to fill in missing columns
  const fireIds = data.map(d => d.fire_id).filter(Boolean)
  if (fireIds.length > 0) {
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const uuidFireIds = fireIds.filter(id => isUUID(id))
    const stringFireIds = fireIds.filter(id => !isUUID(id))

    let obsData: any[] = []

    if (uuidFireIds.length > 0) {
      const { data: uuidObs } = await supabase
        .from('fire_observations')
        .select('id, firms_id, province, district, park, confidence, frp, observation_time, geom')
        .in('id', uuidFireIds)
      if (uuidObs) obsData = obsData.concat(uuidObs)
    }

    if (stringFireIds.length > 0) {
      const { data: stringObs } = await supabase
        .from('fire_observations')
        .select('id, firms_id, province, district, park, confidence, frp, observation_time, geom')
        .in('firms_id', stringFireIds)
      if (stringObs) obsData = obsData.concat(stringObs)
    }

    const obsMap = new Map()
    if (obsData.length > 0) {
      for (const obs of obsData) {
        if (obs.id) obsMap.set(obs.id, obs)
        if (obs.firms_id) obsMap.set(obs.firms_id, obs)
      }
    }

    for (const alert of data) {
      const obs = obsMap.get(alert.fire_id)
      let resolvedLocation: any = null

      // 1. Resolve coordinates from geom (if present in obs)
      if (obs && obs.geom && obs.geom.coordinates) {
        const [lon, lat] = obs.geom.coordinates
        resolvedLocation = resolveSpatialTag(lon, lat)
      } 
      // 2. Parse from firms_id if it's a string containing coordinates
      else if (alert.fire_id && alert.fire_id.startsWith('FIRMS_')) {
        const parsed = parseCoordsFromFirmsId(alert.fire_id)
        if (parsed) {
          resolvedLocation = resolveSpatialTag(parsed.lon, parsed.lat)
        }
      }
      // 3. Fallback to parsing WKB location from alert.metadata
      else if (alert.metadata && alert.metadata.location) {
        const parsed = parseWkbPoint(alert.metadata.location)
        if (parsed) {
          resolvedLocation = resolveSpatialTag(parsed.lon, parsed.lat)
        }
      }

      // Apply resolved location if found
      if (resolvedLocation) {
        alert.province = resolvedLocation.province
        alert.district = resolvedLocation.district
        alert.park = resolvedLocation.park
        if (!alert.location_name || alert.location_name === 'Unknown, Unknown') {
          alert.location_name = resolvedLocation.location_name
        }
      }

      // Apply remaining observation fields
      if (obs) {
        if (alert.detected_at === null) {
          alert.detected_at = obs.observation_time || alert.triggered_at
        }
        if (alert.frp === null) {
          alert.frp = obs.frp
        }
        if (alert.confidence === null) {
          alert.confidence = obs.confidence
        }
        if (!alert.province) alert.province = obs.province
        if (!alert.district) alert.district = obs.district
        if (!alert.park) alert.park = obs.park
      }
    }
  }

  // Fallback to metadata values if still null
  for (const alert of data) {
    if (alert.detected_at === null || alert.detected_at === undefined) {
      alert.detected_at = alert.triggered_at
    }
    if (alert.severity === null || alert.severity === undefined) {
      alert.severity = alert.metadata?.severity || alert.alert_rules?.severity || 'info'
    }
    if (alert.frp === null || alert.frp === undefined) {
      alert.frp = alert.metadata?.frp || 0
    }
    if (alert.confidence === null || alert.confidence === undefined) {
      alert.confidence = alert.metadata?.confidence || 'nominal'
    }
    // Final check for location name if not resolved
    if (!alert.location_name || alert.location_name === 'Unknown, Unknown') {
      if (alert.metadata && alert.metadata.location) {
        const parsed = parseWkbPoint(alert.metadata.location)
        if (parsed) {
          const tag = resolveSpatialTag(parsed.lon, parsed.lat)
          alert.location_name = tag.location_name
          alert.province = tag.province
          alert.district = tag.district
        }
      } else if (alert.fire_id && alert.fire_id.startsWith('FIRMS_')) {
        const parsed = parseCoordsFromFirmsId(alert.fire_id)
        if (parsed) {
          const tag = resolveSpatialTag(parsed.lon, parsed.lat)
          alert.location_name = tag.location_name
          alert.province = tag.province
          alert.district = tag.district
        }
      }
    }
  }

  return data
}

export async function resolveAlert(id: string) {
  const { error } = await supabase
    .from('triggered_alerts')
    .delete()
    .eq('id', id)

  if (error) throw error
  revalidatePath('/alerts')
}

