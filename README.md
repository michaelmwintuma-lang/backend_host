BACKEND LINK : https://backend-host-1-6max.onrender.com









# Campus Collab - Backend API



##  Project Overview

This is the backend API server for **Campus Collab**, a team collaboration and task management platform. The backend provides RESTful API endpoints for user authentication, team management, and task operations.

---


---

##  Installation Instructions

### Prerequisites
- Node.js (v14 or higher) - [Download here](https://nodejs.org/)
- npm or yarn - Comes with Node.js
- PostgreSQL database - [Download here](https://www.postgresql.org/download/)
- Git - [Download here](https://git-scm.com/downloads)

### Setup Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/michaelmwintuma-lang/backend-host.git
   cd backend-host
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=4000
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=development
   ```
   <!-- REPLACE 'your_postgresql_connection_string' WITH YOUR ACTUAL DATABASE URL -->

4. **Database Setup**
   - Create a PostgreSQL database
   - The application uses the following tables:
     - `users` - User accounts
     - `teams` - Team information
     - `team_members` - Team membership
     - `tasks` - Task information
   - Update the `DATABASE_URL` in `.env` with your database connection string

5. **Run the Server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

   The server will run on `http://localhost:4000`

---

##  API Endpoints

### Authentication
- `POST /api/register` - Register new user
  - Body: `{ name, email, password }`
- `POST /api/login` - User login
  - Body: `{ email, password }`

### Teams
- `GET /api/team` - Get all teams
- `POST /api/team/create` - Create new team
  - Body: `{ teamName, user_Id }`
- `POST /api/team/join` - Join a team
  - Body: `{ teamId, user_Id }`
- `GET /api/team/:id` - Get team details
- `GET /api/team/:id/members` - Get team members
- `GET /api/team/:id/stats` - Get team statistics

### Tasks
- `GET /api/task/team/:teamId` - Get tasks by team
- `POST /api/task` - Create new task
  - Body: `{ team_id, title, description, assigned_to, due_date, status }`
- `PUT /api/task/:id` - Update task
  - Body: `{ title, description, status, due_date, assigned_to }`
- `DELETE /api/task/:id` - Delete task

### Health
- `GET /api/health` - Health check endpoint

---

##  Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **pg** - PostgreSQL client

---

##  Dependencies

```json
{
  "express": "^5.2.1",
  "pg": "^8.16.3",
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.5",
  "nodemon": "^3.1.11"
}
```

---

## 🔐 Security Features

- Password hashing with bcryptjs
- CORS enabled for cross-origin requests
- Input validation
- SQL injection prevention with parameterized queries

---

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env` file
- Ensure database tables are created
- Check SSL settings for cloud databases

### Port Already in Use
- Change `PORT` in `.env` file
- Or kill the process using port 4000

### CORS Errors
- Ensure CORS middleware is properly configured
- Check allowed origins in CORS settings

---

## 👤 Author

**Michael Mwintuma**


---

## 📄 License

This project is created for academic purposes.


---

**Last Updated:** December 2025
