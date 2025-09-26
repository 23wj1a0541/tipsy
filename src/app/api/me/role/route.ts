import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, restaurants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    const currentUser = session.user;

    // Parse and validate request body
    const body = await request.json();
    const { role } = body;

    // Validate role field is present
    if (!role) {
      return NextResponse.json({ 
        error: 'Role is required',
        code: 'MISSING_ROLE' 
      }, { status: 400 });
    }

    // Validate role is either "owner" or "worker"
    if (role !== 'owner' && role !== 'worker') {
      return NextResponse.json({ 
        error: 'Role must be either "owner" or "worker"',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Security: Never allow setting role to "admin"
    if (role === 'admin') {
      return NextResponse.json({ 
        error: 'Admin role cannot be set through this endpoint',
        code: 'ADMIN_ROLE_FORBIDDEN' 
      }, { status: 403 });
    }

    // If user is trying to change from "owner" to "worker", check for owned restaurants
    if (currentUser.role === 'owner' && role === 'worker') {
      const ownedRestaurants = await db.select()
        .from(restaurants)
        .where(eq(restaurants.ownerUserId, currentUser.id))
        .limit(1);

      if (ownedRestaurants.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot change to worker role while owning restaurants',
          code: 'OWNER_HAS_RESTAURANTS' 
        }, { status: 400 });
      }
    }

    // Update user role
    const updatedUser = await db.update(user)
      .set({ 
        role,
        updatedAt: new Date()
      })
      .where(eq(user.id, currentUser.id))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image
      });

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updatedUser[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}