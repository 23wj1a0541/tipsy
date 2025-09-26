import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { restaurants, staffMembers, tips, reviews } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get counts for all tables in parallel
    const [restaurantCount, staffCount, tipCount, reviewCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(restaurants),
      db.select({ count: sql<number>`count(*)` }).from(staffMembers),
      db.select({ count: sql<number>`count(*)` }).from(tips),
      db.select({ count: sql<number>`count(*)` }).from(reviews)
    ]);

    return NextResponse.json({
      restaurants: restaurantCount[0].count,
      staff: staffCount[0].count,
      tips: tipCount[0].count,
      reviews: reviewCount[0].count
    }, { status: 200 });

  } catch (error) {
    console.error('Database connectivity test error:', error);
    return NextResponse.json({ 
      error: 'Database connection failed: ' + error,
      code: 'DATABASE_CONNECTION_ERROR'
    }, { status: 500 });
  }
}