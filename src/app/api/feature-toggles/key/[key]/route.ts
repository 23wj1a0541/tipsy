import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { featureToggles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Get session and validate authentication
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    // Validate admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Admin role required.',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const { key } = params;

    // Validate key parameter
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Valid key parameter is required',
        code: 'INVALID_KEY' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { label, enabled, audience } = body;

    // Validate that at least one field is provided for update
    if (label === undefined && enabled === undefined && audience === undefined) {
      return NextResponse.json({ 
        error: 'At least one field (label, enabled, or audience) must be provided for update',
        code: 'NO_UPDATE_FIELDS' 
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and add label if provided
    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Label must be a non-empty string',
          code: 'INVALID_LABEL' 
        }, { status: 400 });
      }
      updates.label = label.trim();
    }

    // Validate and add enabled if provided
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean' && enabled !== 0 && enabled !== 1) {
        return NextResponse.json({ 
          error: 'Enabled must be a boolean or integer (0/1)',
          code: 'INVALID_ENABLED' 
        }, { status: 400 });
      }
      updates.enabled = typeof enabled === 'boolean' ? (enabled ? 1 : 0) : enabled;
    }

    // Validate and add audience if provided
    if (audience !== undefined) {
      if (typeof audience !== 'string' || audience.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Audience must be a non-empty string',
          code: 'INVALID_AUDIENCE' 
        }, { status: 400 });
      }
      updates.audience = audience.trim();
    }

    // Check if feature toggle exists
    const existingToggle = await db.select()
      .from(featureToggles)
      .where(eq(featureToggles.key, key.trim()))
      .limit(1);

    if (existingToggle.length === 0) {
      return NextResponse.json({ 
        error: 'Feature toggle not found',
        code: 'TOGGLE_NOT_FOUND' 
      }, { status: 404 });
    }

    // Update the feature toggle
    const updated = await db.update(featureToggles)
      .set(updates)
      .where(eq(featureToggles.key, key.trim()))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update feature toggle',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    // Format response to match expected structure
    const updatedToggle = updated[0];
    const response = {
      id: updatedToggle.id,
      key: updatedToggle.key,
      label: updatedToggle.label,
      enabled: updatedToggle.enabled,
      audience: updatedToggle.audience,
      created_at: updatedToggle.createdAt,
      updated_at: updatedToggle.updatedAt
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('PATCH feature toggle error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}