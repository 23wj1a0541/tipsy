import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { restaurants, staffMembers, tips, reviews, user } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting test data insertion...');

    // Create a test user first (needed for restaurant owner)
    const testUser = await db.insert(user).values({
      id: `test-user-${Date.now()}`,
      name: 'Test Restaurant Owner',
      email: `testowner${Date.now()}@example.com`,
      emailVerified: true,
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('Created test user:', testUser[0]);

    // Create restaurant
    const newRestaurant = await db.insert(restaurants).values({
      ownerUserId: testUser[0].id,
      name: 'Test Italian Bistro',
      upiId: 'testbistro@upi',
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      createdAt: new Date()
    }).returning();

    console.log('Created restaurant:', newRestaurant[0]);

    // Create staff member
    const newStaffMember = await db.insert(staffMembers).values({
      restaurantId: newRestaurant[0].id,
      displayName: 'Marco Rossi',
      role: 'server',
      status: 'active',
      qrKey: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      upiId: 'marco.rossi@upi',
      createdAt: new Date()
    }).returning();

    console.log('Created staff member:', newStaffMember[0]);

    // Create tip
    const newTip = await db.insert(tips).values({
      staffMemberId: newStaffMember[0].id,
      amountCents: 5000, // ₹50.00
      currency: 'INR',
      payerName: 'Happy Customer',
      message: 'Excellent service! Thank you!',
      source: 'qr',
      status: 'succeeded',
      createdAt: new Date()
    }).returning();

    console.log('Created tip:', newTip[0]);

    // Create review
    const newReview = await db.insert(reviews).values({
      staffMemberId: newStaffMember[0].id,
      rating: 5,
      comment: 'Outstanding service with a smile. Marco was very attentive and made our dining experience memorable.',
      tipId: newTip[0].id,
      approved: true,
      createdAt: new Date()
    }).returning();

    console.log('Created review:', newReview[0]);

    const testData = {
      user: testUser[0],
      restaurant: newRestaurant[0],
      staffMember: newStaffMember[0],
      tip: newTip[0],
      review: newReview[0]
    };

    console.log('Successfully created all test data');

    return NextResponse.json({
      message: 'Test data created successfully',
      data: testData
    }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'TEST_DATA_CREATION_FAILED'
    }, { status: 500 });
  }
}