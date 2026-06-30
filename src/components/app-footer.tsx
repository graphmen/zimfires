"use client"

import * as React from "react"
import { ExternalLink, MapPin, Phone, Mail, Globe, Satellite, Shield, AlertTriangle, Flame, Radio } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function AppFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-primary text-emerald-50/70 border-t border-white/10 mt-auto">
      {/* Main Footer Grid */}
      <div className="px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

        {/* Column 1 — ZINGSA Branding */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 shadow-xl border border-white/10">
              <Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />
            </div>
            <div>
              <p className="font-heading font-black text-white text-lg leading-none tracking-tighter uppercase">ZimFireWatch</p>
              <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-[0.2em] mt-1">by ZINGSA</p>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed font-medium">
            A near real-time wildfire detection and early warning platform developed by the Zimbabwe
            National Geospatial and Space Agency (ZINGSA) to support national disaster management
            and environmental monitoring.
          </p>
          <a
            href="https://zingsa.ac.zw/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[11px] font-black text-white hover:text-emerald-200 transition-colors group"
          >
            <Globe className="h-4 w-4" />
            ZINGSA.AC.ZW
            <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
          </a>
        </div>

        {/* Column 2 — Mandate & Mission */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white border-b border-white/10 pb-2">
            National Mandate
          </h3>
          <ul className="space-y-4">
            {[
              { icon: Satellite, text: "Earth Observation & Remote Sensing" },
              { icon: Shield, text: "National Disaster Risk Reduction" },
              { icon: AlertTriangle, text: "Environmental Hazard Monitoring" },
              { icon: Flame, text: "Veld Fire Early Warning Systems" },
              { icon: Radio, text: "Geospatial Data for Crisis Response" },
              { icon: MapPin, text: "National Spatial Data Infrastructure" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[12px] font-medium">
                <Icon className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Disaster & Fire Info */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white border-b border-white/10 pb-2">
            Crisis Monitoring
          </h3>
          <div className="space-y-4 text-[12px] leading-relaxed font-medium">
            <p>
              Zimbabwe experiences severe veld fire seasons annually, particularly between
              <span className="text-white font-bold"> July and October</span>, affecting
              communal lands, national parks, and commercial farms.
            </p>
            <p>
              Fire data is sourced from NASA FIRMS (<span className="text-white font-bold">VIIRS &amp; MODIS</span>)
              sensors with near real-time latency of approximately 3 hours from overpass.
            </p>
          </div>
        </div>

        {/* Column 4 — Contact */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white border-b border-white/10 pb-2">
            Contact ZINGSA
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-[12px] font-medium">
              <MapPin className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
              <span>
                630 Churchill, Mount Pleasant,<br />
                Harare, Zimbabwe<br />
                <span className="text-emerald-400/60">Zimbabwe Science Park 1,<br />University of Zimbabwe</span>
              </span>
            </li>
            <li className="flex items-center gap-3 text-[12px] font-medium">
              <Phone className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <a href="tel:+2638677009885" className="hover:text-white transition-colors font-bold">+263 8677009885</a>
            </li>
            <li className="flex items-center gap-3 text-[12px] font-medium">
              <Mail className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <a href="mailto:publicrelations@zingsa.ac.zw" className="hover:text-white transition-colors font-bold text-xs uppercase tracking-tighter">publicrelations@zingsa.ac.zw</a>
            </li>
          </ul>

          <Separator className="bg-white/10 my-4" />

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Integrated Data Nodes</p>
            {["NASA FIRMS", "ESA WorldCover 10m", "Google Earth Engine", "OpenStreetMap"].map(src => (
              <p key={src} className="text-[11px] font-bold text-emerald-50">• {src}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-950/20">
        <p className="text-[11px] font-bold text-emerald-400/60">
          © {currentYear} ZINGSA. ALL RIGHTS RESERVED.
        </p>
        <p className="text-[11px] text-emerald-400/60 text-center font-medium">
          Official Monitoring Stream. Emergency Response:
          <span className="text-orange-400 font-black ml-1 uppercase tracking-widest">CPU Hotline 993</span>
        </p>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">
           SYSTEM_V2.0.0
        </div>
      </div>
    </footer>
  )
}
