import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq, like, and, or, desc, asc, count, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to validate admin access
async function validateAdminAccess(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHENTICATED' 
      }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    return null; // No error, user is authenticated admin
  } catch (error) {
    console.error('Admin validation error:', error);
    return NextResponse.json({ 
      error: 'Authentication validation failed',
      code: 'AUTH_ERROR' 
    }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    const authError = await validateAdminAccess(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'email' | 'name' | 'role' || 'createdAt';
    const sortDir = searchParams.get('sortDir') as 'asc' | 'desc' || 'desc';

    // Validate sortBy parameter
    const validSortFields = ['createdAt', 'email', 'name', 'role'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json({ 
        error: 'Invalid sortBy parameter. Must be one of: createdAt, email, name, role',
        code: 'INVALID_SORT_FIELD' 
      }, { status: 400 });
    }

    // Build base query
    let query = db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }).from(user);

    let countQuery = db.select({ count: count() }).from(user);

    // Apply search filter if provided
    if (search.trim()) {
      const searchCondition = or(
        like(user.name, `%${search.trim()}%`),
        like(user.email, `%${search.trim()}%`)
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    // Apply sorting
    const sortColumn = user[sortBy as keyof typeof user];
    query = query.orderBy(sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn));

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.limit(pageSize).offset(offset);

    // Execute queries
    const [users, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize
    });

  } catch (error) {
    console.error('GET users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Validate admin access
    const authError = await validateAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { userId, role } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ 
        error: 'Role is required',
        code: 'MISSING_ROLE' 
      }, { status: 400 });
    }

    // Validate role enum
    const validRoles = ['admin', 'owner', 'worker'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: admin, owner, worker',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const currentUser = targetUser[0];

    // Business rule: Prevent demoting the last admin
    if (currentUser.role === 'admin' && role !== 'admin') {
      // Count total admins
      const adminCount = await db.select({ count: count() })
        .from(user)
        .where(eq(user.role, 'admin'));

      const totalAdmins = adminCount[0]?.count || 0;

      if (totalAdmins <= 1) {
        return NextResponse.json({ 
          error: 'Cannot demote the last admin user. At least one admin must remain.',
          code: 'LAST_ADMIN_PROTECTION' 
        }, { status: 422 });
      }
    }

    // Update user role
    const updatedUser = await db.update(user)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update user',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updatedUser[0]);

  } catch (error) {
    console.error('PATCH users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}