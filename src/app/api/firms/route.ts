import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '3';
    const MAP_KEY = process.env.NASA_FIRMS_MAP_KEY || '17774b5a9e6ebbc6a3e485a2c1894905';
    
    let daysNum = parseInt(daysParam);
    if (isNaN(daysNum) || daysNum < 1) daysNum = 3;
    if (daysNum > 10) daysNum = 10; 
    const finalDays = daysNum.toString();

    // Zimbabwe BBOX
    const BBOX = '25.2,-22.4,33.1,-15.6';
    const sources = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];
    
    const fetchSource = async (source: string) => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${source}/${BBOX}/${finalDays}`;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(url, { 
          cache: 'no-store', 
          signal: controller.signal,
          next: { revalidate: 300 } 
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          console.error(`[NASA FIRMS] ${source} HTTP Error: ${res.status}`);
          return [];
        }
        
        const csv = await res.text();
        if (csv.includes('Invalid API call') || csv.length < 10) {
          return [];
        }

        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim());
        const now = new Date();

        return lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = values[i];
          });

          // Calculate hours_ago
          try {
            const acqDate = obj.acq_date; 
            const acqTime = obj.acq_time; 
            if (acqDate && acqTime) {
              const year = parseInt(acqDate.substring(0, 4));
              const month = parseInt(acqDate.substring(5, 7)) - 1;
              const day = parseInt(acqDate.substring(8, 10));
              const hour = parseInt(acqTime.padStart(4, '0').substring(0, 2));
              const minute = parseInt(acqTime.padStart(4, '0').substring(2, 4));
              const acqDateTime = new Date(Date.UTC(year, month, day, hour, minute));
              obj.hours_ago = Math.max(0, (now.getTime() - acqDateTime.getTime()) / (1000 * 60 * 60));
            } else {
              obj.hours_ago = 0;
            }
          } catch (e) {
            obj.hours_ago = 0;
          }
          return obj;
        });
      } catch (err) {
        console.error(`[NASA FIRMS] ${source} fetch failed:`, err);
        return [];
      }
    };

    const results = await Promise.all(sources.map(fetchSource));
    const combinedData = results.flat().filter(d => d.latitude && d.longitude);

    if (combinedData.length === 0) {
      return NextResponse.json([]);
    }

    // Load spatial boundaries for clipping and administrative tagging
    let finalData = combinedData;
    try {
      const dataDir = path.join(process.cwd(), 'public', 'data');
      const provincesPath = path.join(dataDir, 'provinces.json');
      const districtsPath = path.join(dataDir, 'districts.json');
      const wardsPath = path.join(dataDir, 'wards.json');
      const parksPath = path.join(dataDir, 'parks.json');

      let provinces: any[] = [];
      let districts: any[] = [];
      let wards: any[] = [];
      let parks: any[] = [];

      if (fs.existsSync(provincesPath)) {
        provinces = JSON.parse(fs.readFileSync(provincesPath, 'utf8')).features || [];
      }
      if (fs.existsSync(districtsPath)) {
        districts = JSON.parse(fs.readFileSync(districtsPath, 'utf8')).features || [];
      }
      if (fs.existsSync(wardsPath)) {
        wards = JSON.parse(fs.readFileSync(wardsPath, 'utf8')).features || [];
      }
      if (fs.existsSync(parksPath)) {
        parks = JSON.parse(fs.readFileSync(parksPath, 'utf8')).features || [];
      }
      
      if (provinces.length > 0) {
        finalData = combinedData.map(d => {
          const lat = parseFloat(d.latitude);
          const lng = parseFloat(d.longitude);
          if (isNaN(lat) || isNaN(lng)) return d;
          
          const pt = turf.point([lng, lat]);
          
          // Match Province
          const provMatch = provinces.find((prov: any) => {
            try {
              return turf.booleanPointInPolygon(pt, prov);
            } catch (e) {
              return false;
            }
          });

          if (!provMatch) return d;

          const province = provMatch.properties.province_n || provMatch.properties.NAME_1 || provMatch.properties.name || '';

          // Match District
          let district = '';
          const distMatch = districts.find((dist: any) => {
            try {
              return turf.booleanPointInPolygon(pt, dist);
            } catch (e) {
              return false;
            }
          });
          if (distMatch && distMatch.properties) {
            district = distMatch.properties.district_n || distMatch.properties.NAME_2 || distMatch.properties.name || '';
          }

          // Match Ward
          let ward = '';
          const wardMatch = wards.find((w: any) => {
            try {
              return turf.booleanPointInPolygon(pt, w);
            } catch (e) {
              return false;
            }
          });
          if (wardMatch && wardMatch.properties) {
            const p = wardMatch.properties;
            ward = p.wardnumber !== undefined ? `Ward ${p.wardnumber}` : (p.ward_no || p.WARD_NO || p.WARD_NAME || p.NAME_3 || p.ward || '');
          }

          // Match Park / Protected Area
          let park = 'None';
          if (parks.length > 0) {
            const parkMatch = parks.find((p: any) => {
              try {
                return turf.booleanPointInPolygon(pt, p);
              } catch (e) {
                return false;
              }
            });
            if (parkMatch && parkMatch.properties) {
              park = parkMatch.properties.NAME || parkMatch.properties.name || parkMatch.properties.park_name || 'None';
            }
          }

          return {
            ...d,
            province,
            district,
            ward,
            park
          };
        }).filter(d => d.province); // Only keep points within a known province
        console.log(`[FIRMS API] Tagged ${finalData.length} points with province, district, ward, and park.`);
      }
    } catch (e) {
      console.error('[FIRMS API] Clipping and tagging error:', e);
    }

    return NextResponse.json(finalData);
  } catch (error: any) {
    console.error('FIRMS API Critical Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
