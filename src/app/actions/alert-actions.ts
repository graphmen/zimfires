"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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

export async function getTriggeredAlerts() {
  const { data, error } = await supabase
    .from('triggered_alerts')
    .select('*, alert_rules(name, severity)')
    .order('detected_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching triggered alerts:", error)
    return []
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

