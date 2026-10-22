"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FEEDBACK_COPY, feedbackDraft } from "@/lib/app";
import { sendFeedback, MAX_FEEDBACK_CHARACTERS } from "@/lib/feedback";
import { useAuthedContext, useZekke } from "@/components/session/ZekkeProvider";
import { FormModal, Modal } from "@/components/modal";
import { Button, HintedIconButton, Notice, TextArea } from "@/components/ui";
import { ChatIcon, HeartIcon, LockSessionIcon } from "@/components/ui/icons";

type Step = "closed" | "writing" | "sent";

export default function FeedbackButton() {
  const context = useAuthedContext();
  const { reportError } = useZekke();
  const [step, setStep] = useState<Step>("closed");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const draft = feedbackDraft(message, busy);

  function close() {
    if (busy) {
      return;
    }
    setStep("closed");
    setMessage("");
    setProblem(undefined);
  }

  async function send() {
    if (!draft.canSend) {
      return;
    }
    setBusy(true);
    setProblem(undefined);
    try {
      await sendFeedback(context, message);
      setStep("sent");
      setMessage("");
    } catch (error) {
      setProblem(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <HintedIconButton
        hint={FEEDBACK_COPY.open}
        onClick={() => setStep("writing")}
      >
        <ChatIcon className="h-4 w-4 shrink-0" />
      </HintedIconButton>

      {step === "writing"
        ? createPortal(
            <FormModal
              title={FEEDBACK_COPY.title}
              submitLabel={busy ? FEEDBACK_COPY.sending : FEEDBACK_COPY.send}
              canSubmit={draft.canSend}
              busy={busy}
              onClose={close}
              onSubmit={() => void send()}
            >
              <div className="space-y-4">
                {problem ? <Notice tone="danger">{problem}</Notice> : null}
                <TextArea
                  plain
                  label={FEEDBACK_COPY.question}
                  placeholder={FEEDBACK_COPY.placeholder}
                  rows={6}
                  maxLength={MAX_FEEDBACK_CHARACTERS}
                  value={message}
                  disabled={busy}
                  hint={FEEDBACK_COPY.charactersLeft(draft.charactersLeft)}
                  onChange={(event) => setMessage(event.target.value)}
                  className="h-40"
                />
                <p className="flex items-center gap-3 text-compact font-bold text-ink-soft">
                  <LockSessionIcon className="h-5 w-5 shrink-0 text-brand-700" />
                  {FEEDBACK_COPY.privacy}
                </p>
              </div>
            </FormModal>,
            document.body,
          )
        : null}

      {step === "sent"
        ? createPortal(
            <Modal
              title={FEEDBACK_COPY.title}
              onClose={close}
              footer={
                <div className="flex justify-end">
                  <Button onClick={close}>{FEEDBACK_COPY.done}</Button>
                </div>
              }
            >
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-raised text-brand-700">
                  <HeartIcon className="h-10 w-10" />
                </span>
                <h3 className="text-headline text-ink">
                  {FEEDBACK_COPY.thanksTitle}
                </h3>
                <p className="text-body font-bold text-ink-soft">
                  {FEEDBACK_COPY.thanks}
                </p>
              </div>
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
}
