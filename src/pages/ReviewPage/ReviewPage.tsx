import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  RefreshCw,
  Send,
  Star,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { useReviewStore } from '@/store/useReviewStore';
import { NOISE_LABELS, SHADE_LABELS } from '@/types';
import type { NoiseLevelType, ShadeLevelType } from '@/types';
import Rating from '@/components/Rating/Rating';
import { formatDateTime } from '@/utils/verification';

type SubmitFeedback =
  | { type: 'incomplete'; missing: string[] }
  | { type: 'conflict'; reason: 'updated' | 'removed' }
  | null;

const SHADE_OPTIONS: ShadeLevelType[] = ['none', 'partial', 'full'];
const NOISE_OPTIONS: NoiseLevelType[] = ['quiet', 'moderate', 'noisy'];

interface ReviewItemCardProps {
  icon: typeof Sun;
  title: string;
  description: string;
  confirmed: boolean;
  onToggleConfirm: () => void;
  delayClass: string;
  children: ReactNode;
}

function ReviewItemCard({
  icon: Icon,
  title,
  description,
  confirmed,
  onToggleConfirm,
  delayClass,
  children,
}: ReviewItemCardProps) {
  return (
    <div className={`paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 ${delayClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-moss-green" />
          <h2 className="font-serif text-lg font-semibold text-deep-brown">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onToggleConfirm}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            confirmed
              ? 'bg-moss-green text-white shadow-sm'
              : 'text-moss-green border border-moss-green/40 hover:bg-moss-green/10'
          }`}
        >
          <Check className="w-4 h-4" />
          {confirmed ? '已确认' : '确认此项'}
        </button>
      </div>
      <p className="text-xs text-ink-light mb-4">{description}</p>
      {children}
    </div>
  );
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBenchById, initialize, initialized, applyVerification } = useBenchStore();
  const {
    drafts,
    initialized: reviewInitialized,
    initialize: initializeReviews,
    startDraft,
    setDraftShade,
    setDraftNoise,
    setDraftRating,
    setItemConfirmed,
    rebaseDraft,
    discardDraft,
  } = useReviewStore();
  const [feedback, setFeedback] = useState<SubmitFeedback>(null);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    if (!reviewInitialized) initializeReviews();
  }, [reviewInitialized, initializeReviews]);

  const bench = id ? getBenchById(id) : undefined;
  const draft = id ? drafts[id] : undefined;

  // 进入复核时建立草稿；已有草稿则续核
  useEffect(() => {
    if (initialized && reviewInitialized && bench && !draft) {
      startDraft(bench);
    }
  }, [initialized, reviewInitialized, bench, draft, startDraft]);

  // 档案不存在且没有草稿时才离开
  useEffect(() => {
    if (initialized && reviewInitialized && !bench && !draft) {
      navigate('/');
    }
  }, [initialized, reviewInitialized, bench, draft, navigate]);

  if (!id || !draft) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-ink-light">加载中...</p>
        </div>
      </div>
    );
  }

  const conflictReason: 'updated' | 'removed' | null = !bench
    ? 'removed'
    : bench.updatedAt !== draft.baseUpdatedAt
      ? 'updated'
      : null;

  const confirmedCount = [
    draft.confirmed.shade,
    draft.confirmed.noise,
    draft.confirmed.rating,
  ].filter(Boolean).length;

  const handleSubmit = () => {
    // 任何一项未确认，整次拒绝
    const missing: string[] = [];
    if (!draft.confirmed.shade) missing.push('遮阴');
    if (!draft.confirmed.noise) missing.push('噪音');
    if (!draft.confirmed.rating) missing.push('个人评分');
    if (missing.length > 0) {
      setFeedback({ type: 'incomplete', missing });
      return;
    }

    // 复核期间档案被移除或更新，提交失败但保留草稿
    const current = getBenchById(id);
    if (!current) {
      setFeedback({ type: 'conflict', reason: 'removed' });
      return;
    }
    if (current.updatedAt !== draft.baseUpdatedAt) {
      setFeedback({ type: 'conflict', reason: 'updated' });
      return;
    }

    const applied = applyVerification(id, {
      shadeLevel: draft.shadeLevel,
      noiseLevel: draft.noiseLevel,
      rating: draft.rating,
    });
    if (!applied) {
      setFeedback({ type: 'conflict', reason: 'removed' });
      return;
    }

    discardDraft(id);
    navigate(`/bench/${id}`);
  };

  const handleRebase = () => {
    if (bench) {
      rebaseDraft(id, bench);
      setFeedback(null);
    }
  };

  const handleDiscard = () => {
    discardDraft(id);
    navigate(bench ? `/bench/${id}` : '/');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-ink-light hover:text-deep-brown mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">返回</span>
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-deep-brown mb-1">
            现场复核
          </h1>
          <p className="text-ink-light text-sm">
            {bench ? bench.name : draft.baseName} · 遮阴、噪音、个人评分需逐项确认，全部确认后才能提交
          </p>
        </div>

        {conflictReason && (
          <div className="rounded-xl shadow-paper p-5 mb-6 border border-red-200 bg-red-50/70 fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-serif font-semibold text-deep-brown mb-1">
                  {conflictReason === 'removed' ? '复核冲突：档案已被移除' : '复核冲突：档案已被更新'}
                </h3>
                <p className="text-sm text-ink-light mb-4">
                  {conflictReason === 'removed'
                    ? '复核期间原档案被移除，草稿已保留但无法再提交。'
                    : '复核期间原档案发生了变化，草稿已保留。只有基于最新档案重新逐项确认，才能提交更新。'}
                </p>
                {conflictReason === 'updated' ? (
                  <button
                    type="button"
                    onClick={handleRebase}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-moss-green text-white rounded-lg hover:bg-moss-light transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    基于最新档案重新确认
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    放弃草稿并返回
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {feedback?.type === 'incomplete' && (
          <div className="rounded-xl border border-ochre/40 bg-ochre/10 p-4 mb-6 fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-ochre flex-shrink-0 mt-0.5" />
              <p className="text-sm text-deep-brown">
                提交被拒绝：{feedback.missing.join('、')}尚未确认。本次复核未生效，原档案与排行保持不变。
              </p>
            </div>
          </div>
        )}

        {feedback?.type === 'conflict' && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 mb-6 fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-deep-brown">
                提交失败：复核期间档案{feedback.reason === 'removed' ? '已被移除' : '已被更新'}，草稿已保留。
                {feedback.reason === 'updated' && '请基于最新档案重新确认后再提交。'}
              </p>
            </div>
          </div>
        )}

        <div className="paper-texture rounded-xl shadow-paper p-4 mb-6 fade-in opacity-0 stagger-1">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-ink-light">
              草稿基于版本 <span className="text-deep-brown">{formatDateTime(draft.baseUpdatedAt)}</span>
            </span>
            <span className="text-ink-light">
              开始于 <span className="text-deep-brown">{formatDateTime(draft.startedAt)}</span>
            </span>
            <span className="text-ink-light">
              已确认{' '}
              <span className={`font-medium ${confirmedCount === 3 ? 'text-moss-green' : 'text-ochre'}`}>
                {confirmedCount}/3
              </span>
            </span>
          </div>
        </div>

        <div className={`space-y-6 ${conflictReason ? 'opacity-50 pointer-events-none select-none' : ''}`}>
          <ReviewItemCard
            icon={Sun}
            title="遮阴确认"
            description="现场核对遮阴情况，如有变化请先修正再确认"
            confirmed={draft.confirmed.shade}
            onToggleConfirm={() => {
              setItemConfirmed(id, 'shade', !draft.confirmed.shade);
              setFeedback(null);
            }}
            delayClass="stagger-1"
          >
            <div className="flex flex-wrap gap-2">
              {SHADE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setDraftShade(id, option);
                    setFeedback(null);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    draft.shadeLevel === option
                      ? 'bg-moss-green text-white border-moss-green shadow-sm'
                      : 'bg-white/50 text-deep-brown border-deep-brown/10 hover:bg-moss-green/10'
                  }`}
                >
                  {SHADE_LABELS[option]}
                </button>
              ))}
            </div>
          </ReviewItemCard>

          <ReviewItemCard
            icon={Volume2}
            title="噪音确认"
            description="现场核对噪音等级，如有变化请先修正再确认"
            confirmed={draft.confirmed.noise}
            onToggleConfirm={() => {
              setItemConfirmed(id, 'noise', !draft.confirmed.noise);
              setFeedback(null);
            }}
            delayClass="stagger-2"
          >
            <div className="flex flex-wrap gap-2">
              {NOISE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setDraftNoise(id, option);
                    setFeedback(null);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    draft.noiseLevel === option
                      ? 'bg-moss-green text-white border-moss-green shadow-sm'
                      : 'bg-white/50 text-deep-brown border-deep-brown/10 hover:bg-moss-green/10'
                  }`}
                >
                  {NOISE_LABELS[option]}
                </button>
              ))}
            </div>
          </ReviewItemCard>

          <ReviewItemCard
            icon={Star}
            title="个人评分确认"
            description="现场重新打分，确认后计入舒适度排行"
            confirmed={draft.confirmed.rating}
            onToggleConfirm={() => {
              setItemConfirmed(id, 'rating', !draft.confirmed.rating);
              setFeedback(null);
            }}
            delayClass="stagger-3"
          >
            <Rating
              value={draft.rating}
              onChange={(value) => {
                setDraftRating(id, value);
                setFeedback(null);
              }}
              size="lg"
            />
          </ReviewItemCard>
        </div>

        {!conflictReason && (
          <div className="flex gap-4 pt-6 pb-6">
            <button
              type="button"
              onClick={handleDiscard}
              className="flex-1 px-6 py-3 bg-warm-beige text-deep-brown rounded-xl font-medium hover:bg-warm-beige/80 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              放弃草稿
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-moss-green text-white rounded-xl font-medium hover:bg-moss-light transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              提交复核
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
