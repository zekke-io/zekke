'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { PhraseMismatchError, openNewKeyrings } from '@/lib/account';
import {
  NEW_FEATURES_COPY,
  SECOND_FACTOR_COPY,
  accountPinRefusal,
  checkMnemonic,
  mnemonicSentence,
} from '@/lib/app';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';
import { Button, Card, Notice, PinField, TextArea } from '@/components/ui';

export default function NewFeaturesScreen() {
  const context = useAuthedContext();
  const { paranoid, fullDevice, syncScopes, reportError } = useZekke();
  const [mnemonic, setMnemonic] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'info'; text: string }>();

  async function turnOn() {
    const checked = checkMnemonic(mnemonic);
    if (!checked.ok) {
      setMessage({ tone: 'danger', text: checked.message });
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const opened = await openNewKeyrings(context, {
        mnemonic: mnemonicSentence(mnemonic),
        accountPin: paranoid ? pin : undefined,
      });
      setMnemonic('');
      setPin('');
      syncScopes();
      if (opened.length === 0) {
        setMessage({ tone: 'info', text: NEW_FEATURES_COPY.alreadyOpen });
      } else {
        setMessage({ tone: 'success', text: NEW_FEATURES_COPY.done });
      }
    } catch (error) {
      if (error instanceof PhraseMismatchError) {
        setMessage({ tone: 'danger', text: SECOND_FACTOR_COPY.phraseMismatch });
      } else if (error instanceof ApiError && error.isCredentialFailure) {
        const count = failures + 1;
        setFailures(count);
        setMessage({ tone: 'danger', text: paranoid ? accountPinRefusal(count) : reportError(error) });
      } else if (error instanceof ApiError && error.status === 400) {
        setMessage({ tone: 'info', text: NEW_FEATURES_COPY.alreadyOpen });
      } else {
        setMessage({ tone: 'danger', text: reportError(error) });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!fullDevice) {
    return (
      <Card title={NEW_FEATURES_COPY.title}>
        <Notice tone="info">{NEW_FEATURES_COPY.limitedDevice}</Notice>
      </Card>
    );
  }

  return (
    <Card title={NEW_FEATURES_COPY.title} subtitle={NEW_FEATURES_COPY.summary}>
      <div className="space-y-4">
        <p className="text-compact text-ink-muted">{NEW_FEATURES_COPY.why}</p>
        {message ? (
          <Notice tone={message.tone} onDismiss={() => setMessage(undefined)}>
            {message.text}
          </Notice>
        ) : null}
        <TextArea
          label="Recovery phrase"
          value={mnemonic}
          autoComplete="off"
          spellCheck={false}
          hint={NEW_FEATURES_COPY.phraseHint}
          onChange={(event) => setMnemonic(event.target.value)}
        />
        {paranoid ? <PinField label="Account PIN" value={pin} onChange={setPin} /> : null}
        <Button disabled={busy} onClick={() => void turnOn()}>
          {busy ? NEW_FEATURES_COPY.working : NEW_FEATURES_COPY.submit}
        </Button>
      </div>
    </Card>
  );
}
