/**
 * useDailyAlignment.
 *
 * Wraps src/lib/dailyAlignment.ts for the Nexus screen. Eagerly calls
 * generateTodaysAlignment on mount rather than checking
 * getTodaysAlignment first — generateTodaysAlignment is itself
 * idempotent (see its header comment), so there is no real cost to
 * always calling the "generate" path; it collapses to a cheap read on
 * every visit after the first one each day.
 */

import { useCallback, useEffect, useState } from 'react';
import { generateTodaysAlignment, completeDailyAlignmentQuest } from '../lib/dailyAlignment';
import type { DailyAlignmentRow } from '../types/dailyAlignment';

export function useDailyAlignment() {
  const [alignment, setAlignment] = useState<DailyAlignmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    generateTodaysAlignment()
      .then((row) => {
        if (!cancelled) setAlignment(row);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load today's Alignment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeQuest = useCallback(async () => {
    if (!alignment || alignment.quest_completed_at) return;
    setCompleting(true);
    try {
      const updated = await completeDailyAlignmentQuest(alignment.id);
      setAlignment(updated);
    } finally {
      setCompleting(false);
    }
  }, [alignment]);

  return { alignment, loading, error, completing, completeQuest };
}
