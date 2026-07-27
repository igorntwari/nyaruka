// In-memory USSD session state, keyed by Africa's Talking's sessionId.
// Resets on server restart — acceptable for a demo; a production build would
// back this with Redis so sessions survive restarts and scale across processes.
const sessions = new Map();

function get(sessionId) {
  return sessions.get(sessionId);
}

function set(sessionId, state) {
  sessions.set(sessionId, state);
}

function clear(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { get, set, clear };
