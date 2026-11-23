// Small in-memory limiter (per server instance). For several servers behind a
// load balancer, swap the Map for Redis (e.g. rate-limit-redis).
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = "Too many requests. Please try again later." }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.min(windowMs, 60_000)).unref();

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    let h = hits.get(k);
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs };
      hits.set(k, h);
    }
    h.count += 1;
    if (h.count > max) {
      const retryAfter = Math.ceil((h.reset - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message, code: "RATE_LIMITED", retryAfter });
    }
    next();
  };
}
