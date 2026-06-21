/**
 * App.
 *
 * Sets up the two cross-cutting providers (React Query, Router) and the
 * route table. AuthGate wraps every protected route — there is no route
 * a player can reach without first passing through it.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGate } from './AuthGate';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { StarMapScreen } from '../screens/star-map/StarMapScreen';
import { WorldScreen } from '../screens/world/WorldScreen';
import { NexusScreen } from '../screens/nexus/NexusScreen';
import { StarPassScreen } from '../screens/star-pass/StarPassScreen';
import { ConvergenceScreen } from '../screens/convergence/ConvergenceScreen';
import { SynastryScreen } from '../screens/synastry/SynastryScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Cosmic profile/world data rarely changes mid-session (the
      // chart never changes at all; the Base Layer only changes on
      // first generation) — a short staleTime avoids refetching on
      // every component mount without risking genuinely stale reads
      // for data this static.
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ width: '100vw', height: '100vh', background: '#05050a' }}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route
              path="/nexus"
              element={
                <AuthGate>
                  <NexusScreen />
                </AuthGate>
              }
            />
            <Route
              path="/star-map"
              element={
                <AuthGate>
                  <StarMapScreen />
                </AuthGate>
              }
            />
            <Route
              path="/world/:sign"
              element={
                <AuthGate>
                  <WorldScreen />
                </AuthGate>
              }
            />
            <Route
              path="/star-pass"
              element={
                <AuthGate>
                  <StarPassScreen />
                </AuthGate>
              }
            />
            <Route
              path="/convergence"
              element={
                <AuthGate>
                  <ConvergenceScreen />
                </AuthGate>
              }
            />
            <Route
              path="/synastry"
              element={
                <AuthGate>
                  <SynastryScreen />
                </AuthGate>
              }
            />
            <Route path="*" element={<Navigate to="/nexus" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
