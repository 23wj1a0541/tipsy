import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { featureToggles } from '@/db/schema';
import { eq, like, and, or, desc, asc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const page = Math.floor(offset / limit) + 1;
    const search = searchParams.get('search');
    const audience = searchParams.get('audience');
    const enabled = searchParams.get('enabled');
    const order = searchParams.get('order') || 'created_at';
    const direction = searchParams.get('direction') || 'desc';

    // Build where conditions with proper AND logic
    let whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(featureToggles.key, `%${search}%`),
          like(featureToggles.label, `%${search}%`)
        )
      );
    }

    if (audience) {
      whereConditions.push(eq(featureToggles.audience, audience));
    }

    if (enabled !== null && enabled !== undefined) {
      const enabledValue = enabled === '1' ? 1 : 0;
      whereConditions.push(eq(featureToggles.enabled, enabledValue));
    }

    // Build query with proper AND conditions
    let query = db.select().from(featureToggles);
    let countQuery = db.select({ count: count() }).from(featureToggles);

    if (whereConditions.length > 0) {
      const whereClause = whereConditions.length === 1 
        ? whereConditions[0] 
        : and(...whereConditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply ordering
    const orderColumn = order === 'key' ? featureToggles.key 
                      : order === 'updated_at' ? featureToggles.updatedAt 
                      : featureToggles.createdAt;
    
    const orderDirection = direction === 'asc' ? asc(orderColumn) : desc(orderColumn);
    query = query.orderBy(orderDirection);

    // Execute queries
    const [data, totalResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);

    const total = totalResult[0].count;

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit
      }
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate session and admin role
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin role required',
        code: 'INSUFFICIENT_ROLE' 
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { key, label, enabled = 0, audience = 'all' } = requestBody;

    // Validate required fields
    if (!key) {
      return NextResponse.json({ 
        error: 'Key is required',
        code: 'MISSING_REQUIRED_FIELD' 
      }, { status: 400 });
    }

    if (!label) {
      return NextResponse.json({ 
        error: 'Label is required',
        code: 'MISSING_REQUIRED_FIELD' 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedKey = key.trim();
    const sanitizedLabel = label.trim();
    const sanitizedAudience = audience.trim();

    // Validate key format (basic validation)
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedKey)) {
      return NextResponse.json({ 
        error: 'Key must contain only letters, numbers, underscores, and hyphens',
        code: 'INVALID_KEY_FORMAT' 
      }, { status: 400 });
    }

    // Validate enabled value
    const enabledValue = enabled === 1 || enabled === true || enabled === '1' ? 1 : 0;

    const currentTime = new Date().toISOString();

    // Insert new feature toggle
    const newToggle = await db.insert(featureToggles)
      .values({
        key: sanitizedKey,
        label: sanitizedLabel,
        enabled: enabledValue,
        audience: sanitizedAudience,
        createdAt: currentTime,
        updatedAt: currentTime
      })
      .returning();

    return NextResponse.json(newToggle[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    
    // Handle unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: 'Feature toggle key already exists',
        code: 'DUPLICATE_KEY' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}