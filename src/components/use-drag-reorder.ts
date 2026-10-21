"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, PointerEvent, SetStateAction } from "react";

import { moveItem } from "@/domain/reorder";

type Keyed = { key: string };

// Reorder keyed items by pointer or arrow keys; HTML5 drag-and-drop never fires on touch
export function useDragReorder<T extends Keyed>(setItems: Dispatch<SetStateAction<T[]>>) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (draggingKey === null) return;

    // Count the other items whose midpoint sits above the pointer; comparing
    // against the others only keeps a tall card from flip-flopping
    const onMove = (event: globalThis.PointerEvent) =>
      setItems((current) => {
        const from = current.findIndex((item) => item.key === draggingKey);
        const to = current.filter((item) => {
          if (item.key === draggingKey) return false;
          const rect = nodes.current.get(item.key)?.getBoundingClientRect();
          return rect !== undefined && rect.top + rect.height / 2 < event.clientY;
        }).length;
        return from === to ? current : moveItem(current, from, to);
      });
    const onEnd = () => setDraggingKey(null);

    // Listen on window because React moves the dragged node, which drops pointer capture
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [draggingKey, setItems]);

  const itemRef = (key: string) => (node: HTMLElement | null) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  };

  const handleProps = (key: string) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      // Stops the mouse selecting text on the way past
      event.preventDefault();
      setDraggingKey(key);
    },
    // Arrow keys give keyboard users the same reorder
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      if (step === 0) return;
      event.preventDefault();
      setItems((current) => {
        const from = current.findIndex((item) => item.key === key);
        return moveItem(current, from, from + step);
      });
      // A moved node loses focus, so hand it back once React has re-rendered
      requestAnimationFrame(() =>
        nodes.current.get(key)?.querySelector<HTMLElement>("[data-drag-handle]")?.focus(),
      );
    },
  });

  return { draggingKey, itemRef, handleProps };
}
