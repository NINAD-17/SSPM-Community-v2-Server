# SSPM Community v2 - Server

A robust Node.js backend for the SSPM Community platform, providing RESTful APIs for user management, event handling, and content management. Built with Express.js, MongoDB, and JWT authentication.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, User)
  - Secure password hashing with bcrypt
  - Token refresh mechanism

- **User Management**
  - User registration and profile management
  - Network connections (followers, connections)
  - User search and filtering
  - Profile customization

- **Content Management**
  - Post creation and management
  - Media file uploads (images, documents)
  - Content moderation
  - Feed generation with pagination

- **Event Management** (under development)
  - Event CRUD operations
  - Event registration and ticketing
  - QR code-based ticket verification
  - Event statistics and analytics
  - Media attachments for events

- **Opportunities**
  - Job and internship listings
  - Opportunity filtering and search

- **Direct Messaging**
  - Real-time messaging between users
  - Message history
  - Read receipts and typing indicators (under development)
  - File sharing in messages

## 🛠️ Tech Stack

- **Backend Framework**
  - Express.js
  - MongoDB with Mongoose ODM
  - Socket.IO for real-time features

- **Authentication & Security**
  - JSON Web Tokens (JWT)
  - bcrypt for password hashing
  - Express-rate-limit for rate limiting

- **File Handling**
  - Multer for file uploads
  - Cloudinary for media storage

- **Development Tools**
  - Nodemon for development
  - Prettier

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add necessary environment variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 🚀 Development

To start the development server:

```bash
npm run dev
```

The server will be available at `http://localhost:8000`

## 🏗️ Production

To start the production server:

```bash
npm start
```

## 📁 Project Structure

```
src/
├── config/       # Configuration files
├── controllers/  # Route controllers
├── middleware/   # Custom middleware
├── models/       # Mongoose models
├── routes/       # API routes
├── services/     # Business logic
├── utils/        # Utility functions
└── app.js        # Express application
```

## 📚 API Documentation

The API documentation is available at <a href="https://documenter.getpostman.com/view/24888001/2sB2ca6KpJ">postman docs</a>

<!-- ### Main Endpoints -->

<!-- - **Auth**: `/api/auth/*`
  - POST `/register` - User registration
  - POST `/login` - User login
  - POST `/refresh-token` - Refresh access token
  - POST `/logout` - User logout -->

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

