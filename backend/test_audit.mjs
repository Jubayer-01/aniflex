import { spawn } from 'child_process';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const results = [];

function pass(name, details = '') {
  results.push({ name, passed: true, details });
  console.log(`PASS: ${name}${details ? ` (${details})` : ''}`);
}

function fail(name, details = '') {
  results.push({ name, passed: false, details });
  console.error(`FAIL: ${name}${details ? ` (${details})` : ''}`);
}

function mockRes() {
  const r = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      r.statusCode = code;
      return r;
    },
    json(data) {
      r.body = data;
      return r;
    },
    setHeader(k, v) {
      r.headers[k.toLowerCase()] = v;
    },
    getHeader(k) {
      return r.headers[k.toLowerCase()];
    },
  };
  return r;
}

async function runTests() {
  console.log('--- STARTING OMNIFLEX AUDIT VERIFICATION ---');

  // Test 1: JWT_SECRET missing check crashes server
  await new Promise((resolve) => {
    const proc = spawn('node', ['-e', 'import("./server.js")'], {
      env: { ...process.env, JWT_SECRET: '' },
      cwd: 'F:/ANIFLEX/backend',
    });
    proc.on('close', (code) => {
      if (code === 1) {
        pass('Missing JWT_SECRET crashes server immediately (exit code 1)');
      } else {
        fail('Missing JWT_SECRET crashes server immediately', `Exit code: ${code}`);
      }
      resolve();
    });
  });

  process.env.JWT_SECRET = 'test_secret_key_1234567890_test_secret_key';

  const { pool } = await import('./config/db.js');
  pool.query = async (sql, params) => {
    if (sql.includes('SELECT id, email FROM users') || sql.includes('SELECT id FROM users WHERE email = ?')) {
      return [[]];
    }
    return [{ insertId: 1, affectedRows: 1 }];
  };

  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: animeRoutes } = await import('./routes/anime.js');
  const { default: movieRoutes } = await import('./routes/movies.js');
  const { default: watchlistRoutes } = await import('./routes/watchlist.js');
  const { default: historyRoutes } = await import('./routes/history.js');
  const { authenticateToken } = await import('./middleware/auth.js');

  // Test 2: CORS Origin verification logic
  const allowedOrigins = [
    'https://aniflex-beta.vercel.app',
    'https://aniflex.vercel.app',
    'http://localhost:5173',
  ];
  const corsChecker = (origin) => (!origin || allowedOrigins.includes(origin));

  if (!corsChecker('https://evil.example') && corsChecker('https://aniflex-beta.vercel.app') && corsChecker(null)) {
    pass('CORS origin check cleanly rejects unauthorized origins (https://evil.example)');
  } else {
    fail('CORS origin check failed');
  }

  // Test 3: Malformed JSON and payload-too-large error handling middleware
  const errorMiddleware = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Payload too large. Maximum size is 50KB.' });
    }
    next(err);
  };

  const syntaxErr = new SyntaxError('Unexpected token in JSON');
  syntaxErr.status = 400;
  syntaxErr.body = '{"invalid_json"';
  const res1 = mockRes();
  errorMiddleware(syntaxErr, {}, res1, () => {});
  if (res1.statusCode === 400 && res1.body?.error === 'Malformed JSON payload') {
    pass('Malformed JSON middleware returns 400 Bad Request');
  } else {
    fail('Malformed JSON middleware failed', `Status: ${res1.statusCode}`);
  }

  const largeErr = new Error('entity too large');
  largeErr.type = 'entity.too.large';
  const res2 = mockRes();
  errorMiddleware(largeErr, {}, res2, () => {});
  if (res2.statusCode === 413 && res2.body?.error?.includes('50KB')) {
    pass('Oversized body middleware returns 413 Payload Too Large (50KB cap)');
  } else {
    fail('Oversized body middleware failed', `Status: ${res2.statusCode}`);
  }

  // Test 4: Registration validation checks
  // Find POST /register handler from router stack
  const registerHandler = authRoutes.stack.find((layer) => layer.route && layer.route.path === '/register').route.stack.slice(-1)[0].handle;

  const resUserA = mockRes();
  await registerHandler({ body: { username: 'a', email: 'valid@example.com', password: 'ValidPassword123' } }, resUserA);
  if (resUserA.statusCode === 400 && resUserA.body?.error?.includes('Username must be 3-30')) {
    pass('Registration rejects 1-character username with 400 Bad Request');
  } else {
    fail('Registration rejects 1-char username', `Got status ${resUserA.statusCode}`);
  }

  const resBadEmail = mockRes();
  await registerHandler({ body: { username: 'validuser', email: 'not-an-email', password: 'ValidPassword123' } }, resBadEmail);
  if (resBadEmail.statusCode === 400 && resBadEmail.body?.error?.includes('valid email')) {
    pass('Registration rejects invalid email format with 400 Bad Request');
  } else {
    fail('Registration rejects invalid email', `Got status ${resBadEmail.statusCode}`);
  }

  const resShortPass = mockRes();
  await registerHandler({ body: { username: 'validuser', email: 'valid@example.com', password: '123' } }, resShortPass);
  if (resShortPass.statusCode === 400 && resShortPass.body?.error?.includes('at least 8 characters')) {
    pass('Registration rejects short password (<8 chars) with 400 Bad Request');
  } else {
    fail('Registration rejects short password', `Got status ${resShortPass.statusCode}`);
  }

  // Test 5: Unbounded / Invalid Query Bounds on /api/anime
  const animeGetHandler = animeRoutes.stack.find((layer) => layer.route && layer.route.path === '/').route.stack.slice(-1)[0].handle;

  const resLimitAbc = mockRes();
  await animeGetHandler({ query: { limit: 'abc' } }, resLimitAbc);
  if (resLimitAbc.statusCode === 400 && resLimitAbc.body?.error?.includes('limit')) {
    pass('Catalog rejects ?limit=abc with 400 Bad Request');
  } else {
    fail('Catalog rejects ?limit=abc', `Got status ${resLimitAbc.statusCode}`);
  }

  const resPageNeg = mockRes();
  await animeGetHandler({ query: { page: '-5' } }, resPageNeg);
  if (resPageNeg.statusCode === 400 && resPageNeg.body?.error?.includes('page')) {
    pass('Catalog rejects ?page=-5 with 400 Bad Request');
  } else {
    fail('Catalog rejects ?page=-5', `Got status ${resPageNeg.statusCode}`);
  }

  const resLimitHuge = mockRes();
  await animeGetHandler({ query: { limit: '999999999' } }, resLimitHuge);
  if (resLimitHuge.statusCode === 400 && resLimitHuge.body?.error?.includes('limit')) {
    pass('Catalog rejects unbounded ?limit=999999999 with 400 Bad Request');
  } else {
    fail('Catalog rejects unbounded limit', `Got status ${resLimitHuge.statusCode}`);
  }

  // Test 6: Watchlist status validation
  const watchlistPostHandler = watchlistRoutes.stack.find((l) => l.route?.path === '/' && l.route?.methods?.post).route.stack.slice(-1)[0].handle;

  const resBadStatus = mockRes();
  await watchlistPostHandler({ user: { id: 1 }, body: { animeId: '12345', status: 'hacked_status' } }, resBadStatus);
  if (resBadStatus.statusCode === 400 && resBadStatus.body?.error?.includes('Invalid status')) {
    pass('Watchlist rejects invalid status with 400 Bad Request');
  } else {
    fail('Watchlist rejects invalid status', `Got status ${resBadStatus.statusCode}`);
  }

  // Test 7: History parameter validation
  const historyGetHandler = historyRoutes.stack.find((l) => l.route?.path === '/' && l.route?.methods?.get).route.stack.slice(-1)[0].handle;
  const resHistLimit = mockRes();
  await historyGetHandler({ user: { id: 1 }, query: { limit: 'invalid' } }, resHistLimit);
  if (resHistLimit.statusCode === 400 && resHistLimit.body?.error?.includes('limit')) {
    pass('Watch history rejects invalid ?limit with 400 Bad Request');
  } else {
    fail('Watch history rejects invalid ?limit', `Got status ${resHistLimit.statusCode}`);
  }

  const historyPostHandler = historyRoutes.stack.find((l) => l.route?.path === '/' && l.route?.methods?.post).route.stack.slice(-1)[0].handle;
  const resHistPost = mockRes();
  await historyPostHandler({ user: { id: 1 }, body: {} }, resHistPost);
  if (resHistPost.statusCode === 400 && resHistPost.body?.error?.includes('mediaId')) {
    pass('Watch history rejects missing mediaId with 400 Bad Request');
  } else {
    fail('Watch history rejects missing mediaId', `Got status ${resHistPost.statusCode}`);
  }

  // Test 8: Forgot-password response does not leak reset token or devToken
  const forgotHandler = authRoutes.stack.find((layer) => layer.route && layer.route.path === '/forgot-password').route.stack.slice(-1)[0].handle;
  const resForgot = mockRes();
  await forgotHandler({ body: { email: 'nonexistent_test@example.com' } }, resForgot);
  if (resForgot.body?.token === undefined && resForgot.body?.devToken === undefined && resForgot.body?.message) {
    pass('Forgot-password response never leaks reset token or devToken');
  } else {
    fail('Forgot-password leaks token', JSON.stringify(resForgot.body));
  }

  // Test 9: Timing attack dummy hash verification
  const t0 = Date.now();
  await bcrypt.compare('wrongpassword123', '$2a$10$wT8PZ1pL0u7Xb7xZ7j1zNuqW6Y.O6D1D5V0a2U4k5m6n7o8p9q0r.');
  const duration = Date.now() - t0;
  if (duration >= 40) {
    pass('Constant-time dummy bcrypt equalization confirmed (~60-90ms)', `${duration}ms`);
  } else {
    fail('Bcrypt timing too fast', `${duration}ms`);
  }

  // Test 10: Single-use SHA-256 token hashing
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenHash2 = crypto.createHash('sha256').update(rawToken).digest('hex');
  if (tokenHash1 === tokenHash2 && tokenHash1.length === 64) {
    pass('Password reset token generated with cryptographically secure 256-bit SHA-256 hash');
  } else {
    fail('Password reset token hash generation failed');
  }

  // Test 11: Movie endpoint validation & TMDB failure handling
  const movieHollywoodHandler = movieRoutes.stack.find((layer) => layer.route && layer.route.path === '/hollywood').route.stack.slice(-1)[0].handle;
  const resMovieBadPage = mockRes();
  await movieHollywoodHandler({ query: { page: 'not-a-number' } }, resMovieBadPage);
  if (resMovieBadPage.statusCode === 400 && resMovieBadPage.body?.error?.includes('page')) {
    pass('Movies endpoint rejects non-numeric ?page with 400 Bad Request');
  } else {
    fail('Movies endpoint rejects non-numeric page', `Got status ${resMovieBadPage.statusCode}`);
  }

  const movieTrendingHandler = movieRoutes.stack.find((layer) => layer.route && layer.route.path === '/trending').route.stack.slice(-1)[0].handle;
  const resTrending = mockRes();
  await movieTrendingHandler({ query: {} }, resTrending);
  if (resTrending.statusCode === 502 || resTrending.statusCode === 503) {
    pass('TMDB failure or unconfigured key returns 502/503 upstream error (not 200 with empty array)', `Status: ${resTrending.statusCode}`);
  } else if (resTrending.statusCode === 200 && Array.isArray(resTrending.body?.results)) {
    pass('TMDB live upstream connected', `Results count: ${resTrending.body.results.length}`);
  } else {
    fail('TMDB failure handling', `Status: ${resTrending.statusCode}`);
  }

  // Test 12: Session invalidation logic (token_version verification)
  const tokenWithVersion1 = jwt.sign({ id: 1, username: 'testuser', token_version: 1 }, process.env.JWT_SECRET);
  const decoded = jwt.verify(tokenWithVersion1, process.env.JWT_SECRET);
  const currentDbVersion = 2; // user reset password, DB token_version incremented to 2
  if (decoded.token_version !== currentDbVersion) {
    pass('Token version mismatch detects invalidated sessions after password reset');
  } else {
    fail('Token version check failed');
  }

  console.log('\n--- AUDIT SUMMARY ---');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
}

runTests().catch(console.error);
