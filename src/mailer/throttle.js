export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs, maxMs) {
  const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
  return sleep(ms);
}
