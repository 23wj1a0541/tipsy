import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffMembers, restaurants, reviews, tips } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ 
        error: "QR key is required",
        code: "MISSING_QR_KEY" 
      }, { status: 400 });
    }

    if (!key.trim()) {
      return NextResponse.json({ 
        error: "QR key cannot be empty",
        code: "INVALID_QR_KEY" 
      }, { status: 400 });
    }

    // Find staff member by QR key with restaurant data
    const staffMemberQuery = await db.select({
      id: staffMembers.id,
      userId: staffMembers.userId,
      restaurantId: staffMembers.restaurantId,
      displayName: staffMembers.displayName,
      role: staffMembers.role,
      status: staffMembers.status,
      qrKey: staffMembers.qrKey,
      upiId: staffMembers.upiId,
      createdAt: staffMembers.createdAt,
      restaurant: {
        id: restaurants.id,
        name: restaurants.name,
        upiId: restaurants.upiId,
        address: restaurants.address,
        city: restaurants.city,
        state: restaurants.state,
        country: restaurants.country,
        createdAt: restaurants.createdAt
      }
    })
    .from(staffMembers)
    .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
    .where(eq(staffMembers.qrKey, key.trim()))
    .limit(1);

    if (staffMemberQuery.length === 0) {
      return NextResponse.json({ 
        error: "Staff member not found with this QR key",
        code: "STAFF_NOT_FOUND" 
      }, { status: 404 });
    }

    const staffMember = staffMemberQuery[0];

    // Check if staff member is active
    if (staffMember.status !== 'active') {
      return NextResponse.json({ 
        error: "Staff member is not active",
        code: "STAFF_INACTIVE" 
      }, { status: 404 });
    }

    // Get recent reviews (last 10)
    const recentReviews = await db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      tipId: reviews.tipId,
      approved: reviews.approved,
      createdAt: reviews.createdAt
    })
    .from(reviews)
    .where(eq(reviews.staffMemberId, staffMember.id))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

    // Get recent tips (last 10)
    const recentTips = await db.select({
      id: tips.id,
      amountCents: tips.amountCents,
      currency: tips.currency,
      payerName: tips.payerName,
      message: tips.message,
      source: tips.source,
      status: tips.status,
      createdAt: tips.createdAt
    })
    .from(tips)
    .where(eq(tips.staffMemberId, staffMember.id))
    .orderBy(desc(tips.createdAt))
    .limit(10);

    // Calculate stats
    const totalTips = recentTips.reduce((sum, tip) => sum + tip.amountCents, 0);
    const averageRating = recentReviews.length > 0 
      ? recentReviews.reduce((sum, review) => sum + review.rating, 0) / recentReviews.length 
      : 0;

    const response = {
      staff: {
        id: staffMember.id,
        displayName: staffMember.displayName,
        role: staffMember.role,
        status: staffMember.status,
        qrKey: staffMember.qrKey,
        upiId: staffMember.upiId,
        createdAt: staffMember.createdAt
      },
      restaurant: staffMember.restaurant,
      recentReviews,
      recentTips,
      stats: {
        totalReviews: recentReviews.length,
        averageRating: Math.round(averageRating * 100) / 100,
        totalTipsAmount: totalTips,
        totalTipsCount: recentTips.length
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET QR resolve error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}