import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, staffMembers, restaurants, tips, user } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check user role authorization
    if (user.role !== 'admin' && user.role !== 'owner') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const staffId = searchParams.get('staffId');
    const approved = searchParams.get('approved');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100);
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const offset = (page - 1) * pageSize;

    // Build base query with joins
    let query = db
      .select({
        id: reviews.id,
        staffMemberId: reviews.staffMemberId,
        rating: reviews.rating,
        comment: reviews.comment,
        tipId: reviews.tipId,
        approved: reviews.approved,
        approvedBy: reviews.approvedBy,
        createdAt: reviews.createdAt,
        staffDisplayName: staffMembers.displayName,
        restaurantName: restaurants.name,
        restaurantId: restaurants.id,
        tipAmount: tips.amountCents,
        tipCurrency: tips.currency,
      })
      .from(reviews)
      .innerJoin(staffMembers, eq(reviews.staffMemberId, staffMembers.id))
      .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .leftJoin(tips, eq(reviews.tipId, tips.id));

    // Apply role-based filtering
    const conditions = [];

    if (user.role === 'owner') {
      conditions.push(eq(restaurants.ownerUserId, user.id));
    }

    // Apply query filters
    if (restaurantId) {
      conditions.push(eq(restaurants.id, parseInt(restaurantId)));
    }

    if (staffId) {
      conditions.push(eq(staffMembers.id, parseInt(staffId)));
    }

    if (approved !== null && approved !== undefined) {
      conditions.push(eq(reviews.approved, approved === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortField = sort === 'rating' ? reviews.rating : reviews.createdAt;
    const sortOrder = order === 'asc' ? asc(sortField) : desc(sortField);
    query = query.orderBy(sortOrder);

    // Apply pagination
    const results = await query.limit(pageSize).offset(offset);

    // Transform results to include tip details
    const transformedResults = results.map(review => ({
      id: review.id,
      staffMemberId: review.staffMemberId,
      rating: review.rating,
      comment: review.comment,
      tipId: review.tipId,
      approved: review.approved,
      approvedBy: review.approvedBy,
      createdAt: review.createdAt,
      staff: {
        displayName: review.staffDisplayName,
      },
      restaurant: {
        id: review.restaurantId,
        name: review.restaurantName,
      },
      tip: review.tipId ? {
        id: review.tipId,
        amountCents: review.tipAmount,
        currency: review.tipCurrency,
      } : null,
    }));

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moderation = searchParams.get('moderation');
    
    const body = await request.json();
    const { staffKey, staffId, rating, comment, tipId } = body;

    // Validate required fields
    if (!staffKey && !staffId) {
      return NextResponse.json({ 
        error: "Either staffKey or staffId is required",
        code: "MISSING_STAFF_IDENTIFIER" 
      }, { status: 400 });
    }

    if (!rating) {
      return NextResponse.json({ 
        error: "Rating is required",
        code: "MISSING_RATING" 
      }, { status: 400 });
    }

    // Validate rating is integer between 1-5
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ 
        error: "Rating must be an integer between 1 and 5",
        code: "INVALID_RATING" 
      }, { status: 400 });
    }

    // Resolve staff member
    let staff;
    if (staffKey) {
      const staffResult = await db
        .select()
        .from(staffMembers)
        .where(eq(staffMembers.qrKey, staffKey))
        .limit(1);
      
      if (staffResult.length === 0) {
        return NextResponse.json({ 
          error: "Staff member not found",
          code: "STAFF_NOT_FOUND" 
        }, { status: 404 });
      }
      staff = staffResult[0];
    } else {
      const staffResult = await db
        .select()
        .from(staffMembers)
        .where(eq(staffMembers.id, parseInt(staffId)))
        .limit(1);
      
      if (staffResult.length === 0) {
        return NextResponse.json({ 
          error: "Staff member not found",
          code: "STAFF_NOT_FOUND" 
        }, { status: 404 });
      }
      staff = staffResult[0];
    }

    // Check staff member is active
    if (staff.status !== 'active') {
      return NextResponse.json({ 
        error: "Staff member is not active",
        code: "STAFF_INACTIVE" 
      }, { status: 400 });
    }

    // Validate tip exists if tipId provided
    if (tipId) {
      const tipResult = await db
        .select()
        .from(tips)
        .where(eq(tips.id, parseInt(tipId)))
        .limit(1);
      
      if (tipResult.length === 0) {
        return NextResponse.json({ 
          error: "Tip not found",
          code: "TIP_NOT_FOUND" 
        }, { status: 404 });
      }
    }

    // Set approval status based on moderation setting
    const approved = moderation === 'on' ? false : true;

    // Create review
    const newReview = await db.insert(reviews)
      .values({
        staffMemberId: staff.id,
        rating: ratingNum,
        comment: comment || null,
        tipId: tipId ? parseInt(tipId) : null,
        approved,
        createdAt: new Date(),
      })
      .returning();

    // Get staff info for response
    const reviewWithStaff = {
      ...newReview[0],
      staff: {
        id: staff.id,
        displayName: staff.displayName,
      },
    };

    return NextResponse.json(reviewWithStaff, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}