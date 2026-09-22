import type { Bench, ReviewDraft } from '@/types';

const STORAGE_KEY = 'bench-archive-data';
const DRAFTS_STORAGE_KEY = 'bench-review-drafts';

export function loadBenches(): Bench[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load benches from localStorage:', error);
  }
  return [];
}

export function saveBenches(benches: Bench[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(benches));
  } catch (error) {
    console.error('Failed to save benches to localStorage:', error);
  }
}

export function clearBenches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear benches from localStorage:', error);
  }
}

export function loadReviewDrafts(): Record<string, ReviewDraft> {
  try {
    const data = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load review drafts from localStorage:', error);
  }
  return {};
}

export function saveReviewDrafts(drafts: Record<string, ReviewDraft>): void {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save review drafts to localStorage:', error);
  }
}
