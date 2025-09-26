import { db } from '@/db';
import { featureToggles } from '@/db/schema';

async function main() {
    const sampleFeatureToggles = [
        {
            key: 'qr_payments',
            label: 'QR Code Payments',
            enabled: 1,
            audience: 'all',
            createdAt: '2024-01-10T00:00:00.000Z',
            updatedAt: '2024-01-15T00:00:00.000Z',
        },
        {
            key: 'review_moderation',
            label: 'Review Moderation System',
            enabled: 0,
            audience: 'owners',
            createdAt: '2024-01-12T00:00:00.000Z',
            updatedAt: '2024-01-15T00:00:00.000Z',
        },
        {
            key: 'analytics_dashboard',
            label: 'Analytics Dashboard',
            enabled: 1,
            audience: 'owners',
            createdAt: '2024-01-15T00:00:00.000Z',
            updatedAt: '2024-01-18T00:00:00.000Z',
        },
        {
            key: 'mobile_app',
            label: 'Mobile Application Access',
            enabled: 1,
            audience: 'all',
            createdAt: '2024-01-18T00:00:00.000Z',
            updatedAt: '2024-01-22T00:00:00.000Z',
        },
        {
            key: 'tip_goals',
            label: 'Worker Tip Goals Feature',
            enabled: 0,
            audience: 'workers',
            createdAt: '2024-01-20T00:00:00.000Z',
            updatedAt: '2024-01-25T00:00:00.000Z',
        },
        {
            key: 'multi_restaurant',
            label: 'Multi-Restaurant Management',
            enabled: 1,
            audience: 'owners',
            createdAt: '2024-01-25T00:00:00.000Z',
            updatedAt: '2024-01-25T00:00:00.000Z',
        },
        {
            key: 'admin_panel',
            label: 'System Administration Panel',
            enabled: 1,
            audience: 'admins',
            createdAt: '2024-01-28T00:00:00.000Z',
            updatedAt: '2024-01-28T00:00:00.000Z',
        },
        {
            key: 'push_notifications',
            label: 'Push Notification Service',
            enabled: 0,
            audience: 'all',
            createdAt: '2024-02-01T00:00:00.000Z',
            updatedAt: '2024-02-03T00:00:00.000Z',
        },
    ];

    await db.insert(featureToggles).values(sampleFeatureToggles);
    
    console.log('✅ Feature toggles seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});