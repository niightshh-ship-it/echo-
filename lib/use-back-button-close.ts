"use client";

import { useEffect } from "react";

/**
 * Когда модалка открыта — пушим в history фиктивную запись.
 * Нажатие "назад" на телефоне (или Alt+←) сначала вытянет эту запись
 * и закроет модалку, а не уведёт со страницы.
 *
 * Если компонент размонтировался без нажатия "назад" (например, юзер
 * закрыл кнопкой X), мы сами откатим запись чтобы не плодить мусор
 * в истории.
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const marker = `echoModal-${Math.random().toString(36).slice(2, 10)}`;
    window.history.pushState({ echoModalMarker: marker }, "");

    let closedViaPop = false;
    function onPop() {
      closedViaPop = true;
      onClose();
    }
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (
        !closedViaPop &&
        (window.history.state as { echoModalMarker?: string } | null)?.echoModalMarker === marker
      ) {
        window.history.back();
      }
    };
  }, [open, onClose]);
}
