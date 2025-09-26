import { db } from '@/db';
import { restaurants } from '@/db/schema';

async function main() {
    const sampleRestaurants = [
        {
            ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            name: 'The Golden Spoon',
            upiId: 'goldenspoon@paytm',
            address: '123 Main Street, Food Plaza',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            createdAt: new Date('2024-01-10').getTime(),
        },
        {
            ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            name: 'Spice Garden Restaurant',
            upiId: 'spicegarden@upi',
            address: '456 Park Avenue, Commercial Complex',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            createdAt: new Date('2024-01-15').getTime(),
        },
        {
            ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            name: 'Coastal Kitchen',
            upiId: 'coastalkitchen@gpay',
            address: '789 Beach Road, Marine Drive',
            city: 'Kochi',
            state: 'Kerala',
            country: 'India',
            createdAt: new Date('2024-01-20').getTime(),
        },
        {
            ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            name: 'Urban Bites Cafe',
            upiId: 'urbanbites@phonepe',
            address: '321 Tech Park, IT Hub',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            createdAt: new Date('2024-01-25').getTime(),
        },
        {
            ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            name: 'Royal Dining Hall',
            upiId: 'royaldining@upi',
            address: '567 Heritage Street, Old City',
            city: 'Jaipur',
            state: 'Rajasthan',
            country: 'India',
            createdAt: new Date('2024-02-01').getTime(),
        },
        {
            ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            name: 'Green Valley Restaurant',
            upiId: 'greenvalley@paytm',
            address: '890 Hill Station Road, Valley View',
            city: 'Shimla',
            state: 'Himachal Pradesh',
            country: 'India',
            createdAt: new Date('2024-02-05').getTime(),
        }
    ];

    await db.insert(restaurants).values(sampleRestaurants);
    
    console.log('✅ Restaurants seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});