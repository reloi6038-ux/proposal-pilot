const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const {
  authLimiter,
  aiLimiter,
  paypalLimiter,
  webhookLimiter,
} = require('./middleware/rateLimiters');

dotenv.config();
connectDB();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://*.paypal.com",
        "https://*.paypalobjects.com",
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://*.paypal.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://*.paypal.com",
        "https://*.paypalobjects.com",
      ],
      connectSrc: [
        "'self'",
        "https://*.paypal.com",
        "https://*.paypalobjects.com",
      ],
      frameSrc: [
        "'self'",
        "https://*.paypal.com",
        "https://*.paypalobjects.com",
      ],
      formAction: ["'self'", "https://*.paypal.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ProposalPilot API is running' });
});

app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/paypal', paypalLimiter, require('./routes/paypalRoutes'));
app.use('/api/config', require('./routes/configRoutes'));
app.use('/api/ai', aiLimiter, require('./routes/aiRoutes'));
app.use('/api/webhooks', webhookLimiter, require('./routes/webhookRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message || 'Something went wrong';
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});