"use client";

import { use } from "react";
import SpreadsheetWorkspace from "@/components/spreadsheets/SpreadsheetWorkspace";
import SessionGate from "@/components/session/SessionGate";
import LightTheme from "@/components/shell/LightTheme";

export default function SpreadsheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <>
      <LightTheme />
      <SessionGate>
        <SpreadsheetWorkspace id={id} />
      </SessionGate>
    </>
  );
}
