import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Terms of Use | Learn With Sulav', description: 'Terms for using Learn With Sulav agency tools and exam practice portals.' };

export default function TermsPage() { return <LegalPage kind="terms" />; }
