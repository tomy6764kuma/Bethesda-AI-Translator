import React from 'react';
import { LogEntry } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  uiLanguage: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs, uiLanguage }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const t = TRANSLATIONS[uiLanguage] || TRANSLATIONS['en'];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-neutral-900 border border-neutral-800 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 hover:bg-neutral-800 transition z-40 select-none"
      >
        <span>{t.showLogs(logs.length)}</span>
      </button>
    );
  }

  return (
    <div className="h-48 bg-neutral-950 border-t border-neutral-800 flex flex-col font-mono text-[11px] shrink-0 select-text">
      {/* Header */}
      <div className="px-4 py-2 bg-neutral-900/80 border-b border-neutral-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="font-bold text-neutral-300">{t.title}</span>
          <span className="text-neutral-500">{t.events(logs.length)}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClearLogs}
            className="text-neutral-500 hover:text-neutral-300 transition px-2 py-0.5 rounded hover:bg-neutral-800"
          >
            {t.clear}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-neutral-500 hover:text-neutral-300 transition px-2 py-0.5 rounded hover:bg-neutral-800"
          >
            {t.minimize}
          </button>
        </div>
      </div>

      {/* Log Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-neutral-600 italic">{t.empty}</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2">
              <span className="text-neutral-600 shrink-0">[{log.timestamp}]</span>
              <span
                className={`shrink-0 font-bold uppercase ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'warning'
                    ? 'text-yellow-400'
                    : log.type === 'success'
                    ? 'text-emerald-400'
                    : log.type === 'ai'
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`}
              >
                [{log.type}]
              </span>
              <span className="text-neutral-300 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default LogViewer;
