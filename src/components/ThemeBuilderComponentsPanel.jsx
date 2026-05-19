import { useMemo, useState } from 'react';
import {
  SNIPPETS,
  SNIPPET_GROUPS,
  buildPartialSnippets,
} from '../lib/themeBuilderSnippets.js';

// Inline replacement for the old "Add" modal. Lives in the sidebar's
// Components tab so the user can keep clicking snippets to insert
// several in a row without an open/close roundtrip.
export default function ThemeBuilderComponentsPanel({ isTwig, files, onInsert }) {
  const partials = useMemo(() => buildPartialSnippets(files || []), [files]);
  const groups = useMemo(
    () => (partials.length ? [...SNIPPET_GROUPS, 'Partials'] : [...SNIPPET_GROUPS]),
    [partials.length],
  );

  // Track expanded groups. Defaults to "Elements" + "Structure" expanded
  // — the two tabs theme authors hit most. Others are collapsed.
  const [open, setOpen] = useState(() => ({ Elements: true, Structure: true }));

  if (!isTwig) {
    return (
      <div className="rounded-md border border-dashed border-zinc-200 p-3 text-xs text-zinc-500">
        Components are Twig snippets. Open a `.twig` template to use them.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((name) => {
        const items = name === 'Partials' ? partials : SNIPPETS.filter((s) => s.group === name);
        const isOpen = !!open[name];
        return (
          <section key={name} className="rounded-md border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [name]: !prev[name] }))}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <span>{name}</span>
              <span className="text-[10px] text-zinc-400">
                {items.length} {isOpen ? '▾' : '▸'}
              </span>
            </button>
            {isOpen && (
              items.length === 0 ? (
                <div className="px-2 pb-2 text-[11px] text-zinc-500">
                  {name === 'Partials'
                    ? 'Add a templates/_<name>.twig file to see it here.'
                    : 'Nothing in this group.'}
                </div>
              ) : (
                <div className="grid gap-1.5 px-2 pb-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onInsert?.(item)}
                      title={item.description}
                      className="flex flex-col gap-0.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                    >
                      <span className="text-[11px] font-semibold text-zinc-900">{item.label}</span>
                      <span className="line-clamp-2 text-[10px] leading-snug text-zinc-500">
                        {item.description}
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}
