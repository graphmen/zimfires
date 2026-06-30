"use client"

import * as React from "react"
import { 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  Activity,
  ArrowRight,
  Flame,
  Globe
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { getSystemStatus, getSyncJobs, triggerSync } from "@/app/actions/sync-actions"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

export default function SyncPage() {
  const [status, setStatus] = React.useState<any>(null)
  const [jobs, setJobs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  
  const [dataset, setDataset] = React.useState("VIIRS_SNPP_NRT")
  const [days, setDays] = React.useState("3")

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [statusData, jobsData] = await Promise.all([
        getSystemStatus(),
        getSyncJobs()
      ])
      setStatus(statusData)
      setJobs(jobsData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
    // Poll for status every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleTriggerSync = async () => {
    setSyncing(true)
    try {
      await triggerSync(dataset, parseInt(days))
      toast.success("Sync job dispatched to background")
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Failed to trigger sync")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50/50">
        {/* Action Controls Sub-Header */}
        <div className="flex-none bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">NASA FIRMS Ingestion Hub</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-200" />
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Active Node</span>
                  <span className="text-[10px] font-bold text-zinc-900">NASA-FIRMS-INGEST</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
              className="h-8 font-black text-[9px] uppercase tracking-[0.15em] bg-white border-2 border-zinc-200 hover:bg-zinc-50 transition-all active:scale-95"
             >
                {loading ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />} 
                Refresh Hub
             </Button>
          </div>
        </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-6xl mx-auto w-full space-y-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {/* System Health Card */}
            <Card className="border shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 border-b bg-muted/5">
                <CardTitle className="text-xs font-heading font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                  <Activity className="h-3.5 w-3.5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">API Status</span>
                    <Badge variant={status?.status === 'operational' ? 'outline' : 'destructive'} className="h-4 text-[8px] font-black tracking-widest">
                       {status?.status?.toUpperCase() || 'OFFLINE'}
                    </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Database</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight">
                       <div className={`h-1.5 w-1.5 rounded-full ${status?.database === 'connected' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                       {status?.database === 'connected' ? 'Connected' : 'Disconnected'}
                    </div>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Observations</span>
                    <span className="text-[10px] font-black tabular-nums">{status?.counts?.fires?.toLocaleString() || '0'}</span>
                 </div>
              </CardContent>
            </Card>

            {/* API Config Card */}
            <Card className="border shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 border-b bg-muted/5">
                <CardTitle className="text-xs font-heading font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  NASA FIRMS Config
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">API Key</span>
                    <Badge variant="outline" className="h-4 text-[8px] font-black tracking-widest border-primary/20 text-primary bg-primary/5">
                       CONFIGURED
                    </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Key Status</span>
                    <span className="text-[10px] font-black text-primary uppercase">Valid</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Restriction</span>
                    <span className="text-[10px] font-black uppercase">ZWE (Zimbabwe)</span>
                 </div>
              </CardContent>
            </Card>

            {/* Sync Trigger Card */}
            <Card className="border-2 border-orange-500/20 bg-orange-500/5 rounded-2xl overflow-hidden shadow-lg shadow-orange-900/5">
              <CardHeader className="pb-2 border-b border-orange-500/10 bg-orange-500/10">
                <CardTitle className="text-xs font-heading font-black uppercase tracking-widest flex items-center gap-2 text-orange-600">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  Manual Ingestion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                       <label className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Dataset</label>
                       <Select value={dataset} onValueChange={(v) => v && setDataset(v)}>
                          <SelectTrigger className="h-8 text-[10px] font-bold bg-background border-none shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MODIS_NRT" className="text-[10px] font-bold">MODIS (C6.1)</SelectItem>
                            <SelectItem value="VIIRS_SNPP_NRT" className="text-[10px] font-bold">VIIRS (S-NPP)</SelectItem>
                            <SelectItem value="VIIRS_NOAA20_NRT" className="text-[10px] font-bold">VIIRS (NOAA-20)</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Lookback</label>
                       <Select value={days} onValueChange={(v) => v && setDays(v)}>
                          <SelectTrigger className="h-8 text-[10px] font-bold bg-background border-none shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1" className="text-[10px] font-bold">1 Day</SelectItem>
                            <SelectItem value="3" className="text-[10px] font-bold">3 Days</SelectItem>
                            <SelectItem value="7" className="text-[10px] font-bold">7 Days</SelectItem>
                            <SelectItem value="10" className="text-[10px] font-bold">10 Days</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>
                 <Button 
                    className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-orange-500 hover:bg-orange-600 text-white active:scale-95 transition-all shadow-lg shadow-orange-900/20" 
                    onClick={handleTriggerSync}
                    disabled={syncing || status?.status !== 'operational'}
                 >
                    {syncing ? "Dispatched..." : "Execute Sync Now"}
                 </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
             {/* Recent Jobs Table */}
             <Card className="lg:col-span-2 border shadow-sm overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/5 border-b py-3">
                   <CardTitle className="text-xs font-heading font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      Recent Ingestion Jobs
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <Table>
                      <TableHeader className="bg-muted/5">
                         <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="text-[8px] uppercase font-black tracking-widest h-8 px-6">Job ID / Dataset</TableHead>
                            <TableHead className="text-[8px] uppercase font-black tracking-widest h-8">Status</TableHead>
                            <TableHead className="text-[8px] uppercase font-black tracking-widest h-8">Processed</TableHead>
                            <TableHead className="text-[8px] uppercase font-black tracking-widest h-8">Started</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {loading && jobs.length === 0 ? (
                            <TableRow>
                               <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Loading sync history...</TableCell>
                            </TableRow>
                         ) : jobs.length === 0 ? (
                            <TableRow>
                               <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">No sync history found.</TableCell>
                            </TableRow>
                         ) : (
                            jobs.map((job) => (
                               <TableRow key={job.id} className="hover:bg-primary/5 transition-colors border-b border-zinc-50">
                                  <TableCell className="px-6 py-3">
                                     <div className="font-black text-[11px] uppercase tracking-tight text-zinc-800">{job.dataset}</div>
                                     <div className="text-[8px] text-muted-foreground font-mono truncate w-32 uppercase">NODE-{job.id?.substring(0, 8)}</div>
                                  </TableCell>
                                  <TableCell>
                                     <div className="flex items-center gap-1.5">
                                        {job.status === 'completed' ? (
                                           <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        ) : job.status === 'running' ? (
                                           <RefreshCw className="h-3 w-3 text-emerald-500 animate-spin" />
                                        ) : (
                                           <AlertCircle className="h-3 w-3 text-orange-500" />
                                        )}
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                                           job.status === 'completed' ? 'text-emerald-600' : 
                                           job.status === 'running' ? 'text-blue-600' : 'text-red-600'
                                        }`}>
                                           {job.status}
                                        </span>
                                     </div>
                                  </TableCell>
                                  <TableCell>
                                     <span className="text-[11px] font-black tabular-nums">{job.records_processed?.toLocaleString() || 0} RECS</span>
                                  </TableCell>
                                  <TableCell>
                                     <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                     </span>
                                  </TableCell>
                               </TableRow>
                            ))
                         )}
                      </TableBody>
                   </Table>
                </CardContent>
             </Card>

             {/* Info Card */}
             <Card className="border shadow-sm bg-muted/5 rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-3">
                   <CardTitle className="text-xs font-heading font-black uppercase tracking-widest text-primary">Intelligence Protocols</CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] p-6 space-y-4 text-muted-foreground font-medium leading-relaxed">
                   <p>
                      The system fetches Near Real-Time (NRT) fire detection data from NASA's Fire Information for Resource Management System (FIRMS).
                   </p>
                   <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                         <span><b className="text-zinc-900 uppercase">MODIS:</b> 1km resolution, updated 4x daily cycle.</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                         <span><b className="text-zinc-900 uppercase">VIIRS:</b> 375m resolution, maximum thermal sensitivity.</span>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-zinc-200">
                      <p className="font-bold text-zinc-800 uppercase text-[9px] tracking-widest mb-2">Automated Scheduling</p>
                      <p>
                        Background logic executes handshakes every 6 hours. Manual overrides force immediate validation of tactical feeds.
                      </p>
                   </div>
                    <a 
                      href="https://firms.modaps.eosdis.nasa.gov/api/area/" 
                      target="_blank" 
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm", className: "w-full text-[9px] font-black h-8 uppercase tracking-widest mt-4 border-2 hover:bg-primary hover:text-white transition-all" }))}
                    >
                       FIRMS API Documentation <ArrowRight className="ml-1 h-3 w-3" />
                    </a>
                </CardContent>
             </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
