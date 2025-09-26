import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffMembers, restaurants, reviews, tips } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    // Validate qrKey parameter
    if (!key || typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json({
        error: 'QR key is required',
        code: 'MISSING_QR_KEY'
      }, { status: 400 });
    }

    console.log('Looking for QR key:', key);

    // Get staff member with restaurant info
    const staffResult = await db
      .select({
        staffId: staffMembers.id,
        staffDisplayName: staffMembers.displayName,
        staffRole: staffMembers.role,
        staffStatus: staffMembers.status,
        staffUpiId: staffMembers.upiId,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        restaurantUpiId: restaurants.upiId
      })
      .from(staffMembers)
      .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(staffMembers.qrKey, key))
      .limit(1);

    console.log('Staff query result:', staffResult);

    // Check if staff member exists
    if (staffResult.length === 0) {
      return NextResponse.json({
        error: 'Staff member not found',
        code: 'STAFF_NOT_FOUND'
      }, { status: 404 });
    }

    const staff = staffResult[0];

    // Check if staff member is active
    if (staff.staffStatus !== 'active') {
      return NextResponse.json({
        error: 'Staff member is not active',
        code: 'STAFF_INACTIVE'
      }, { status: 404 });
    }

    // Get recent approved reviews (latest 5)
    const recentReviewsResult = await db
      .select({
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt
      })
      .from(reviews)
      .where(and(
        eq(reviews.staffMemberId, staff.staffId),
        eq(reviews.approved, true)
      ))
      .orderBy(desc(reviews.createdAt))
      .limit(5);

    // Get recent successful tips (latest 5)
    const recentTipsResult = await db
      .select({
        amountCents: tips.amountCents,
        createdAt: tips.createdAt
      })
      .from(tips)
      .where(and(
        eq(tips.staffMemberId, staff.staffId),
        eq(tips.status, 'succeeded')
      ))
      .orderBy(desc(tips.createdAt))
      .limit(5);

    // Resolve UPI ID (staff UPI ID if exists, otherwise restaurant UPI ID)
    const upiIdResolved = staff.staffUpiId || staff.restaurantUpiId;

    // Format response
    const response = {
      staff: {
        id: staff.staffId,
        displayName: staff.staffDisplayName,
        role: staff.staffRole
      },
      restaurant: {
        id: staff.restaurantId,
        name: staff.restaurantName
      },
      upi_id_resolved: upiIdResolved,
      recentReviews: recentReviewsResult.map(review => ({
        rating: review.rating,
        comment: review.comment,
        created_at: review.createdAt?.toISOString() || new Date().toISOString()
      })),
      recentTips: recentTipsResult.map(tip => ({
        amount_cents: tip.amountCents,
        created_at: tip.createdAt?.toISOString() || new Date().toISOString()
      }))
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET /api/qr/[key] error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}