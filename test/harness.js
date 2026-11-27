// Loads the game script from index.html into a sandbox with a stubbed browser.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function fakeContext() {
  const grad = { addColorStop() {} };
  const target = {};
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function loadGame(storage = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  let src = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
  const end = src.lastIndexOf('})();');
  src = src.slice(0, end) + 'globalThis.__eval=s=>eval(s);\n' + src.slice(end);
  const ctx = fakeContext();
  const canvas = {
    getContext: () => ctx, addEventListener() {}, setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 450 }),
  };
  const box = {
    console, Math, Date, JSON, URLSearchParams,
    document: { getElementById: () => canvas, addEventListener() {} },
    localStorage: {
      getItem: k => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
    },
    navigator: {}, location: { search: '', protocol: 'http:', host: 'test' },
    addEventListener() {}, dispatchEvent() {}, KeyboardEvent: function () {},
    requestAnimationFrame() {}, setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; },
  };
  box.window = box;
  vm.createContext(box);
  vm.runInContext(src, box, { filename: 'index.html' });
  return { run: code => box.__eval(code), box };
}

module.exports = { loadGame };
