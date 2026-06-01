"use client";

import { useEffect, useRef } from "react";

/**
 * Когда модалка открыта — пушим в history фиктивную запись.
 * Нажатие "назад" на телефоне (или Alt+←) сначала вытянет эту запись
 * и закроет модалку, а не уведёт со страницы.
 *
 * Если компонент размонтировался без нажатия "назад" (например, юзер
 * закрыл кнопкой X), мы сами откатим запись чтобы не плодить мусор
 * в истории.
 *
 * onClose стабилизируется через ref — иначе при каждом ре-рендере
 * родителя пересоздаётся колбэк, эффект перезапускается, в cleanup
 * вызывается history.back() с async popstate, который ловится новым
 * listener'ом и сразу закрывает модалку (баг "открылось и тут же
 * закрылось").
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const marker = `echoModal-${Math.random().toString(36).slice(2, 10)}`;
    // Запоминаем URL на момент открытия — если он изменился к моменту cleanup,
    // значит юзер сам перешёл по ссылке (например, нажал на уведомление),
    // и откатывать history.back() мы не должны — это сорвало бы навигацию.
    const initialHref = window.location.href;
    window.history.pushState({ echoModalMarker: marker }, "");

    let closedViaPop = false;
    function onPop() {
      closedViaPop = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (
        !closedViaPop &&
        window.location.href === initialHref &&
        (window.history.state as { echoModalMarker?: string } | null)?.echoModalMarker === marker
      ) {
        window.history.back();
      }
    };
  }, [open]);
}
