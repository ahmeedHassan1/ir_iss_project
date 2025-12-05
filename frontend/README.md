# Frontend - Secure Information Retrieval System

Next.js 15 frontend with App Router, authentication, and interactive visualizations.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (no TypeScript)
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 4.4.7 with persistence
- **Animations**: Framer Motion 10.16
- **HTTP Client**: Axios 1.6.2 with JWT interceptors
- **Icons**: Lucide React 0.303

## Directory Structure

```
frontend/
├── app/
│   ├── auth/
│   │   ├── login/page.js          # Login page
│   │   ├── register/page.js       # Registration page
│   │   └── callback/page.js       # OAuth callback
│   ├── upload/page.js             # Document upload
│   ├── index/page.js              # Positional index
│   ├── search/page.js             # Search interface
│   ├── tfidf/page.js              # TF-IDF visualization
│   ├── layout.js                  # Root layout
│   ├── page.js                    # Home page
│   └── globals.css                # Global styles
├── components/
│   ├── Navbar.js                  # Navigation bar
│   └── AuthGuard.js               # Route protection
├── lib/
│   ├── api.js                     # Axios client & API functions
│   └── auth.js                    # Zustand auth store
├── public/                        # Static assets
├── .env.example                   # Environment template
├── next.config.js                 # Next.js config
├── tailwind.config.js             # Tailwind config
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## Installation

```bash
cd frontend
npm install
```

## Running

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

Frontend runs on `http://localhost:3000`

## Pages

### 1. Home Page (`/`)

**Features:**
- Hero section with gradient background
- 6 feature cards (Positional Indexing, TF-IDF, Boolean Search, Encryption, Auth, Security)
- "How It Works" section (4 steps)
- Call-to-action section
- Framer Motion animations

**Components:**
```javascript
// Hero with search icon
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  <h1>Secure Information Retrieval System</h1>
</motion.div>

// Feature cards
features.map(feature => (
  <motion.div whileHover={{ y: -5 }}>
    <Icon />
    <h3>{feature.title}</h3>
    <p>{feature.description}</p>
  </motion.div>
))
```

### 2. Login Page (`/auth/login`)

**Features:**
- Email/password form with validation
- Google OAuth button with SVG icon
- Error display with AlertCircle
- Loading states
- Redirect to `/upload` on success

**API Integration:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await login({ email, password });
  login(response.data.token, response.data.user);
  router.push('/upload');
};
```

### 3. Register Page (`/auth/register`)

**Features:**
- Email/password registration form
- Password confirmation validation
- Google OAuth option
- Success redirect to login

### 4. Upload Page (`/upload`)

**Features:**
- Drag-and-drop zone (.txt files only)
- File preview cards with delete buttons
- Batch upload with progress
- Document table with filename, hash, date, delete action
- AuthGuard wrapper (protected route)

**Upload Flow:**
```javascript
const handleUpload = async () => {
  const formData = new FormData();
  selectedFiles.forEach(file => formData.append('files', file));
  
  await uploadDocuments(formData);
  loadDocuments(); // Refresh list
};
```

### 5. Index Page (`/index`)

**Features:**
- "Build Index" button (triggers Spark job)
- Stats cards (Total Terms, Documents, Index Entries)
- Search filter for terms
- Index display in EXACT format: `< term doc1: pos1, pos2; doc2: pos1 >`
- Loading states with Loader2 spinner
- AuthGuard wrapper

**Index Format:**
```javascript
// Backend returns:
{
  "term": {
    "doc1.txt": [1, 5, 10],
    "doc2.txt": [3, 7]
  }
}

// Frontend displays:
< term doc1.txt: 1, 5, 10; doc2.txt: 3, 7 >
```

### 6. Search Page (`/search`)

**Features:**
- Large search input with Search icon
- Example query chips (clickable):
  - `fools fear in` (phrase)
  - `fools AND fear` (boolean AND)
  - `angels AND NOT fear` (boolean AND NOT)
- Operator helper badges (AND, AND NOT)
- Results with:
  - Cosine similarity score (badge with color gradient)
  - Document filename
  - Highlighted snippet (terms in yellow)
- Empty state for no results
- AuthGuard wrapper

**Query Examples:**
```javascript
const examples = [
  { label: 'Phrase: "fools fear in"', query: 'fools fear in' },
  { label: 'AND: "fools AND fear"', query: 'fools AND fear' },
  { label: 'AND NOT: "angels AND NOT fear"', query: 'angels AND NOT fear' }
];

// Highlight terms in snippet
const highlightTerms = (text, terms) => {
  return text.replace(
    new RegExp(`(${terms.join('|')})`, 'gi'),
    '<mark class="bg-yellow-200">$1</mark>'
  );
};
```

### 7. TF-IDF Page (`/tfidf`)

**Features:**
- 4 tabs:
  1. **Term Frequency**: Matrix table (terms × documents)
  2. **IDF Values**: List with horizontal bar charts
  3. **TF-IDF Matrix**: Heatmap with color gradient
  4. **Normalized TF-IDF**: Normalized values table
- Export to CSV button
- Color-coded heatmap (intensity based on value)
- AuthGuard wrapper

**Heatmap:**
```javascript
<td
  style={{
    backgroundColor: value > 0 
      ? `rgba(79, 70, 229, ${Math.min(value * 100, 100) / 200})` 
      : 'transparent'
  }}
