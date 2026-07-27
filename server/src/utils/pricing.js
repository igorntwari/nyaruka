// Mirrors the estimate used by the original frontend-only mock (lib/store.tsx)
// so switching to the real backend doesn't change quoted prices.
function estimateCost(weight) {
  const base = 400;
  const kg = parseFloat(weight) || 1;
  return Math.round(base + kg * 250);
}

const RIDER_SHARE = 0.8;

function riderPayout(cost) {
  return Math.round(cost * RIDER_SHARE);
}

module.exports = { estimateCost, riderPayout };
