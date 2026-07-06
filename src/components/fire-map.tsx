"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useSearchParams } from "next/navigation"
import * as turf from "@turf/turf"


interface FireMapProps {
  style?: string
  center?: [number, number]
  zoom?: number
  className?: string
  activeLayers?: Record<string, boolean>
  time?: string
  historicalYear?: number
  onIncidentClick?: (info: any) => void
  hotspots?: any[]
  riskZones?: any[]
  mappingMode?: 'simple' | 'time' | 'heatmap'
  layerOpacities?: Record<string, number>
}

export function FireMap({
  style = 'osm',
  center = [30.0, -19.0],
  zoom = 6,
  className,
  activeLayers = {},
  time = new Date().toISOString().split('T')[0],
  historicalYear = 2024,
  onIncidentClick,
  hotspots = [],
  riskZones = [],
  mappingMode = 'simple',
  layerOpacities = {}
}: FireMapProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<maplibregl.Map | null>(null)
  const marker = React.useRef<maplibregl.Marker | null>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Use a valid date for GIBS if the current year is in the future (for demo)
  const effectiveTime = React.useMemo(() => {
    const d = new Date(time)
    // If date is too far in future, use today. If it's valid 2026, use it.
    const now = new Date()
    if (d > now) return now.toISOString().split('T')[0]
    return time
  }, [time])

  const searchParams = useSearchParams()
  const targetParkId = searchParams.get('park')

  const basemaps: Record<string, any> = {
    midnight: {
      id: 'carto-dark',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '&copy; CartoDB'
    },
    osm: {
      id: 'osm',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap'
    },
    satellite: {
      id: 'google-satellite',
      tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
      tileSize: 256,
      attribution: '&copy; Google Imagery'
    },
    hybrid: {
      id: 'google-hybrid',
      tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
      tileSize: 256,
      attribution: '&copy; Google Hybrid'
    }
  }

  const syncLayers = React.useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return
    const m = map.current

    // Helper to enforce visual rendering hierarchy
    const boundaryMaskLayerId = 'zim-boundary-mask-layer'
    const maskLayerId = 'zim-mask-layer'
    const reorderMapLayers = () => {
      const order = [
        'basemap-layer',
        'nasa-burned-layer', 
        'nasa-ndvi-layer', 
        'nasa-fires-layer',
        'gee-burned-layer',
        'gee-vegetation-layer',
        'gee-urbanHeat-layer',
        'gee-heatVulnerability-layer',
        'gee-landcover-layer',
        boundaryMaskLayerId, // Draw boundary mask exactly on top of all raster layers
        'local-parks-layer',
        'local-histBurned-layer',
        'local-provinces-layer',
        'local-districts-layer',
        'local-wards-layer',
        maskLayerId,
        'local-histFires-layer',
        hotspotsHeatmapId,
        hotspotsGlowId,
        hotspotsLayerId,
        'risk-zones-layer-outer',
        'risk-zones-layer',
        'risk-zones-labels'
      ]
      
      const layers = m.getStyle().layers || []
      const currentOrder = layers.map(l => l.id)
      
      let changed = true
      let passes = 0
      const maxPasses = 100 // Prevent any potential infinite loop
      
      while (changed && passes < maxPasses) {
        changed = false
        passes++
        
        for (let i = 0; i < order.length - 1; i++) {
          const layerId = order[i]
          const nextLayerId = order[i + 1]
          
          if (m.getLayer(layerId) && m.getLayer(nextLayerId)) {
            const idx = currentOrder.indexOf(layerId)
            const nextIdx = currentOrder.indexOf(nextLayerId)
            
            if (idx !== -1 && nextIdx !== -1 && idx > nextIdx) {
              try {
                m.moveLayer(layerId, nextLayerId)
                
                // Update our local tracking array
                currentOrder.splice(idx, 1)
                const newInsertIdx = currentOrder.indexOf(nextLayerId)
                currentOrder.splice(newInsertIdx, 0, layerId)
                
                changed = true
              } catch (e) {
                console.error("Error moving layer:", e)
              }
            }
          }
        }
      }
    }

    // 1. Sync Basemap
    const selectedBase = basemaps[style] || basemaps.osm
    if (!m.getSource('basemap-source')) {
      m.addSource('basemap-source', {
        type: 'raster',
        tiles: selectedBase.tiles,
        tileSize: selectedBase.tileSize,
        attribution: selectedBase.attribution
      })
      m.addLayer({ id: 'basemap-layer', type: 'raster', source: 'basemap-source' })
    } else {
      const source = m.getSource('basemap-source') as maplibregl.RasterTileSource
      if (source.tiles && source.tiles[0] !== selectedBase.tiles[0]) source.setTiles(selectedBase.tiles)
    }

    // 2. NASA GIBS WMS Layers (Using standard WMS for maximum compatibility)
    const nasaLayers: Record<string, any> = {
      fires: {
        id: 'nasa-fires',
        url: `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=VIIRS_SNPP_Thermal_Anomalies_375m_All&TIME=${effectiveTime}&TRANSPARENT=TRUE&FORMAT=image/png&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}`
      },
      burned: {
        id: 'nasa-burned',
        url: `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=VIIRS_SNPP_CorrectedReflectance_BandsM11I2I1&TIME=${effectiveTime}&TRANSPARENT=TRUE&FORMAT=image/png&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}`
      },
      vegetation: {
        id: 'nasa-ndvi',
        url: `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MODIS_Terra_L3_NDVI_Monthly&TIME=${effectiveTime}&TRANSPARENT=TRUE&FORMAT=image/png&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}`
      }
    }

    Object.entries(nasaLayers).forEach(([key, def]) => {



      const isVisible = key === 'fires' ? false : activeLayers[key] // Disable WMS fires to show only clipped GeoJSON
      const sourceId = `${def.id}-source`
      const layerId = `${def.id}-layer`
      if (isVisible) {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, { 
            type: 'raster', 
            tiles: [def.url], 
            tileSize: 256,
            bounds: [-180, -85, 180, 85]
          })
          const beforeId = m.getLayer(boundaryMaskLayerId) 
            ? boundaryMaskLayerId 
            : (m.getLayer('local-provinces-layer') ? 'local-provinces-layer' : undefined);
          const opacity = layerOpacities[key] ?? 0.8
          m.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': opacity } }, beforeId)
        } else {
          const opacity = layerOpacities[key] ?? 0.8
          m.setPaintProperty(layerId, 'raster-opacity', opacity)
          const source = m.getSource(sourceId) as maplibregl.RasterTileSource
          if (source.tiles && source.tiles[0] !== def.url) source.setTiles([def.url])
        }
      } else {
        if (m.getLayer(layerId)) m.removeLayer(layerId)
        if (m.getSource(sourceId)) m.removeSource(sourceId)
      }
    })

    // 3. GEE Layers (Urban Heat & Assessment)
    const geeLayers = [
      { id: 'burned', type: 'burned' },
      { id: 'vegetation', type: 'vegetation' },
      { id: 'urbanHeat', type: 'uhi' },
      { id: 'heatVulnerability', type: 'heat' },
      { id: 'landcover', type: 'landcover' }
    ];

    geeLayers.forEach(({ id, type }) => {
      const sourceId = `gee-${id}-source`;
      const layerId = `gee-${id}-layer`;

      if (activeLayers[id]) {
        if (!m.getSource(sourceId)) {
          // Fetch the tile URL from our API
          fetch(`/api/gee/tiles?type=${type}`)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then(data => {
              if (data.url && !m.getSource(sourceId)) {
                console.log(`GEE Layer Loaded [${id}]:`, data.url);
                m.addSource(sourceId, { 
                  type: 'raster', 
                  tiles: [data.url], 
                  tileSize: 256,
                  bounds: [-180, -85, 180, 85]
                });
                const beforeId = m.getLayer(boundaryMaskLayerId) 
                  ? boundaryMaskLayerId 
                  : (m.getLayer('local-provinces-layer') ? 'local-provinces-layer' : undefined);
                const opacity = layerOpacities[id] ?? 0.8
                m.addLayer({ 
                  id: layerId, 
                  type: 'raster', 
                  source: sourceId, 
                  paint: { 'raster-opacity': opacity } 
                }, beforeId);

                // Re-evaluate Z-indexing stack once async layer is loaded
                reorderMapLayers();
              }
            })
            .catch(() => {});
        } else if (m.getLayer(layerId)) {
          const opacity = layerOpacities[id] ?? 0.8
          m.setPaintProperty(layerId, 'raster-opacity', opacity);
        }
      } else {
        if (m.getLayer(layerId)) m.removeLayer(layerId);
        if (m.getSource(sourceId)) m.removeSource(sourceId);
      }
    });

    // 4. Local GeoJSON Layers
    const geojsonLayers: Record<string, any> = {
      provinces: { url: '/data/provinces.json', color: '#3b82f6', type: 'line', opacity: 0.6 },
      districts: { url: '/data/districts.json', color: '#10b981', type: 'line', opacity: 0.4 },
      wards: { url: '/data/wards.json', color: '#f59e0b', type: 'line', opacity: 0.2 },
      parks: { url: '/data/parks.json', color: '#059669', type: 'fill', opacity: 0.2 },
      histBurned: { url: `/data/burnt/${historicalYear}.json`, color: '#7c2d12', type: 'fill', opacity: 0.4 },
      histFires: { url: '/data/fires.json', color: '#ef4444', type: 'circle', opacity: 0.8 }
    }

    Object.entries(geojsonLayers).forEach(([key, def]) => {
      const isVisible = activeLayers[key]
      const sourceId = `local-${key}-source`
      const layerId = `local-${key}-layer`

      if (!m.getSource(sourceId)) {
        m.addSource(sourceId, { type: 'geojson', data: def.url })

        if (['provinces', 'districts', 'wards', 'parks'].includes(key)) {
          m.addLayer({
            id: `${layerId}-click`,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-opacity': 0 }
          })
        }

        if (def.type === 'line') {
          m.addLayer({ id: layerId, type: 'line', source: sourceId, paint: { 'line-color': def.color, 'line-width': 1.5, 'line-opacity': isVisible ? (layerOpacities[key] ?? def.opacity) : 0 } })
        } else if (def.type === 'fill') {
          m.addLayer({ id: layerId, type: 'fill', source: sourceId, paint: { 'fill-color': def.color, 'fill-opacity': isVisible ? (layerOpacities[key] ?? def.opacity) : 0 } })
          if (key === 'parks') {
            const outlineOpacity = isVisible ? Math.min(1, (layerOpacities[key] ?? def.opacity) * 2.5) : 0
            m.addLayer({ id: `${layerId}-outline`, type: 'line', source: sourceId, paint: { 'line-color': def.color, 'line-width': 1, 'line-opacity': outlineOpacity } })
          }
        } else if (def.type === 'circle') {
          m.addLayer({ id: layerId, type: 'circle', source: sourceId, paint: { 'circle-radius': 3, 'circle-color': def.color, 'circle-opacity': isVisible ? (layerOpacities[key] ?? def.opacity) : 0 } })
        }
      } else {
        const opacity = layerOpacities[key] ?? def.opacity
        if (m.getLayer(layerId)) m.setPaintProperty(layerId, `${def.type}-opacity`, isVisible ? opacity : 0)
        if (m.getLayer(`${layerId}-outline`)) {
          const outlineOpacity = isVisible ? Math.min(1, opacity * 2.5) : 0
          m.setPaintProperty(`${layerId}-outline`, 'line-opacity', outlineOpacity)
        }
        
        // Force update the GeoJSON data if the URL has changed (e.g. historicalYear slider moves)
        if (key === 'histBurned') {
          const source = m.getSource(sourceId) as maplibregl.GeoJSONSource;
          if (source && source.setData) {
            source.setData(def.url);
          }
        }
      }
    })

    // Helper to toggle layer visibility
    const setVisibility = (layerId: string, visible: boolean) => {
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    // 4. Real-time Hotspot Points
    const hotspotsSourceId = 'live-hotspots-source'
    const hotspotsLayerId = 'live-hotspots-layer'
    const hotspotsHeatmapId = 'live-hotspots-heatmap'
    const hotspotsGlowId = `${hotspotsLayerId}-glow`
    
    // Filter out invalid hotspots to prevent MapLibre crashes
    const validHotspots = hotspots.filter(h => 
      h && h.longitude !== undefined && h.latitude !== undefined && 
      !isNaN(parseFloat(h.longitude.toString())) && !isNaN(parseFloat(h.latitude.toString()))
    );

    console.log(`[FireMap] Syncing ${validHotspots.length}/${hotspots.length} hotspots.`);

    const hotspotsData: any = {
      type: 'FeatureCollection',
      features: validHotspots.map(h => ({
        type: 'Feature',
        geometry: { 
          type: 'Point', 
          coordinates: [
            parseFloat(h.longitude.toString()), 
            parseFloat(h.latitude.toString())
          ] 
        },
        properties: { ...h }
      }))
    }

    // Ensure source exists and update it
    if (!m.getSource(hotspotsSourceId)) {
      m.addSource(hotspotsSourceId, { type: 'geojson', data: hotspotsData })
    } else {
      (m.getSource(hotspotsSourceId) as maplibregl.GeoJSONSource).setData(hotspotsData)
    }

    // Robust temporal color expression
    const timeExpression: any = [
      'step',
      ['coalesce', ['get', 'hours_ago'], 999],
      '#ef4444', // < 1h: Bright Red
      1, '#f97316', // 1-3h: Orange
      3, '#f59e0b', // 3-6h: Amber
      6, '#eab308', // 6-12h: Yellow
      12, '#84cc16', // 12-24h: Lime
      24, '#3b82f6', // 24-48h: Blue
      48, '#6366f1', // 48-72h: Indigo
      72, '#a1a1aa'  // > 72h: Zinc
    ]

    // Create Layers if they don't exist
    if (!m.getLayer(hotspotsHeatmapId)) {
      m.addLayer({
        id: hotspotsHeatmapId,
        type: 'heatmap',
        source: hotspotsSourceId,
        maxzoom: 15,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'frp'], 0], 0, 0, 50, 0.5, 500, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(33,102,172,0)', 0.2, 'rgb(103,169,207)', 0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)', 0.8, 'rgb(239,138,98)', 1, 'rgb(178,24,43)'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 10, 20],
          'heatmap-opacity': 0.8
        }
      })
    }

    if (!m.getLayer(hotspotsGlowId)) {
      m.addLayer({
        id: hotspotsGlowId,
        type: 'circle',
        source: hotspotsSourceId,
        paint: {
          'circle-radius': 12,
          'circle-blur': 1.2,
          'circle-color': mappingMode === 'time' ? timeExpression : '#f97316',
          'circle-opacity': 0.4
        }
      })
    }

    if (!m.getLayer(hotspotsLayerId)) {
      m.addLayer({
        id: hotspotsLayerId,
        type: 'circle',
        source: hotspotsSourceId,
        paint: {
          'circle-radius': 6,
          'circle-color': mappingMode === 'time' ? timeExpression : '#f97316',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95
        }
      })

      m.on('click', hotspotsLayerId, (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties || {};
          const geom = e.features[0].geometry;
          let coords = e.lngLat;
          if (geom && geom.type === 'Point') {
            coords = { lng: geom.coordinates[0], lat: geom.coordinates[1] } as any;
          }
          onIncidentClick?.({
            ...props,
            lat: coords.lat,
            lng: coords.lng
          });
        }
      })
      m.on('mouseenter', hotspotsLayerId, () => m.getCanvas().style.cursor = 'pointer')
      m.on('mouseleave', hotspotsLayerId, () => m.getCanvas().style.cursor = '')
    }

    // Update Visibility based on activeLayers.fires and mappingMode
    const isFiresActive = !!activeLayers.fires;
    setVisibility(hotspotsHeatmapId, isFiresActive && mappingMode === 'heatmap');
    setVisibility(hotspotsGlowId, isFiresActive && mappingMode !== 'heatmap');
    setVisibility(hotspotsLayerId, isFiresActive && mappingMode !== 'heatmap');

    // Update Paint Properties for mappingMode change
    if (m.getLayer(hotspotsLayerId)) {
      m.setPaintProperty(hotspotsLayerId, 'circle-color', mappingMode === 'time' ? timeExpression : '#f97316');
    }
    if (m.getLayer(hotspotsGlowId)) {
      m.setPaintProperty(hotspotsGlowId, 'circle-color', mappingMode === 'time' ? timeExpression : '#f97316');
    }
    
    // 5. Risk Zone Intelligence Layer
    const riskSourceId = 'risk-zones-source'
    const riskLayerId = 'risk-zones-layer'
    const riskLabelId = 'risk-zones-labels'
    
    const riskData: any = {
      type: 'FeatureCollection',
      features: (riskZones || []).filter(z => z.lat && z.lng).map(z => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [z.lng, z.lat] },
        properties: { 
          ...z,
          factors_label: (z.factors || []).join(' • ')
        }
      }))
    }
    
    if (!m.getSource(riskSourceId)) {
      m.addSource(riskSourceId, { type: 'geojson', data: riskData })
      
      // Outer Scanner Ring
      m.addLayer({
        id: `${riskLayerId}-outer`,
        type: 'circle',
        source: riskSourceId,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'riskScore'], 0, 15, 100, 45],
          'circle-color': [
            'step', ['get', 'riskScore'],
            '#22c55e', 40, '#eab308', 65, '#f97316', 85, '#ef4444'
          ],
          'circle-opacity': 0.15,
          'circle-stroke-width': 1,
          'circle-stroke-color': [
            'step', ['get', 'riskScore'],
            '#22c55e', 40, '#eab308', 65, '#f97316', 85, '#ef4444'
          ],
          'circle-stroke-opacity': 0.3
        }
      })
      
      // Inner Core
      m.addLayer({
        id: riskLayerId,
        type: 'circle',
        source: riskSourceId,
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'step', ['get', 'riskScore'],
            '#22c55e', 40, '#eab308', 65, '#f97316', 85, '#ef4444'
          ]
        }
      })
      
      // Intelligence Labels
      m.addLayer({
        id: riskLabelId,
        type: 'symbol',
        source: riskSourceId,
        layout: {
          'text-field': ['format', 
            ['get', 'name'], { 'font-scale': 1.1, 'text-color': '#ffffff' },
            '\n', {},
            ['get', 'factors_label'], { 'font-scale': 0.8, 'text-color': '#cbd5e1' }
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-offset': [0, 2.5],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 2
        }
      })
    } else {
      (m.getSource(riskSourceId) as maplibregl.GeoJSONSource).setData(riskData)
    }

    // 5. Zimbabwe Outer Boundary Mask (Hides everything outside Zimbabwe)
    const boundaryMaskSourceId = 'zim-boundary-mask-source'
    const maskColors: Record<string, string> = {
      midnight: '#0c0c0d',
      osm: '#f4f3f0',
      satellite: '#05070a',
      hybrid: '#05070a'
    }
    const maskColor = maskColors[style] || maskColors.osm

    if (!m.getSource(boundaryMaskSourceId)) {
      m.addSource(boundaryMaskSourceId, { 
        type: 'geojson', 
        data: '/data/zim-mask.json' 
      })
      m.addLayer({
        id: boundaryMaskLayerId,
        type: 'fill',
        source: boundaryMaskSourceId,
        paint: {
          'fill-color': maskColor,
          'fill-opacity': 1.0
        }
      })
    } else {
      m.setPaintProperty(boundaryMaskLayerId, 'fill-color', maskColor)
    }

    // 6. Zimbabwe Mask / Administrative Bounds
    const maskSourceId = 'zim-mask-source'
    if (activeLayers.provinces) {
      if (!m.getSource(maskSourceId)) {
        m.addSource(maskSourceId, { type: 'geojson', data: '/data/provinces.json' })
      }
      if (!m.getLayer(maskLayerId)) {
        m.addLayer({
          id: maskLayerId,
          type: 'line',
          source: maskSourceId,
          paint: {
            'line-color': '#ffffff',
            'line-width': 1,
            'line-opacity': 0.3
          }
        })
      }
      setVisibility(maskLayerId, true);
    } else {
      setVisibility(maskLayerId, false);
    }

    // 7. Layer Z-Index Ordering
    reorderMapLayers();
  }, [activeLayers, effectiveTime, style, historicalYear, hotspots, riskZones, mappingMode, onIncidentClick, layerOpacities])

  React.useEffect(() => {
    if (!isLoaded || !map.current || !targetParkId) return
    const m = map.current
    const checkAndZoom = () => {
      const features = m.querySourceFeatures('local-parks-source')
      const park = features.find(f => f.properties?.WDPAID === targetParkId || f.id === targetParkId)
      if (park && park.geometry) {
        const coords = (park.geometry as any).coordinates[0][0]
        if (coords) m.flyTo({ center: [coords[0], coords[1]], zoom: 10, duration: 2000 })
      } else {
        setTimeout(checkAndZoom, 500)
      }
    }
    checkAndZoom()
  }, [isLoaded, targetParkId])

  // 6. Map Initialization (Once on mount)
  React.useEffect(() => {
    if (map.current || !mapContainer.current) return

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: { 
        version: 8, 
        sources: {}, 
        layers: [],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
      },
      center: center,
      zoom: zoom,
    })

    map.current = m
    m.addControl(new maplibregl.NavigationControl(), 'top-right')

    m.on('load', () => {
      setIsLoaded(true)
    })

    m.on('styledata', () => {
      if (m.isStyleLoaded() && !m.getSource('zim-boundary-mask-source')) {
        syncLayers()
      }
    })

    m.on('click', (e) => {
      if (!onIncidentClick) return
      
      const features = m.queryRenderedFeatures(e.point)
      const info: any = { 
        lat: e.lngLat.lat, 
        lng: e.lngLat.lng, 
        province: 'Outside Border', 
        district: 'Unknown', 
        ward: 'Unknown', 
        park: 'None' 
      }

      let foundBurned = false
      features.forEach(f => {
        const p = f.properties
        const lid = f.layer.id
        
        // Handle Historical Burned Area
        if (lid.includes('histBurned')) {
          foundBurned = true
          info.isBurnedArea = true
          info.year = p.year || historicalYear
          info.value = p.value
          
          // Use properties if available, otherwise calculate
          if (p.area_ha) {
            info.area_ha = p.area_ha
          } else if (f.geometry) {
            try {
              const polyArea = turf.area(f as any) // in square meters
              info.area_ha = (polyArea / 10000).toFixed(2)
              info.area_km2 = (polyArea / 1000000).toFixed(2)
            } catch (err) {
              console.warn("Turf calculation failed:", err)
            }
          }

          // Extraction of potential date/time if encoded in properties
          info.month = p.month || p.MONTH || p.acq_month
          info.date = p.date || p.DATE || p.acq_date
          info.time = p.time || p.TIME || p.acq_time
        }

        if (lid.includes('provinces')) info.province = p.province_n || p.province || p.PROVINCE || p.NAME_1 || info.province
        if (lid.includes('districts')) {
          info.district = p.district_n || p.district || p.DISTRICT || p.NAME_2 || info.district
          if (info.province === 'Outside Border' || !info.province) info.province = p.province || p.province_n || info.province
        }
        if (lid.includes('wards')) {
          info.ward = p.wardnumber !== undefined ? `Ward ${p.wardnumber}` : (p.ward_no || p.WARD_NO || p.WARD_NAME || p.NAME_3 || p.ward || info.ward)
          if (info.district === 'Unknown' || !info.district) info.district = p.district || p.district_n || info.district
        }
        if (lid.includes('parks')) info.park = p.NAME || p.name || p.park_name || p.ParkName || p.DESIG || info.park

        // Capture Hotspot Metadata
        if (lid.includes('hotspots') || lid.includes('fires') || lid.includes('histFires')) {
          info.isHotspot = true
          info.sensor = p.sensor || p.instrument || p.satellite || info.sensor
          info.frp = p.frp || info.frp
          info.confidence = p.confidence || info.confidence
          info.acq_date = p.acq_date || p.DATE || p.date || info.acq_date
          info.acq_time = p.acq_time || p.TIME || p.time || info.acq_time
          info.hours_ago = p.hours_ago !== undefined ? p.hours_ago : info.hours_ago
        }
      })

      // Update Marker
      if (marker.current) marker.current.remove()
      
      const el = document.createElement('div')
      el.className = 'selection-marker'
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute h-10 w-10 rounded-full bg-orange-500/20 animate-ping"></div>
          <div class="absolute h-5 w-5 rotate-45 border border-white/50 bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] flex items-center justify-center">
            <div class="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
          </div>
          <div class="absolute -top-8 bg-zinc-900 text-orange-500 text-[10px] font-black px-2 py-0.5 rounded shadow-2xl border border-orange-500/30 whitespace-nowrap uppercase tracking-[0.2em]">
            SELECTED
          </div>
        </div>
      `
      
      marker.current = new maplibregl.Marker({ element: el })
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(m)

      onIncidentClick(info)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, []) // Initial values only

  // 7. Layer Synchronization
  React.useEffect(() => {
    if (isLoaded) {
      syncLayers()
    }
  }, [isLoaded, syncLayers])

  // 8. Viewport Synchronization
  React.useEffect(() => {
    if (isLoaded && map.current) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        essential: true,
        duration: 1500
      })
    }
  }, [isLoaded, center, zoom])

  // 8. Hover Tooltip Logic Removed as per requirement

  return (
    <>
      <div ref={mapContainer} className={cn("h-full w-full", className)} />
    </>
  )
}
