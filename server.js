const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const WINNER_TYPES = ['linha', 'coluna', 'cartela cheia'];
const emptyWinners = () => ({ linha: null, coluna: null, 'cartela cheia': null });

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 100_000) req.destroy(new Error('Payload muito grande.'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function newCode() {
  let code;
  do { code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function localAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address).sort((a, b) => {
    const rank = ip => ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2;
    return rank(a) - rank(b);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && url.pathname === '/api/network') return json(res, 200, { addresses: localAddresses(), port: PORT });
    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const body = await readBody(req);
      const code = newCode();
      const room = { code, host: String(body.name || 'Anfitrião').slice(0, 20), words: [], drawn: [], winners: emptyWinners(), players: [String(body.name || 'Anfitrião').slice(0, 20)] };
      rooms.set(code, room);
      return json(res, 201, room);
    }
    if (parts[0] === 'api' && parts[1] === 'rooms' && parts[2]) {
      const code = parts[2].toUpperCase();
      const room = rooms.get(code);
      if (!room) return json(res, 404, { error: 'Sala não encontrada.' });
      if (req.method === 'GET' && parts.length === 3) return json(res, 200, room);
      if (req.method === 'POST' && parts[3] === 'join') {
        const body = await readBody(req);
        const name = String(body.name || 'Jogador').trim().slice(0, 20) || 'Jogador';
        if (!room.players.includes(name)) room.players.push(name);
        return json(res, 200, room);
      }
      if (req.method === 'POST' && parts[3] === 'claim') {
        const body = await readBody(req);
        const name = String(body.name || '').trim().slice(0, 20);
        const type = String(body.type || '');
        const nextType = WINNER_TYPES.find(item => !room.winners[item]);
        if (!name || !room.players.includes(name)) return json(res, 403, { error: 'Entre na sala antes de anunciar bingo.', room });
        if (!WINNER_TYPES.includes(type)) return json(res, 400, { error: 'Tipo de bingo inválido.', room });
        if (room.winners[type]) return json(res, 409, { error: `O bingo ${type} já tem vencedor: ${room.winners[type]}.`, room });
        if (type !== nextType) return json(res, 409, { error: `A próxima etapa é bingo ${nextType || 'encerrado'}.`, room });
        room.winners[type] = name;
        return json(res, 200, room);
      }
      if (req.method === 'PATCH' && parts.length === 3) {
        const body = await readBody(req);
        if (Array.isArray(body.words)) room.words = body.words.map(word => String(word).slice(0, 80)).slice(0, 300);
        if (Array.isArray(body.drawn)) room.drawn = body.drawn.map(String);
        if (body.resetRound === true) { room.drawn = []; room.winners = emptyWinners(); }
        return json(res, 200, room);
      }
      return json(res, 405, { error: 'Método não permitido.' });
    }

    const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(ROOT, `.${requestPath}`);
    if (!file.startsWith(`${ROOT}${path.sep}`)) return json(res, 403, { error: 'Acesso negado.' });
    fs.readFile(file, (error, contents) => {
      if (error) return json(res, 404, { error: 'Arquivo não encontrado.' });
      const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(contents);
    });
  } catch (error) {
    json(res, 400, { error: error.message || 'Requisição inválida.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = localAddresses();
  console.log(`Bingo das Palavras pronto na porta ${PORT}.`);
  if (addresses.length) console.log(`Acesso na rede local: ${addresses.map(address => `http://${address}:${PORT}`).join(' | ')}`);
  else console.log('Conecte este aparelho ao Wi-Fi local para gerar o QR da sala.');
});
