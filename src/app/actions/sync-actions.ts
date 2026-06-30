"use server"

import { revalidatePath } from "next/cache"

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8000"
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "zimfire-admin-key-2026"

export async function getSystemStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/diagnostic/status`, {
      cache: 'no-store'
    })
    if (!res.ok) throw new Error("Backend unreachable")
    return await res.json()
  } catch (error) {
    console.error("Error fetching system status:", error)
    return { status: "offline", error: "Could not connect to backend API" }
  }
}

export async function getSyncJobs() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/ingest/jobs`, {
      cache: 'no-store'
    })
    if (!res.ok) throw new Error("Failed to fetch jobs")
    return await res.json()
  } catch (error) {
    console.error("Error fetching sync jobs:", error)
    return []
  }
}

export async function triggerSync(dataset: string, days: number) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/ingest/sync?dataset=${dataset}&days=${days}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`
        },
        cache: 'no-store'
      }
    )
    
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Failed to trigger sync")
    }
    
    revalidatePath('/sync')
    return await res.json()
  } catch (error: any) {
    console.error("Error triggering sync:", error)
    throw error
  }
}
