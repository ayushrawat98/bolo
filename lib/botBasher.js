const rateMap = new Map()

const LIMIT_30S = 3
const LIMIT_1H = 50
const WINDOW_30S = 30 * 1000
const WINDOW_1H = 60 * 60 * 1000

export function rateLimitPosts(req, res, next) {
  const key = getFingerprint(req)
  const now = Date.now()

  let user = rateMap.get(key)
  if (!user) {
    user = { times: [], cooldownUntil: 0 }
    rateMap.set(key, user)
  }

  // If in cooldown
  if (user.cooldownUntil > now) {
    return res.status(429).send(((user.cooldownUntil - now) / 1000))
  }

  // Keep only last 1 hour
  user.times = user.times.filter(t => now - t < WINDOW_1H)

  const in30s = user.times.filter(t => now - t < WINDOW_30S).length
  const in1h = user.times.length

  if (in30s >= LIMIT_30S) {
    user.cooldownUntil = now + 30000
    return res.status(429).send(30)
  }

  if (in1h >= LIMIT_1H) {
    user.cooldownUntil = now + 10 * 60 * 1000
    return res.status(429).send(600)
  }

  // Record this post
  user.times.push(now)

  next()
}

function getFingerprint(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  const ua = req.headers['user-agent'] || ''
  const lang = req.headers['accept-language'] || ''
  return ip + '|' + ua + '|' + lang
}


setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateMap) {
    if (v.times.length === 0 && v.cooldownUntil < now) {
      rateMap.delete(k)
    }
  }
}, 5 * 60000)
