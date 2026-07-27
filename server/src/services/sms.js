// Thin wrapper around the Africa's Talking SMS API. Safe to call even before
// AT_API_KEY is configured — it just logs instead of sending, so the rest of
// the app never depends on a live account being set up.
let sms = null;

if (process.env.AT_API_KEY) {
  const AfricasTalking = require('africastalking')({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox',
  });
  sms = AfricasTalking.SMS;
} else {
  console.warn('[sms] AT_API_KEY not set — SMS sends will be logged only, not delivered.');
}

// Local Rwandan numbers are stored as 07XXXXXXXX; Africa's Talking expects E.164.
function toE164(phone) {
  const digits = phone.replace(/\s/g, '');
  return digits.startsWith('0') ? '+250' + digits.slice(1) : digits;
}

async function sendSms(phone, message) {
  const to = toE164(phone);
  if (!sms) {
    console.log(`[sms:skipped] to=${to} message="${message}"`);
    return { skipped: true };
  }
  try {
    const result = await sms.send({ to: [to], message });
    console.log(`[sms:sent] to=${to} message="${message}"`);
    return result;
  } catch (err) {
    // Notifications are best-effort — never let an SMS failure break the order flow.
    console.error(`[sms:failed] to=${to}`, err.message);
    return { error: err.message };
  }
}

module.exports = { sendSms };
