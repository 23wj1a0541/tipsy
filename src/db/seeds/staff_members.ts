import { db } from '@/db';
import { staffMembers } from '@/db/schema';

async function main() {
    const sampleStaffMembers = [
        {
            restaurantId: 1,
            displayName: 'Raju Kumar',
            role: 'server' as const,
            status: 'active' as const,
            qrKey: 'raju-qr',
            upiId: 'raju@paytm',
            createdAt: new Date('2024-01-15').getTime(),
        },
        {
            restaurantId: 1,
            displayName: 'Priya Sharma',
            role: 'chef' as const,
            status: 'active' as const,
            qrKey: 'priya-chef-001',
            upiId: 'priya.sharma@googlepay',
            createdAt: new Date('2024-01-20').getTime(),
        },
        {
            restaurantId: 1,
            displayName: 'Arjun Singh',
            role: 'host' as const,
            status: 'active' as const,
            qrKey: 'arjun-host-qr',
            upiId: 'arjun@phonepe',
            createdAt: new Date('2024-02-01').getTime(),
        },
        {
            restaurantId: 1,
            displayName: 'Sunita Devi',
            role: 'server' as const,
            status: 'inactive' as const,
            qrKey: 'sunita-server-002',
            upiId: 'sunita@upi',
            createdAt: new Date('2024-02-05').getTime(),
        },
        {
            restaurantId: 1,
            displayName: 'Vikram Patel',
            role: 'manager' as const,
            status: 'active' as const,
            qrKey: 'vikram-mgr-qr',
            upiId: 'vikram.patel@paytm',
            createdAt: new Date('2024-02-10').getTime(),
        },
        {
            restaurantId: 1,
            displayName: 'Meera Gupta',
            role: 'server' as const,
            status: 'active' as const,
            qrKey: 'meera-server-qr',
            upiId: 'meera@googlepay',
            createdAt: new Date('2024-02-15').getTime(),
        },
        {
            restaurantId: 1,
            displayName: 'Rohit Kumar',
            role: 'chef' as const,
            status: 'active' as const,
            qrKey: 'rohit-chef-qr',
            upiId: 'rohit.kumar@phonepe',
            createdAt: new Date('2024-02-20').getTime(),
        }
    ];

    await db.insert(staffMembers).values(sampleStaffMembers);
    
    console.log('✅ Staff members seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});