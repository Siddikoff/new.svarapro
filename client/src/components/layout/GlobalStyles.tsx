/**
 * Global keyframes and form-input resets used across the app.
 *
 * Kept as a `<style>` block (rather than a CSS module) because the original
 * markup expects these names to exist on the document at all times — e.g.
 * `online-dot` and `svaraSpin` are referenced from many inline-styled places.
 */
const GLOBAL_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
input, select, textarea { font-size: 16px !important; caret-color: var(--text); }
input.svr-search { font-size: 13px !important; font-weight: 500; }
button { transition: opacity .15s, transform .1s; }
button:active { opacity: .75; transform: scale(0.96); }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }
.online-dot { animation: pulse 1.8s ease-in-out infinite; }
@keyframes svrFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes svrSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes svaraSpin { to { transform: rotate(360deg); } }
@keyframes svrPop { 0% { transform: scale(0); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
@keyframes svrCheckDraw { from { stroke-dashoffset: 26; } to { stroke-dashoffset: 0; } }
`;

export function GlobalStyles() {
  return <style>{GLOBAL_CSS}</style>;
}
