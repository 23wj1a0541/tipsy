import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { restaurants, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const restaurantId = parseInt(id);

    // Build query based on user role
    let whereCondition;
    if (currentUser.role === 'admin') {
      // Admin can access any restaurant
      whereCondition = eq(restaurants.id, restaurantId);
    } else if (currentUser.role === 'owner') {
      // Owner can only access their own restaurant
      whereCondition = and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerUserId, currentUser.id)
      );
    } else {
      // Workers cannot access restaurants
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const restaurant = await db.select()
      .from(restaurants)
      .where(whereCondition)
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(restaurant[0]);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const restaurantId = parseInt(id);
    const requestBody = await request.json();

    // Security check: reject if userId provided in body
    if ('ownerUserId' in requestBody || 'owner_user_id' in requestBody) {
      return NextResponse.json({ 
        error: "Owner user ID cannot be provided in request body",
        code: "OWNER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, upiId, address, city, state, country } = requestBody;

    // Build query based on user role
    let whereCondition;
    if (currentUser.role === 'admin') {
      // Admin can update any restaurant
      whereCondition = eq(restaurants.id, restaurantId);
    } else if (currentUser.role === 'owner') {
      // Owner can only update their own restaurant
      whereCondition = and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerUserId, currentUser.id)
      );
    } else {
      // Workers cannot update restaurants
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Check if restaurant exists and user has access
    const existingRestaurant = await db.select()
      .from(restaurants)
      .where(whereCondition)
      .limit(1);

    if (existingRestaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Prepare update data - only include provided fields
    const updateData: any = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: "Name is required and must be a non-empty string",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (upiId !== undefined) {
      if (!upiId || typeof upiId !== 'string' || upiId.trim().length === 0) {
        return NextResponse.json({ 
          error: "UPI ID is required and must be a non-empty string",
          code: "INVALID_UPI_ID" 
        }, { status: 400 });
      }
      updateData.upiId = upiId.trim();
    }
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;

    // If no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: "No valid fields provided for update",
        code: "NO_UPDATE_FIELDS" 
      }, { status: 400 });
    }

    const updatedRestaurant = await db.update(restaurants)
      .set(updateData)
      .where(whereCondition)
      .returning();

    if (updatedRestaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(updatedRestaurant[0]);

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admin can delete restaurants
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Insufficient permissions - admin access required',
        code: 'ADMIN_REQUIRED' 
      }, { status: 403 });
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const restaurantId = parseInt(id);

    // Check if restaurant exists
    const existingRestaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (existingRestaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const deletedRestaurant = await db.delete(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (deletedRestaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Restaurant deleted successfully',
      deletedRestaurant: deletedRestaurant[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}