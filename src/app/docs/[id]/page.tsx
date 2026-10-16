'use client';

import { use } from 'react';
import DocumentWorkspace from '@/components/documents/DocumentWorkspace';
import SessionGate from '@/components/session/SessionGate';
import LightTheme from '@/components/shell/LightTheme';

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <LightTheme />
      <SessionGate>
        <DocumentWorkspace id={id} />
      </SessionGate>
    </>
  );
}
