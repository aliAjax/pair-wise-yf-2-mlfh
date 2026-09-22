import { BadgeCheck, ClipboardEdit, CircleDashed } from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';

interface ReviewStatusBadgeProps {
  benchId: string;
}

export default function ReviewStatusBadge({ benchId }: ReviewStatusBadgeProps) {
  const { reviewRecords, reviewDrafts } = useBenchStore();
  const hasRecords = (reviewRecords[benchId]?.length ?? 0) > 0;
  const hasDraft = !!reviewDrafts[benchId];

  if (hasDraft) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-ochre/10 text-ochre text-xs rounded-full">
        <ClipboardEdit className="w-3 h-3" />
        复核中
      </span>
    );
  }

  if (hasRecords) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-moss-green/10 text-moss-green text-xs rounded-full">
        <BadgeCheck className="w-3 h-3" />
        已复核
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-deep-brown/5 text-ink-light text-xs rounded-full">
      <CircleDashed className="w-3 h-3" />
      待首次复核
    </span>
  );
}
