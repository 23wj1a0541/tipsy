import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { featureToggles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and authorization check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Validate ID parameter
    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { label, enabled, audience } = body;

    // Check if record exists
    const existingRecord = await db.select()
      .from(featureToggles)
      .where(eq(featureToggles.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Feature toggle not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Label must be a non-empty string',
          code: 'INVALID_LABEL' 
        }, { status: 400 });
      }
      updateData.label = label.trim();
    }

    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean' && enabled !== 0 && enabled !== 1) {
        return NextResponse.json({ 
          error: 'Enabled must be a boolean or 0/1',
          code: 'INVALID_ENABLED' 
        }, { status: 400 });
      }
      updateData.enabled = enabled === true || enabled === 1 ? 1 : 0;
    }

    if (audience !== undefined) {
      if (typeof audience !== 'string' || audience.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Audience must be a non-empty string',
          code: 'INVALID_AUDIENCE' 
        }, { status: 400 });
      }
      updateData.audience = audience.trim();
    }

    // Update record
    const updated = await db.update(featureToggles)
      .set(updateData)
      .where(eq(featureToggles.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update feature toggle',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    // Transform response to match expected format
    const response = {
      id: updated[0].id,
      key: updated[0].key,
      label: updated[0].label,
      enabled: updated[0].enabled === 1,
      audience: updated[0].audience,
      created_at: updated[0].createdAt,
      updated_at: updated[0].updatedAt
    };

    return NextResponse.json(response, { status: 200 });
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
    // Authentication and authorization check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Validate ID parameter
    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if record exists before deleting
    const existingRecord = await db.select()
      .from(featureToggles)
      .where(eq(featureToggles.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Feature toggle not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete record
    const deleted = await db.delete(featureToggles)
      .where(eq(featureToggles.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete feature toggle',
        code: 'DELETE_FAILED' 
      }, { status: 500 });
    }

    // Transform deleted record to match expected format
    const deletedToggle = {
      id: deleted[0].id,
      key: deleted[0].key,
      label: deleted[0].label,
      enabled: deleted[0].enabled === 1,
      audience: deleted[0].audience,
      created_at: deleted[0].createdAt,
      updated_at: deleted[0].updatedAt
    };

    return NextResponse.json({
      message: 'Feature toggle deleted successfully',
      deleted: deletedToggle
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}