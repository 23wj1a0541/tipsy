import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, staffMembers, restaurants, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Validate ID parameter
    const reviewId = params.id;
    if (!reviewId || isNaN(parseInt(reviewId))) {
      return NextResponse.json({ 
        error: 'Valid review ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { approved } = body;

    // Validate approved field
    if (typeof approved !== 'boolean') {
      return NextResponse.json({ 
        error: 'approved field must be a boolean',
        code: 'INVALID_APPROVED_VALUE' 
      }, { status: 400 });
    }

    // Get review with staff member and restaurant context
    const reviewData = await db
      .select({
        review: reviews,
        staffMember: staffMembers,
        restaurant: restaurants
      })
      .from(reviews)
      .innerJoin(staffMembers, eq(reviews.staffMemberId, staffMembers.id))
      .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(reviews.id, parseInt(reviewId)))
      .limit(1);

    if (reviewData.length === 0) {
      return NextResponse.json({ 
        error: 'Review not found' 
      }, { status: 404 });
    }

    const { review, staffMember, restaurant } = reviewData[0];

    // Authorization check
    const isAdmin = currentUser.role === 'admin';
    const isOwner = currentUser.role === 'owner' && restaurant.ownerUserId === currentUser.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to moderate this review',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Update review
    const updatedReview = await db
      .update(reviews)
      .set({
        approved: approved,
        approvedBy: currentUser.id,
        updatedAt: new Date()
      })
      .where(eq(reviews.id, parseInt(reviewId)))
      .returning();

    if (updatedReview.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update review' 
      }, { status: 500 });
    }

    // Return updated review with context
    const response = {
      ...updatedReview[0],
      staffMember: {
        id: staffMember.id,
        displayName: staffMember.displayName,
        role: staffMember.role
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        ownerUserId: restaurant.ownerUserId
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('PATCH reviews error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}