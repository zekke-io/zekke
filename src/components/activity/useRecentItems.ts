'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  documentTitle,
  decodeCredentialPayload,
  decodeSecretPayload,
  noteTitle,
  recentEntries,
  RECENT_LIMIT,
  type RecentCandidate,
  type RecentEntry,
} from '@/lib/app';
import { feedCredentials, feedDocumentMetas, feedNotes, feedSecrets } from '@/lib/feed';
import { openCredential } from '@/lib/credentials';
import { loadDocumentSummaries } from '@/lib/documents/summaries';
import { openNote } from '@/lib/notes';
import { openSecret } from '@/lib/secrets';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';
import { useFeedChanges, useReloadOnReturn } from '@/components/session/useFeed';

export interface RecentItems {
  entries: RecentEntry[] | undefined;
  failed: boolean;
}

async function readable(candidate: () => Promise<RecentCandidate>): Promise<RecentCandidate[]> {
  try {
    return [await candidate()];
  } catch {
    return [];
  }
}

export function useRecentItems(): RecentItems {
  const context = useAuthedContext();
  const { holds } = useZekke();
  const [entries, setEntries] = useState<RecentEntry[]>();
  const [failed, setFailed] = useState(false);
  const notes = holds('notes');
  const secrets = holds('secrets');
  const passwords = holds('passwords');
  const documents = holds('documents');

  const load = useCallback(async () => {
    try {
      const groups = await Promise.all([
        notes
          ? feedNotes(context).then((records) =>
              Promise.all(
                records.slice(0, RECENT_LIMIT).flatMap((record) =>
                  readable(async () => ({
                    id: record.id,
                    kind: 'note' as const,
                    title: noteTitle(await openNote(context, record)),
                    updatedAt: record.updated_at,
                  })),
                ),
              ),
            )
          : [],
        secrets
          ? feedSecrets(context).then((records) =>
              Promise.all(
                [...records]
                  .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
                  .slice(0, RECENT_LIMIT)
                  .flatMap((record) =>
                    readable(async () => ({
                      id: record.id,
                      kind: 'secret' as const,
                      title: decodeSecretPayload(await openSecret(context, record)).name,
                      updatedAt: record.updated_at,
                    })),
                  ),
              ),
            )
          : [],
        passwords
          ? feedCredentials(context).then((records) =>
              Promise.all(
                records.slice(0, RECENT_LIMIT).flatMap((record) =>
                  readable(async () => ({
                    id: record.credential_id,
                    kind: 'password' as const,
                    title: decodeCredentialPayload(await openCredential(context, record)).site,
                    updatedAt: record.created_at,
                  })),
                ),
              ),
            )
          : [],
        documents
          ? feedDocumentMetas(context).then(async (metas) => {
              const newest = [...metas]
                .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
                .slice(0, RECENT_LIMIT);
              const summaries = await loadDocumentSummaries(context, newest);
              return summaries.flatMap((summary): RecentCandidate[] =>
                summary.readable
                  ? [
                      {
                        id: summary.id,
                        kind: summary.kind,
                        title: documentTitle(summary.title, summary.kind),
                        updatedAt: summary.updatedAt,
                      },
                    ]
                  : [],
              );
            })
          : [],
      ]);

      setEntries(recentEntries(groups.flat().flat()));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [context, notes, secrets, passwords, documents]);

  useEffect(() => {
    void load();
  }, [load]);

  useFeedChanges('notes', load);
  useFeedChanges('secrets', load);
  useFeedChanges('passwords', load);
  useFeedChanges('documents', load);
  useReloadOnReturn(load);

  return { entries, failed };
}
