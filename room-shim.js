// Provides the `claude.use('room')` API that the game expects, backed by our WebSocket relay.
(function () {
  if (typeof window.claude !== 'undefined' && window.claude && typeof window.claude.use === 'function') return;
  function join(name) {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(proto + '//' + location.host + '/ws');
      const handlers = {};
      const rm = {
        on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
        emit(ev, d) { if (ws.readyState === 1) ws.send(JSON.stringify({ op: 'msg', ev, d })); },
        leave() { try { ws.send(JSON.stringify({ op: 'leave' })); } catch (e) {} try { ws.close(); } catch (e) {} },
      };
      let done = false;
      ws.onopen = () => ws.send(JSON.stringify({ op: 'join', room: name }));
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (_) { return; }
        if (m.op === 'joined' && !done) { done = true; resolve(rm); }
        else if (m.op === 'error' && !done) { done = true; reject(new Error(m.msg)); }
        else if (m.op === 'msg') (handlers[m.ev] || []).forEach((fn) => fn(m.d));
      };
      ws.onerror = () => { if (!done) { done = true; reject(new Error('could not reach server')); } };
      ws.onclose = () => { if (!done) { done = true; reject(new Error('connection closed')); } };
    });
  }
  window.claude = { use: async (feature) => (feature === 'room' ? { join } : null) };
})();
