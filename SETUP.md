# Quick Setup Guide

## Prerequisites

- Node.js v18+
- PostgreSQL v14+
- Docker v20+
- Docker Compose v2+

## 1. Database Setup (5 minutes)

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ir_iss_db;

# Exit
\q
```

## 2. Backend Setup (10 minutes)

```bash
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Generate secrets
# JWT_SECRET (64 bytes):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY (32 bytes):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env with your values:
# - DB_USER=postgres
# - DB_PASSWORD=your_password
# - JWT_SECRET=generated_secret
# - ENCRYPTION_KEY=generated_key
# - GOOGLE_CLIENT_ID=get_from_google_cloud_console
# - GOOGLE_CLIENT_SECRET=get_from_google_cloud_console

# Initialize database (creates tables)
npm start
# Wait for "Database initialized successfully"
# Press Ctrl+C
```

## 3. Google OAuth Setup (Optional, 5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "IR-ISS-System"
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID and Client Secret to backend `.env`

## 4. Frontend Setup (5 minutes)

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
copy .env.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=same_as_backend
```

## 5. Spark Setup (2 minutes)

```bash
# From project root
docker-compose up -d

# Verify container is running
docker ps

# Should see: spark-local container running
```

## 6. Start Application (2 minutes)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Verify Spark:**
```bash
docker logs spark-local -f
```

## 7. First Run Workflow (10 minutes)

1. **Open browser**: http://localhost:3000

2. **Register account**:
   - Click "Get Started"
   - Email: `test@test.com`
   - Password: `Test123!`

3. **Upload documents**:
   - Click "Upload" in navbar
   - Drag-drop files from `project_dataSet/` folder (1.txt - 10.txt)
   - Click "Upload Selected Files"

4. **Build index**:
   - Click "Index" in navbar
   - Click "Build Index" button
   - Wait ~10 seconds for Spark job
   - View positional index in format: `< term doc1: pos1, pos2; doc2: pos1 >`

5. **Search documents**:
   - Click "Search" in navbar
   - Try example queries:
     - `fools fear in` (phrase)
     - `fools AND fear` (boolean AND)
     - `angels AND NOT fear` (boolean AND NOT)
   - View ranked results with snippets

6. **View TF-IDF**:
   - Click "TF-IDF" in navbar
   - Explore 4 tabs:
     - Term Frequency
     - IDF Values
     - TF-IDF Matrix (heatmap)
     - Normalized TF-IDF

## Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify database exists
psql -U postgres -l | grep ir_iss_db

# Check port 5000 is free
netstat -ano | findstr :5000
```

### Frontend won't connect to backend
```bash
# Verify backend is running
curl http://localhost:5000/api/auth/register

# Check .env.local has correct URL
cat frontend\.env.local

# Clear browser cache and localStorage
# F12 > Application > Clear storage
```

### Spark job fails
```bash
# Check container is running
docker ps | grep spark-local

# Restart container
docker-compose restart

# View logs
docker logs spark-local -f

# Access container shell
docker exec -it spark-local bash

# Install psycopg2 manually (if needed)
pip install psycopg2-binary
```

### Database connection from Spark fails
```bash
# Verify PostgreSQL allows connections from Docker
# Edit postgresql.conf:
# listen_addresses = '*'

# Edit pg_hba.conf (add line):
# host    all    all    172.17.0.0/16    md5

# Restart PostgreSQL
# Windows: services.msc > PostgreSQL > Restart
```

## Verification Checklist

- [ ] PostgreSQL database `ir_iss_db` created
- [ ] Backend `.env` file configured with secrets
- [ ] Backend starts without errors
- [ ] Frontend `.env.local` configured
- [ ] Frontend accessible at http://localhost:3000
- [ ] Spark container running (`docker ps`)
- [ ] Can register/login successfully
- [ ] Can upload documents
- [ ] Can build index (Spark job succeeds)
- [ ] Can search with boolean operators
- [ ] Can view TF-IDF visualizations

## Next Steps

- Read `README.md` for detailed documentation
- Check `backend/README.md` for API documentation
- Check `frontend/README.md` for component details
- Upload your own documents and experiment with queries

## Support

If you encounter issues:

1. Check application logs in terminal
2. Check browser console (F12) for frontend errors
3. Verify all environment variables are set
4. Ensure all ports are free (3000, 5000, 5432, 7077)
5. Check Docker container logs: `docker logs spark-local`

---

Total setup time: ~30-40 minutes
