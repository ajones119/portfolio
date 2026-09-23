export type KeyResultStatus = 'on-track' | 'at-risk' | 'complete';

export interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  status: KeyResultStatus;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  deadline: string;
  keyResults: KeyResult[];
}

export interface OKRSet {
  objectives: Objective[];
}

const statusValues: Record<KeyResultStatus, true> = { 'on-track': true, 'at-risk': true, complete: true };

export function progressFor(keyResult: Pick<KeyResult, 'current' | 'target'>): number {
  if (!Number.isFinite(keyResult.target) || keyResult.target <= 0) return 0;
  return Math.min(100, Math.max(0, (keyResult.current / keyResult.target) * 100));
}

export function statusFor(keyResult: Pick<KeyResult, 'current' | 'target'>): KeyResultStatus {
  const progress = progressFor(keyResult);
  if (progress >= 100) return 'complete';
  if (progress < 40) return 'at-risk';
  return 'on-track';
}

export function validateOKRSet(value: unknown): value is OKRSet {
  if (!value || typeof value !== 'object' || !Array.isArray((value as OKRSet).objectives)) return false;
  return (value as OKRSet).objectives.every((objective) => {
    if (!objective || typeof objective !== 'object') return false;
    const item = objective as Objective;
    return typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim().length > 0
      && typeof item.description === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline)
      && Array.isArray(item.keyResults) && item.keyResults.every((keyResult) => {
        const result = keyResult as KeyResult;
        return typeof result.id === 'string' && typeof result.title === 'string' && result.title.trim().length > 0
          && typeof result.unit === 'string' && Number.isFinite(result.target) && result.target > 0
          && Number.isFinite(result.current) && result.current >= 0 && result.status in statusValues;
      });
  });
}
