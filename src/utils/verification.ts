import type { Bench, BenchVerification } from '@/types';

export function getVerifications(bench: Bench): BenchVerification[] {
  return bench.verifications ?? [];
}

export function isBenchVerified(bench: Bench): boolean {
  return getVerifications(bench).length > 0;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
