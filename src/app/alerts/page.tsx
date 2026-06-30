"use client"

import * as React from "react"
import { 
  Plus, 
  Bell, 
  Trash2, 
  Edit2, 
  Power, 
  PowerOff, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Globe, 
  Cpu, 
  Layers, 
  ExternalLink,
  ChevronRight,
  Flame,
  Zap,
  Target,
  Radar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { AlertRuleForm } from "@/components/alerts/alert-rule-form"
import { getAlertRules, deleteAlertRule, toggleAlertRule, getTriggeredAlerts, resolveAlert, type AlertRule } from "@/app/actions/alert-actions"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ZIMBABWE_PROVINCES, ZIMBABWE_DISTRICTS } from "@/lib/constants"


export default function AlertsPage() {
  const [rules, setRules] = React.useState<AlertRule[]>([])
  const [triggered, setTriggered] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<AlertRule | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [selectedProvince, setSelectedProvince] = React.useState("all")
  const [selectedDistrict, setSelectedDistrict] = React.useState("all")


  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [rulesData, triggeredData] = await Promise.all([
        getAlertRules(),
        getTriggeredAlerts()
      ])
      setRules(rulesData)
      setTriggered(triggeredData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    toast.promise(deleteAlertRule(id), {
      loading: 'Decommissioning surveillance rule...',
      success: () => {
        fetchData()
        return 'Rule purged from surveillance network.'
      },
      error: 'Failed to purge rule.'
    })
  }

  const handleToggle = async (id: string, current: boolean) => {
    toast.promise(toggleAlertRule(id, !current), {
      loading: `${!current ? 'Initializing' : 'Hibernating'} surveillance node...`,
      success: () => {
        fetchData()
        return `Rule ${!current ? 'active' : 'paused'}.`
      },
      error: 'Failed to toggle rule state.'
    })
  }

  const handleResolve = async (id: string) => {
    toast.promise(resolveAlert(id), {
      loading: 'Acknowledging tactical event...',
      success: () => {
        fetchData()
        return 'Event resolved and archived.'
      },
      error: 'Failed to resolve event.'
    })
  }

  const handleSync = () => {
    setIsSyncing(true)
    toast.promise(fetchData(), {
      loading: 'Handshaking with surveillance nodes...',
      success: () => {
        setIsSyncing(false)
        return 'Intelligence feed synchronized.'
      },
      error: () => {
        setIsSyncing(false)
        return 'Sync failed.'
      }
    })
  }

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setIsDialogOpen(true)
  }

  if (loading && triggered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
             <Radar className="h-16 w-16 text-orange-500 animate-spin relative z-10" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Synchronizing Surveillance Network</p>
            <div className="h-1 w-64 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-orange-500 animate-progress origin-left" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#f8fafc] dark:bg-[#020617] overflow-hidden">
    <div className="flex flex-col h-full bg-zinc-50/50">
        {/* Action Controls Sub-Header */}
        <div className="flex-none bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Surveillance Intelligence Hub</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-200" />
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Logic Node</span>
                  <span className="text-[10px] font-bold text-zinc-900">THREAT-ARCH-01</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Dialog open={isDialogOpen} onOpenChange={(open) => {
               setIsDialogOpen(open)
               if (!open) setEditingRule(null)
             }}>
                <DialogTrigger 
                  render={
                    <Button className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-900/20 active:scale-95 transition-all">
                      <Plus className="mr-2 h-3 w-3" /> New Surveillance Node
                    </Button>
                  }
                />
               <DialogContent className="sm:max-w-[600px] border-none shadow-2xl rounded-3xl overflow-hidden">
                 <DialogHeader className="p-6 bg-emerald-700 text-white m-0">
                   <DialogTitle className="text-xl font-heading font-black uppercase tracking-tighter">{editingRule ? "Modify Surveillance Parameters" : "Initialize Surveillance Node"}</DialogTitle>
                   <DialogDescription className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] mt-2">
                     {editingRule ? "Adjusting logical triggers for active monitoring." : "Establishing automated fire notification protocol."}
                   </DialogDescription>
                 </DialogHeader>
                 <div className="p-6">
                  <AlertRuleForm 
                    initialData={editingRule || undefined}
                    onSuccess={() => {
                      setIsDialogOpen(false)
                      setEditingRule(null)
                      fetchData()
                    }} 
                  />
                 </div>
               </DialogContent>
             </Dialog>
             <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={isSyncing}
              className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-white border-2 border-zinc-200 hover:bg-zinc-50 transition-all active:scale-95"
             >
                {isSyncing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />} 
                Refresh Feed
             </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border-b border-zinc-200 px-8 py-3 z-20">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
              <Input 
                placeholder="Query event logs by node, region, or severity..." 
                className="pl-9 h-9 bg-zinc-50 border-zinc-200 shadow-none text-xs font-bold focus-visible:ring-1 focus-visible:ring-orange-500/30"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={selectedProvince} onValueChange={(v) => { if (v) { setSelectedProvince(v); setSelectedDistrict("all"); } }}>
                <SelectTrigger className="h-9 w-[180px] bg-zinc-50 border-zinc-200 text-[10px] font-black uppercase tracking-widest">
                  <Globe className="mr-2 h-3 w-3 text-emerald-600" />
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">ALL PROVINCES</SelectItem>
                  {ZIMBABWE_PROVINCES.map(p => <SelectItem key={p} value={p} className="text-[10px] font-bold uppercase">{p}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedDistrict} onValueChange={(v) => { if (v) setSelectedDistrict(v); }} disabled={selectedProvince === 'all'}>
                <SelectTrigger className="h-9 w-[180px] bg-zinc-50 border-zinc-200 text-[10px] font-black uppercase tracking-widest">
                  <Filter className="mr-2 h-3 w-3 text-emerald-600" />
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">ALL DISTRICTS</SelectItem>
                  {ZIMBABWE_DISTRICTS[selectedProvince]?.map(d => <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
          {/* Tactical Event Log Matrix */}
          <div className="lg:col-span-3 border-r flex flex-col bg-white dark:bg-zinc-900/30 overflow-hidden">
            <Tabs defaultValue="triggered" className="flex-1 flex flex-col overflow-hidden">
               <div className="px-6 py-2 border-b bg-primary/5 flex items-center justify-between">
                <TabsList className="bg-transparent border-none gap-6 h-auto p-0">
                  <TabsTrigger 
                    value="triggered" 
                    className="text-[10px] font-heading font-black uppercase tracking-[0.2em] p-0 h-8 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent shadow-none"
                  >
                    Tactical Event Log
                    {triggered.length > 0 && (
                      <Badge className="ml-2 bg-orange-600 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[8px] font-black text-white">{triggered.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rules" 
                    className="text-[10px] font-heading font-black uppercase tracking-[0.2em] p-0 h-8 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent shadow-none"
                  >
                    Surveillance Configuration
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-1.5">
                   <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(45,122,49,0.5)] animate-pulse" />
                   <span className="text-[8px] font-black tracking-widest text-primary/60 uppercase">REAL-TIME MONITORING ACTIVE</span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="triggered" className="m-0 p-0 h-full flex flex-col">
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur z-10">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-6">Timestamp</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Location Vector</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Trigger Source</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Thermal Profile</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Priority</TableHead>
                          <TableHead className="text-right text-[9px] font-black uppercase tracking-widest h-10 px-6">Resolution</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {triggered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-[400px] text-center">
                               <div className="flex flex-col items-center gap-4 opacity-50">
                                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                     <ShieldCheck className="h-8 w-8 text-emerald-600" />
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-xs font-black uppercase tracking-widest">No Active Threats</p>
                                     <p className="text-[10px] font-bold text-muted-foreground">All surveillance nodes reporting normal thermal activity.</p>
                                  </div>
                               </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          triggered.map((alert) => (
                            <TableRow key={alert.id} className="group hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-colors border-none">
                              <TableCell className="px-6 py-3">
                                <div className="font-black text-[11px] tabular-nums">{formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(alert.detected_at).toLocaleTimeString()}</div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                   <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                   <span className="font-black text-[11px] uppercase tracking-tight">
                                     {alert.district ? `${alert.district}, ${alert.province}` : alert.location_name}
                                   </span>
                                </div>
                                {alert.ward && <div className="text-[9px] font-bold text-muted-foreground ml-3.5 uppercase">Ward {alert.ward}</div>}
                              </TableCell>
                              <TableCell className="py-3">
                                 <Badge variant="outline" className="text-[9px] font-black uppercase border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-1.5">
                                    {alert.alert_rules?.name || 'MANUAL OVERRIDE'}
                                 </Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                 <div className="text-[10px] font-black space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                       <Zap className="h-3 w-3 text-orange-500" />
                                       <span>{alert.frp} MW</span>
                                    </div>
                                    <div className="text-muted-foreground uppercase text-[8px]">{alert.confidence} Sensor Confidence</div>
                                 </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge className={`h-5 px-2 rounded-full font-black text-[8px] uppercase tracking-widest border-none shadow-sm ${
                                  alert.severity === 'critical' ? 'bg-orange-600 text-white' : 
                                  alert.severity === 'high' ? 'bg-orange-500 text-white' :
                                  alert.severity === 'medium' ? 'bg-yellow-500 text-black' :
                                  'bg-emerald-600 text-white'
                                }`}>
                                  {alert.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right px-6 py-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all border-2 active:scale-95"
                                  onClick={() => handleResolve(alert.id)}
                                >
                                  Decommission Alert
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="rules" className="m-0 p-0 h-full flex flex-col">
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur z-10">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-6">Node Identifier</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Severity</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Spatial Target</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Logical Triggers</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Power</TableHead>
                          <TableHead className="text-right text-[9px] font-black uppercase tracking-widest h-10 px-6">Matrix Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-[400px] text-center">
                               <div className="flex flex-col items-center gap-4 opacity-50">
                                  <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center">
                                     <Radar className="h-8 w-8 text-zinc-400" />
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-xs font-black uppercase tracking-widest">No Active Nodes</p>
                                     <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} className="h-8 font-black uppercase text-[9px]">Configure First Node</Button>
                                  </div>
                               </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          rules.map((rule) => (
                            <TableRow key={rule.id} className="group hover:bg-zinc-50 transition-colors border-none">
                              <TableCell className="px-6 py-3">
                                <div className="font-black text-[11px] uppercase tracking-tight">{rule.name}</div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">NODE ID: {rule.id?.substring(0, 8)}</div>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge variant="outline" className={`h-5 px-2 rounded-full font-black text-[8px] uppercase tracking-widest border-none ${
                                  rule.severity === 'critical' ? 'bg-orange-500/10 text-orange-600' : 
                                  rule.severity === 'high' ? 'bg-orange-500/10 text-orange-600' :
                                  rule.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-600' :
                                  'bg-emerald-500/10 text-emerald-600'
                                }`}>
                                  {rule.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                   <Globe className="h-3 w-3 text-zinc-400" />
                                   <span className="font-black text-[10px] uppercase tracking-tight">
                                      {rule.park_only ? "PROTECTED AREAS ONLY" : rule.province_filter || "NATIONWIDE"}
                                   </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                 <div className="text-[10px] font-black space-y-0.5">
                                    <div className="text-zinc-600 uppercase tracking-tighter">FRP &ge; {rule.min_frp} MW</div>
                                    <div className="text-muted-foreground uppercase text-[8px]">{rule.min_confidence} CONFIDENCE THRESHOLD</div>
                                 </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <Switch 
                                    checked={rule.is_active} 
                                    onCheckedChange={() => handleToggle(rule.id!, rule.is_active!)}
                                    className="scale-75"
                                  />
                                  <span className={cn("text-[10px] font-black uppercase tracking-widest", rule.is_active ? "text-emerald-600" : "text-zinc-400")}>
                                     {rule.is_active ? 'ONLINE' : 'OFFLINE'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-6 py-3">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(rule)}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-orange-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleDelete(rule.id!)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Operational Recon Panel */}
          <div className="hidden lg:flex flex-col bg-zinc-950 border-l border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                <span className="text-[10px] font-heading font-black text-white uppercase tracking-widest">Operational Recon</span>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-none text-[8px] font-black">HIGH PRIORITY</Badge>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Threat Vector Analysis</span>
                  <span className="text-[10px] text-zinc-500">NODE ALPHA-01</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white">
                  <div className="relative z-10">
                    <h4 className="text-sm font-bold text-white mb-1.5">Automated Protocol</h4>
                    <p className="text-[10px] text-zinc-400 font-normal leading-relaxed">
                      Surveillance clusters are tuned for high-confidence VIIRS detections.
                      Automated alerts dispatch within 180 seconds of sensor validation.
                    </p>
                    <div className="mt-2.5 flex items-center gap-6">
                      <div>
                        <div className="text-[9px] text-zinc-400 uppercase tracking-wide">Active Dispatch</div>
                        <div className="text-xs font-bold text-orange-400">1.2 sec</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-400 uppercase tracking-wide">Node Latency</div>
                        <div className="text-xs font-bold text-emerald-400">42ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-2">Intelligence Metrics</div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Active Rules', val: rules.length, icon: Cpu, color: 'text-emerald-400' },
                    { label: 'Threats (24h)', val: triggered.length, icon: Flame, color: 'text-orange-400' },
                    { label: 'Network Reach', val: '10 Provinces', icon: Globe, color: 'text-emerald-400' },
                    { label: 'Node Uptime', val: '99.98%', icon: Activity, color: 'text-emerald-400' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <item.icon className={cn('h-3.5 w-3.5', item.color)} />
                        <span className="text-[10px] font-medium text-zinc-300">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-white tabular-nums">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-orange-500/20 bg-orange-500/10">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-bold text-orange-400 mb-0.5">Escalation Protocol</h5>
                    <p className="text-[9px] text-orange-300/80 leading-relaxed">
                      All Critical severity events are automatically escalated to the National EOC within 60 seconds of trigger validation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
