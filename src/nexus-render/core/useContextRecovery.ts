/**
 * useContextRecovery.
 *
 * The React-facing wrapper around attachContextRecovery. Returns a
 * `reconnecting` boolean and an `onCanvasCreated` callback to pass to
 * R3F's <Canvas onCreated={...}>. This is the hook screens actually use
 * — they never call attachContextRecovery directly.
 *
 * Also the instrumentation point for the Phase 3 exit criterion "at
 * least one logged context-loss-and-recovery cycle": every loss and
 * every restore is reported via trackEvent here, in addition to (not
 * instead of) the existing reconnecting-state UI behavior. A lost-at
 * timestamp is captured on loss and used to compute recoveryMs when
 * (if) the restore fires, so the analytics row carries the actual
 * recovery duration rather than just a bare "it happened" flag.
 */

import { useCallback, useRef, useState } from 'react';
import { attachContextRecovery } from '../context-recovery/contextRecovery';
import { trackEvent } from '../../lib/analytics';
import type { RootState } from '@react-three/fiber';

export function useContextRecovery() {
  const [reconnecting, setReconnecting] = useState(false);
  const detachRef = useRef<(() => void) | null>(null);
  const lostAtRef = useRef<number | null>(null);

  const onCanvasCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;
    const handle = attachContextRecovery(canvas, {
      onContextLost: () => {
        lostAtRef.current = Date.now();
        setReconnecting(true);
        void trackEvent('webgl_context_lost');
      },
      onContextRestored: () => {
        setReconnecting(false);
        // lostAtRef should always be set by the time a restore fires
        // (loss must precede restore), but guard anyway rather than
        // assume — a missing lost-at timestamp shouldn't crash this
        // analytics call, it should just omit recoveryMs.
        const recoveryMs = lostAtRef.current !== null ? Date.now() - lostAtRef.current : undefined;
        lostAtRef.current = null;
        void trackEvent('webgl_context_restored', recoveryMs !== undefined ? { recoveryMs } : {});
      },
    });
    detachRef.current = handle.detach;
  }, []);

  return { reconnecting, onCanvasCreated };
}
