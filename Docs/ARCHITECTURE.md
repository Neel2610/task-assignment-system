# TaskFlow — Architecture

## 1. Architecture Overview

TaskFlow is a frontend-focused web application built using React and Vite.

There is no custom backend server.

The application communicates directly with Supabase for:

* User authentication
* PostgreSQL database operations
* Real-time functionality

The general architecture is:

```text
React + Vite Frontend
        |
        | Supabase Client
        |
        v
     Supabase
     /      \
    /        \
 Auth       PostgreSQL
             |
          Realtime
```

The frontend is responsible for:

* Rendering the user interface
* Client-side navigation
* Form handling
* Loading and error states
* Displaying data
* Requesting data from Supabase
* Sending user actions to Supabase

Supabase is responsible for:

* Authentication
* Database storage
* Database relationships
* Row Level Security
* Realtime subscriptions

---

## 2. Technology Architecture

### Frontend

* React
* Vite
* Tailwind CSS
* React Router DOM v6
* @hello-pangea/dnd

### Backend / Services

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Realtime

### State Management

TaskFlow currently does not use a dedicated state-management library.

Use standard React state management such as:

* `useState`
* `useEffect`
* `useMemo` when appropriate

Do not introduce Redux, Zustand, or another state-management library unless there is a clear future requirement.

---

## 3. Supabase Client

TaskFlow uses a single shared Supabase client.

The client is located at:

```text
client/src/supabase.js
```

The application uses the environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Pages should use the existing Supabase client instead of creating their own clients.

Expected import convention:

```text
import { supabase } from '../supabase'
```

Do not create duplicate Supabase client instances inside pages or components.

---

## 4. Authentication Architecture

TaskFlow uses Supabase Auth for user authentication.

The application should treat the authenticated Supabase user as the primary identity of the user.

The application also maintains a corresponding record in the custom `users` table.

The intended relationship is:

```text
Supabase Auth
     |
     | authenticated user ID
     v
auth.users
     |
     v
public.users
     |
     +----------------+
     |                |
     v                v
 projects          tasks
     |
     v
project_members
```

The exact foreign-key relationship between `auth.users.id` and `users.id` should be verified in the database before implementing advanced authorization.

### Current Status

The authentication system is partially implemented.

Current functionality includes:

* Login through Supabase Auth
* Signup through Supabase Auth
* User record insertion into the `users` table

The complete authentication and authorization architecture still needs to be verified.

---

## 5. Authentication Check on Pages

Protected pages should verify authentication when they load.

The standard approach is:

```text
Page loads
    ↓
supabase.auth.getUser()
    ↓
Is authenticated?
    ├── No → redirect to /
    |
    └── Yes → load page data
```

Unauthenticated users should not be allowed to access protected application pages.

Use React Router navigation mechanisms for redirects.

---

## 6. Role Architecture

TaskFlow has three roles:

```text
super_admin
    |
    +---- admin
    |
    +---- member
```

The hierarchy represents authority, not necessarily a direct database relationship.

### Super Admin

The Super Admin has system-wide authority.

The Super Admin can:

* Manage users
* Change user roles
* Manage projects
* Manage project members
* Manage admins
* Manage members
* View all system information
* Manage tasks
* Override lower-level project restrictions when necessary

There should normally be only a small number of Super Admin users.

The Super Admin controls which Admins can manage which projects.

---

### Admin

An Admin is a project/team leader.

An Admin can manage one or multiple projects.

However, an Admin should only manage projects that have been allocated to them by a Super Admin.

Admin capabilities include:

* Create/manage tasks within authorized projects
* Assign tasks
* Add/manage project members
* Set task priority
* Set task due dates
* Monitor project progress
* View relevant workload
* Communicate through task comments

---

### Member

A Member is responsible for completing assigned tasks.

Members can:

* View projects they belong to
* View their assigned tasks
* Update the status of assigned tasks
* Add task comments
* View task descriptions and requirements
* View task priority
* View task due dates
* Provide task progress updates

Members cannot:

* Create tasks
* Assign tasks
* Change task priority
* Change task due dates
* Manage project members
* Manage projects
* Access other members' assigned task lists as their own workload

