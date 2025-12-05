# Backend - Secure Information Retrieval System

Express.js backend with comprehensive security features and Apache Spark integration.

## Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT + Passport.js (Google OAuth)
- **Security**: bcrypt, helmet, xss, express-validator

## Directory Structure

```
backend/
├── config/
│   ├── db.js                 # PostgreSQL pool & schema
│   └── passport.js           # Google OAuth strategy
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── uploadController.js   # Document management
│   ├── indexController.js    # Spark indexing
│   └── searchController.js   # Search & TF-IDF
├── middleware/
│   ├── auth.js               # JWT verification
│   ├── rateLimiter.js        # DoS protection
│   ├── validator.js          # SQL injection prevention
│   ├── sanitizer.js          # XSS prevention
│   └── auditLogger.js        # Security logging
├── routes/
│   ├── auth.js               # Auth endpoints
│   ├── upload.js             # Document endpoints
│   ├── index.js              # Indexing endpoints
│   └── search.js             # Search endpoints
├── services/
│   ├── hashingService.js     # bcrypt, SHA-256
│   ├── encryptionService.js  # AES-256-GCM
│   ├── sparkService.js       # Spark job triggering
│   ├── tfIdf.js              # TF-IDF calculations
│   └── queryProcessor.js     # Query parsing & ranking
├── utils/
│   └── textProcessor.js      # Tokenization, snippets
├── uploads/                  # Encrypted documents
├── .env.example              # Environment template
├── server.js                 # Application entry
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=ir_iss_db
DB_PASSWORD=your_password
DB_PORT=5432

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=generate_with_crypto_randomBytes_64
JWT_EXPIRY=24h

# Encryption (32 bytes)
ENCRYPTION_KEY=generate_with_crypto_randomBytes_32

# Google OAuth
GOOGLE_CLIENT_ID=from_google_cloud_console
GOOGLE_CLIENT_SECRET=from_google_cloud_console
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Generate Secrets

```bash
# JWT Secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Installation

```bash
cd backend
npm install
```

## Database Setup

The server automatically initializes the database schema on first run:

```javascript
// Creates 6 tables:
// 1. users (id, email, password_hash, google_id, created_at)
// 2. api_tokens (id, user_id, token_hash, expires_at)
// 3. documents (id, user_id, filename, encrypted_content, iv, auth_tag, content_hash, created_at)
// 4. positional_index (id, term, document_id, positions)
// 5. audit_logs (id, user_id, action, ip_address, user_agent, created_at)
// 6. rate_limits (id, identifier, requests, window_start)
```

Start the server once to create tables:

```bash
npm start
# Wait for "Database initialized successfully"
# Press Ctrl+C
```

## Running

```bash
# Development
npm start

# Production
NODE_ENV=production npm start
```

Server runs on `http://localhost:5000`

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: { token, user: { id, email } }
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: { token, user: { id, email } }
```

#### Google OAuth
```http
GET /api/auth/google
# Redirects to Google OAuth consent screen

Callback: /api/auth/google/callback
# Redirects to frontend with token
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response: { message: "Logged out successfully" }
```

### Documents

#### Upload Documents
```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: File[] (.txt only)

Response: { 
  success: true, 
  uploaded: [{ id, filename, contentHash }] 
}
```

#### Get Documents
```http
GET /api/documents
Authorization: Bearer <token>

Response: { 
  documents: [{ id, filename, contentHash, createdAt }] 
}
```

#### Delete Document
```http
DELETE /api/documents/:id
Authorization: Bearer <token>

Response: { message: "Document deleted successfully" }
```

### Indexing

#### Build Index (Spark Job)
```http
POST /api/index/build
Authorization: Bearer <token>

Response: { 
  message: "Index built successfully", 
  termsIndexed: 150 
}
```

#### Get Positional Index
```http
GET /api/index?search=term
Authorization: Bearer <token>

Response: { 
  index: {
    "term": {
      "doc1.txt": [1, 5, 10],
      "doc2.txt": [3, 7]
    }
  },
  formatted: "< term doc1.txt: 1, 5, 10; doc2.txt: 3, 7 >"
}
```

#### Get Index Stats
```http
GET /api/index/stats
Authorization: Bearer <token>

Response: { 
  totalTerms: 150, 
  totalDocuments: 10, 
  totalEntries: 500 
}
```

### Search & TF-IDF

#### Search Query
```http
POST /api/search/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "fools AND fear"
}

