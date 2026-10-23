'use client';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui';
import ExamApp from '@/components/exam/ExamApp';
import { useI18n } from '@/lib/i18n';

export default function ExamPortal() {
  const { t } = useI18n();
  return (
    <Shell site="exam">
      <Card className="mx-auto mt-5 max-w-5xl border-gold/30 bg-gold/10 px-4 py-3 text-sm text-navy shadow-none">
        {t('exam_disclaimer')}
      </Card>
      <ExamApp />
    </Shell>
  );
}
