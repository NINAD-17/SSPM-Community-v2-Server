# SSPM Community v2 — Server (Backend API)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.9-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?style=flat-square&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ML_Model-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)

The RESTful API backend for **SSPM Community v2** — providing secure authentication, social feeds, group management, direct messaging, background scheduling, and AI-driven group recommendations. Built with **Node.js**, **Express.js**, **MongoDB (Mongoose)**, and **Cloudinary**.

---

## 🚀 Key Engineering Features

### 1. Multi-Step 2FA Authentication & Security
* **Email OTP Verification**: Registration and login require 6-digit OTP verification sent via Nodemailer SMTP.
* **JWT Access & Refresh Token Rotation**: Uses short-lived access tokens (15m) and long-lived refresh tokens (7d) stored in secure, `httpOnly`, `SameSite: None` cookies to prevent XSS and CSRF attacks.
* **Bcrypt Password Hashing**: Passwords are automatically hashed with a salt work factor before saving to the database.
* **Non-Blocking User Activity Tracking**: When verifying tokens, the user's `lastActive` timestamp updates asynchronously in the background so API requests respond with minimal latency.

### 2. Fast Keyset (Cursor-Based) Pagination
* Instead of slow offset pagination (`skip()` which gets slower as data grows), the post feed uses **keyset cursor pagination** (`_id < lastPostId`).
* This keeps feed loading fast and prevents duplicate or missed posts when new items are added while a user is scrolling.

### 3. Smart Media Uploads with Automatic Rollback
* **Two-Phase Upload**: Media files (images, videos, PDFs up to 50MB) are uploaded to Cloudinary via Multer, returning secure CDN URLs.
* **Automatic Rollback**: If saving the post to MongoDB fails after uploading, the server immediately deletes the newly uploaded files from Cloudinary using `Promise.all`. This prevents orphaned files from wasting cloud storage.

### 4. Polymorphic Database Architecture
* Reusable interaction schemas (`Like`, `Comment`, `Report`) use dynamic `postType` identifiers (`"UserPost"`, `"GroupPost"`, `"Opportunity"`).
* This eliminates duplicate database tables and allows the same like and comment endpoints to work across different content types.

