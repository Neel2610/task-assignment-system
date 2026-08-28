# TaskFlow Node.js Backend Server

A lightweight, dedicated Express.js backend server for the **TaskFlow** Project Management & Task Assignment System.

---

## 🚀 Overview

The TaskFlow backend server provides essential auxiliary backend services for the TaskFlow web application:
- **System Health & Uptime Monitoring**: Health checks with human-readable uptime statistics and environment info.
- **Application Metadata**: Centralized metadata endpoint detailing project specifications, tech stack, author credentials, and supported features.
- **In-Memory Activity Logging**: Real-time logging of user activities (logins, project creations, task assignments) with automatic log rotation (last 100 entries capped).
- **System Diagnostics & Stats**: Real-time Node.js process metrics including heap memory consumption, platform, and runtime version.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Steps to Run

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env`):**
   A default `.env` file is included with the following configuration:
   ```env
   PORT=3001
   APP_NAME=TaskFlow
   APP_VERSION=1.0.0
   APP_AUTHOR=Neel
   COLLEGE=H.N. Shukla College of IT and Management
   UNIVERSITY=Saurashtra University
   ```

4. **Start the server:**
   - **Development Mode (with auto-reload via nodemon):**
     ```bash
     npm run dev
     ```
   - **Production Mode:**
     ```bash
     npm start
     ```

5. The server will run on `http://localhost:3001`.

---

## 📡 API Endpoints

### 1. `GET /api/health`
Returns the operational health and uptime of the server.

- **Example Response:**
  ```json
  {
    "status": "OK",
    "app": "TaskFlow",
    "version": "1.0.0",
    "uptime": 125.42,
    "uptimeFormatted": "2m 5s",
    "timestamp": "2026-08-28T10:15:30.000Z",
    "server": "TaskFlow Node.js Server",
    "port": "3001"
  }
  ```

---

### 2. `GET /api/app-info`
Provides comprehensive details regarding the application, university affiliation, and technological architecture.

- **Example Response:**
  ```json
  {
    "name": "TaskFlow",
    "version": "1.0.0",
    "description": "Project Management and Task Assignment System",
    "author": "Neel",
    "college": "H.N. Shukla College of IT and Management",
    "university": "Saurashtra University",
    "techStack": {
      "frontend": "React + Vite + Tailwind CSS",
      "backend": "Node.js + Express",
      "database": "PostgreSQL via Supabase",
      "auth": "Supabase Auth",
      "deployment": "Local"
    },
    "features": [
      "Role-based access control",
      "Kanban board with drag and drop",
      "Real-time project management",
      "Task assignment and tracking",
      "Team collaboration",
      "Activity logging"
    ]
  }
  ```

---

### 3. `POST /api/log`
Records an action/activity in the server's in-memory activity ring buffer (up to 100 entries).

- **Request Body:**
  ```json
  {
    "action": "User Login",
    "user": "alex@company.com",
    "page": "Login",
    "details": "Successful authentication"
  }
  ```

- **Example Response:**
  ```json
  {
    "logged": true,
    "timestamp": "2026-08-28T10:15:30.000Z"
  }
  ```

---

### 4. `GET /api/logs`
Fetches the most recent 50 activity logs and total count.

- **Example Response:**
  ```json
  {
    "logs": [
      {
        "id": "1724838930000-abc123xyz",
        "timestamp": "2026-08-28T10:15:30.000Z",
        "method": "POST",
        "url": "/api/log",
        "user": "alex@company.com",
        "action": "User Login",
        "page": "Login",
        "details": "Successful authentication",
        "ip": "::1"
      }
    ],
    "total": 1
  }
  ```

---

### 5. `DELETE /api/logs`
Clears all entries from the activity log.

- **Example Response:**
  ```json
  {
    "cleared": true,
    "message": "Activity log cleared"
  }
  ```

---

### 6. `GET /api/stats`
Returns system memory consumption, process uptime, and Node.js runtime information.

- **Example Response:**
  ```json
  {
    "totalLogsRecorded": 1,
    "serverStartTime": "2026-08-28T10:13:24.578Z",
    "uptime": 125.42,
    "nodeVersion": "v20.10.0",
    "platform": "win32",
    "memoryUsage": "24.58 MB"
  }
  ```

---

## 🔗 Integration with React Frontend (`client/`)

The React frontend (`client/`) communicates directly with this Express server on `http://localhost:3001`:

1. **User Authentication Logging (`Login.jsx`)**:
   Sends activity telemetry on successful login.
2. **Server Connectivity Handshake (`Dashboard.jsx`)**:
   Queries `/api/app-info` on dashboard load to verify server connection and fetch project metadata.
3. **Audit Trail Logging (`CreateProject.jsx` & `CreateTask.jsx`)**:
   Dispatches audit events when projects or tasks are created.
4. **Resilient Communication**:
   Frontend API calls are wrapped in non-blocking try-catch blocks, allowing the React app to function seamlessly even if the Node server is offline.
