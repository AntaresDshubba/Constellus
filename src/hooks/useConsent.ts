/**
 * useConsent.
 *
 * Thin wrapper around src/lib/consent.ts for the onboarding screen.
 * Each tier is recorded explicitly, in order, BEFORE the data that
 * tier gates is collected — see OnboardingScreen.tsx for where this is
 * called per step, never as one bulk "accept everything" action.
 */

import { useCallback, useState } from 'react';
import { recordConsent } from '../lib/consent';
import type { ConsentTier } from '../types/identity';

export function useConsent() {
  const [recording, setRecording] = useState(false);

  const grant = useCallback(async (tier: ConsentTier, granted: boolean) => {
    setRecording(true);
    try {
      await recordConsent(tier, granted);
    } finally {
      setRecording(false);
    }
  }, []);

  return { recordConsent: grant, recording };
}
