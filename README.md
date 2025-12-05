# Secure Information Retrieval System

A full-stack application combining **Information Retrieval (IR)** with **Information Systems Security (ISS)** requirements. This system implements positional indexing, TF-IDF ranking, phrase queries with boolean operators, and comprehensive security features including encryption, authentication, and secure coding practices.

## 🎯 Features

### Information Retrieval
- **Positional Indexing**: Built using Apache Spark with PySpark
- **TF-IDF Ranking**: Term frequency, inverse document frequency, and normalized scoring
- **Boolean Queries**: Support for AND and AND NOT operators
- **Phrase Queries**: Search for exact phrases within documents
- **Cosine Similarity**: Ranked search results based on document relevance

### Security (ISS Requirements)
1. **Password Hashing**: Bcrypt with 12 salt rounds
2. **Document Encryption**: AES-256-GCM for stored documents
3. **Content Integrity**: SHA-256 hashing for document verification
4. **JWT Authentication**: Secure token-based authentication with token revocation
5. **Google OAuth SSO**: Single Sign-On with Google
6. **SQL Injection Prevention**: Parameterized queries throughout
7. **XSS Prevention**: Input sanitization middleware
8. **DoS Protection**: Database-backed rate limiting
9. **Security Headers**: Helmet.js for HTTP security headers
10. **Audit Logging**: Comprehensive security event logging to database

## 🏗️ Architecture

