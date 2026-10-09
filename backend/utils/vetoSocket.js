const { protectSocket } = require('../middlewares/authMiddleware');
const { context, touchPresence, removePresence } = require('../controllers/vetoController');
async function authorize(socket, tournamentId, matchId) {
  await new Promise((resolve, reject) => protectSocket(socket, error => error ? reject(error) : resolve()));
  const User = require('../models/User');
  const user = await User.findById(socket.data.userId).select('role banned isBanned');
  if (!user || user.banned || user.isBanned) throw new Error('Not authorized');
  return context(tournamentId, matchId, { userId: String(user._id), role: user.role });
}
function attach(socket) {
  socket.on('disconnect', () => {
    const room = socket.data.veto;
    if (!room) return;
    const another = [...socket.nsp.sockets.values()].some(other => other.id !== socket.id && other.connected && other.data.userId === socket.data.userId && other.data.veto?.tournamentId === room.tournamentId && other.data.veto?.matchId === room.matchId);
    if (!another) removePresence(room.tournamentId, room.matchId, socket.data.userId);
  });
  socket.on('veto:subscribe', async (payload, callback) => {
    const ack = typeof callback === 'function' ? callback : () => {};
    try {
      const { tournamentId, matchId } = payload || {};
      if (typeof tournamentId !== 'string' || typeof matchId !== 'string' || matchId.length > 100) throw new Error('Invalid room');
      await authorize(socket, tournamentId, matchId);
      socket.data.veto = { tournamentId, matchId };
      touchPresence(tournamentId, matchId, socket.data.userId);
      ack({ ok: true });
    } catch { socket.data.veto = null; ack({ ok: false, message: 'Room access denied' }); }
  });
}
async function notify(io, tournamentId, matchId) {
  for (const socket of await io.fetchSockets()) {
    const room = socket.data.veto;
    if (room?.tournamentId !== tournamentId || room.matchId !== matchId) continue;
    try {
      await authorize(socket, tournamentId, matchId);
      socket.emit('veto:updated', { tournamentId, matchId });
    } catch { socket.data.veto = null; socket.emit('veto:revoked'); }
  }
}
module.exports = { attach, notify };
