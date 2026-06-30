"use client"

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register a clean font for that premium look
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helvetica/v1/something.ttf' }, // Mocking for now, standard fonts are built-in
  ]
});

interface TacticalDossierProps {
  data: {
    reportId: string;
    date: string;
    province: string;
    district: string;
    ward: string;
    timeRange: string;
    metrics: {
      hotspots: number;
      avgIntensity: number;
      peakFRP: number;
      confidence: number;
      burnedArea?: number;
    };
    historical: {
      baselineAvg: number;
      percentChange: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    sensors: {
      modis: number;
      viirs: number;
    };
    summary: string;
    incidents: Array<{
      id: string;
      lat: number;
      lng: number;
      frp: number;
      confidence: string;
      sensor: string;
    }>;
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 3,
    borderBottomColor: '#235823',
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a2e1a',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 9,
    color: '#444',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 1,
  },
  meta: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#235823',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f1f5f1',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#235823',
  },
  statLabel: {
    fontSize: 8,
    color: '#445544',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statSub: {
    fontSize: 7,
    color: '#667766',
    marginTop: 2,
  },
  description: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#222',
    textAlign: 'justify',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#235823',
    padding: 6,
    borderRadius: 3,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 6,
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: '#333',
  },
  badge: {
    padding: '2 6',
    borderRadius: 10,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999',
  }
});

