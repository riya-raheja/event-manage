# Event Management System

A full-stack event management web application with AI-powered features, 3D UI, and real-time notifications.

## Features

- User Authentication (Sign up & Login)
- Event Management (CRUD operations)
- Calendar View with FullCalendar.js
- Smart AI Features:
  - Event Description Generation
  - Checklist Generation
  - Scheduling Suggestions
  - AI Chat Assistant
- 3D UI with Three.js and GSAP animations
- Dark/Light Mode
- Email and Browser Push Notifications
- Responsive Design

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Three.js, GSAP
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT
- AI: OpenAI API
- Notifications: Nodemailer, Push.js

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- OpenAI API Key
- Email service credentials (for notifications)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/event-management-app.git
cd event-management-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/event-management
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
EMAIL_FROM=your_email@gmail.com

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
event-management-app/
├── src/
│   ├── controllers/
│   │   ├── User.js
│   │   └── Event.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── events.js
│   │   └── ai.js
│   ├── middleware/
│   │   └── auth.js
│   ├── services/
│   │   └── notificationService.js
│   ├── public/
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   └── app.js
│   │   └── index.html
│   └── server.js
├── .env
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user

### Events
- GET /api/events - Get all events
- POST /api/events - Create new event
- GET /api/events/:id - Get single event
- PUT /api/events/:id - Update event
- DELETE /api/events/:id - Delete event

### AI Features
- POST /api/ai/generate-description - Generate event description
- POST /api/ai/generate-checklist - Generate event checklist
- GET /api/ai/scheduling-suggestions - Get scheduling suggestions
- POST /api/ai/generate-summary - Generate event summary

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- FullCalendar.js for the calendar component
- Three.js for 3D graphics
- GSAP for animations
- OpenAI for AI capabilities 