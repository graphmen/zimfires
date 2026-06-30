"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createAlertRule, updateAlertRule, type AlertRule } from "@/app/actions/alert-actions"
import { toast } from "sonner"
import { ZIMBABWE_PROVINCES_DISTRICTS } from "@/lib/zimbabwe_geography"

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  severity: z.enum(["critical", "high", "medium", "info"]),
  alert_type: z.enum(["FIRE", "UHI", "HEAT_RISK"]).default("FIRE"),
  province_filter: z.string().optional().nullable(),
  district_id: z.string().optional().nullable(),
  park_filter: z.string().optional().nullable(),
  min_frp: z.preprocess((val) => Number(val), z.number().min(0)).optional().nullable(),
  thermal_threshold: z.preprocess((val) => Number(val), z.number().min(0)).optional().nullable(),
  min_confidence: z.string().optional().nullable(),
  park_only: z.boolean().default(false),
  channels: z.array(z.string()).default([]),
})

interface AlertRuleFormProps {
  initialData?: AlertRule
  onSuccess?: () => void
}

export function AlertRuleForm({ initialData, onSuccess }: AlertRuleFormProps) {
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialData ? {
      ...initialData,
      min_frp: initialData.min_frp || 10,
      thermal_threshold: initialData.thermal_threshold || 35,
      district_id: initialData.district_id || "None",
      province_filter: initialData.province_filter || "All Provinces",
      park_filter: initialData.park_filter || "None",
      min_confidence: initialData.min_confidence || "nominal",
    } as any : {
      name: "",
      severity: "high",
      alert_type: "FIRE",
      province_filter: "All Provinces",
      district_id: "None",
      park_filter: "None",
      min_frp: 10,
      thermal_threshold: 35,
      min_confidence: "nominal",
      park_only: false,
      channels: ["Email"],
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          district_id: values.district_id === "None" ? null : values.district_id,
          province_filter: values.province_filter === "All Provinces" ? null : values.province_filter,
          park_filter: values.park_filter === "None" ? null : values.park_filter,
        } as any;

        if (initialData?.id) {
          await updateAlertRule(initialData.id, payload)
          toast.success("Alert rule updated successfully")
        } else {
          await createAlertRule(payload)
          toast.success("Alert rule created successfully")
        }
        onSuccess?.()
      } catch (error) {
        toast.error(initialData?.id ? "Failed to update alert rule" : "Failed to create alert rule")
        console.error(error)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Hwange Park Incursion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity</FormLabel>
                <Select onValueChange={(v) => v && field.onChange(v)} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="info">🔵 Info</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="alert_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hazard Type</FormLabel>
                <Select onValueChange={(v) => v && field.onChange(v)} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hazard" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FIRE">🔥 Wildfire Hotspot</SelectItem>
                    <SelectItem value="UHI">🏙️ Urban Heat Island</SelectItem>
                    <SelectItem value="HEAT_RISK">⚠️ Heat Risk (7D)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="province_filter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Province</FormLabel>
                <Select 
                  onValueChange={(val) => {
                    if (val) {
                      field.onChange(val)
                      form.setValue("district_id", "None") // Reset district when province changes
                    }
                  }} 
                  value={field.value || undefined}
                  defaultValue={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="All Provinces">All Provinces</SelectItem>
                    {Object.keys(ZIMBABWE_PROVINCES_DISTRICTS).map(prov => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district_id"
            render={({ field }) => {
              const selectedProvince = form.watch("province_filter")
              const availableDistricts = selectedProvince && selectedProvince !== "All Provinces"
                ? ZIMBABWE_PROVINCES_DISTRICTS[selectedProvince as keyof typeof ZIMBABWE_PROVINCES_DISTRICTS] || []
                : []

              return (
                <FormItem>
                  <FormLabel>Monitoring District</FormLabel>
                  <Select onValueChange={(v) => v && field.onChange(v)} value={field.value || undefined} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={availableDistricts.length > 0 ? "Select district" : "Select province first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="None">
                        {selectedProvince === "All Provinces" ? "Nationwide" : "All Districts (Province-wide)"}
                      </SelectItem>
                      {availableDistricts.map(dist => (
                        <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_confidence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min. Confidence</FormLabel>
                <Select onValueChange={(v) => v && field.onChange(v)} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select confidence" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">High Only</SelectItem>
                    <SelectItem value="nominal">Nominal or above</SelectItem>
                    <SelectItem value="low">Any</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("alert_type") === "FIRE" ? (
            <FormField
              control={form.control}
              name="min_frp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min. Power (MW)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="thermal_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temp Threshold (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription className="text-[10px]">Trigger if temperature exceeds this value.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="park_only"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Protected Areas Only
                </FormLabel>
                <FormDescription>
                  Only alert if fire is within a National Park or Safari Area.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (initialData?.id ? "Updating..." : "Creating...") : (initialData?.id ? "Update Alert Rule" : "Save Alert Rule")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
