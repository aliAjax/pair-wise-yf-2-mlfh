import { create } from 'zustand';
import type {
  Bench,
  BenchExperience,
  BenchReview,
  MaterialType,
  OrientationType,
  ShadeLevelType,
  NoiseLevelType,
  StayDurationType,
  ReviewDraft,
  ReviewItemKey,
  SubmitReviewResult,
} from '@/types';
import {
  loadBenches,
  saveBenches,
  loadReviewRecords,
  saveReviewRecords,
  loadReviewDrafts,
  saveReviewDrafts,
} from '@/utils/storage';
import { generateId } from '@/utils/comfort';
import { mockBenches } from '@/data/mockBenches';

interface BenchState {
  benches: Bench[];
  reviewRecords: Record<string, BenchReview[]>;
  reviewDrafts: Record<string, ReviewDraft>;
  searchQuery: string;
  materialFilter: MaterialType | null;
  orientationFilter: OrientationType | null;
  shadeFilter: ShadeLevelType | null;
  noiseFilter: NoiseLevelType | null;
  initialized: boolean;
}

interface BenchActions {
  initialize: () => void;
  setSearchQuery: (query: string) => void;
  setMaterialFilter: (material: MaterialType | null) => void;
  setOrientationFilter: (orientation: OrientationType | null) => void;
  setShadeFilter: (shade: ShadeLevelType | null) => void;
  setNoiseFilter: (noise: NoiseLevelType | null) => void;
  clearFilters: () => void;
  addBench: (bench: Omit<Bench, 'id' | 'createdAt' | 'updatedAt' | 'experiences' | 'revision'>) => void;
  updateBench: (id: string, updates: Partial<Bench>) => void;
  deleteBench: (id: string) => void;
  getBenchById: (id: string) => Bench | undefined;
  addExperience: (benchId: string, experience: Omit<BenchExperience, 'id' | 'benchId'>) => void;
  updateExperience: (benchId: string, expId: string, updates: Partial<BenchExperience>) => void;
  deleteExperience: (benchId: string, expId: string) => void;
  getFilteredBenches: () => Bench[];
  startReview: (benchId: string) => ReviewDraft | undefined;
  setDraftValue: (benchId: string, field: 'shadeLevel' | 'noiseLevel' | 'rating', value: ShadeLevelType | NoiseLevelType | number) => void;
  setDraftConfirmed: (benchId: string, item: ReviewItemKey, confirmed: boolean) => void;
  rebaseDraft: (benchId: string) => boolean;
  discardDraft: (benchId: string) => void;
  submitReview: (benchId: string) => SubmitReviewResult;
  getDraft: (benchId: string) => ReviewDraft | undefined;
  getReviewRecords: (benchId: string) => BenchReview[];
}

const initialState: BenchState = {
  benches: [],
  reviewRecords: {},
  reviewDrafts: {},
  searchQuery: '',
  materialFilter: null,
  orientationFilter: null,
  shadeFilter: null,
  noiseFilter: null,
  initialized: false,
};

let storageListenerRegistered = false;

// 旧数据没有 revision 字段，按 0 处理（同样没有复核记录，属首次待确认）
const normalizeBench = (bench: Bench): Bench => ({
  ...bench,
  revision: bench.revision ?? 0,
});

