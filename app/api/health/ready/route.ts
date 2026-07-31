import { NextResponse } from 'next/server';
import { prisma } from '@/server/utils/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'unready', database: 'disconnected' }, { status: 503 });
  }
}
