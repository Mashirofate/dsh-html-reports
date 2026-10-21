/* HTML Reports — client half.
 *
 * Renders `present_html_report` tool calls as rich HTML cards, keeps a
 * page-wide index of every report that has rendered, and exposes that index
 * as a right-sidebar tab. Also exports the current report as PNG or PDF.
 */
window.__ModuleLoader__.load({
  id: 'dsh-html-reports',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const {
      useCallback,
      useEffect,
      useMemo,
      useRef,
      useState,
      useSyncExternalStore,
    } = React;

    const NS = 'html-reports';
    const TOOL_NAME = 'present_html_report';
    const OVERLAY_ID = 'html-reports.fullscreen';
    const HEADER_ID = 'html-reports.header';
    const TAB_ID = 'dsh-html-reports';
    const TAB_KIND = 'html-reports';
    const STYLE_ID = 'html-reports/style';
    const DEFAULT_HEIGHT = 560;
    const MIN_HEIGHT = 240;
    const MAX_HEIGHT = 1200;
    const EXPORT_WIDTH = 1080;
    const MAX_CANVAS_DIM = 16000;
    const MAX_CANVAS_AREA = 6e7;
    const A4_WIDTH_PT = 595.28;
    const A4_HEIGHT_PT = 841.89;
    const FONT_STACK =
      'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

    const TOKENS = [
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-bg-layer-2',
      '--dsw-alias-bg-overlay',
      '--dsw-alias-border-l1',
      '--dsw-alias-border-l2',
      '--dsw-alias-brand-primary',
      '--dsw-alias-label-primary',
      '--dsw-alias-label-secondary',
      '--dsw-alias-state-error-primary',
      '--dsw-alias-state-idle-primary',
      '--dsw-alias-state-success-primary',
      '--dsw-alias-state-warn-primary',
      '--dsw-specific-sidebar-fill',
    ];

    const DICT = {
      en: {
        'report.preparing': 'Preparing report…',
        'report.untitled': 'Untitled report',
        'report.failed': 'This report has no renderable content.',
        'report.expand': 'Expand report',
        'report.close': 'Close',
        'report.export': 'Export',
        'report.download': 'Download HTML',
        'report.png': 'Export PNG',
        'report.pdf': 'Export PDF',
        'report.exporting': 'Exporting…',
        'report.exportFailed': 'Export failed: {message}',
        'report.list': 'Reports',
        'report.openList': 'Open report list',
        'report.tab': 'Reports',
        'report.count': '{count} in this session',
        'report.emptyList': 'Reports you generate in this session show up here.',
        'report.open': 'Open',
        'report.preview': 'Report preview',
      },
      zh: {
        'report.preparing': '正在准备报告…',
        'report.untitled': '未命名报告',
        'report.failed': '这份报告没有可渲染的内容。',
        'report.expand': '展开报告',
        'report.close': '关闭',
        'report.export': '导出',
        'report.download': '下载 HTML',
        'report.png': '导出 PNG',
        'report.pdf': '导出 PDF',
        'report.exporting': '正在导出…',
        'report.exportFailed': '导出失败：{message}',
        'report.list': '报告',
        'report.openList': '打开报告列表',
        'report.tab': '报告',
        'report.count': '当前会话 {count} 份',
        'report.emptyList': '这个会话里生成的报告会出现在这里。',
        'report.open': '打开',
        'report.preview': '报告预览',
      },
    };

    const CSS = `
.hr_card{position:relative;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-layer-1,transparent);overflow:hidden;margin:8px 0}
.hr_head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);min-height:36px;box-sizing:border-box}
.hr_badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:0 0 auto;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.1))}
.hr_title{flex:1 1 auto;min-width:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hr_meta{flex:0 0 auto;font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.hr_actions{flex:0 0 auto;display:flex;align-items:center;gap:2px}
.hr_btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.hr_btn:hover{background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary)}
.hr_btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.hr_body{position:relative;width:100%;background:var(--dsw-alias-bg-base,#fff)}
.hr_frame{border:0;width:100%;height:100%;min-height:120px;display:block;background:transparent}
.hr_skeleton{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(127,127,127,.14),transparent);background-size:200% 100%;animation:hr-shimmer 1.4s linear infinite}
@keyframes hr-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.hr_note{display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;padding:16px;font-size:12px;color:var(--dsw-alias-label-secondary);text-align:center}
.hr_measure{position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none}
.hr_menu_root{position:relative;display:inline-flex}
.hr_menu{position:absolute;right:0;top:calc(100% + 4px);z-index:30;min-width:150px;padding:4px;display:flex;flex-direction:column;gap:1px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));box-shadow:0 8px 24px rgba(0,0,0,.18)}
.hr_menu_item{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.5;text-align:left;padding:6px 8px;border-radius:var(--dsw-radius-sm,6px);cursor:pointer;white-space:nowrap}
.hr_menu_item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.14))}
.hr_menu_item:disabled{color:var(--dsw-alias-label-secondary);cursor:default}
.hr_menu_err{padding:4px 8px;font-size:11px;line-height:1.4;color:var(--dsw-alias-state-error-primary);max-width:220px;white-space:normal}
.hr_spin{animation:hr-spin 1s linear infinite;display:inline-block}
@keyframes hr-spin{to{transform:rotate(360deg)}}
.hr_overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.45);z-index:1200;pointer-events:auto}
.hr_panel{display:flex;flex-direction:column;width:100%;max-width:1180px;height:100%;max-height:100%;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-base);overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.hr_panel .hr_head{background:var(--dsw-alias-bg-layer-1)}
.hr_panel_body{position:relative;flex:1 1 auto;min-height:0;background:var(--dsw-alias-bg-base)}
.hr_tab{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box}
.hr_tab_head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.hr_tab_title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}
.hr_tab_count{font-size:11px;color:var(--dsw-alias-label-secondary);margin-left:auto;font-variant-numeric:tabular-nums}
.hr_tab_list{flex:0 0 auto;max-height:38%;overflow:auto;padding:6px;display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.hr_tab_empty{padding:18px 14px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.hr_row{display:flex;align-items:center;gap:8px;width:100%;padding:7px 8px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;font-size:12px;line-height:1.4}
.hr_row:hover{background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.12))}
.hr_row[data-active="true"]{background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.18))}
.hr_row_badge{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}
.hr_row_main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.hr_row_title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.hr_row_meta{font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.hr_row_actions{flex:0 0 auto;display:flex;align-items:center;gap:2px}
.hr_tab_preview{position:relative;flex:1 1 auto;min-height:200px;background:var(--dsw-alias-bg-base)}
.hr_tab_preview .hr_frame{height:100%}
.hr_tab_title_pill{display:inline-flex;align-items:center;gap:6px}
.hr_tab_title_count{font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
`;

    /* ---------------------------------------------------------------- utils */

    function isObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function clampHeight(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_HEIGHT;
      return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));
    }

    function byteLength(text) {
      try {
        return new TextEncoder().encode(text).length;
      } catch (_) {
        return text.length;
      }
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      const kb = bytes / 1024;
      if (kb < 1024) return (kb < 10 ? kb.toFixed(1) : Math.round(kb)) + ' KB';
      return (kb / 1024).toFixed(1) + ' MB';
    }

    function formatTime(at) {
      try {
        return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (_) {
        return '';
      }
    }

    function slugify(title) {
      const base = String(title || 'report')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
      return base || 'report';
    }

    function escapeXml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function readTokens() {
      const out = {};
      try {
        const style = window.getComputedStyle(document.documentElement);
        for (const name of TOKENS) {
          const value = style.getPropertyValue(name);
          if (value && value.trim()) out[name] = value.trim();
        }
      } catch (_) {
        /* no theme variables available */
      }
      return out;
    }

    function fallbackBackground(scheme) {
      return scheme === 'dark' ? '#16181d' : '#ffffff';
    }

    function preludeCss(scheme, tokens) {
      const vars = Object.keys(tokens)
        .map((name) => name + ':' + tokens[name] + ';')
        .join('');
      return (
        ':root{color-scheme:' +
        scheme +
        ';' +
        vars +
        '}html,body{margin:0;padding:0}' +
        'body{font:14px/1.6 ' +
        FONT_STACK +
        ';background:var(--dsw-alias-bg-base,' +
        fallbackBackground(scheme) +
        ');color:var(--dsw-alias-label-primary,' +
        (scheme === 'dark' ? '#e6e8eb' : '#1f2328') +
        ');-webkit-font-smoothing:antialiased}' +
        'img{max-width:100%}'
      );
    }

    function withPrelude(html, scheme, tokens) {
      const style = '<style data-dsh-html-report>' + preludeCss(scheme, tokens) + '</style>';
      if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + style);
      if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + '<head>' + style + '</head>');
      if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m) => style + m);
      if (/<!doctype[^>]*>/i.test(html)) return html.replace(/<!doctype[^>]*>/i, (m) => m + style);
      return style + html;
    }

    function download(blob, name) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    function downloadHtml(report) {
      const parts = report.html.charCodeAt(0) === 0xfeff ? [report.html] : ['\ufeff', report.html];
      download(new Blob(parts, { type: 'text/html;charset=utf-8' }), slugify(report.title) + '.html');
    }

    /* ------------------------------------------------------- tool call args */

    function rawArgs(phase, block) {
      if (!block) return null;
      if (phase === 'result') {
        if (block.call && typeof block.call.argsRaw === 'string') return block.call.argsRaw;
        return typeof block.argsRaw === 'string' ? block.argsRaw : null;
      }
      if (phase === 'start') return typeof block.argsRaw === 'string' ? block.argsRaw : null;
      return null;
    }

    function lazyText(block, key) {
      try {
        const args = block && block.args;
        if (!args || typeof args.text !== 'function') return '';
        if (typeof args.complete === 'function' && !args.complete(key)) return '';
        const value = args.text(key);
        return typeof value === 'string' ? value : '';
      } catch (_) {
        return '';
      }
    }

    function parseArgs(phase, block) {
      let args = null;
      const raw = rawArgs(phase, block);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (isObject(parsed)) args = parsed;
        } catch (_) {
          /* still streaming */
        }
      }
      const rawTitle =
        args && typeof args.title === 'string' && args.title.trim()
          ? args.title.trim()
          : lazyText(block, 'title').trim();
      const html = args && typeof args.html === 'string' ? args.html : '';
      const height = args && args.height !== undefined ? clampHeight(args.height) : DEFAULT_HEIGHT;
      const failed =
        phase === 'result' && !!(block && (block.isError || (block.call && block.call.isError)));
      return {
        pending: phase === 'preparing' || (!failed && !html),
        title: rawTitle,
        html,
        height,
        failed,
        ready: html.length > 0,
      };
    }

    /* --------------------------------------------------------------- stores */

    function createStore(initial) {
      let value = initial;
      const listeners = new Set();
      return {
        get() {
          return value;
        },
        set(next) {
          if (next === value) return;
          value = next;
          listeners.forEach((listener) => listener());
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    }

    function createReportStore() {
      const items = new Map();
      let snapshot = [];
      let seq = 0;
      const listeners = new Set();
      const publish = () => {
        snapshot = Array.from(items.values()).sort((a, b) => b.seq - a.seq);
        listeners.forEach((listener) => listener());
      };
      return {
        add(entry) {
          if (!entry || !entry.callId || !entry.html) return;
          const previous = items.get(entry.callId);
          if (previous && previous.html === entry.html && previous.title === entry.title) {
            if (entry.sessionId && !previous.sessionId) {
              previous.sessionId = entry.sessionId;
            }
            return;
          }
          items.set(entry.callId, {
            callId: entry.callId,
            title: entry.title,
            html: entry.html,
            height: entry.height,
            sessionId: entry.sessionId || (previous && previous.sessionId) || undefined,
            at: previous ? previous.at : Date.now(),
            seq: previous ? previous.seq : ++seq,
          });
          publish();
        },
        get() {
          return snapshot;
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    }

    const runtime = {
      ctx: null,
      translate: (key) => key,
      reports: createReportStore(),
      overlay: createStore(null),
      theme: null,
      sidebarRight: null,
      layout: null,
      tabOpen: false,
    };

    function themeSubscribe(listener) {
      return runtime.theme ? runtime.theme.subscribe(listener) : () => {};
    }

    function themeSnapshot() {
      return runtime.theme ? runtime.theme.get() : { scheme: 'light', revision: 0 };
    }

    function currentTheme() {
      const snapshot = themeSnapshot();
      return { scheme: snapshot.scheme, tokens: runtime.theme ? runtime.theme.tokens() : readTokens() };
    }

    function createThemeStore(ctx) {
      let snapshot = { scheme: 'light', revision: 0 };
      let cache = { revision: -1, tokens: {} };
      const listeners = new Set();
      const themeService = () => {
        try {
          return ctx.get('theme');
        } catch (_) {
          return undefined;
        }
      };
      const read = () => {
        try {
          const service = themeService();
          const theme = service && service.getTheme();
          const scheme = theme && theme.active && theme.active.colorScheme === 'dark' ? 'dark' : 'light';
          const revision = theme && typeof theme.revision === 'number' ? theme.revision : 0;
          return { scheme, revision };
        } catch (_) {
          return { scheme: 'light', revision: 0 };
        }
      };
      const refresh = () => {
        snapshot = read();
        listeners.forEach((listener) => listener());
      };
      snapshot = read();
      try {
        ctx.on('theme/change', refresh);
      } catch (_) {
        /* theme events unavailable */
      }
      return {
        get() {
          return snapshot;
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        tokens() {
          if (cache.revision !== snapshot.revision) {
            cache = { revision: snapshot.revision, tokens: readTokens() };
          }
          return cache.tokens;
        },
      };
    }

    /* ---------------------------------------------------------------- hooks */

    const localeSubscribe = (listener) => (runtime.ctx ? runtime.ctx.locale.subscribe(listener) : () => {});
    const localeSnapshot = () => (runtime.ctx ? runtime.ctx.locale.getSnapshot() : null);

    function useTranslate() {
      useSyncExternalStore(localeSubscribe, localeSnapshot);
      return runtime.translate;
    }

    function useTheme() {
      return useSyncExternalStore(themeSubscribe, themeSnapshot);
    }

    function useReports() {
      return useSyncExternalStore(
        (listener) => runtime.reports.subscribe(listener),
        () => runtime.reports.get(),
      );
    }

    function useOverlay() {
      return useSyncExternalStore(
        (listener) => runtime.overlay.subscribe(listener),
        () => runtime.overlay.get(),
      );
    }

    /**
     * Which Session a sidebar report tab belongs to. The slot hands every occupant the
     * Session identity; the navigation parameters recorded when we minted the tab are the
     * fallback for a tab restored from a saved layout.
     */
    function tabSessionId(props) {
      if (props && typeof props.sessionId === 'string' && props.sessionId) return props.sessionId;
      if (props && typeof props.useTabInfo === 'function') {
        try {
          const info = props.useTabInfo();
          const tab = info && info.tab;
          if (tab && tab.params && typeof tab.params.sessionId === 'string' && tab.params.sessionId) {
            return tab.params.sessionId;
          }
          const navigation = tab && tab.navigation;
          const snapshot = navigation && typeof navigation.getSnapshot === 'function' ? navigation.getSnapshot() : null;
          const params = snapshot && snapshot.params;
          if (params && typeof params.sessionId === 'string' && params.sessionId) return params.sessionId;
        } catch (_) {
          /* the tab may not be committed yet; the caller treats it as unscoped */
        }
      }
      return '';
    }

    /** Reports of one Session, newest first; unscoped when the Session identity is unknown. */
    function useSessionReports(sessionId) {
      const reports = useReports();
      return useMemo(() => {
        if (!sessionId) return reports;
        return reports.filter((report) => report.sessionId === sessionId);
      }, [reports, sessionId]);
    }

    /* ----------------------------------------------------------------- icons */

    function svg(paths, size) {
      return h(
        'svg',
        {
          width: size || 16,
          height: size || 16,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        paths.map((d, index) => h('path', { key: index, d })),
      );
    }

    const DocIcon = () => svg(['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h4']);
    const ExpandIcon = () => svg(['M9 3H4v5', 'M15 3h5v5', 'M15 21h5v-5', 'M9 21H4v-5']);
    const ListIcon = () => svg(['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6h.01', 'M3.5 12h.01', 'M3.5 18h.01']);
    const CloseIcon = () => svg(['M6 6l12 12', 'M18 6L6 18']);
    const SpinnerIcon = () => svg(['M12 3a9 9 0 1 1-9 9'], 14);

    function IconButton({ label, onClick, children, disabled }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'hr_btn',
          title: label,
          'aria-label': label,
          onClick,
          disabled: !!disabled,
        },
        children,
      );
    }

    /* ---------------------------------------------------------------- export */

    function loadImage(url) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('render failed'));
        image.src = url;
      });
    }

    function measureHeight(srcdoc, width, mount) {
      return new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-same-origin');
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('tabindex', '-1');
        frame.style.cssText =
          'position:absolute;left:0;top:0;width:' +
          width +
          'px;height:1200px;border:0;visibility:hidden;pointer-events:none';
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try {
            frame.remove();
          } catch (_) {
            /* ignore */
          }
          resolve(value);
        };
        const timer = setTimeout(() => finish(900), 8000);
        frame.addEventListener('load', () => {
          setTimeout(() => {
            try {
              const doc = frame.contentDocument;
              if (!doc) return finish(900);
              const height = Math.max(
                doc.documentElement ? doc.documentElement.scrollHeight : 0,
                doc.body ? doc.body.scrollHeight : 0,
                1,
              );
              finish(Math.min(Math.max(Math.ceil(height), MIN_HEIGHT), MAX_CANVAS_DIM));
            } catch (_) {
              finish(900);
            }
          }, 80);
        });
        try {
          (mount || document.body).appendChild(frame);
        } catch (_) {
          /* ignore */
        }
        frame.srcdoc = srcdoc;
      });
    }

    function buildSvgMarkup(html, scheme, tokens, width, height) {
      const parsed = new DOMParser().parseFromString(withPrelude(html, scheme, tokens), 'text/html');
      parsed.querySelectorAll('script, link, iframe, object, embed, video, audio, noscript').forEach((node) => {
        node.remove();
      });
      const styles = [];
      parsed.querySelectorAll('style').forEach((node) => {
        styles.push(node.textContent || '');
        node.remove();
      });
      const body = parsed.body;
      const serializer = new XMLSerializer();
      const inner = body ? serializer.serializeToString(body) : '';
      const vars = Object.keys(tokens)
        .map((name) => name + ':' + tokens[name] + ';')
        .join('');
      const css =
        '.dsh-export{box-sizing:border-box;width:' +
        width +
        'px;margin:0;padding:0;' +
        vars +
        'background:var(--dsw-alias-bg-base,' +
        fallbackBackground(scheme) +
        ');color:var(--dsw-alias-label-primary,' +
        (scheme === 'dark' ? '#e6e8eb' : '#1f2328') +
        ');font:14px/1.6 ' +
        FONT_STACK +
        ';}' +
        '.dsh-export *{box-sizing:border-box}' +
        styles.join('\n');
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        width +
        '" height="' +
        height +
        '" viewBox="0 0 ' +
        width +
        ' ' +
        height +
        '">' +
        '<foreignObject x="0" y="0" width="' +
        width +
        '" height="' +
        height +
        '">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" class="dsh-export">' +
        '<style>' +
        escapeXml(css) +
        '</style>' +
        inner +
        '</div>' +
        '</foreignObject>' +
        '</svg>'
      );
    }

    async function rasterize(html, scheme, tokens, mount) {
      const srcdoc = withPrelude(html, scheme, tokens);
      const height = await measureHeight(srcdoc, EXPORT_WIDTH, mount);
      const markup = buildSvgMarkup(html, scheme, tokens, EXPORT_WIDTH, height);
      const image = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup));
      let scale = 2;
      while (
        scale > 0.75 &&
        (height * scale > MAX_CANVAS_DIM || EXPORT_WIDTH * scale * height * scale > MAX_CANVAS_AREA)
      ) {
        scale -= 0.25;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(EXPORT_WIDTH * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas unavailable');
      context.fillStyle = tokens['--dsw-alias-bg-base'] || fallbackBackground(scheme);
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, EXPORT_WIDTH, height);
      return { canvas, background: tokens['--dsw-alias-bg-base'] || fallbackBackground(scheme) };
    }

    function canvasToBlob(canvas, type, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))),
          type,
          quality,
        );
      });
    }

    function pdfNumber(value) {
      return (Math.round(value * 100) / 100).toString();
    }

    function assemblePdf(pages) {
      const encoder = new TextEncoder();
      const parts = [];
      let size = 0;
      const offsets = [];
      const push = (chunk) => {
        const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
        parts.push(bytes);
        size += bytes.length;
      };
      const addObject = (number, dict, stream) => {
        offsets[number] = size;
        push(number + ' 0 obj\n' + dict + '\n');
        if (stream) {
          push('stream\n');
          push(stream);
          push('\nendstream\n');
        }
        push('endobj\n');
      };
      const pagesCount = pages.length;
      const pageObject = (index) => 3 + index * 3;
      push('%PDF-1.4\n');
      addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
      addObject(
        2,
        '<< /Type /Pages /Count ' +
          pagesCount +
          ' /Kids [' +
          pages.map((_, index) => pageObject(index) + ' 0 R').join(' ') +
          '] >>',
      );
      pages.forEach((page, index) => {
        const base = pageObject(index);
        const pageHeight = A4_WIDTH_PT * (page.h / page.w);
        const content = encoder.encode(
          'q ' + pdfNumber(A4_WIDTH_PT) + ' 0 0 ' + pdfNumber(pageHeight) + ' 0 0 cm /Im0 Do Q',
        );
        addObject(
          base,
          '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
            pdfNumber(A4_WIDTH_PT) +
            ' ' +
            pdfNumber(pageHeight) +
            '] /Resources << /XObject << /Im0 ' +
            (base + 1) +
            ' 0 R >> >> /Contents ' +
            (base + 2) +
            ' 0 R >>',
        );
        addObject(
          base + 1,
          '<< /Type /XObject /Subtype /Image /Width ' +
            page.w +
            ' /Height ' +
            page.h +
            ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
            page.bytes.length +
            ' >>',
          page.bytes,
        );
        addObject(base + 2, '<< /Length ' + content.length + ' >>', content);
      });
      const total = 3 + pagesCount * 3;
      const xrefOffset = size;
      let table = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
      for (let index = 1; index < total; index += 1) {
        table += String(offsets[index] || 0).padStart(10, '0') + ' 00000 n \n';
      }
      push(table);
      push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n');
      return new Blob(parts, { type: 'application/pdf' });
    }

    async function buildPdf(canvas, background) {
      const scale = A4_WIDTH_PT / canvas.width;
      const sliceHeight = Math.max(1, Math.floor((A4_HEIGHT_PT - 16) / scale));
      const pages = [];
      for (let offset = 0; offset < canvas.height; offset += sliceHeight) {
        const height = Math.min(sliceHeight, canvas.height - offset);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = height;
        const context = slice.getContext('2d');
        if (!context) throw new Error('canvas unavailable');
        context.fillStyle = background;
        context.fillRect(0, 0, slice.width, slice.height);
        context.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
        const blob = await canvasToBlob(slice, 'image/jpeg', 0.92);
        pages.push({
          bytes: new Uint8Array(await blob.arrayBuffer()),
          w: slice.width,
          h: slice.height,
        });
      }
      return assemblePdf(pages);
    }

    async function exportReport(report, kind, mount) {
      if (kind === 'html') {
        downloadHtml(report);
        return;
      }
      const theme = currentTheme();
      const raster = await rasterize(report.html, theme.scheme, theme.tokens, mount);
      const base = slugify(report.title);
      if (kind === 'png') {
        const blob = await canvasToBlob(raster.canvas, 'image/png');
        download(blob, base + '.png');
        return;
      }
      const blob = await buildPdf(raster.canvas, raster.background);
      download(blob, base + '.pdf');
    }

    /* ------------------------------------------------------------ components */

    function ExportMenu({ report, mountRef, t }) {
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const root = useRef(null);
      useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          if (root.current && !root.current.contains(event.target)) setOpen(false);
        };
        const close = () => setOpen(false);
        window.addEventListener('mousedown', onPointerDown, true);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
          window.removeEventListener('mousedown', onPointerDown, true);
          window.removeEventListener('scroll', close, true);
          window.removeEventListener('resize', close);
        };
      }, [open]);
      const toggle = () => {
        if (open) {
          setOpen(false);
          return;
        }
        const node = root.current;
        if (node) {
          const rect = node.getBoundingClientRect();
          setPos({
            top: Math.round(rect.bottom + 6),
            right: Math.max(8, Math.round(window.innerWidth - rect.right)),
          });
        }
        setOpen(true);
      };
      const run = useCallback(
        async (kind) => {
          if (busy || !report) return;
          setBusy(true);
          setError('');
          try {
            await exportReport(report, kind, mountRef && mountRef.current ? mountRef.current : document.body);
            setOpen(false);
          } catch (failure) {
            setError(failure && failure.message ? failure.message : String(failure));
          } finally {
            setBusy(false);
          }
        },
        [busy, report, mountRef],
      );
      return h(
        'div',
        { className: 'hr_menu_root', ref: root },
        h(
          'button',
          {
            type: 'button',
            className: 'hr_btn',
            title: t('report.export'),
            'aria-label': t('report.export'),
            'aria-expanded': open ? 'true' : 'false',
            onClick: toggle,
            disabled: !report || busy,
          },
          busy ? h('span', { className: 'hr_spin' }, h(SpinnerIcon)) : svg(['M12 4v11', 'M7.5 10.5L12 15l4.5-4.5', 'M5 19h14']),
        ),
        open
          ? h(
              'div',
              {
                className: 'hr_menu',
                role: 'menu',
                style: pos ? { position: 'fixed', top: pos.top + 'px', right: pos.right + 'px' } : undefined,
              },
              h(
                'button',
                { type: 'button', className: 'hr_menu_item', role: 'menuitem', disabled: busy, onClick: () => run('html') },
                t('report.download'),
              ),
              h(
                'button',
                { type: 'button', className: 'hr_menu_item', role: 'menuitem', disabled: busy, onClick: () => run('png') },
                t('report.png'),
              ),
              h(
                'button',
                { type: 'button', className: 'hr_menu_item', role: 'menuitem', disabled: busy, onClick: () => run('pdf') },
                t('report.pdf'),
              ),
              busy ? h('div', { className: 'hr_menu_err' }, t('report.exporting')) : null,
              error ? h('div', { className: 'hr_menu_err', role: 'alert' }, t('report.exportFailed', { message: error })) : null,
            )
          : null,
      );
    }

    function openReportsTab(sessionId) {
      const ctx = runtime.ctx;
      if (!ctx) return;
      const scoped = typeof sessionId === 'string' && sessionId ? sessionId : undefined;
      try {
        if (runtime.sidebarRight && typeof runtime.sidebarRight.openTab === 'function') {
          runtime.sidebarRight.openTab(TAB_KIND, scoped ? { params: { sessionId: scoped } } : undefined);
          return;
        }
      } catch (error) {
        console.warn('[html-reports] openTab failed', error);
      }
      try {
        const layout = runtime.layout;
        if (layout && typeof layout.openRightbar === 'function') layout.openRightbar(true, false);
      } catch (error) {
        console.warn('[html-reports] openRightbar failed', error);
      }
    }

    function ReportFrame({ html, theme }) {
      const srcDoc = useMemo(() => withPrelude(html, theme.scheme, currentTheme().tokens), [html, theme]);
      return h('iframe', {
        className: 'hr_frame',
        sandbox: 'allow-scripts',
        srcDoc,
        title: 'HTML report',
        loading: 'lazy',
      });
    }

    function ReportCard(props) {
      const t = useTranslate();
      const theme = useTheme();
      const phase = props.phase;
      const block = props.block;
      const parsed = useMemo(() => parseArgs(phase, block), [phase, block]);
      const measure = useRef(null);
      const report = parsed.ready
        ? { callId: props.callId, title: parsed.title, html: parsed.html, height: parsed.height }
        : null;
      useEffect(() => {
        if (!report) return;
        runtime.reports.add({
          callId: report.callId,
          title: report.title,
          html: report.html,
          height: report.height,
          sessionId: typeof props.sessionId === 'string' ? props.sessionId : undefined,
        });
      }, [report && report.callId, report && report.html, props.sessionId]);
      const title = parsed.title || t('report.untitled');
      return h(
        'div',
        { className: 'hr_card' },
        h(
          'div',
          { className: 'hr_head' },
          h('span', { className: 'hr_badge' }, h(DocIcon)),
          h('span', { className: 'hr_title', title }, title),
          parsed.ready
            ? h('span', { className: 'hr_meta' }, formatSize(byteLength(parsed.html)))
            : null,
          h(
            'div',
            { className: 'hr_actions' },
            h(IconButton, { label: t('report.openList'), onClick: () => openReportsTab(props.sessionId) }, h(ListIcon)),
            parsed.ready
              ? h(ExportMenu, { report: { title, html: parsed.html }, mountRef: measure, t })
              : null,
            h(
              IconButton,
              {
                label: t('report.expand'),
                disabled: !parsed.ready,
                onClick: () =>
                  runtime.overlay.set({
                    callId: props.callId,
                    title,
                    html: parsed.html,
                    height: parsed.height,
                  }),
              },
              h(ExpandIcon),
            ),
          ),
        ),
        h(
          'div',
          { className: 'hr_body', style: { height: (parsed.ready ? parsed.height : 96) + 'px' } },
          parsed.failed
            ? h('div', { className: 'hr_note' }, t('report.failed'))
            : parsed.ready
              ? h(ReportFrame, { html: parsed.html, theme })
              : h('span', { className: 'hr_skeleton' }),
        ),
        h('div', { className: 'hr_measure', ref: measure }),
      );
    }

    function ReportOverlay() {
      const t = useTranslate();
      const theme = useTheme();
      const current = useOverlay();
      const measure = useRef(null);
      useEffect(() => {
        if (!current) return undefined;
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            runtime.overlay.set(null);
          }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
      }, [current]);
      if (!current) return null;
      return h(
        'div',
        {
          className: 'hr_overlay',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': current.title,
          onMouseDown: () => runtime.overlay.set(null),
        },
        h(
          'div',
          { className: 'hr_panel', onMouseDown: (event) => event.stopPropagation() },
          h(
            'div',
            { className: 'hr_head' },
            h('span', { className: 'hr_badge' }, h(DocIcon)),
            h('span', { className: 'hr_title' }, current.title || t('report.untitled')),
            h('span', { className: 'hr_meta' }, formatSize(byteLength(current.html || ''))),
            h(
              'div',
              { className: 'hr_actions' },
              h(ExportMenu, {
                report: { title: current.title, html: current.html },
                mountRef: measure,
                t,
              }),
              h(IconButton, { label: t('report.close'), onClick: () => runtime.overlay.set(null) }, h(CloseIcon)),
            ),
          ),
          h(
            'div',
            { className: 'hr_panel_body' },
            h(ReportFrame, { html: current.html, theme }),
          ),
          h('div', { className: 'hr_measure', ref: measure }),
        ),
      );
    }

    function ReportListBody(props) {
      const t = useTranslate();
      const theme = useTheme();
      const sessionId = tabSessionId(props);
      const visible = useSessionReports(sessionId);
      const [selectedId, setSelectedId] = useState(null);
      const selected = useMemo(() => {
        const match = visible.find((report) => report.callId === selectedId);
        return match || visible[0] || null;
      }, [visible, selectedId]);
      return h(
        'div',
        { className: 'hr_tab' },
        h(
          'div',
          { className: 'hr_tab_head' },
          h('span', { className: 'hr_tab_title' }, t('report.tab')),
          h('span', { className: 'hr_tab_count' }, t('report.count', { count: String(visible.length) })),
        ),
        visible.length === 0
          ? h('div', { className: 'hr_tab_empty' }, t('report.emptyList'))
          : h(
              'div',
              { className: 'hr_tab_list' },
              visible.map((report) =>
                h(
                  'div',
                  {
                    key: report.callId,
                    className: 'hr_row',
                    'data-active': selected && selected.callId === report.callId ? 'true' : 'false',
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => setSelectedId(report.callId),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(report.callId);
                      }
                    },
                  },
                  h('span', { className: 'hr_row_badge' }, h(DocIcon)),
                  h(
                    'span',
                    { className: 'hr_row_main' },
                    h('span', { className: 'hr_row_title', title: report.title }, report.title || t('report.untitled')),
                    h(
                      'span',
                      { className: 'hr_row_meta' },
                      formatSize(byteLength(report.html)) + ' · ' + formatTime(report.at),
                    ),
                  ),
                  h(
                    'span',
                    { className: 'hr_row_actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hr_btn',
                        title: t('report.expand'),
                        'aria-label': t('report.expand'),
                        onClick: (event) => {
                          event.stopPropagation();
                          runtime.overlay.set(report);
                        },
                      },
                      h(ExpandIcon),
                    ),
                  ),
                ),
              ),
            ),
        visible.length === 0
          ? null
          : h(
              'div',
              { className: 'hr_tab_preview' },
              selected ? h(ReportFrame, { html: selected.html, theme }) : null,
            ),
      );
    }

    function ReportTabTitle(props) {
      const t = useTranslate();
      const sessionId = tabSessionId(props);
      const reports = useSessionReports(sessionId);
      return h(
        'span',
        { className: 'hr_tab_title_pill' },
        h('span', null, t('report.tab')),
        reports.length > 0 ? h('span', { className: 'hr_tab_title_count' }, String(reports.length)) : null,
      );
    }

    function HeaderButton(props) {
      const t = useTranslate();
      return h(
        'button',
        {
          type: 'button',
          className: 'hr_btn',
          title: t('report.openList'),
          'aria-label': t('report.openList'),
          onClick: () => openReportsTab(props && props.sessionId),
        },
        h(ListIcon),
      );
    }

    /* ------------------------------------------------------------ registration */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const steps = [];
        const attempt = (name, run) => {
          try {
            const value = run();
            steps.push(name + ' ok');
            return value;
          } catch (error) {
            steps.push(name + ' ! ' + ((error && error.message) || String(error)));
            try {
              console.warn('[html-reports] ' + name + ' failed', error);
            } catch (_) {
              /* ignore */
            }
            return () => {};
          }
        };
        const service = (name) => {
          try {
            return ctx.get(name);
          } catch (_) {
            return undefined;
          }
        };
        runtime.ctx = ctx;
        runtime.sidebarRight = service('sidebarRight');
        runtime.layout = service('layout');
        let translate = (key) => key;
        try {
          const bound = ctx.locale.bind(NS);
          if (typeof bound === 'function') translate = bound;
        } catch (error) {
          console.warn('[html-reports] locale binding failed', error);
        }
        runtime.translate = translate;
        runtime.theme = createThemeStore(ctx);
        const t = (key, params) => {
          try {
            const value = translate(key, params);
            return typeof value === 'string' ? value : key;
          } catch (_) {
            return key;
          }
        };

        attempt('locale', () => ctx.effect(() => ctx.locale.register(NS, DICT)));

        attempt('style', () =>
          ctx.effect(() => {
            const style = document.createElement('style');
            style.setAttribute('data-plugin', 'html-reports');
            style.id = STYLE_ID;
            style.textContent = CSS;
            document.head.appendChild(style);
            return () => {
              try {
                style.remove();
              } catch (_) {
                /* ignore */
              }
            };
          }),
        );

        attempt('toolview', () =>
          ctx.effect(() =>
            ctx.slots.inject('tool.call.toolview', () =>
              ctx.slots.register({ name: 'tool.call.toolview', key: TOOL_NAME }, ReportCard),
            ),
          ),
        );

        attempt('overlay', () =>
          ctx.effect(() =>
            ctx.slots.inject('shell.overlay', () =>
              ctx.slots.register({ name: 'shell.overlay', id: OVERLAY_ID, order: 60 }, ReportOverlay),
            ),
          ),
        );

        attempt('header', () =>
          ctx.effect(() =>
            ctx.slots.inject('conversation.session.header.utilities', () =>
              ctx.slots.register(
                {
                  name: 'conversation.session.header.utilities',
                  id: HEADER_ID,
                  order: 40,
                  label: () => translate('report.list'),
                },
                HeaderButton,
              ),
            ),
          ),
        );

        attempt('tabType', () =>
          ctx.effect(() => {
            const tabs = service('sidebarRightTabs');
            if (!tabs || typeof tabs.register !== 'function') return () => {};
            return tabs.register({
              id: TAB_ID,
              kind: TAB_KIND,
              title: () => translate('report.tab'),
              keepMounted: true,
            });
          }),
        );

        attempt('tabBody', () =>
          ctx.effect(() =>
            ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS }, ReportListBody),
            ),
          ),
        );

        attempt('tabTitle', () =>
          ctx.effect(() =>
            ctx.slots.inject('sidebar.right.pane.tab.title', () =>
              ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID }, ReportTabTitle),
            ),
          ),
        );
      },
    };
  },
});