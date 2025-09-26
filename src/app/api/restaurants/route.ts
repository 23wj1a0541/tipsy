import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { restaurants, user } from '@/db/schema';
import { eq, like, and, desc, asc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userRole = session.user.role;
    
    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100);
    const offset = (page - 1) * pageSize;
    const search = searchParams.get('search');
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') === 'asc' ? asc : desc;

    // For owners, only show their restaurants
    // For admins, show all restaurants
    let baseCondition = userRole === 'owner' 
      ? eq(restaurants.ownerUserId, session.user.id)
      : undefined;

    let searchCondition;
    if (search) {
      searchCondition = like(restaurants.name, `%${search}%`);
    }

    let whereCondition;
    if (baseCondition && searchCondition) {
      whereCondition = and(baseCondition, searchCondition);
    } else if (baseCondition) {
      whereCondition = baseCondition;
    } else if (searchCondition) {
      whereCondition = searchCondition;
    }

    // Get total count
    const totalQuery = db.select({ count: count() }).from(restaurants);
    if (whereCondition) {
      totalQuery.where(whereCondition);
    }
    const totalResult = await totalQuery;
    const total = totalResult[0].count;

    // Get restaurants data
    let query = db.select().from(restaurants);
    if (whereCondition) {
      query = query.where(whereCondition);
    }

    // Apply sorting
    if (sortField === 'name') {
      query = query.orderBy(sortOrder(restaurants.name));
    } else {
      query = query.orderBy(sortOrder(restaurants.createdAt));
    }

    const data = await query.limit(pageSize).offset(offset);

    return NextResponse.json({
      data,
      page,
      pageSize,
      total
    });

  } catch (error) {
    console.error('GET restaurants error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userRole = session.user.role;
    
    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, upiId, address, city, state, country, ownerUserId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!upiId) {
      return NextResponse.json({ 
        error: "UPI ID is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Determine the owner user ID
    let finalOwnerUserId;
    if (userRole === 'admin' && ownerUserId) {
      // Admin can specify ownerUserId
      finalOwnerUserId = ownerUserId;
      
      // Validate that the specified owner exists and has owner role
      const ownerUser = await db.select()
        .from(user)
        .where(eq(user.id, ownerUserId))
        .limit(1);
      
      if (ownerUser.length === 0) {
        return NextResponse.json({ 
          error: "Specified owner user not found",
          code: "INVALID_OWNER_USER" 
        }, { status: 400 });
      }

      if (ownerUser[0].role !== 'owner') {
        return NextResponse.json({ 
          error: "Specified user must have owner role",
          code: "INVALID_OWNER_ROLE" 
        }, { status: 400 });
      }
    } else {
      // For owners, use their own ID
      finalOwnerUserId = session.user.id;
    }

    const newRestaurant = await db.insert(restaurants)
      .values({
        name: name.trim(),
        upiId: upiId.trim(),
        address: address?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        country: country?.trim(),
        ownerUserId: finalOwnerUserId,
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json(newRestaurant[0], { status: 201 });

  } catch (error) {
    console.error('POST restaurants error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}