---

## 7. Role Assignment

Role management is primarily controlled by the Super Admin.

The intended role-management behavior is:

```text
Super Admin
     |
     +--> Create/manage users
     |
     +--> Change user role
     |
     +--> Allocate Admin to project
     |
     +--> Add/manage project members
```

Admins and Super Admins can add members to projects.

When adding a user to a project, the role within the project should default to:

```text
member
```

The role can be explicitly selected where authorized.

The exact UI and database implementation for role assignment should be kept consistent with the authorization rules.

---

## 8. Project Architecture

A project is the primary container for project-related work.

A project can have:

* One project record
* Multiple members
* Multiple admins
* Multiple tasks
* A project owner
* A project status

The `projects.owner_id` field represents the owner/creator associated with the project.

Project ownership and project membership are separate concepts.

For example:

```text
Project
  |
  +-- owner
  |
  +-- Admin A
  |
  +-- Admin B
  |
  +-- Member A
  |
  +-- Member B
  |
  +-- Tasks
```

A project may contain multiple authorized users and admins.

The exact business rule for whether the owner must be an Admin, Super Admin, or another authorized user should follow the actual implementation and authorization requirements.

---

## 9. Project Membership Architecture

The `project_members` table connects users with projects.

Conceptually:

```text
users
  |
  | many-to-many
  |
projects
```

The relationship is implemented through:

```text
project_members
```

A project member record contains:

* Project ID
* User ID
* Role within the project
* Joined date

This allows a user to belong to multiple projects.

It also allows a project to have multiple users.

A user may therefore have:

```text
User
 |
 +-- Project A → admin
 |
 +-- Project B → member
 |
 +-- Project C → member
```

The application should not assume that a user's global role alone determines their access to every project.

Project membership and authorization must also be considered.

---

## 10. Task Architecture

Tasks belong to projects.

The intended relationship is:

```text
Project
   |
   +---- Tasks
           |
           +---- Assignee
           |
           +---- Creator
           |
           +---- Comments
```

Each task contains an `assignee_id`.

A task should only be assigned to a user who is a member of the corresponding project.

The intended validation is:

```text
Task project
     |
     v
Is assignee a member of this project?
     |
   Yes → allow assignment
   No  → reject assignment
```

This rule should be enforced as securely as possible through database authorization/validation rather than relying only on frontend UI restrictions.

---

## 11. Task Status Updates

Task status changes are an important part of TaskFlow's workflow.

The Kanban board uses drag-and-drop functionality to change task status.

The intended flow is:

```text
User drags task
      ↓
React updates request
      ↓
Supabase updates task.status
      ↓
Realtime event
      ↓
Relevant UI updates
```

Members should be able to update the status of tasks assigned to them.

Admins and Super Admins have broader task-management authority.

The exact list of valid statuses is defined separately in `DATABASE_SCHEMA.md`.

---

## 12. Task Comments

Comments are attached directly to tasks.

The intended relationship is:

```text
Task
 |
 +-- Comment
 |     |
 |     +-- User
 |
 +-- Comment
       |
       +-- User
```

Task comments provide the communication mechanism within TaskFlow.

Users with access to a task can use comments for:

* Updates
* Questions
* Clarifications
* Task-related discussions
* Progress information

Task comments should remain associated with their task rather than becoming a separate chat system.

---

## 13. Real-Time Architecture

Supabase Realtime is intended to be used for two primary areas:

### Task Status Changes

When an authorized user changes a task's status, relevant interfaces should receive the update without requiring a manual page refresh.

### Task Comments

When a new comment is added to a task, users viewing that task should be able to receive the new comment without manually refreshing.

Current status:

**Realtime has not yet been implemented.**

Realtime should be added after the basic CRUD functionality is stable.

Do not introduce realtime subscriptions everywhere unnecessarily.

---

## 14. Routing Architecture

TaskFlow uses:

```text
react-router-dom v6
```

The current routing system is defined in:

```text
client/src/App.jsx
```

Current routes include:

```text
/                  → Login
/signup            → Signup
/dashboard         → Dashboard
/create-project    → CreateProject
/create-task       → CreateTask
/kanban            → KanbanBoard
/add-member        → AddMember
```

