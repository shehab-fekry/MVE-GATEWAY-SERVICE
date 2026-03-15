import 'dotenv/config'; // Load environment variables from .env file

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import proxy from 'express-http-proxy';
import { IRequest } from '../global';

// Create an Express application
const app = express();

// Whitelist of allowed origins for CORS
const whitelist = [
  String(process.env.AUTH_FRONTEND),
  String(process.env.CUSTOMER_FRONTEND),
  String(process.env.SELLER_FRONTEND),
];

// allow localhost:3000 to access resources from this server
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (
        requestOrigin &&
        whitelist.includes(requestOrigin as string)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed access by CORS.'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// set limit on requests from same IP address
app.set('trust proxy', 1); // Trust first proxy only in front of your app
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req: IRequest) => (req.user ? 1000 : 100), // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: true, // enable the `X-RateLimit-*` headers
  })
);

// parses incoming JSON request bodies and makes them available on req.body
app.use(express.json({ limit: '100mb' }));
// Parses URL-encoded form data (including nested objects) into req.body, with a 100MB size limit.
app.use(express.urlencoded({ limit: '100mb', extended: true }));
// parses cookies from the request header and puts them into req.cookies
app.use(cookieParser());

// log request info (logger)
app.use(morgan('dev'));

// routes...
app.get('/gateway-health', (req, res) => {
  res.send('Hello From API Gateway!');
});

// Proxy requests to /auth the auth-service
app.use('/auth', proxy(`${process.env.AUTH_SERVICE}`));

// server's port
const PORT = process.env.PORT;
// start the server
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}/`);
});