>
  {value.toFixed(4)}
</td>
```

## Components

### Navbar

**Features:**
- Logo and site title
- Conditional nav links (authenticated vs guest)
- User dropdown with logout
- Mobile hamburger menu
- Google OAuth sign-in button
- Responsive design

**Navigation:**
```javascript
{isAuthenticated ? (
  <>
    <Link href="/upload">Upload</Link>
    <Link href="/index">Index</Link>
    <Link href="/search">Search</Link>
    <Link href="/tfidf">TF-IDF</Link>
  </>
) : (
  <>
    <Link href="/auth/login">Sign In</Link>
    <Link href="/auth/register">Sign Up</Link>
  </>
)}
```

### AuthGuard

**Purpose:** Protect routes requiring authentication

**Behavior:**
- Checks `isAuthenticated` from Zustand store
- Redirects to `/auth/login` if not authenticated
- Shows loading spinner during check
- Renders children if authenticated

```javascript
export default function AuthGuard({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated]);
  
  if (!isAuthenticated) return <Loader />;
  return children;
}
```

## State Management

### Zustand Auth Store (`lib/auth.js`)

```javascript
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      }
    }),
    { name: 'auth-storage' }
  )
);
```

**Persistence:** Uses `zustand/middleware` to sync with localStorage

## API Client

### Axios Instance (`lib/api.js`)

**Configuration:**
```javascript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});
```

**Request Interceptor:**
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Response Interceptor:**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
```

### API Functions

**Authentication:**
- `register(data)` - POST /auth/register
- `login(data)` - POST /auth/login
- `logout()` - POST /auth/logout

**Documents:**
- `uploadDocuments(formData)` - POST /documents
- `getDocuments()` - GET /documents
- `deleteDocument(id)` - DELETE /documents/:id

**Indexing:**
- `buildIndex()` - POST /index/build
- `getIndex()` - GET /index
- `getIndexStats()` - GET /index/stats

**Search & TF-IDF:**
- `searchQuery(query)` - POST /search/query
- `getTermFrequency()` - GET /search/tf
- `getIDF()` - GET /search/idf
- `getTFIDFMatrix()` - GET /search/tfidf
- `getNormalizedTFIDF()` - GET /search/normalized

## Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo-600
      }
    }
  }
};
```

### Global Styles

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
```

## Animations

### Framer Motion Patterns

**Page Transitions:**
```javascript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {content}
</motion.div>
```

**Hover Effects:**
```javascript
<motion.div
  whileHover={{ y: -5, scale: 1.02 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  {card}
</motion.div>
```

**Stagger Children:**
```javascript
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.1 } }
  }}
>
  {items.map(item => (
    <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

## Responsive Design

**Breakpoints:**
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px

**Mobile Menu:**
```javascript
const [mobileOpen, setMobileOpen] = useState(false);

<button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
  <Menu />
</button>

{mobileOpen && (
  <div className="md:hidden">
    {navLinks}
  </div>
)}
```

## Form Validation

**Email Validation:**
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  setError('Invalid email format');
  return;
}
```

**Password Validation:**
```javascript
if (password.length < 8) {
  setError('Password must be at least 8 characters');
  return;
}
```

## Error Handling

**Display Errors:**
```javascript
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-center">
      <AlertCircle className="text-red-600 mr-2" />
      <p className="text-red-800">{error}</p>
    </div>
  </div>
)}
```

**Success Messages:**
```javascript
{success && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <p className="text-green-800">{success}</p>
  </div>
)}
```

## Performance

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: next/image component
- **Font Optimization**: next/font with Inter
- **API Caching**: React Query could be added for caching

## Testing

```bash
# Run development server
npm run dev

# Test pages:
# - http://localhost:3000 (home)
# - http://localhost:3000/auth/login
# - http://localhost:3000/upload
# - http://localhost:3000/index
# - http://localhost:3000/search
# - http://localhost:3000/tfidf
```

## Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Troubleshooting

### "localStorage is not defined"
- Ensure client-side only access
- Use `'use client'` directive
- Check `typeof window !== 'undefined'`

### API Connection Error
- Verify backend is running on port 5000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Inspect browser console for CORS errors

### Auth Redirect Loop
- Clear localStorage: `localStorage.clear()`
- Check token expiration
- Verify JWT_SECRET matches backend

### Framer Motion Warnings
- Ensure motion components have valid initial/animate props
- Use `layout` prop for layout animations

## Dependencies

```json
{
  "next": "^14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "axios": "^1.6.2",
  "zustand": "^4.4.7",
  "framer-motion": "^10.16.16",
  "lucide-react": "^0.303.0",
  "tailwindcss": "^3.4.0",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32"
}
```

---

Built for the IR & ISS course at FCAI Cairo University.