Response: { 
  results: [{
    documentId: 1,
    filename: "doc1.txt",
    cosineSimilarity: 0.85,
    snippet: "...highlighted text..."
  }]
}
```

#### Get Term Frequency
```http
GET /api/search/tf
Authorization: Bearer <token>

Response: { 
  data: {
    matrix: { "term": { "doc1.txt": 0.05 } },
    terms: ["term1", "term2"],
    documents: ["doc1.txt", "doc2.txt"]
  }
}
```

#### Get IDF
```http
GET /api/search/idf
Authorization: Bearer <token>

Response: { 
  data: {
    idf: { "term": 0.693 },
    totalDocuments: 10
  }
}
```

#### Get TF-IDF Matrix
```http
GET /api/search/tfidf
Authorization: Bearer <token>

Response: { 
  data: {
    matrix: { "term": { "doc1.txt": 0.034 } },
    terms: ["term1"],
    documents: ["doc1.txt"]
  }
}
```

#### Get Normalized TF-IDF
```http
GET /api/search/normalized
Authorization: Bearer <token>

Response: { 
  data: {
    matrix: { "term": { "doc1.txt": 0.95 } },
    terms: ["term1"],
    documents: ["doc1.txt"]
  }
}
```

## Security Features

### 1. Password Hashing (bcrypt)
```javascript
// hashingService.js
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);
```

### 2. Document Encryption (AES-256-GCM)
```javascript
// encryptionService.js
const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
// Stores: encrypted content, IV, auth tag
```

### 3. Content Integrity (SHA-256)
```javascript
// hashingService.js
const hash = crypto.createHash('sha256').update(content).digest('hex');
```

### 4. JWT Authentication
```javascript
// middleware/auth.js
const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
// Tokens stored as SHA-256 hash in api_tokens table
```

### 5. Google OAuth SSO
```javascript
// config/passport.js
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}));
```

### 6. SQL Injection Prevention
```javascript
// All queries use parameterized statements
await pool.query('SELECT * FROM users WHERE email = $1', [email]);
```

### 7. XSS Prevention
```javascript
// middleware/sanitizer.js
import xss from 'xss';
const sanitized = xss(input);
```

### 8. DoS Protection
```javascript
// middleware/rateLimiter.js
// 100 requests per 15-minute window per IP
```

### 9. Security Headers
```javascript
// server.js
import helmet from 'helmet';
app.use(helmet());
```

### 10. Audit Logging
```javascript
// middleware/auditLogger.js
await pool.query(
  'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
  [userId, action, ip]
);
```

## Spark Integration

### Trigger Spark Job

```javascript
// services/sparkService.js
const buildPositionalIndex = async (userId) => {
  // 1. Install psycopg2 in container
  // 2. Submit spark-submit with positional_index.py
  // 3. Parse stdout for results
  return { termsIndexed };
};
```

### Spark Application

```python
# spark-app/positional_index.py
# 1. Connects to PostgreSQL at host.docker.internal
# 2. Reads documents for user
# 3. Builds positional index: {term: {doc_id: [positions]}}
# 4. Batch inserts to positional_index table
```

## Error Handling

```javascript
// Global error handler in server.js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

## Logging

```javascript
// Audit logs capture:
// - Login/logout events
// - Document uploads/deletions
// - Index builds
// - Search queries
// - Failed authentication attempts
```

## Performance

- **Connection Pooling**: PostgreSQL pool (max 20 connections)
- **Rate Limiting**: Database-backed with efficient cleanup
- **Async Operations**: All I/O operations use async/await
- **Spark Jobs**: Offloaded to separate container

## Testing

```bash
# Test database connection
npm start
# Check for "Database connected successfully"

# Test endpoints with curl
curl http://localhost:5000/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

## Troubleshooting

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check credentials in .env
# Ensure database exists: ir_iss_db
```

### Spark Job Fails
```bash
# Check container is running
docker ps | grep spark-local

# View Spark logs
docker logs spark-local -f

# Test PostgreSQL connection from container
docker exec -it spark-local bash
pip install psycopg2-binary
python3 -c "import psycopg2; print('OK')"
```

### Port Already in Use
```bash
# Windows: Find process using port 5000
netstat -ano | findstr :5000

# Kill process by PID
taskkill /PID <PID> /F
```

## Dependencies

```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "multer": "^1.4.5",
  "express-validator": "^7.0.1",
  "xss": "^1.0.15",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

---

Built for the IR & ISS course at FCAI Cairo University.