export const TacticalDossier = ({ data }: TacticalDossierProps) => (
    <Document title={`Dossier-${data?.reportId || 'AUTO'}`}>
    {/* PAGE 1: Executive Summary */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TACTICAL DOSSIER</Text>
          <Text style={styles.subtitle}>National Fire Command Center | ZINGSA Intelligence</Text>
        </View>
        <View style={styles.meta}>
          <Text>ID: {data?.reportId || 'UNKNOWN'}</Text>
          <Text>DATE: {data?.date || new Date().toLocaleDateString()}</Text>
          <Text>PERIOD: {data?.timeRange || 'REALTIME'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1.0 Area of Interest & Governance</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Province</Text>
            <Text style={styles.statValue}>{data?.province || 'Zimbabwe'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>District</Text>
            <Text style={styles.statValue}>{data?.district || 'Multiple'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Ward/Commune</Text>
            <Text style={styles.statValue}>{data?.ward || 'Central'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2.0 Situational Awareness Metrics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Anomalies</Text>
            <Text style={styles.statValue}>{data?.metrics?.hotspots ?? 0}</Text>
            <Text style={styles.statSub}>{data?.historical?.trend === 'increasing' ? '↑ Increasing trend' : '↓ Stable/Decreasing'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Peak Radiative Power</Text>
            <Text style={styles.statValue}>{data?.metrics?.peakFRP ?? 0} MW</Text>
            <Text style={styles.statSub}>High Intensity Detection</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg Confidence</Text>
            <Text style={styles.statValue}>{data?.metrics?.confidence ?? 0}%</Text>
            <Text style={styles.statSub}>L2 Data Validation</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3.0 Executive Summary</Text>
        <Text style={styles.description}>
          {data?.summary || "No automated summary generated for this AOI."}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4.0 Historical Context</Text>
        <Text style={styles.description}>
          The current fire activity in {data?.district || 'this AOI'} represents a {data?.historical?.percentChange ?? 0}% change compared to the 
          5-year mean baseline ({data?.historical?.baselineAvg ?? 0} hotspots). This {data?.historical?.trend || 'stable'} trend suggests 
          {data?.historical?.trend === 'increasing' ? ' anomalous environmental stress.' : ' expected seasonal behavior.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text>Classification: RESTRICTED</Text>
        <Text>Source: NASA FIRMS / GEE L3 Processing</Text>
        <Text>Page 1 of 3</Text>
      </View>
    </Page>

    {/* PAGE 2: Technical Breakdown */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TECHNICAL ADDENDUM</Text>
          <Text style={styles.subtitle}>Detailed Observation Log & Sensor Portfolio</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5.0 Sensor Distribution</Text>
        <View style={styles.statsRow}>
          <View style={{ ...styles.statCard, borderLeftColor: '#ea580c' }}>
            <Text style={styles.statLabel}>VIIRS (S-NPP/NOAA-20)</Text>
            <Text style={styles.statValue}>{data?.sensors?.viirs ?? 0}</Text>
            <Text style={styles.statSub}>375m Spatial Resolution</Text>
          </View>
          <View style={{ ...styles.statCard, borderLeftColor: '#3b82f6' }}>
            <Text style={styles.statLabel}>MODIS (Terra/Aqua)</Text>
            <Text style={styles.statValue}>{data?.sensors?.modis ?? 0}</Text>
            <Text style={styles.statSub}>1km Spatial Resolution</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6.0 Primary Observation Log (Top 15)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>Asset ID</Text>
            <Text style={{ ...styles.tableHeaderCell, flex: 1.2 }}>Coordinates</Text>
            <Text style={styles.tableHeaderCell}>Intensity</Text>
            <Text style={{ ...styles.tableHeaderCell, flex: 1.2 }}>Sensor</Text>
            <Text style={{ ...styles.tableHeaderCell, textAlign: 'right' }}>Conf.</Text>
          </View>
          {(data?.incidents || []).slice(0, 15).map((inc, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 2, fontWeight: 'bold', fontSize: 6 }}>{inc?.id || 'N/A'}</Text>
              <Text style={{ ...styles.tableCell, flex: 1.2, fontSize: 7 }}>
                {Number(inc?.lat || 0).toFixed(4)}, {Number(inc?.lng || 0).toFixed(4)}
              </Text>
              <Text style={styles.tableCell}>{inc?.frp ?? 0} MW</Text>
              <Text style={{ ...styles.tableCell, flex: 1.2 }}>{inc?.sensor || 'Unknown'}</Text>
              <Text style={{ ...styles.tableCell, textAlign: 'right' }}>{inc?.confidence || 'N/A'}%</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7.0 Operational Directives</Text>
        <View style={{ gap: 8 }}>
          <Text style={styles.description}>• [CRITICAL] Inspect infrastructure corridors within {data?.ward || 'AOI'} for thermal encroachment.</Text>
          <Text style={styles.description}>• [RESOURCE] Prioritize suppression assets to coordinates with FRP {">"} 50MW.</Text>
          <Text style={styles.description}>• [VALIDATION] Schedule high-resolution Sentinel-2 overpass check for burned area assessment.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Technical Annex - ZimFireWatch Hub</Text>
        <Text>Authored by: ZINGSA Autonomous Intelligence Engine</Text>
        <Text>Page 2 of 3</Text>
      </View>
    </Page>

    {/* PAGE 3: Asset Logistics & Strategic Directives */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>LOGISTICS & RESPONSE</Text>
          <Text style={styles.subtitle}>Asset Allocation & Infrastructure Resilience</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8.0 Strategic Asset Recommendations</Text>
        <View style={{ ...styles.statCard, flex: undefined, marginBottom: 15, borderLeftColor: '#ef4444' }}>
          <Text style={styles.statLabel}>Primary Deployment Priority</Text>
          <Text style={{ ...styles.statValue, marginBottom: 8 }}>EXTREME - Immediate Response</Text>
          <Text style={styles.description}>
            Based on the detected peak FRP of {data?.metrics?.peakFRP ?? 0} MW, ground-based suppression teams should be supported by aerial surveillance units in {data?.district || 'this district'}.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9.0 Regional Impact & Infrastructure</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>Resource Node</Text>
            <Text style={styles.tableHeaderCell}>Risk Index</Text>
            <Text style={styles.tableHeaderCell}>Buffer Status</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, flex: 2 }}>Electrical Grid Corridors ({data?.province === 'NATIONAL' ? 'Mainline' : data?.province})</Text>
            <Text style={styles.tableCell}>{(data?.metrics?.peakFRP ?? 0) > 200 ? 'HIGH' : 'MODERATE'}</Text>
            <Text style={styles.tableCell}>{(data?.metrics?.peakFRP ?? 0) > 200 ? 'Critical' : 'Sufficient'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, flex: 2 }}>Agricultural Perimeter</Text>
            <Text style={styles.tableCell}>{(data?.metrics?.hotspots ?? 0) > 100 ? 'HIGH' : 'MODERATE'}</Text>
            <Text style={styles.tableCell}>{(data?.metrics?.hotspots ?? 0) > 100 ? 'Vulnerable' : 'Sufficient'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, flex: 2 }}>Human Settlements</Text>
            <Text style={styles.tableCell}>{(data?.metrics?.peakFRP ?? 0) > 300 ? 'EXTREME' : ((data?.metrics?.peakFRP ?? 0) > 150 ? 'HIGH' : 'MODERATE')}</Text>
            <Text style={styles.tableCell}>{(data?.metrics?.peakFRP ?? 0) > 300 ? 'Deficient' : 'Adequate'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10.0 Closing Intelligence Assessment</Text>
        <Text style={styles.description}>
          This dossier has been compiled using multi-spectral archival data. The signatures identified within the {data?.timeRange || 'REALTIME'} window necessitate a strategic review of regional fireguards. Long-term climate modelling indicates that {data?.province || 'Zimbabwe'} will remain a high-probability thermal cluster for the foreseeable future.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text>Official Intelligence Record - RESTRICTED</Text>
        <Text>Zimbabawe National Geospatial & Space Agency</Text>
        <Text>Page 3 of 3</Text>
      </View>
    </Page>
  </Document>
);
