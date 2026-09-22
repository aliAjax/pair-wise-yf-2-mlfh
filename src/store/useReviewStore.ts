import { create } from 'zustand';
import type { Bench, ReviewDraft, ShadeLevelType, NoiseLevelType } from '@/types';
import { loadReviewDrafts, saveReviewDrafts } from '@/utils/storage';

export type ReviewItemKey = 'shade' | 'noise' | 'rating';

interface ReviewState {
  drafts: Record<string, ReviewDraft>;
  initialized: boolean;
}

interface ReviewActions {
  initialize: () => void;
  startDraft: (bench: Bench) => void;
  setDraftShade: (benchId: string, value: ShadeLevelType) => void;
  setDraftNoise: (benchId: string, value: NoiseLevelType) => void;
  setDraftRating: (benchId: string, value: number) => void;
  setItemConfirmed: (benchId: string, item: ReviewItemKey, confirmed: boolean) => void;
  rebaseDraft: (benchId: string, bench: Bench) => void;
  discardDraft: (benchId: string) => void;
}

export const useReviewStore = create<ReviewState & ReviewActions>((set, get) => {
  const persist = (drafts: Record<string, ReviewDraft>) => {
    set({ drafts });
    saveReviewDrafts(drafts);
  };

  const patch = (benchId: string, partial: Partial<ReviewDraft>, resetConfirm?: ReviewItemKey) => {
    const draft = get().drafts[benchId];
    if (!draft) return;
    persist({
      ...get().drafts,
      [benchId]: {
        ...draft,
        ...partial,
        confirmed: resetConfirm
          ? { ...draft.confirmed, [resetConfirm]: false }
          : (partial.confirmed ?? draft.confirmed),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  return {
    drafts: {},
    initialized: false,

    initialize: () => {
      set({ drafts: loadReviewDrafts(), initialized: true });
    },

    // 已有草稿时保留原草稿（续核），否则基于当前档案建立草稿
    startDraft: (bench) => {
      if (get().drafts[bench.id]) return;
      const now = new Date().toISOString();
      persist({
        ...get().drafts,
        [bench.id]: {
          benchId: bench.id,
          baseName: bench.name,
          baseUpdatedAt: bench.updatedAt,
          shadeLevel: bench.shadeLevel,
          noiseLevel: bench.noiseLevel,
          rating: bench.rating,
          confirmed: { shade: false, noise: false, rating: false },
          startedAt: now,
          updatedAt: now,
        },
      });
    },

    // 修改某项数值后，该项需重新确认
    setDraftShade: (benchId, value) => patch(benchId, { shadeLevel: value }, 'shade'),
    setDraftNoise: (benchId, value) => patch(benchId, { noiseLevel: value }, 'noise'),
    setDraftRating: (benchId, value) => patch(benchId, { rating: value }, 'rating'),

    setItemConfirmed: (benchId, item, confirmed) => {
      const draft = get().drafts[benchId];
      if (!draft) return;
      patch(benchId, { confirmed: { ...draft.confirmed, [item]: confirmed } });
    },

    // 档案冲突后，基于最新档案重建草稿，所有确认项重置
    rebaseDraft: (benchId, bench) => {
      if (!get().drafts[benchId]) return;
      patch(benchId, {
        baseName: bench.name,
        baseUpdatedAt: bench.updatedAt,
        shadeLevel: bench.shadeLevel,
        noiseLevel: bench.noiseLevel,
        rating: bench.rating,
        confirmed: { shade: false, noise: false, rating: false },
      });
    },

    discardDraft: (benchId) => {
      const drafts = { ...get().drafts };
      delete drafts[benchId];
      persist(drafts);
    },
  };
});
