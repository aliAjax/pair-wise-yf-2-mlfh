import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sun,
  Volume2,
  Star,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ClipboardCheck,
  Archive,
} from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import {
  SHADE_LABELS,
  NOISE_LABELS,
  REVIEW_ITEM_LABELS,
} from '@/types';
import type { ReviewItemKey, ShadeLevelType, NoiseLevelType } from '@/types';
import Rating from '@/components/Rating/Rating';

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    initialize,
    initialized,
    getBenchById,
    getDraft,
    startReview,
    setDraftValue,
    setDraftConfirmed,
    rebaseDraft,
    discardDraft,
    submitReview,
  } = useBenchStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const bench = id ? getBenchById(id) : undefined;
  const draft = id ? getDraft(id) : undefined;

  // 进入复核即建立草稿（基于当前档案快照），已存在则保留继续
  useEffect(() => {
    if (initialized && id && bench && !draft) {
      startReview(id);
    }
  }, [initialized, id, bench, draft, startReview]);

  // 档案不存在且没有草稿：无从复核，返回列表
  useEffect(() => {
    if (initialized && !bench && !draft) {
      navigate('/');
    }
  }, [initialized, bench, draft, navigate]);

  if (!initialized || (!bench && !draft)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-ink-light">加载中...</p>
        </div>
      </div>
    );
  }

  const hasConflict = !!(bench && draft && draft.baseRevision !== bench.revision);
  const confirmedCount = draft
    ? (['shade', 'noise', 'rating'] as ReviewItemKey[]).filter((key) => draft.confirmed[key]).length
    : 0;

  const handleSubmit = () => {
    if (!id) return;
    const result = submitReview(id);
    if (result.ok) {
      navigate(`/bench/${id}`);
      return;
    }
    switch (result.reason) {
      case 'incomplete': {
        const missingLabels = (result.missing ?? [])
          .map((key) => REVIEW_ITEM_LABELS[key])
          .join('、');
        setErrorMessage(
          `${missingLabels}尚未确认。本次复核已整次拒绝，原档案与排行保持不变。`
        );
        break;
      }
      case 'conflict':
        setErrorMessage(
          '提交失败：该档案在复核期间已被更新，草稿与最新档案存在冲突。请基于最新档案重新逐项确认后再提交。'
        );
        break;
      case 'bench-removed':
        setErrorMessage('提交失败：该档案在复核期间已被移除，草稿已保留。');
        break;
      default:
        setErrorMessage('提交失败：没有找到复核草稿。');
    }
  };

  const handleRebase = () => {
    if (!id) return;
    if (rebaseDraft(id)) {
      setErrorMessage(null);
    }
  };

  const handleDiscard = () => {
    if (!id) return;
    discardDraft(id);
    setShowDiscardConfirm(false);
    navigate(bench ? `/bench/${id}` : '/');
  };

  // 档案已被移除：草稿保留，但无法提交
  if (!bench && draft) {
    return (
      <div className="container mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-ink-light hover:text-deep-brown mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-1">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-deep-brown mb-1">
                  原档案已被移除
                </h1>
                <p className="text-sm text-ink-light leading-relaxed">
                  该档案在复核期间被移除，复核草稿已保留在本地，但无法提交。
                  只有档案存在时才能基于最新档案重新确认并提交。
                </p>
              </div>
            </div>

            <div className="p-4 bg-warm-cream/50 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-deep-brown mb-3">草稿内容（已保留）</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-light">遮阴</span>
                  <span className="text-deep-brown">{SHADE_LABELS[draft.shadeLevel]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-light">噪音</span>
                  <span className="text-deep-brown">{NOISE_LABELS[draft.noiseLevel]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-light">个人评分</span>
                  <Rating value={draft.rating} readOnly size="sm" />
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-light">已确认</span>
                  <span className="text-deep-brown">{confirmedCount} / 3 项</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscardConfirm(true)}
                className="flex-1 px-4 py-2.5 text-sm text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                放弃草稿
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 text-sm text-white bg-ink-light/50 rounded-lg flex items-center justify-center gap-1.5"
              >
                <ClipboardCheck className="w-4 h-4" />
                提交复核
              </button>
            </div>
          </div>
        </div>

        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="paper-texture rounded-xl shadow-paper-hover p-6 max-w-sm w-full fade-in">
              <h3 className="font-serif text-lg font-semibold text-deep-brown mb-2">
                放弃复核草稿
              </h3>
              <p className="text-ink-light text-sm mb-6">
                确定要丢弃这份复核草稿吗？此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex-1 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  放弃草稿
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!bench || !draft) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-ink-light">加载中...</p>
        </div>
      </div>
    );
  }

  const renderOptionButtons = <T extends string>(
    labels: Record<T, string>,
    current: T,
    onSelect: (value: T) => void
  ) => (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(labels) as [T, string][]).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            current === value
              ? 'bg-moss-green text-white border-moss-green'
              : 'bg-white/50 text-ink-light border-deep-brown/10 hover:border-moss-green/50 hover:text-deep-brown'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderConfirmButton = (item: ReviewItemKey) => {
    const confirmed = draft.confirmed[item];
    return (
      <button
        type="button"
        onClick={() => setDraftConfirmed(bench.id, item, !confirmed)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
          confirmed
            ? 'bg-moss-green text-white'
            : 'bg-warm-beige text-deep-brown hover:bg-moss-green/10 hover:text-moss-green'
        }`}
      >
        <CheckCircle2 className="w-4 h-4" />
        {confirmed ? '已确认' : '确认此项'}
      </button>
    );
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

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="fade-in opacity-0 stagger-1">
          <h1 className="font-serif text-2xl font-bold text-deep-brown mb-1">
            现场复核
          </h1>
          <p className="text-ink-light text-sm">
            {bench.name} · 逐项核对现场情况，确认无误后提交
          </p>
        </div>

        {hasConflict && (
          <div className="paper-texture rounded-xl shadow-paper p-4 border border-ochre/40 fade-in opacity-0 stagger-1">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-ochre/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-ochre" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-deep-brown text-sm mb-1">
                  档案在复核期间已被更新
                </h3>
                <p className="text-xs text-ink-light leading-relaxed mb-3">
                  当前草稿基于旧版本档案，提交将会失败。请基于最新档案重新逐项确认。
                </p>
                <button
                  onClick={handleRebase}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-ochre hover:bg-ochre-light rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  基于最新档案重新确认
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-xl fade-in">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-serif text-lg font-semibold text-deep-brown">
              逐项确认
            </h2>
            <span className={`text-sm font-medium ${confirmedCount === 3 ? 'text-moss-green' : 'text-ochre'}`}>
              已确认 {confirmedCount} / 3
            </span>
          </div>
          <p className="text-xs text-ink-light mb-5">
            遮阴、噪音和个人评分均需逐项确认，任何一项未确认，本次复核将被整次拒绝。
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-warm-cream/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-moss-green" />
                  <span className="font-medium text-deep-brown text-sm">遮阴</span>
                </div>
                {renderConfirmButton('shade')}
              </div>
              <div className="text-xs text-ink-light mb-2">
                档案当前值：{SHADE_LABELS[bench.shadeLevel]}
              </div>
              {renderOptionButtons<ShadeLevelType>(
                SHADE_LABELS,
                draft.shadeLevel,
                (value) => setDraftValue(bench.id, 'shadeLevel', value)
              )}
            </div>

            <div className="p-4 bg-warm-cream/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-ochre" />
                  <span className="font-medium text-deep-brown text-sm">噪音</span>
                </div>
                {renderConfirmButton('noise')}
              </div>
              <div className="text-xs text-ink-light mb-2">
                档案当前值：{NOISE_LABELS[bench.noiseLevel]}
              </div>
              {renderOptionButtons<NoiseLevelType>(
                NOISE_LABELS,
                draft.noiseLevel,
                (value) => setDraftValue(bench.id, 'noiseLevel', value)
              )}
            </div>

            <div className="p-4 bg-warm-cream/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-ochre" />
                  <span className="font-medium text-deep-brown text-sm">个人评分</span>
                </div>
                {renderConfirmButton('rating')}
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-light mb-2">
                <span>档案当前值：</span>
                <Rating value={bench.rating} readOnly size="sm" />
              </div>
              <Rating
                value={draft.rating}
                onChange={(value) => setDraftValue(bench.id, 'rating', value)}
                size="lg"
              />
            </div>
          </div>
        </div>

        <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-3">
          <div className="flex items-center gap-2 text-xs text-ink-light mb-4">
            <Archive className="w-3.5 h-3.5" />
            <span>
              草稿保存在浏览器本地 · 最后修改 {new Date(draft.updatedAt).toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDiscardConfirm(true)}
              className="px-4 py-2.5 text-sm text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              放弃草稿
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-2.5 bg-moss-green text-white rounded-lg font-medium text-sm hover:bg-moss-light transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              提交复核
            </button>
          </div>
        </div>
      </div>

      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="paper-texture rounded-xl shadow-paper-hover p-6 max-w-sm w-full fade-in">
            <h3 className="font-serif text-lg font-semibold text-deep-brown mb-2">
              放弃复核草稿
            </h3>
            <p className="text-ink-light text-sm mb-6">
              确定要丢弃这份复核草稿吗？已确认的内容不会被保留。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 px-4 py-2 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
              >
                继续复核
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                放弃草稿
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
