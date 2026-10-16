'use client';

import type { ReactNode } from 'react';
import { useZekke } from './ZekkeProvider';
import Onboarding from './Onboarding';
import Unlock from './Unlock';
import RegionalScope from './RegionalScope';
import { Spinner, TatuClosed } from '@/components/ui';

export function WelcomeLayout({ width, children }: { width: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-ground px-4 py-12">
      <div className={`mx-auto ${width} space-y-8`}>
        <div className="flex flex-col items-center gap-3">
          <TatuClosed className="h-36 w-36" />
          <span className="-mt-2 text-6xl font-black leading-none tracking-tighter text-ink">zekke</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export default function SessionGate({ children }: { children: ReactNode }) {
  const { phase } = useZekke();

  if (phase === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ground">
        <Spinner />
      </main>
    );
  }

  if (phase === 'onboarding') {
    return (
      <WelcomeLayout width="max-w-2xl">
        <Onboarding />
      </WelcomeLayout>
    );
  }

  if (phase === 'locked') {
    return (
      <WelcomeLayout width="max-w-md">
        <Unlock />
      </WelcomeLayout>
    );
  }

  return <RegionalScope>{children}</RegionalScope>;
}
