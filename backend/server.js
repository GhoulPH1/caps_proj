import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';


// Import routes
import userRoutes from './routes/user.route.js';
import uploadRoutes from './routes/file.route.js';
import passwordRoutes from './routes/password.route.js';

// Import configuration and middleware
import { connectDB } from './config/db.js';
import { configurePassport } from './controllers/user.controller.js';
import { errorHandler } from './middleware/errorHandler.js';

// import { validateToken } from './middleware/auth.middleware.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security Middleware Stack
// 1. Helmet for secure HTTP headers
app.use(helmet());

// 2. CORS Configuration
const corsOptions = {
  origin: [process.env.FRONTEND_URL || 'https://localhost:5173', 'https://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};
app.use(cors(corsOptions));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit for file uploads
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 4. Request Logging (only in development)
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 5. Body Parsing with Size Limits
app.use(express.json({ 
  limit: '50mb', // Increased for file uploads
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 6. Data Sanitization
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Sanitize input against XSS
app.use(hpp()); // Prevent parameter pollution

// 7. Compression
app.use(compression());

// 8. Passport Initialization
configurePassport();
app.use(passport.initialize());

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'Server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    objectSrc: ["'none'"],
  }
}));

// Routes
app.use("/api/user", userRoutes);
app.use('/api', uploadRoutes);
app.use('/api/password', passwordRoutes);

// 404 Handler for Undefined Routes
app.use((req, res, next) => {
  res.status(404).json({ 
    status: 'error',
    message: "Endpoint not found",
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Global Error Handler
app.use(errorHandler);

// Server Startup
const startServer = async () => {
  try {
    await connectDB();
    console.log('📦 Database connected successfully');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${NODE_ENV} mode on https://localhost:${PORT}`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed.');
        // Close database connection if needed
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: You can add more sophisticated logging here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Attempt to log the error and exit
  process.exit(1);
});

startServer();

export default app;