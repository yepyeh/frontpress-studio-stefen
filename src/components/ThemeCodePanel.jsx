import { useMemo } from 'react';
import CodeEditor from './CodeEditor.jsx';
import { findAncestorsAtLine } from '../lib/themeBuilderBlocks.js';

export default function ThemeCodePanel({
  files,
  selectedPath,
  draft,
  dirty,
  focusLine,
  blocks,
  cursorLine,
  selectedBlockId,
  onChange,
  onSelectFile,
  onCursorChange,
  onSelectBlock,
}) {
  const crumbs = useMemo(
    () => (Array.isArray(blocks) ? findAncestorsAtLine(blocks, cursorLine || 1) : []),
    [blocks, cursorLine]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-200 bg-white">
      <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 px-2">
        {files.map((file) => {
          const active = file.path === selectedPath;
          return (
            <button
              key={file.path}
              type="button"
              onClick={() => onSelectFile(file.path)}
              className={`h-7 shrink-0 rounded px-2 text-xs font-medium ${
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
              title={file.path}
            >
              {file.name}
              {active && dirty ? ' *' : ''}
            </button>
          );
        })}
      </div>
      <Breadcrumbs
        crumbs={crumbs}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
      />
      <CodeEditor
        value={draft}
        onChange={onChange}
        onCursorChange={onCursorChange}
        filename={selectedPath}
        focusLine={focusLine}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

function Breadcrumbs({ crumbs, selectedBlockId, onSelectBlock }) {
  return (
    <div
      role="navigation"
      aria-label="Element path"
      className="flex h-7 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-2 text-[11px] text-zinc-600"
    >
      {crumbs.length === 0 ? (
        <span className="text-zinc-400">No element at cursor</span>
      ) : (
        crumbs.map((b, i) => {
          const active = b.id === selectedBlockId;
          return (
            <span key={b.id} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-zinc-300">›</span>}
              <button
                type="button"
                onClick={() => onSelectBlock?.(b.id)}
                className={`rounded px-1.5 py-0.5 font-mono ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'hover:bg-zinc-200 hover:text-zinc-900'
                }`}
                title={`${b.label} — line ${b.startLine}`}
              >
                {b.label}
              </button>
            </span>
          );
        })
      )}
    </div>
  );
}
