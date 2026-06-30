"use client"

import * as React from "react"
import {
  Bell,
  Flame,
  History,
  LayoutDashboard,
  Map,
  RefreshCw,
  Settings,
  TreePine,
  TrendingUp,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
const navItems = [
  {
    title: "Monitoring",
    items: [
      { title: "Map Explorer", icon: Map, url: "/" },
      { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
      { title: "Sync NASA FIRMS", icon: RefreshCw, url: "#", action: "sync" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { title: "Trends", icon: TrendingUp, url: "/trends" },
      { title: "Historical Dossiers", icon: History, url: "/history" },
      { title: "Archive Intelligence", icon: Flame, url: "/burned-area" },
    ],
  },
  {
    title: "Protected Areas",
    items: [
      { title: "National Parks", icon: TreePine, url: "/national-parks" },
      { title: "Alerts", icon: Bell, url: "/alerts" },
      { title: "Risk Zones", icon: TriangleAlert, url: "/risk-zones" },
    ],
  },
]

import { syncFirmsData } from "@/app/actions/sync-firms"
import { toast } from "sonner"

export function AppSidebar() {
  const [isSyncing, startSync] = React.useTransition()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleSync = () => {
    startSync(async () => {
      const result = await syncFirmsData()
      if (result.success) {
        toast.success(`Sync complete! Processed ${result.processed} records.`)
      } else {
        toast.error(`Sync failed: ${result.note || "Check NASA API Connectivity"}`)
      }
    })
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-200 shadow-sm transition-all duration-300">
      <div className="flex flex-col h-full bg-white">
        {!isCollapsed && (
          <div className="flex h-20 items-center px-6 border-b border-zinc-100 bg-white shadow-sm transition-opacity duration-200">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-900/20">
                   <Flame className="h-5 w-5 text-white fill-white/20" />
                </div>
                <div className="flex flex-col">
                   <h3 className="text-[13px] font-heading font-black text-zinc-900 uppercase leading-none tracking-tighter">ZimFireWatch</h3>
                   <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Command Node</span>
                </div>
             </div>
          </div>
        )}
        <SidebarContent className={cn("bg-transparent", isCollapsed && "pt-4")}>
        {navItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      render={item.action === "sync" ? <button onClick={handleSync} disabled={isSyncing} className="w-full text-left" /> : <a href={item.url} />} 
                      tooltip={item.title}
                      className="hover:bg-zinc-50 hover:text-primary transition-colors py-5"
                    >
                      {item.action === "sync" && isSyncing ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <item.icon className="h-4 w-4" />
                      )}
                      <span className="font-bold text-[13px] tracking-tight">{item.action === "sync" && isSyncing ? "Syncing..." : item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-zinc-100 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="/settings" />} tooltip="Settings" className="hover:bg-zinc-50 hover:text-primary transition-colors">
              <Settings className="h-4 w-4" />
              <span className="font-bold text-[13px] tracking-tight">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </div>
  </Sidebar>
  )
}
