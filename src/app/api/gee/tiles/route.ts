import { NextResponse } from 'next/server';
import * as ee from '@google/earthengine';

// discrete environment variables
const clientEmail = process.env.GEE_CLIENT_EMAIL;
const privateKey = process.env.GEE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.GEE_PROJECT_ID;

let eeInitialized = false;

async function initializeEE() {
  if (eeInitialized) return;
  
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Missing GEE credentials (GEE_CLIENT_EMAIL, GEE_PRIVATE_KEY, or GEE_PROJECT_ID) in .env.local');
  }

  return new Promise((resolve, reject) => {
    console.log('Attempting GEE Authentication for project:', projectId);
    ee.data.authenticateViaPrivateKey(
      {
        client_email: clientEmail,
        private_key: privateKey,
        project_id: projectId
      },
      () => {
        ee.initialize(null, null, () => {
          eeInitialized = true;
          console.log('GEE Successfully Initialized');
          resolve(true);
        }, (err: any) => {
          console.error('GEE Initialization Failed:', err);
          reject(new Error(`EE Initialize Error: ${err}`));
        });
      },
      (err: any) => {
        console.error('GEE Auth Failed:', err);
        reject(new Error(`EE Auth Error: ${err}`));
      }
    );
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layerType = searchParams.get('type'); // 'uhi' or 'heat'

  try {
    await initializeEE();

    let image: any;
    let visParams: any;

    if (layerType === 'uhi') {
      console.log('Generating UHI Layer...');
      const zimbabwe = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
        .filter(ee.Filter.eq('country_na', 'Zimbabwe'));

      // MODIS LST logic
      const modis = ee.ImageCollection("MODIS/061/MOD11A1")
        .filterBounds(zimbabwe)
        .filterDate('2024-01-01', '2025-12-31')
        .select('LST_Day_1km');

      const lst = modis.median().multiply(0.02).subtract(273.15).clip(zimbabwe);
      image = lst.convolve(ee.Kernel.gaussian(1000, 800, 'meters'));
      visParams = {
        min: 20,
        max: 45,
        palette: ['#0000ff', '#00ffff', '#ffff00', '#ff0000', '#800080']
      };
    } else if (layerType === 'burned') {
      console.log('Generating 2026 Burned Area Layer (MODIS MCD64A1)...');
      const zim = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
        .filter(ee.Filter.eq('country_na', 'Zimbabwe'));
      
      const modis = ee.ImageCollection("MODIS/061/MCD64A1")
        .filterBounds(zim)
        .filterDate('2026-01-01', '2026-12-31')
        .select('BurnDate');

      // Identify burned pixels (BurnDate > 0)
      const burned = modis.max().gt(0).clip(zim);
      
      image = burned.selfMask();
      visParams = {
        min: 0,
        max: 1,
        palette: ['#271010', '#542222', '#b91c1c'] // Dark charcoal to deep burnt red
      };
    } else if (layerType === 'vegetation') {
      console.log('Generating NDVI Layer...');
      const zim = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
        .filter(ee.Filter.eq('country_na', 'Zimbabwe'));
      
      const ndvi = ee.ImageCollection("MODIS/061/MOD13Q1")
        .filterBounds(zim)
        .filterDate('2024-01-01', '2026-12-31')
        .select('NDVI')
        .median()
        .multiply(0.0001)
        .clip(zim);

      image = ndvi;
      visParams = {
        min: 0,
        max: 0.8,
        palette: [
          '#FFFFFF', '#CE7E45', '#DF923D', '#F1B555', '#FCD163', '#99B718', '#74A901',
          '#66A000', '#529400', '#3E8601', '#207401', '#056201', '#004C00', '#023B01',
          '#012E01', '#011D01', '#011301'
        ]
      };
    } else if (layerType === 'landcover') {
      console.log('Generating ESA WorldCover 10m Layer...');
      const zim = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
        .filter(ee.Filter.eq('country_na', 'Zimbabwe'));
      
      const lc = ee.ImageCollection("ESA/WorldCover/v100").first().clip(zim);
      image = lc;
      visParams = {
        min: 10,
        max: 100,
        palette: [
          '006400', 'ffbb22', 'ffff4c', 'f096ff', 'fa0000', 'b4b4b4',
          'f0f0f0', '0064c8', '0096a0', '00cf75', 'fae6a0'
        ]
      };
    } else {
      console.log('Generating Heat Vulnerability Layer...');
      const zim = ee.FeatureCollection("FAO/GAUL/2015/level0")
        .filter(ee.Filter.eq('ADM0_NAME', 'Zimbabwe'));
      const start = '2026-04-01';
      const end = '2026-04-08';

      const collection = ee.ImageCollection("ECMWF/ERA5/HOURLY")
        .filterBounds(zim)
        .filterDate(start, end);

      const processNRT = (img: any) => {
        const tempC = img.select('temperature_2m').subtract(273.15);
        const dewC = img.select('dewpoint_temperature_2m').subtract(273.15);
        const uWind = img.select('u_component_of_wind_10m');
        const vWind = img.select('v_component_of_wind_10m');
        const windSpeed = uWind.pow(2).add(vWind.pow(2)).sqrt();

        const rh = img.expression(
          '100 * (exp((17.625 * Td) / (243.04 + Td)) / exp((17.625 * T) / (243.04 + T)))',
          { 'T': tempC, 'Td': dewC }
        );

        const e_val = rh.divide(100).multiply(6.105).multiply(img.expression('exp((17.27 * T) / (237.7 + T))', { 'T': tempC }));

        const apparentTemp = tempC.add(e_val.multiply(0.33)).subtract(windSpeed.multiply(0.70)).subtract(4.0);
        return apparentTemp.rename('Apparent_Temp').copyProperties(img, ['system:time_start']);
      };

      image = collection.map(processNRT).max().clip(zim);
      visParams = { min: 20, max: 45, palette: ['blue', 'cyan', 'yellow', 'red', 'darkred'] };
    }

    console.log(`Generating GEE Map ID for ${layerType}...`);
    const mapId: any = await new Promise((resolve, reject) => {
      image.getMapId(visParams, (res: any, err: any) => {
        if (err) {
          console.error(`GEE getMapId Error [${layerType}]:`, err);
          reject(err);
        } else {
          console.log(`GEE Map ID Generated [${layerType}]:`, res.mapid);
          resolve(res);
        }
      });
    });

    return NextResponse.json({ url: mapId.urlFormat });

  } catch (error: any) {
    console.error('GEE API ROUTE ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
