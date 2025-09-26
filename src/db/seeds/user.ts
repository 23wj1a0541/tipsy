import { db } from '@/db';
import { user } from '@/db/schema';

async function main() {
    const currentTimestamp = new Date();
    
    const sampleUsers = [
        {
            id: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            name: 'Admin User',
            email: 'admin@company.com',
            emailVerified: true,
            image: null,
            role: 'admin' as const,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            id: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            name: 'John Owner',
            email: 'john@company.com',
            emailVerified: true,
            image: null,
            role: 'owner' as const,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            id: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            name: 'Jane Owner',
            email: 'jane@company.com',
            emailVerified: true,
            image: null,
            role: 'owner' as const,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            id: 'user_01h4kxt2e8z9y3b1n7m6q5w8r7',
            name: 'Mike Worker',
            email: 'mike@company.com',
            emailVerified: true,
            image: null,
            role: 'worker' as const,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            id: 'user_01h4kxt2e8z9y3b1n7m6q5w8r8',
            name: 'Sarah Worker',
            email: 'sarah@company.com',
            emailVerified: true,
            image: null,
            role: 'worker' as const,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    await db.insert(user).values(sampleUsers);
    
    console.log('✅ User seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});