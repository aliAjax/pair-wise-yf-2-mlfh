import type { Bench, BenchReview, ReviewDraft } from '@/types';

const STORAGE_KEY = 'bench-archive-data';
const REVIEW_RECORDS_KEY = 'bench-review-records';
const REVIEW_DRAFTS_KEY = 'bench-review-drafts';

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

export function loadReviewRecords(): Record<string, BenchReview[]> {
  try {
    const data = localStorage.getItem(REVIEW_RECORDS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load review records from localStorage:', error);
  }
  return {};
}

export function saveReviewRecords(records: Record<string, BenchReview[]>): void {
  try {
    localStorage.setItem(REVIEW_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save review records to localStorage:', error);
  }
}

export function loadReviewDrafts(): Record<string, ReviewDraft> {
  try {
    const data = localStorage.getItem(REVIEW_DRAFTS_KEY);
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
    localStorage.setItem(REVIEW_DRAFTS_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save review drafts to localStorage:', error);
  }
}
