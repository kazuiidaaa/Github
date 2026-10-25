"use client";

import { useEffect, useRef, useState } from "react";

/** 入力が止まってから、検索語を URL（一覧）へ反映するまでの時間 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * 検索欄の状態。検索欄は入力欄自身の状態で表示し、URL への反映は、変換の確定・入力の停止・Enter のときに行う（変換中は反映しない）。
 * 案件一覧の検索欄（幅 md 未満は一覧の上、PC 版はツールバー）が共用する。
 * - flush(): 未反映の検索語があれば、他の条件の変更と同時に反映するための値を返す（なければ null）。
 * - reset(): 検索語を空にして反映済みとする（「条件をリセット」の直前に呼ぶ）。
 */
export function useCommittedSearch(query: string, commit: (value: string) => void) {
  const [text, setText] = useState(query);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushed = useRef(query); // 最後に URL へ反映した（または URL から受け取った）検索語
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  const cancelTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const push = (value: string) => {
    cancelTimer();
    if (value === pushed.current) return;
    pushed.current = value;
    commitRef.current(value);
  };
  // 戻る・進む、「条件をリセット」、カードの選択などによる URL 側の変更を入力欄へ反映する。
  // 自分が反映した値の戻りは無視する（入力途中の文字を巻き戻さない）。
  useEffect(() => {
    if (query === pushed.current) return;
    pushed.current = query;
    cancelTimer();
    composing.current = false;
    setText(query);
  }, [query]);
  useEffect(() => cancelTimer, []);

  const inputProps = {
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setText(v);
      if (composing.current || (e.nativeEvent as InputEvent).isComposing) return;
      cancelTimer();
      timer.current = setTimeout(() => push(v), SEARCH_DEBOUNCE_MS);
    },
    onCompositionStart: () => {
      composing.current = true;
      cancelTimer();
    },
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => {
      composing.current = false;
      push(e.currentTarget.value);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !composing.current && !e.nativeEvent.isComposing) push(e.currentTarget.value);
    },
  };
  /** 他の条件を変えるとき、未反映の検索語があれば返す（同時に反映した扱いにする） */
  const flush = (): string | null => {
    cancelTimer();
    if (composing.current || text === pushed.current) return null;
    pushed.current = text;
    return text;
  };
  const reset = () => {
    cancelTimer();
    composing.current = false;
    pushed.current = "";
    setText("");
  };
  return { inputProps, flush, reset };
}