export const useBenchStore = create<BenchState & BenchActions>((set, get) => ({
  ...initialState,

  initialize: () => {
    const stored = loadBenches().map(normalizeBench);
    const reviewRecords = loadReviewRecords();
    const reviewDrafts = loadReviewDrafts();
    if (stored.length > 0) {
      set({ benches: stored, reviewRecords, reviewDrafts, initialized: true });
    } else {
      const mocks = mockBenches.map(normalizeBench);
      set({ benches: mocks, reviewRecords, reviewDrafts, initialized: true });
      saveBenches(mocks);
    }

    // 跨标签页同步：其他标签页更新/移除档案、记录或草稿时，这里随之刷新，
    // 复核页面据此实时发现冲突。
    if (!storageListenerRegistered && typeof window !== 'undefined') {
      storageListenerRegistered = true;
      window.addEventListener('storage', (event) => {
        if (!event.key || !event.key.startsWith('bench-')) return;
        set({
          benches: loadBenches().map(normalizeBench),
          reviewRecords: loadReviewRecords(),
          reviewDrafts: loadReviewDrafts(),
        });
      });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setMaterialFilter: (material) => set({ materialFilter: material }),
  setOrientationFilter: (orientation) => set({ orientationFilter: orientation }),
  setShadeFilter: (shade) => set({ shadeFilter: shade }),
  setNoiseFilter: (noise) => set({ noiseFilter: noise }),

  clearFilters: () => set({
    searchQuery: '',
    materialFilter: null,
    orientationFilter: null,
    shadeFilter: null,
    noiseFilter: null,
  }),

  addBench: (benchData) => {
    const now = new Date().toISOString();
    const newBench: Bench = {
      ...benchData,
      id: generateId(),
      experiences: [],
      revision: 0,
      createdAt: now,
      updatedAt: now,
    };
    const newBenches = [newBench, ...get().benches];
    set({ benches: newBenches });
    saveBenches(newBenches);
  },

  updateBench: (id, updates) => {
    const newBenches = get().benches.map((bench) =>
      bench.id === id
        ? {
            ...bench,
            ...updates,
            revision: bench.revision + 1,
            updatedAt: new Date().toISOString(),
          }
        : bench
    );
    set({ benches: newBenches });
    saveBenches(newBenches);
  },

  deleteBench: (id) => {
    const newBenches = get().benches.filter((bench) => bench.id !== id);
    set({ benches: newBenches });
    saveBenches(newBenches);
  },

  getBenchById: (id) => {
    return get().benches.find((bench) => bench.id === id);
  },

  addExperience: (benchId, experienceData) => {
    const newExperience: BenchExperience = {
      ...experienceData,
      id: generateId(),
      benchId,
    };
    const newBenches = get().benches.map((bench) =>
      bench.id === benchId
        ? {
            ...bench,
            experiences: [...bench.experiences, newExperience],
            revision: bench.revision + 1,
            updatedAt: new Date().toISOString(),
          }
        : bench
    );
    set({ benches: newBenches });
    saveBenches(newBenches);
  },

  updateExperience: (benchId, expId, updates) => {
    const newBenches = get().benches.map((bench) =>
      bench.id === benchId
        ? {
            ...bench,
            experiences: bench.experiences.map((exp) =>
              exp.id === expId ? { ...exp, ...updates } : exp
            ),
            revision: bench.revision + 1,
            updatedAt: new Date().toISOString(),
          }
        : bench
    );
    set({ benches: newBenches });
    saveBenches(newBenches);
  },

  deleteExperience: (benchId, expId) => {
    const newBenches = get().benches.map((bench) =>
      bench.id === benchId
        ? {
            ...bench,
            experiences: bench.experiences.filter((exp) => exp.id !== expId),
            revision: bench.revision + 1,
            updatedAt: new Date().toISOString(),
          }
        : bench
    );
    set({ benches: newBenches });
    saveBenches(newBenches);
  },

  getFilteredBenches: () => {
    const { benches, searchQuery, materialFilter, orientationFilter, shadeFilter, noiseFilter } = get();

    return benches.filter((bench) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = bench.name.toLowerCase().includes(query);
        const matchLocation = bench.location.toLowerCase().includes(query);
        const matchReview = bench.review.toLowerCase().includes(query);
        if (!matchName && !matchLocation && !matchReview) return false;
      }

      if (materialFilter && bench.material !== materialFilter) return false;
      if (orientationFilter && bench.orientation !== orientationFilter) return false;
      if (shadeFilter && bench.shadeLevel !== shadeFilter) return false;
      if (noiseFilter && bench.noiseLevel !== noiseFilter) return false;

      return true;
    });
  },

  startReview: (benchId) => {
    const { benches, reviewDrafts } = get();
    const existing = reviewDrafts[benchId];
    if (existing) return existing;
    const bench = benches.find((b) => b.id === benchId);
    if (!bench) return undefined;
    const draft: ReviewDraft = {
      benchId,
      baseRevision: bench.revision,
      shadeLevel: bench.shadeLevel,
      noiseLevel: bench.noiseLevel,
      rating: bench.rating,
      confirmed: { shade: false, noise: false, rating: false },
      updatedAt: new Date().toISOString(),
    };
    const newDrafts = { ...reviewDrafts, [benchId]: draft };
    set({ reviewDrafts: newDrafts });
    saveReviewDrafts(newDrafts);
    return draft;
  },

  setDraftValue: (benchId, field, value) => {
    const draft = get().reviewDrafts[benchId];
    if (!draft) return;
    const itemKey: ReviewItemKey =
      field === 'shadeLevel' ? 'shade' : field === 'noiseLevel' ? 'noise' : 'rating';
    const newDrafts = {
      ...get().reviewDrafts,
      [benchId]: {
        ...draft,
        [field]: value,
        // 值被修改后，该项需要重新确认
        confirmed: { ...draft.confirmed, [itemKey]: false },
        updatedAt: new Date().toISOString(),
      },
    };
    set({ reviewDrafts: newDrafts });
    saveReviewDrafts(newDrafts);
  },

  setDraftConfirmed: (benchId, item, confirmed) => {
    const draft = get().reviewDrafts[benchId];
    if (!draft) return;
    const newDrafts = {
      ...get().reviewDrafts,
      [benchId]: {
        ...draft,
        confirmed: { ...draft.confirmed, [item]: confirmed },
        updatedAt: new Date().toISOString(),
      },
    };
    set({ reviewDrafts: newDrafts });
    saveReviewDrafts(newDrafts);
  },

  rebaseDraft: (benchId) => {
    const { benches, reviewDrafts } = get();
    const bench = benches.find((b) => b.id === benchId);
    if (!bench) return false;
    const draft: ReviewDraft = {
      benchId,
      baseRevision: bench.revision,
      shadeLevel: bench.shadeLevel,
      noiseLevel: bench.noiseLevel,
      rating: bench.rating,
      confirmed: { shade: false, noise: false, rating: false },
      updatedAt: new Date().toISOString(),
    };
    const newDrafts = { ...reviewDrafts, [benchId]: draft };
    set({ reviewDrafts: newDrafts });
    saveReviewDrafts(newDrafts);
    return true;
  },

  discardDraft: (benchId) => {
    const newDrafts = { ...get().reviewDrafts };
    delete newDrafts[benchId];
    set({ reviewDrafts: newDrafts });
    saveReviewDrafts(newDrafts);
  },

  submitReview: (benchId) => {
    const { benches, reviewDrafts, reviewRecords } = get();
    const draft = reviewDrafts[benchId];
    if (!draft) return { ok: false, reason: 'no-draft' };

    const bench = benches.find((b) => b.id === benchId);
    if (!bench) return { ok: false, reason: 'bench-removed' };

    // 复核期间档案被更新过（版本号不一致）：草稿保留，提交失败
    if (draft.baseRevision !== bench.revision) {
      return { ok: false, reason: 'conflict' };
    }

    // 遮阴、噪音、个人评分必须逐项确认，任何一项未确认则整次拒绝
    const missing: ReviewItemKey[] = [];
    if (!draft.confirmed.shade) missing.push('shade');
    if (!draft.confirmed.noise) missing.push('noise');
    if (!draft.confirmed.rating) missing.push('rating');
    if (missing.length > 0) return { ok: false, reason: 'incomplete', missing };

    const now = new Date().toISOString();
    const newBenches = benches.map((b) =>
      b.id === benchId
        ? {
            ...b,
            shadeLevel: draft.shadeLevel,
            noiseLevel: draft.noiseLevel,
            rating: draft.rating,
            revision: b.revision + 1,
            updatedAt: now,
          }
        : b
    );
    const record: BenchReview = {
      id: generateId(),
      benchId,
      shadeLevel: draft.shadeLevel,
      noiseLevel: draft.noiseLevel,
      rating: draft.rating,
      baseRevision: draft.baseRevision,
      reviewedAt: now,
    };
    // 保留上一版核验记录，新记录追加到历史末尾
    const newRecords = {
      ...reviewRecords,
      [benchId]: [...(reviewRecords[benchId] ?? []), record],
    };
    const newDrafts = { ...reviewDrafts };
    delete newDrafts[benchId];

    set({ benches: newBenches, reviewRecords: newRecords, reviewDrafts: newDrafts });
    saveBenches(newBenches);
    saveReviewRecords(newRecords);
    saveReviewDrafts(newDrafts);
    return { ok: true };
  },

  getDraft: (benchId) => {
    return get().reviewDrafts[benchId];
  },

  getReviewRecords: (benchId) => {
    return get().reviewRecords[benchId] ?? [];
  },
}));
