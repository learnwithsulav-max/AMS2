import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy | Learn With Sulav', description: 'How Learn With Sulav uses information across its agency tools and exam practice portals.' };

export default function PrivacyPage() { return <LegalPage kind="privacy" />; }
