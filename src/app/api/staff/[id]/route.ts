import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffMembers, restaurants, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const staffId = parseInt(id);

    // Get staff member with restaurant details
    const staffResult = await db
      .select({
        staff: staffMembers,
        restaurant: restaurants
      })
      .from(staffMembers)
      .leftJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(staffMembers.id, staffId))
      .limit(1);

    if (staffResult.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { staff, restaurant } = staffResult[0];

    // Authorization checks
    if (currentUser.role === 'admin') {
      // Admin can access any staff member
    } else if (currentUser.role === 'owner') {
      // Owner can only access staff from restaurants they own
      if (!restaurant || restaurant.ownerUserId !== currentUser.id) {
        return NextResponse.json({ 
          error: 'Access denied: You can only access staff from restaurants you own',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, { status: 403 });
      }
    } else if (currentUser.role === 'worker') {
      // Worker can only access their own staff record
      if (staff.userId !== currentUser.id) {
        return NextResponse.json({ 
          error: 'Access denied: You can only access your own staff record',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Access denied: Invalid user role',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    return NextResponse.json({
      ...staff,
      restaurant: restaurant
    });

  } catch (error) {
    console.error('GET staff member error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const staffId = parseInt(id);
    const requestBody = await request.json();
    const { displayName, role, status, userId, upiId } = requestBody;

    // Get staff member with restaurant details for authorization
    const staffResult = await db
      .select({
        staff: staffMembers,
        restaurant: restaurants
      })
      .from(staffMembers)
      .leftJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(staffMembers.id, staffId))
      .limit(1);

    if (staffResult.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { staff, restaurant } = staffResult[0];

    // Authorization checks and field restrictions
    let allowedUpdates: any = {};

    if (currentUser.role === 'admin') {
      // Admin can update any field
      if (displayName !== undefined) allowedUpdates.displayName = displayName;
      if (role !== undefined) allowedUpdates.role = role;
      if (status !== undefined) allowedUpdates.status = status;
      if (userId !== undefined) allowedUpdates.userId = userId;
      if (upiId !== undefined) allowedUpdates.upiId = upiId;
    } else if (currentUser.role === 'owner') {
      // Owner can update any field for staff in restaurants they own
      if (!restaurant || restaurant.ownerUserId !== currentUser.id) {
        return NextResponse.json({ 
          error: 'Access denied: You can only update staff from restaurants you own',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, { status: 403 });
      }
      if (displayName !== undefined) allowedUpdates.displayName = displayName;
      if (role !== undefined) allowedUpdates.role = role;
      if (status !== undefined) allowedUpdates.status = status;
      if (userId !== undefined) allowedUpdates.userId = userId;
      if (upiId !== undefined) allowedUpdates.upiId = upiId;
    } else if (currentUser.role === 'worker') {
      // Worker can only update limited fields of their own profile
      if (staff.userId !== currentUser.id) {
        return NextResponse.json({ 
          error: 'Access denied: You can only update your own staff record',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, { status: 403 });
      }
      // Workers can only update displayName and upiId
      if (displayName !== undefined) allowedUpdates.displayName = displayName;
      if (upiId !== undefined) allowedUpdates.upiId = upiId;
      
      // Reject attempts to update restricted fields
      if (role !== undefined || status !== undefined || userId !== undefined) {
        return NextResponse.json({ 
          error: 'Access denied: Workers can only update displayName and upiId',
          code: 'RESTRICTED_FIELDS' 
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Access denied: Invalid user role',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Validate enum values
    if (allowedUpdates.role && !['server', 'chef', 'host', 'manager'].includes(allowedUpdates.role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: server, chef, host, manager',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }
    
    if (allowedUpdates.status && !['active', 'inactive'].includes(allowedUpdates.status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: active, inactive',
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    // Validate displayName is not empty if provided
    if (allowedUpdates.displayName !== undefined) {
      if (!allowedUpdates.displayName || allowedUpdates.displayName.trim() === '') {
        return NextResponse.json({ 
          error: 'Display name cannot be empty',
          code: 'INVALID_DISPLAY_NAME' 
        }, { status: 400 });
      }
      allowedUpdates.displayName = allowedUpdates.displayName.trim();
    }

    // If no valid updates provided
    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update',
        code: 'NO_UPDATES' 
      }, { status: 400 });
    }

    // Update the staff member
    const updated = await db
      .update(staffMembers)
      .set(allowedUpdates)
      .where(eq(staffMembers.id, staffId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PATCH staff member error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const staffId = parseInt(id);

    // Workers cannot delete staff records
    if (currentUser.role === 'worker') {
      return NextResponse.json({ 
        error: 'Access denied: Workers cannot delete staff records',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Get staff member with restaurant details for authorization
    const staffResult = await db
      .select({
        staff: staffMembers,
        restaurant: restaurants
      })
      .from(staffMembers)
      .leftJoin(restaurants, eq(staffMembers.restaurantId, restaurants.id))
      .where(eq(staffMembers.id, staffId))
      .limit(1);

    if (staffResult.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { staff, restaurant } = staffResult[0];

    // Authorization checks
    if (currentUser.role === 'admin') {
      // Admin can delete any staff member
    } else if (currentUser.role === 'owner') {
      // Owner can only delete staff from restaurants they own
      if (!restaurant || restaurant.ownerUserId !== currentUser.id) {
        return NextResponse.json({ 
          error: 'Access denied: You can only delete staff from restaurants you own',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Access denied: Invalid user role',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Delete the staff member
    const deleted = await db
      .delete(staffMembers)
      .where(eq(staffMembers.id, staffId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Staff member deleted successfully',
      deletedStaffMember: deleted[0]
    });

  } catch (error) {
    console.error('DELETE staff member error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}