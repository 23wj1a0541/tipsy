import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffMembers, restaurants, user } from '@/db/schema';
import { eq, like, and, or, desc, asc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const status = searchParams.get('status') as 'active' | 'inactive' | null;
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '10'));
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';
    
    const offset = (page - 1) * pageSize;

    // Role-based query building
    let baseQuery = db
      .select({
        id: staffMembers.id,
        userId: staffMembers.userId,
        restaurantId: staffMembers.restaurantId,
        displayName: staffMembers.displayName,
        role: staffMembers.role,
        status: staffMembers.status,
        qrKey: staffMembers.qrKey,
        upiId: staffMembers.upiId,
        createdAt: staffMembers.createdAt,
        restaurantName: restaurants.name,
      })
      .from(staffMembers)
      .leftJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id));

    let countQuery = db
      .select({ count: count() })
      .from(staffMembers)
      .leftJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id));

    // Apply role-based filtering
    if (sessionUser.role === 'owner') {
      const ownerCondition = eq(restaurants.ownerUserId, sessionUser.id);
      baseQuery = baseQuery.where(ownerCondition);
      countQuery = countQuery.where(ownerCondition);
    } else if (sessionUser.role === 'worker') {
      const workerCondition = eq(staffMembers.userId, sessionUser.id);
      baseQuery = baseQuery.where(workerCondition);
      countQuery = countQuery.where(workerCondition);
    }
    // admin role has no additional restrictions

    // Apply additional filters
    const conditions = [];
    
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      conditions.push(eq(staffMembers.restaurantId, parseInt(restaurantId)));
    }
    
    if (status && (status === 'active' || status === 'inactive')) {
      conditions.push(eq(staffMembers.status, status));
    }
    
    if (search) {
      conditions.push(like(staffMembers.displayName, `%${search}%`));
    }

    if (conditions.length > 0) {
      const additionalCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      
      if (sessionUser.role === 'owner') {
        baseQuery = baseQuery.where(and(eq(restaurants.ownerUserId, sessionUser.id), additionalCondition));
        countQuery = countQuery.where(and(eq(restaurants.ownerUserId, sessionUser.id), additionalCondition));
      } else if (sessionUser.role === 'worker') {
        baseQuery = baseQuery.where(and(eq(staffMembers.userId, sessionUser.id), additionalCondition));
        countQuery = countQuery.where(and(eq(staffMembers.userId, sessionUser.id), additionalCondition));
      } else {
        baseQuery = baseQuery.where(additionalCondition);
        countQuery = countQuery.where(additionalCondition);
      }
    }

    // Apply sorting
    const orderBy = sortOrder === 'asc' ? asc : desc;
    if (sortField === 'displayName') {
      baseQuery = baseQuery.orderBy(orderBy(staffMembers.displayName));
    } else if (sortField === 'role') {
      baseQuery = baseQuery.orderBy(orderBy(staffMembers.role));
    } else if (sortField === 'status') {
      baseQuery = baseQuery.orderBy(orderBy(staffMembers.status));
    } else {
      baseQuery = baseQuery.orderBy(orderBy(staffMembers.createdAt));
    }

    // Execute queries
    const [data, totalResult] = await Promise.all([
      baseQuery.limit(pageSize).offset(offset),
      countQuery
    ]);

    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      data,
      page,
      pageSize,
      total
    });

  } catch (error) {
    console.error('GET staff members error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners and admins can create staff members
    if (sessionUser.role === 'worker') {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { restaurantId, displayName, role, status, userId, upiId } = requestBody;

    // Security check: prevent user ID manipulation if provided
    if ('userId' in requestBody && sessionUser.role !== 'admin') {
      return NextResponse.json({ 
        error: "Only admins can assign staff to specific users",
        code: "INSUFFICIENT_PERMISSIONS" 
      }, { status: 403 });
    }

    // Validate required fields
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      return NextResponse.json({ 
        error: "Valid restaurant ID is required",
        code: "MISSING_RESTAURANT_ID" 
      }, { status: 400 });
    }

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ 
        error: "Display name is required",
        code: "MISSING_DISPLAY_NAME" 
      }, { status: 400 });
    }

    // Validate restaurant exists and ownership for owners
    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, parseInt(restaurantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({ 
        error: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND" 
      }, { status: 404 });
    }

    // For owners, validate they own the restaurant
    if (sessionUser.role === 'owner' && restaurant[0].ownerUserId !== sessionUser.id) {
      return NextResponse.json({ 
        error: "You can only create staff for restaurants you own",
        code: "RESTAURANT_ACCESS_DENIED" 
      }, { status: 403 });
    }

    // Validate userId if provided
    if (userId && userId.trim().length > 0) {
      const userExists = await db
        .select()
        .from(user)
        .where(eq(user.id, userId.trim()))
        .limit(1);

      if (userExists.length === 0) {
        return NextResponse.json({ 
          error: "User not found",
          code: "USER_NOT_FOUND" 
        }, { status: 404 });
      }
    }

    // Validate role if provided
    const validRoles = ['server', 'chef', 'host', 'manager'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ 
        error: "Invalid role. Must be one of: " + validRoles.join(', '),
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be one of: " + validStatuses.join(', '),
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Generate unique qrKey
    const timestamp = Date.now();
    const sanitizedDisplayName = displayName.trim().toLowerCase().replace(/\s+/g, '-');
    const qrKey = `${sanitizedDisplayName}-${timestamp}`;

    // Prepare insert data
    const insertData = {
      restaurantId: parseInt(restaurantId),
      displayName: displayName.trim(),
      role: role || 'server',
      status: status || 'active',
      qrKey,
      userId: userId && userId.trim().length > 0 ? userId.trim() : null,
      upiId: upiId && upiId.trim().length > 0 ? upiId.trim() : null,
      createdAt: new Date()
    };

    // Create staff member
    const newStaffMember = await db
      .insert(staffMembers)
      .values(insertData)
      .returning();

    // Fetch the created staff member with restaurant name
    const createdStaffMember = await db
      .select({
        id: staffMembers.id,
        userId: staffMembers.userId,
        restaurantId: staffMembers.restaurantId,
        displayName: staffMembers.displayName,
        role: staffMembers.role,
        status: staffMembers.status,
        qrKey: staffMembers.qrKey,
        upiId: staffMembers.upiId,
        createdAt: staffMembers.createdAt,
        restaurantName: restaurants.name,
      })
      .from(staffMembers)
      .leftJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(staffMembers.id, newStaffMember[0].id))
      .limit(1);

    return NextResponse.json(createdStaffMember[0], { status: 201 });

  } catch (error) {
    console.error('POST staff members error:', error);
    
    // Handle unique constraint violation for qrKey
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: staff_members.qr_key')) {
      return NextResponse.json({ 
        error: 'QR key generation failed. Please try again.',
        code: 'QR_KEY_CONFLICT'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}