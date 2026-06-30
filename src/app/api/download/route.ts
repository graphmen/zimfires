import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('file');
  const type = searchParams.get('type') || 'root'; // 'root' or 'burnt'

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  // Security: Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const dataDir = path.join(process.cwd(), 'data');
  const targetDir = type === 'burnt' ? path.join(dataDir, 'burnt') : dataDir;
  const filePath = path.join(targetDir, filename);

  console.log(`[Download API] Requested: ${filename}, Type: ${type}`);
  console.log(`[Download API] Resolved Path: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`[Download API] File NOT FOUND at: ${filePath}`);
    return NextResponse.json({ error: `File not found: ${filename}` }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on extension
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.geojson') || filename.endsWith('.json')) {
      contentType = 'application/json';
    } else if (filename.endsWith('.csv')) {
      contentType = 'text/csv';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