### 5. Scalable Group Memberships
* Instead of storing member arrays inside the Group document (which would hit MongoDB's 16MB document size limit), memberships are normalized into a separate `GroupMembership` collection.
* Supports role-based permissions (`Admin`, `Member`) and join approvals (`pending`, `accepted`).

### 6. Background Inactivity Scheduler
* **Automated Weekly Job**: Runs every Sunday at 02:00 AM using `node-schedule` to find users who have been inactive for $\ge 14\text{ days}$.
* **Batched Email Sending**: Sends re-engagement emails in batches of 50 with a 5-second pause between batches to avoid hitting Gmail SMTP rate limits.
* **Single-Query Bulk Writes**: Uses `User.bulkWrite` to update all user records in a batch in one database round-trip.

### 7. Machine Learning Group Recommendation
* Uses a **Support Vector Machine (SVM)** model trained with Scikit-learn in Python.
* Takes a user's skills, runs inference via a Python child process, and returns the most relevant groups for the student.

### 8. Request Validation & Sanitization
* **Joi Schemas**: Strict input validation on all write endpoints.
* **XSS Sanitization**: Recursively cleans all incoming request body fields using the `xss` library to prevent script injection.
* **Connection-Gated Messaging**: Validates that two users are connected before allowing them to start a direct message conversation.

---

## 🗄️ Database Collections (13 Models)

| Model / Collection | Description |
| :--- | :--- |
| **`User`** | User profiles, authentication data, academic details, and activity timestamps |
| **`UserPost`** | User-created posts with media attachments and text search index |
| **`Group`** | Community groups with categories, banner, avatar, and creator info |
| **`GroupMembership`** | Junction collection tracking user group roles and join request statuses |
| **`GroupPost`** | Discussions and updates posted within specific groups |
| **`Like`** | Polymorphic likes supporting UserPosts, GroupPosts, and Opportunities |
| **`Comment`** | Polymorphic comments supporting threaded discussions |
| **`Connection`** | 1-to-1 connections between users with status (`pending`, `accepted`, `rejected`) |
| **`Follower`** | Public follow relationships between users |
| **`Conversation`** | Chat threads between connected users |
| **`Message`** | Direct messages within conversations with read receipts and soft-deletion |
| **`Opportunity`** | Jobs, internships, and competition listings |
| **`Report`** | User-submitted content reports for moderation |

---

## API Overview

Base URL: `http://localhost:8000/api/v2`  
Complete Postman Documentation: [SSPM API Docs](https://documenter.getpostman.com/view/24888001/2sB2ca6KpJ)

### Main Route Groups:
* `/api/v2/auth` — Registration, login, 2FA OTP verification, token refresh, logout, password reset.
* `/api/v2/users` — User profile management, avatar uploads, search.
* `/api/v2/posts` — Feed posts, media upload, single post CRUD, user post history.
* `/api/v2/groups` — Group CRUD, member approvals, role management, ML recommendations.
* `/api/v2/group-posts` — Posts within specific groups.
* `/api/v2/opportunities` — Job and internship listings and filters.
* `/api/v2/conversations` — Conversation lists and connection verification.
* `/api/v2/messages` — Direct messaging, reverse cursor pagination, read receipts.
* `/api/v2/connections` — Connection requests, accept/reject, my connections.
* `/api/v2/followers` — Follow/unfollow users and follower lists.
* `/api/v2/likes` & `/api/v2/comments` — Polymorphic interactions.
* `/api/v2/admin` — Inactive user analytics and manual notification dispatch.

---

## 📁 Project Structure

```
Server/
├── public/temp/                  # Temporary storage for file uploads before Cloudinary
├── src/
│   ├── config/                   # Configuration for Cloudinary, Nodemailer, etc.
│   ├── controllers/              # 16 Controller files handling request logic
│   ├── db/
│   │   └── index.js              # MongoDB connection setup
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT verification & Admin role check
│   │   ├── connection.middleware.js # Blocks messaging if not connected
│   │   ├── multer.middleware.js  # File upload validator and size limits
│   │   └── validation.middleware.js # Joi schemas & XSS sanitization
│   ├── ml/                       # Scikit-learn SVM recommendation model & runner
│   │   ├── model/                # Pickled SVM model and vectorizer
│   │   ├── scripts/predict.py    # Python inference script
│   │   └── service.js            # Node child_process wrapper
│   ├── models/                   # 13 Mongoose database schemas
│   ├── routes/                   # 16 Express route files
│   ├── services/
│   │   ├── emailService.js       # Nodemailer email sender
│   │   ├── inactiveUsers.service.js # Inactive user query & bulk notification
│   │   └── scheduler.service.js  # node-schedule weekly cron job
│   ├── utils/
│   │   ├── apiError.js           # Standard error response class
│   │   ├── apiResponse.js        # Standard success response class
│   │   ├── asyncHandler.js       # Async wrapper to catch controller errors
│   │   └── cloudinary.js         # Cloudinary upload and delete functions
│   ├── validators/               # Joi request validation schemas
│   ├── app.js                    # Express app configuration & middleware
│   └── index.js                  # Server entry point & DB connection
└── package.json
```

---

## 🚦 Getting Started

### Prerequisites
* **Node.js**: v18 or higher
* **MongoDB**: Local MongoDB instance or MongoDB Atlas URI
* **Python 3**: With `scikit-learn` and `joblib` (for group recommendation)

### 1. Installation
```bash
# Navigate to Server folder
cd Server

# Install dependencies
npm install
```

### 2. Environment Setup
Create a `.env` file in the `Server/` directory:

```env
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database Connection
DEV_MONGODB_URI=mongodb://localhost:27017/sspm_dev
PROD_MONGODB_URI=your_mongodb_atlas_uri

# JWT Authentication
ACCESS_TOKEN_SECRET=your_access_token_secret_key
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key
REFRESH_TOKEN_EXPIRY=7d
OTP_TOKEN_SECRET=your_otp_token_secret_key

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Nodemailer (Email SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 3. Run the Server
```bash
# Development mode (with nodemon auto-restart)
npm run dev

# Production mode
npm run start
```
The server will start at `http://localhost:8000`.

---

## 📄 License
This project is licensed under the **ISC License**.
