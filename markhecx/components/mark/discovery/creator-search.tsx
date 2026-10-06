"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { getSearchSuggestions, popularSearches } from "@/lib/mark/discovery";
import { useDiscoveryCreators } from "./use-discovery";
import { Button, Input } from "../ui";
import { useApp } from "../provider";

/** One keyboard-accessible search control shared by the top bar and Discover. */
export function CreatorSearch({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const pool = useDiscoveryCreators();
  const { state } = useApp();
  const historyKey = `markhecx.searches.${state.signedIn ? "owner" : "guest"}`;
  const [draft, setDraft] = useState({ value, text: value }),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [recent, setRecent] = useState<string[]>([]);
  const id = useId();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const notify = useRef(onChange);
  useEffect(() => {
    notify.current = onChange;
  }, [onChange]);
  // Back/forward navigation or clearing the query cancels an older queued search.
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [value],
  );
  const text = draft.value === value ? draft.text : value;
  const setText = (text: string) => setDraft({ value, text });
  function loadRecent() {
    try {
      const data = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
      setRecent(
        Array.isArray(data)
          ? data.filter((x) => typeof x === "string").slice(0, 4)
          : [],
      );
    } catch {
      setRecent([]);
    }
  }
  const suggestions = getSearchSuggestions(pool, text);
  const options = text.trim()
    ? suggestions.map((s) => ({ ...s, kind: s.type }))
    : [
        ...recent.map((s) => ({
          kind: "Recent",
          label: s,
          value: s,
          detail: "",
        })),
        ...popularSearches(pool)
          .filter((s) => !recent.includes(s))
          .map((s) => ({
            kind: "Try a skill",
            label: s,
            value: s,
            detail: "",
          })),
      ].slice(0, 8);
  function remember(next: string) {
    if (!next.trim()) return;
    const list = [
      next.trim(),
      ...recent.filter((x) => x !== next.trim()),
    ].slice(0, 4);
    setRecent(list);
    try {
      sessionStorage.setItem(historyKey, JSON.stringify(list));
    } catch {}
  }
  function choose(next: string) {
    if (pending.current) clearTimeout(pending.current);
    setText(next);
    remember(next);
    onChange(next);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }
  return (
    <div
      className={`creator-search ${compact ? "compact-search" : ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <form
        className={compact ? "global-search" : "filter-search"}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          choose(text);
        }}
      >
        <Search size={18} aria-hidden="true" />
        <Input
          ref={input}
          role="combobox"
          aria-label={compact ? "Global creator search" : "Search creators"}
          aria-autocomplete="list"
          aria-expanded={open && options.length > 0}
          aria-controls={
            open && options.length > 0 ? `${id}-suggestions` : undefined
          }
          aria-activedescendant={
            open && active >= 0 && active < options.length
              ? `${id}-${active}`
              : undefined
          }
          autoComplete="off"
          value={text}
          placeholder="Search creators, skills, projects..."
          onFocus={() => {
            loadRecent();
            setOpen(true);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            setOpen(true);
            setActive(-1);
            if (pending.current) clearTimeout(pending.current);
            pending.current = setTimeout(() => notify.current(next), 180);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                options.length
                  ? i < 0
                    ? e.key === "ArrowDown"
                      ? 0
                      : options.length - 1
                    : (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                      options.length
                  : -1,
              );
            }
            if (e.key === "Enter" && open && active >= 0 && options[active]) {
              e.preventDefault();
              choose(options[active].value);
            }
          }}
        />
        {text && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => {
              choose("");
              setOpen(true);
            }}
          >
            <X size={16} />
          </Button>
        )}
      </form>
      {open && options.length > 0 && (
        <div
          className="search-suggestions"
          id={`${id}-suggestions`}
          role="listbox"
          aria-label="Search suggestions"
        >
          {options.map((s, i) => (
            <button
              type="button"
              tabIndex={-1}
              role="option"
              aria-selected={active === i}
              id={`${id}-${i}`}
              key={s.kind + s.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s.value)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="suggestion-kind">{s.kind}</span>
              <span>
                {s.label}
                {s.detail && <small>{s.detail}</small>}
              </span>
              <Search size={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
