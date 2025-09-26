import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tips, staffMembers, restaurants } from '@/db/schema';
import { eq, and, or, desc, asc, gte, lte } from 'drizzle-orm';
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

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const staffId = searchParams.get('staffId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100);
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const offset = (page - 1) * pageSize;

    // Build base query with joins
    let query = db.select({
      id: tips.id,
      staffMemberId: tips.staffMemberId,
      amountCents: tips.amountCents,
      currency: tips.currency,
      payerName: tips.payerName,
      message: tips.message,
      source: tips.source,
      status: tips.status,
      createdAt: tips.createdAt,
      staffDisplayName: staffMembers.displayName,
      restaurantName: restaurants.name,
      restaurantId: restaurants.id
    })
    .from(tips)
    .innerJoin(staffMembers, eq(tips.staffMemberId, staffMembers.id))
    .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id));

    // Apply role-based filtering
    const conditions = [];

    if (user.role === 'admin') {
      // Admin can see all tips
    } else if (user.role === 'owner') {
      // Owner can only see tips from their restaurants
      conditions.push(eq(restaurants.ownerUserId, user.id));
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Apply query filters
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      conditions.push(eq(restaurants.id, parseInt(restaurantId)));
    }

    if (staffId && !isNaN(parseInt(staffId))) {
      conditions.push(eq(staffMembers.id, parseInt(staffId)));
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(tips.createdAt, fromDate));
      }
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(tips.createdAt, toDate));
      }
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Apply sorting
    const sortOrder = order === 'desc' ? desc : asc;
    switch (sort) {
      case 'amountCents':
        query = query.orderBy(sortOrder(tips.amountCents));
        break;
      case 'createdAt':
      default:
        query = query.orderBy(sortOrder(tips.createdAt));
        break;
    }

    // Apply pagination
    const results = await query.limit(pageSize).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET tips error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffKey, staffId, amount, currency = 'INR', payerName, message, source = 'qr' } = body;

    // Validation
    if (!staffKey && !staffId) {
      return NextResponse.json({ 
        error: 'Either staffKey or staffId is required',
        code: 'MISSING_STAFF_IDENTIFIER' 
      }, { status: 400 });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT' 
      }, { status: 400 });
    }

    // Clamp amount to reasonable range (1-100000 INR)
    if (amount < 1 || amount > 100000) {
      return NextResponse.json({ 
        error: 'Amount must be between 1 and 100000',
        code: 'AMOUNT_OUT_OF_RANGE' 
      }, { status: 400 });
    }

    // Validate source enum
    if (!['qr', 'link', 'pos'].includes(source)) {
      return NextResponse.json({ 
        error: 'Invalid source. Must be one of: qr, link, pos',
        code: 'INVALID_SOURCE' 
      }, { status: 400 });
    }

    // Resolve staff member
    let staffMember;
    if (staffKey) {
      const staffResults = await db.select({
        id: staffMembers.id,
        displayName: staffMembers.displayName,
        status: staffMembers.status,
        restaurantId: staffMembers.restaurantId
      })
      .from(staffMembers)
      .where(eq(staffMembers.qrKey, staffKey))
      .limit(1);

      if (staffResults.length === 0) {
        return NextResponse.json({ 
          error: 'Staff member not found',
          code: 'STAFF_NOT_FOUND' 
        }, { status: 404 });
      }
      staffMember = staffResults[0];
    } else {
      const staffIdNum = parseInt(staffId);
      if (isNaN(staffIdNum)) {
        return NextResponse.json({ 
          error: 'Invalid staff ID',
          code: 'INVALID_STAFF_ID' 
        }, { status: 400 });
      }

      const staffResults = await db.select({
        id: staffMembers.id,
        displayName: staffMembers.displayName,
        status: staffMembers.status,
        restaurantId: staffMembers.restaurantId
      })
      .from(staffMembers)
      .where(eq(staffMembers.id, staffIdNum))
      .limit(1);

      if (staffResults.length === 0) {
        return NextResponse.json({ 
          error: 'Staff member not found',
          code: 'STAFF_NOT_FOUND' 
        }, { status: 404 });
      }
      staffMember = staffResults[0];
    }

    // Check if staff member is active
    if (staffMember.status !== 'active') {
      return NextResponse.json({ 
        error: 'Staff member is not active',
        code: 'STAFF_INACTIVE' 
      }, { status: 400 });
    }

    // Convert amount to cents
    const amountCents = Math.round(amount * 100);

    // Create tip
    const newTip = await db.insert(tips).values({
      staffMemberId: staffMember.id,
      amountCents,
      currency,
      payerName: payerName?.trim() || null,
      message: message?.trim() || null,
      source,
      status: 'succeeded',
      createdAt: new Date()
    }).returning();

    // Get restaurant info for response
    const restaurantResults = await db.select({
      name: restaurants.name
    })
    .from(restaurants)
    .where(eq(restaurants.id, staffMember.restaurantId))
    .limit(1);

    const response = {
      ...newTip[0],
      staffDisplayName: staffMember.displayName,
      restaurantName: restaurantResults[0]?.name || null
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('POST tips error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}