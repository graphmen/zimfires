import { NextResponse } from 'next/server';
import ee from '@google/earthengine';

// GEE Authentication Singleton
const authenticateGEE = async () => {
  return new Promise((resolve, reject) => {
    try {
      const clientEmail = process.env.GEE_CLIENT_EMAIL;
      const privateKey = process.env.GEE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const projectId = process.env.GEE_PROJECT_ID;

      if (!clientEmail || !privateKey || !projectId) {
        throw new Error('Missing GEE credentials');
      }

      ee.data.authenticateViaPrivateKey(
        { client_email: clientEmail, private_key: privateKey, project_id: projectId },
        () => {
          ee.initialize(null, null, () => resolve(true), (err: any) => reject(err));
        },
        (err: any) => reject(err)
      );
    } catch (err) {
      reject(err);
    }
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district') || 'Harare';

    await authenticateGEE();

    // 1. Define Zimbabwe Region
    const zimDistricts = ee.FeatureCollection("FAO/GAUL/2015/level1")
      .filter(ee.Filter.eq('ADM0_NAME', 'Zimbabwe'));
    
    let region = zimDistricts.filter(ee.Filter.eq('ADM1_NAME', district));
    if (region.size().getInfo() === 0) {
      region = zimDistricts; // Fallback to all Zimbabwe if district not found
    }

    // 2. Load MODIS LST Collection (10 Years)
    const startYear = 2014;
    const endYear = 2024;
    
    const lstCol = ee.ImageCollection("MODIS/061/MOD11A1")
      .filter(ee.Filter.date(`${startYear}-01-01`, `${endYear}-12-31`))
      .select('LST_Day_1km');

    // 3. Aggregate by Year
    const years = ee.List.sequence(startYear, endYear);
    
    const yearlyStats = years.map((year: any) => {
      const annual = lstCol.filter(ee.Filter.calendarRange(year, year, 'year')).median();
      const stats = annual.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region.geometry(),
        scale: 1000,
        maxPixels: 1e9
      });
      
      const tempC = ee.Number(stats.get('LST_Day_1km')).multiply(0.02).subtract(273.15);
      
      return ee.Feature(null, {
        year: year,
        avg_temp: tempC,
        label: ee.String(ee.Number(year).format('%d'))
      });
    });

    const results = await new Promise((resolve) => {
      ee.FeatureCollection(yearlyStats).evaluate((fc: any) => {
        resolve(fc.features.map((f: any) => f.properties));
      });
    });

    return NextResponse.json({ 
      status: 'success', 
      district,
      data: results 
    });

  } catch (error: any) {
    console.error('TRENDS_API_ERROR:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
