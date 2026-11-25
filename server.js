// Serves index.html and relays room messages between players over WebSocket.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8765;
const ROOT = __dirname;
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/room-shim.js': 'room-shim.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const MAX_PER_ROOM = 8;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/healthz') { res.writeHead(200); res.end('ok'); return; }
  const f = FILES[url];
  if (!f) { res.writeHead(404); res.end('not found'); return; }
  fs.readFile(path.join(ROOT, f), (err, buf) => {
    if (err) { res.writeHead(500); res.end('error'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)], 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});

const rooms = new Map(); // name -> Set<ws>
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });

wss.on('connection', (ws) => {
  ws.room = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.op === 'join' && typeof m.room === 'string' && m.room.length <= 40 && !ws.room) {
      const set = rooms.get(m.room) || new Set();
      if (set.size >= MAX_PER_ROOM) { ws.send(JSON.stringify({ op: 'error', msg: 'room full' })); return; }
      set.add(ws); rooms.set(m.room, set); ws.room = m.room;
      ws.send(JSON.stringify({ op: 'joined' }));
    } else if (m.op === 'msg' && ws.room) {
      const out = JSON.stringify({ op: 'msg', ev: m.ev, d: m.d });
      for (const o of rooms.get(ws.room) || []) if (o !== ws && o.readyState === 1) o.send(out);
    } else if (m.op === 'leave') {
      drop(ws);
    }
  });
  ws.on('close', () => drop(ws));
  ws.on('error', () => drop(ws));
});

function drop(ws) {
  if (!ws.room) return;
  const set = rooms.get(ws.room);
  if (set) { set.delete(ws); if (!set.size) rooms.delete(ws.room); }
  ws.room = null;
}

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, 20000);

server.listen(PORT, '0.0.0.0', () => console.log('Emberdeep listening on :' + PORT));
