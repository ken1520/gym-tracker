"use client";

import { useEffect } from "react";

import { useToast } from "@/components/toast";
import type { ActionState } from "@/server/actions/state";

// Actions return a fresh object every run, so a new success state always fires.
// The effect, rather than a render-phase check, keeps the toast out of render
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const { showToast } = useToast();

  useEffect(() => {
    if (state.status !== "success") return;
    if (state.message) showToast(state.message);
    onSuccess?.();
    // onSuccess is redeclared each render; the state object is the real trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
