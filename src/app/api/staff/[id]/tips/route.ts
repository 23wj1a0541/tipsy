import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tips, staffMembers, restaurants, user } from '@/db/schema';
import { eq, and, desc, asc, gte, lte, sql, count, sum } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const staffId = params.id;
    if (!staffId || isNaN(parseInt(staffId))) {
      return NextResponse.json({ 
        error: "Valid staff member ID is required",
        code: "INVALID_STAFF_ID" 
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    // Validate sort field
    if (!['amountCents', 'createdAt'].includes(sort)) {
      return NextResponse.json({ 
        error: "Sort field must be 'amountCents' or 'createdAt'",
        code: "INVALID_SORT_FIELD" 
      }, { status: 400 });
    }

    // Validate order
    if (!['asc', 'desc'].includes(order)) {
      return NextResponse.json({ 
        error: "Order must be 'asc' or 'desc'",
        code: "INVALID_ORDER" 
      }, { status: 400 });
    }

    // Validate date formats if provided
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return NextResponse.json({ 
        error: "Invalid dateFrom format. Use ISO string",
        code: "INVALID_DATE_FROM" 
      }, { status: 400 });
    }

    if (dateTo && isNaN(Date.parse(dateTo))) {
      return NextResponse.json({ 
        error: "Invalid dateTo format. Use ISO string",
        code: "INVALID_DATE_TO" 
      }, { status: 400 });
    }

    // First, get staff member with restaurant info to check permissions
    const staffQuery = await db
      .select({
        id: staffMembers.id,
        userId: staffMembers.userId,
        restaurantId: staffMembers.restaurantId,
        displayName: staffMembers.displayName,
        role: staffMembers.role,
        restaurantName: restaurants.name,
        restaurantOwnerUserId: restaurants.ownerUserId
      })
      .from(staffMembers)
      .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(staffMembers.id, parseInt(staffId)))
      .limit(1);

    if (staffQuery.length === 0) {
      return NextResponse.json({ 
        error: 'Staff member not found',
        code: "STAFF_NOT_FOUND" 
      }, { status: 404 });
    }

    const staffMember = staffQuery[0];

    // Check permissions based on user role
    let hasAccess = false;

    if (currentUser.role === 'admin') {
      hasAccess = true;
    } else if (currentUser.role === 'owner') {
      // Owner can access tips for staff in restaurants they own
      hasAccess = staffMember.restaurantOwnerUserId === currentUser.id;
    } else if (currentUser.role === 'worker') {
      // Worker can only access their own tips
      hasAccess = staffMember.userId === currentUser.id;
    }

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to access this staff member\'s tips',
        code: "INSUFFICIENT_PERMISSIONS" 
      }, { status: 403 });
    }

    // Build date filters
    const dateFilters = [];
    if (dateFrom) {
      dateFilters.push(gte(tips.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      dateFilters.push(lte(tips.createdAt, new Date(dateTo)));
    }

    // Build where condition
    const whereConditions = [eq(tips.staffMemberId, parseInt(staffId))];
    if (dateFilters.length > 0) {
      whereConditions.push(...dateFilters);
    }

    // Get total count for pagination
    const totalCountQuery = await db
      .select({ count: count() })
      .from(tips)
      .where(and(...whereConditions));

    const total = totalCountQuery[0]?.count || 0;

    // Get summary data
    const summaryQuery = await db
      .select({
        totalAmount: sum(tips.amountCents),
        tipCount: count()
      })
      .from(tips)
      .where(and(...whereConditions));

    const summary = {
      totalAmount: summaryQuery[0]?.totalAmount || 0,
      tipCount: summaryQuery[0]?.tipCount || 0
    };

    // Build main query with pagination and sorting
    const offset = (page - 1) * pageSize;
    const orderBy = sort === 'amountCents' 
      ? (order === 'desc' ? desc(tips.amountCents) : asc(tips.amountCents))
      : (order === 'desc' ? desc(tips.createdAt) : asc(tips.createdAt));

    const tipsQuery = await db
      .select({
        id: tips.id,
        amountCents: tips.amountCents,
        currency: tips.currency,
        payerName: tips.payerName,
        message: tips.message,
        source: tips.source,
        status: tips.status,
        createdAt: tips.createdAt,
        staffMember: {
          id: staffMembers.id,
          displayName: staffMembers.displayName,
          role: staffMembers.role
        },
        restaurant: {
          id: restaurants.id,
          name: restaurants.name
        }
      })
      .from(tips)
      .innerJoin(staffMembers, eq(tips.staffMemberId, staffMembers.id))
      .innerJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data: tipsQuery,
      page,
      pageSize,
      total,
      summary
    }, { status: 200 });

  } catch (error) {
    console.error('GET tips error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}