### Backend
- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL
- **Authentication**: JWT + Passport.js (Google OAuth)
- **Security**: bcrypt, jsonwebtoken, helmet, xss, express-validator

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (no TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **Animations**: Framer Motion
- **HTTP Client**: Axios with JWT interceptors

### Infrastructure
- **Search Engine**: Apache Spark with PySpark
- **Containerization**: Docker (Bitnami Spark image)
- **Orchestration**: Docker Compose

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **Docker**: v20 or higher
- **Docker Compose**: v2 or higher

## 🚀 Installation

### 1. Clone the Repository

```bash
cd "d:\FCAIH\IR & ISS\project"
```

### 2. Database Setup

Create PostgreSQL database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ir_iss_db;

# Exit
\q
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env file with your configuration
# Required variables:
# - DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - ENCRYPTION_KEY (32 bytes hex: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (from Google Cloud Console)
```

**Backend .env Configuration:**

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
JWT_SECRET=your_64_byte_hex_string_here
JWT_EXPIRY=24h

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_string_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

**Initialize database schema:**

```bash
# Start the backend server (this will auto-create tables)
npm start

# Stop with Ctrl+C after seeing "Database initialized successfully"
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local file
copy .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Frontend .env.local Configuration:**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 5. Spark Setup

Start Apache Spark container:

```bash
cd ..

# Start Spark container
docker-compose up -d

# Verify container is running
docker ps

# Check logs
docker logs spark-local
```

## 🎮 Running the Application

### Start Backend

```bash
cd backend
npm start
```

Backend will run on `http://localhost:5000`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📖 Usage Guide

### 1. Register/Login

- Navigate to `http://localhost:3000`
- Click "Get Started" or "Sign In"
- Register with email/password or use Google OAuth

### 2. Upload Documents

- Click "Upload" in navigation
- Drag and drop `.txt` files or click to browse
- Documents are automatically encrypted (AES-256-GCM)
- View uploaded documents in the table

### 3. Build Positional Index

- Click "Index" in navigation
- Click "Build Index" button
- This triggers Apache Spark job to analyze documents
- View positional index in format: `< term doc1: pos1, pos2; doc2: pos1 >`
- Use search filter to find specific terms

### 4. Search Documents

- Click "Search" in navigation
- Enter query:
  - **Phrase**: `fools fear in`
  - **AND**: `fools AND fear`
  - **AND NOT**: `angels AND NOT fear`
- Results ranked by cosine similarity
- Relevant terms highlighted in snippets

### 5. TF-IDF Analysis

- Click "TF-IDF" in navigation
- View 4 tabs:
  - **Term Frequency**: TF values per document
  - **IDF Values**: Inverse document frequency with bar charts
  - **TF-IDF Matrix**: Heatmap visualization
  - **Normalized TF-IDF**: Final normalized scores
- Export data to CSV

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with 24-hour expiration
- Token revocation database
- Secure password hashing (bcrypt, 12 rounds)
- Google OAuth SSO integration

### Data Protection
- AES-256-GCM encryption for documents
- SHA-256 integrity hashing
- Encrypted data at rest

### Attack Prevention
- **SQL Injection**: Parameterized queries ($1, $2 syntax)
- **XSS**: Input sanitization with xss library
- **DoS**: Rate limiting (100 requests/15 minutes)
- **CSRF**: SameSite cookies, CORS configuration

### Monitoring
- Audit logs stored in database
- Security event tracking (login, logout, failed attempts)
- Access logs with IP, user agent, endpoint

## 🗄️ Database Schema

### Tables
1. **users**: User accounts with hashed passwords
2. **api_tokens**: JWT token tracking for revocation
3. **documents**: Encrypted document storage
4. **positional_index**: Term positions per document
5. **audit_logs**: Security event logging
6. **rate_limits**: DoS protection tracking

## 🧪 Testing

### Upload Sample Documents

Use the provided dataset in `project_dataSet/` (1.txt - 10.txt)

### Test Queries

```
# Phrase queries
fools fear in
angels tread

# Boolean AND
fools AND fear
angels AND tread

# Boolean AND NOT
angels AND NOT fear
wise AND NOT fools
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - Logout and revoke token

### Documents
- `POST /api/documents` - Upload documents (multipart/form-data)
- `GET /api/documents` - List user documents
- `DELETE /api/documents/:id` - Delete document

### Indexing
- `POST /api/index/build` - Trigger Spark indexing job
- `GET /api/index` - Get positional index
- `GET /api/index/stats` - Get index statistics

### Search
- `POST /api/search/query` - Search with boolean operators
- `GET /api/search/tf` - Get term frequency
- `GET /api/search/idf` - Get IDF values
- `GET /api/search/tfidf` - Get TF-IDF matrix
- `GET /api/search/normalized` - Get normalized TF-IDF

## 🛠️ Troubleshooting

### Spark Container Issues

```bash
# Restart container
docker-compose restart

# View logs
docker logs spark-local -f

# Access container shell
docker exec -it spark-local bash
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify database exists
psql -U postgres -l | grep ir_iss_db

# Test connection
psql -U postgres -d ir_iss_db -c "SELECT * FROM users LIMIT 1;"
```

### Port Conflicts

```bash
# Check if ports are in use
netstat -ano | findstr :5000
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

## 📝 Project Structure

```
project/
├── backend/
│   ├── config/          # Database, Passport config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Security middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── uploads/         # Encrypted documents
│   └── server.js        # Entry point
├── frontend/
│   ├── app/             # Next.js pages
│   ├── components/      # React components
│   ├── lib/             # API client, state
│   └── public/          # Static assets
├── spark-app/
│   └── positional_index.py  # PySpark indexing script
├── project_dataSet/     # Sample documents
└── docker-compose.yml   # Spark container config
```

## 🎓 Academic Requirements

This project fulfills all requirements for the IR & ISS course:

### IR Requirements ✅
- Positional indexing with Apache Spark
- TF-IDF ranking algorithm
- Phrase queries with boolean operators
- Document relevance scoring

### ISS Requirements ✅
1. Password hashing (bcrypt)
2. Document encryption (AES-256-GCM)
3. Content integrity (SHA-256)
4. JWT authentication
5. Google OAuth SSO
6. SQL injection prevention
7. XSS prevention
8. DoS protection
9. Security headers
10. Audit logging

## 📄 License

This is an academic project for the Information Retrieval & Information Systems Security course at FCAI Cairo University.

## 👥 Authors

- Course: Information Retrieval & Information Systems Security
- Institution: Faculty of Computers and Artificial Intelligence, Cairo University

---

For questions or issues, refer to the troubleshooting section or check application logs.
