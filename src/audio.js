let ctx = null;
function context() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}
function tone(freq, duration = 0.08, type = 'sine', gain = 0.035, delay = 0) {
  const c = context();
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration);
}
export function sfx(name, enabled = true) {
  if (!enabled) return;
  try {
    if (name === 'tap') tone(420 + Math.random() * 90, 0.045, 'sine', 0.018);
    if (name === 'buy') { tone(390, 0.08, 'triangle', 0.025); tone(585, 0.11, 'triangle', 0.02, 0.055); }
    if (name === 'claim') { tone(523, 0.12, 'sine', 0.03); tone(659, 0.12, 'sine', 0.025, 0.07); tone(784, 0.18, 'sine', 0.02, 0.14); }
    if (name === 'comet') { tone(880, 0.09, 'sine', 0.03); tone(1320, 0.18, 'sine', 0.02, 0.06); }
    if (name === 'pulse') { tone(220, 0.16, 'sawtooth', 0.025); tone(440, 0.22, 'triangle', 0.025, 0.07); }
    if (name === 'ascend') { [330, 440, 660, 880].forEach((f, i) => tone(f, 0.35, 'sine', 0.03, i * 0.11)); }
  } catch { /* Audio is optional. */ }
}
