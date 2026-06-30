import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { supabase } from '@/lib/supabase';

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

export async function GET() {
  try {
    await authenticateGEE();

    // 1. Fetch Active Thermal Rules
    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)
      .in('alert_type', ['UHI', 'HEAT_RISK']);

    if (rulesError || !rules) throw new Error('Failed to fetch rules');

    const triggered = [];

    // 2. Load Datasets
    const modis = ee.ImageCollection("MODIS/061/MOD11A1")
      .filter(ee.Filter.date(
        ee.Date(new Date()).advance(-2, 'day'), 
        ee.Date(new Date())
      ))
      .select('LST_Day_1km')
      .median()
      .multiply(0.02)
      .subtract(273.15);

    const zimDistricts = ee.FeatureCollection("FAO/GAUL/2015/level1")
      .filter(ee.Filter.eq('ADM0_NAME', 'Zimbabwe'));

    // 3. Process Rules
    for (const rule of rules) {
      let region = zimDistricts;
      if (rule.district_id && rule.district_id !== 'None') {
        region = zimDistricts.filter(ee.Filter.eq('ADM1_NAME', rule.district_id));
      }

      // Calculate max temperature in the region
      const stats = modis.reduceRegion({
        reducer: ee.Reducer.max(),
        geometry: region.geometry(),
        scale: 1000,
        maxPixels: 1e9
      });

      const maxTemp = await new Promise((resolve) => {
        stats.evaluate((result: any) => resolve(result?.LST_Day_1km || 0));
      });

      // 4. Check Threshold
      if (typeof maxTemp === 'number' && maxTemp >= (rule.thermal_threshold || 35)) {
        // Trigger Alert
        const alertData = {
          rule_id: rule.id,
          location_name: rule.district_id || 'Zimbabwe (Regional)',
          severity: rule.severity,
          alert_value: Math.round(maxTemp * 10) / 10,
          detected_at: new Date().toISOString(),
          metadata: {
            alert_type: rule.alert_type,
            max_temp: maxTemp,
            threshold: rule.thermal_threshold
          }
        };

        const { error: insertError } = await supabase
          .from('triggered_alerts')
          .insert([alertData]);

        if (!insertError) {
          triggered.push(alertData);
        }
      }
    }

    return NextResponse.json({ 
      status: 'success', 
      processed: rules.length, 
      triggered: triggered.length,
      alerts: triggered 
    });

  } catch (error: any) {
    console.error('SURVEILLANCE_ERROR:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
