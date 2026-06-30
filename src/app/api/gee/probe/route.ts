import { NextResponse } from 'next/server';
import * as ee from '@google/earthengine';

const clientEmail = process.env.GEE_CLIENT_EMAIL;
const privateKey = process.env.GEE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.GEE_PROJECT_ID;

let eeInitialized = false;

async function initializeEE() {
  if (eeInitialized) return;
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Missing GEE credentials');
  }

  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      { client_email: clientEmail, private_key: privateKey, project_id: projectId },
      () => {
        ee.initialize(null, null, () => {
          eeInitialized = true;
          resolve(true);
        }, (err: any) => reject(err));
      },
      (err: any) => reject(err)
    );
  });
}

const LANDCOVER_CLASSES: Record<number, string> = {
  10: 'Trees / Forest',
  20: 'Shrubland',
  30: 'Grassland',
  40: 'Cropland',
  50: 'Built-up / Urban',
  60: 'Bare / Sparse Vegetation',
  70: 'Snow and Ice',
  80: 'Permanent Water Bodies',
  90: 'Herbaceous Wetland',
  95: 'Mangroves',
  100: 'Moss and Lichen'
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    await initializeEE();

    const point = ee.Geometry.Point([lng, lat]);
    const lc = ee.ImageCollection("ESA/WorldCover/v100").first().select('Map');
    
    // Sample the image at the point
    const sample = lc.sample(point, 10).first();
    const info: any = await new Promise((resolve, reject) => {
      sample.evaluate((res: any, err: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const classValue = info?.properties?.Map;
    const className = LANDCOVER_CLASSES[classValue] || 'Unknown / Mixed';

    return NextResponse.json({
      lat,
      lng,
      landcover: className,
      value: classValue
    });

  } catch (error: any) {
    console.error('GEE PROBE ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