Future routes are expected to include:

```text
/project/:projectId
/task/:taskId
/workload
/notifications
/profile
```

Protected routes should verify authentication.

A future shared protected layout may be introduced to avoid repeating authentication and layout logic across every page.

---

## 15. Layout Architecture

TaskFlow uses a consistent application layout.

The intended structure is:

```text
┌─────────────────┬─────────────────────────────────┐
│                 │                                 │
│    Sidebar      │          Main Content            │
│                 │                                 │
│  Dashboard      │                                 │
│  Projects       │                                 │
│  Workload       │                                 │
│  Notifications  │                                 │
│  Profile        │                                 │
│                 │                                 │
│  Logout         │                                 │
│                 │                                 │
└─────────────────┴─────────────────────────────────┘
```

The sidebar should use the TaskFlow dark theme.

Pages should share the same general layout instead of implementing completely different layouts.

Reusable layout and UI components may be introduced to improve consistency and development speed.

---

## 16. Reusable Components

The current application does not yet have a dedicated reusable component architecture.

As development continues, common UI elements should be extracted into reusable components when doing so improves consistency.

Potential reusable components include:

```text
components/
├── Layout.jsx
├── Sidebar.jsx
├── Button.jsx
├── Card.jsx
├── Badge.jsx
├── LoadingSpinner.jsx
├── ErrorMessage.jsx
├── Modal.jsx
└── ...
```

Do not create unnecessary abstractions.

A component should be extracted when:

* It is used multiple times
* It represents a common UI pattern
* It makes pages easier to maintain
* It improves visual consistency

---

## 17. Data Flow

The basic data flow is:

```text
User Action
     ↓
React Component
     ↓
Supabase Client
     ↓
PostgreSQL
     ↓
React State Update
     ↓
UI
```

For realtime-enabled features:

```text
Database Change
     ↓
Supabase Realtime
     ↓
React Subscription
     ↓
React State
     ↓
UI Update
```

Pages should avoid unnecessary duplicate database requests.

Where practical, related information should be fetched efficiently.

---

## 18. Authorization Architecture

Authorization is currently incomplete.

Some database access policies exist, but the complete RLS architecture has not yet been finalized.

Current understanding:

* Some select/insert operations are working
* RLS policies may already exist
* Full role-based authorization is not yet confirmed

This must be treated as an unfinished architectural area.

Frontend role checks alone are not sufficient for security.

The final system should use Supabase Row Level Security to enforce important permissions at the database level.

The intended authorization model is:

```text
Authentication
      ↓
Who is the user?
      ↓
Global role
      ↓
Project membership / project allocation
      ↓
What can this user access?
      ↓
Database RLS
```

The exact RLS policies should be documented and implemented separately after the actual database structure is verified.

---

## 19. Current Architecture Status

### Implemented

* React + Vite frontend
* Tailwind CSS
* Supabase client
* Supabase authentication
* PostgreSQL database
* React Router
* Task drag-and-drop using @hello-pangea/dnd
* Basic project/task CRUD functionality

### Not Yet Implemented

* Complete RLS authorization
* Supabase Realtime
* Shared reusable component architecture
* Shared protected application layout
* Complete role-management workflow
* Complete project-level authorization
* Finalized notification architecture

These areas should be implemented incrementally without breaking existing functionality.

---

## 20. Architecture Principles

When modifying TaskFlow, follow these principles:

1. Keep the architecture simple.
2. Do not introduce a custom backend server.
3. Use the existing Supabase client.
4. Do not create unnecessary dependencies.
5. Prefer React's built-in state management for the current project scale.
6. Keep authentication separate from authorization.
7. Treat project membership as an important part of authorization.
8. Tasks should only be assigned to project members.
9. Enforce important permissions at the database/RLS level.
10. Use Realtime only where it provides meaningful value.
11. Reuse common UI components where appropriate.
12. Preserve existing working functionality.
13. Inspect the existing implementation before modifying it.
14. Prefer simple, maintainable solutions over enterprise-level complexity.
15. Keep the architecture easy to explain during a college project demonstration and viva.
