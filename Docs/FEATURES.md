# TaskFlow — Features & Functional Specification

## 1. Purpose of This Document

This document defines the functional behavior of TaskFlow.

It describes:

- What features exist
- What each feature should do
- Which users can access each feature
- What Admins, Members, and Super Admins can do
- Which features are currently implemented
- Which features are planned

AI development tools should read this document before implementing or modifying TaskFlow functionality.

Do not add features that are outside this document unless explicitly requested.

---

# 2. User Roles

TaskFlow has three global roles:

```text
super_admin
admin
member
````

### Super Admin

Highest-level system authority.

### Admin

Project/team leader responsible for projects allocated to them.

### Member

Team member responsible for completing assigned work.

---

# 3. Authentication

## Login

Users can log into TaskFlow using Supabase Auth.

Expected behavior:

```text
Login
  ↓
Supabase Auth
  ↓
Successful authentication
  ↓
Dashboard
```

If authentication fails:

* Display an appropriate error message.
* Do not redirect to the dashboard.

If a user is not authenticated when accessing a protected page:

```text
Protected Page
    ↓
supabase.auth.getUser()
    ↓
No authenticated user
    ↓
Redirect to /
```

---

# 4. Signup

New users can register through the Signup page.

Supabase Auth handles:

* Email
* Password
* Authentication account
* Session

The `public.users` table stores:

* Full name
* Email
* Role

Passwords must never be stored in the `users` table.

---

# 5. Dashboard

Route:

```text
/dashboard
```

The Dashboard is the main landing page after login.

It should provide an overview of the user's relevant projects and work.

The exact dashboard information can vary according to the user's role.

## General Information

The Dashboard may show:

* Projects
* Project status
* Number of tasks
* Task progress
* Assigned work
* Recent relevant activity

## Admin Dashboard

An Admin should primarily see projects allocated to them.

## Member Dashboard

A Member should primarily see:

* Projects they belong to
* Their assigned work
* Task status
* Due dates
* Important task information

## Super Admin Dashboard

A Super Admin can see system-wide information.

The Super Admin should not be restricted to a single project.

---

# 6. Project Management

## Create Project

Route:

```text
/create-project
```

Authorized users can create projects.

A project contains:

* Name
* Description
* Owner
* Status
* Creation date

The project creator becomes the project's `owner_id`.

## Project Status

Only:

```text
active
on_hold
completed
```

are valid.

---

# 7. Project Detail

Route:

```text
/project/:projectId
```

The Project Detail page provides an overview of a specific project.

It should show:

* Project name
* Description
* Status
* Owner
* Team members
* Project tasks
* Relevant project information

The page should make it easy to understand the current state of the project.

## Project Actions

Authorized users should be able to:

* View project
* View members
* View tasks
* Navigate to task details
* Navigate to task creation
* Navigate to the Kanban board

Project management actions must respect the user's role and project access.

---

# 8. Project Members

Route:

```text
/add-member
```

Project members are managed through the project membership system.

## Admin / Super Admin

Authorized Admins and Super Admins can:

* Add members
* Invite users
* Assign an appropriate project role
* Manage project membership

When adding a normal team member, the default role should be:

```text
member
```

## Member

Members cannot:

* Add users
* Remove users
* Change project roles
* Manage project membership

---

# 9. Project Invitations

TaskFlow supports project invitations.

An authorized Admin or Super Admin can invite a user using their email address.

Invitation statuses:

```text
pending
accepted
rejected
```

## Invitation Workflow

```text
Admin / Super Admin
       ↓
Invite user
       ↓
Pending invitation
       ↓
Invited user sees notification
       ↓
Accept / Reject
```

If accepted:

* The user becomes a member of the project.
* The invitation status becomes `accepted`.

If rejected:

* The invitation status becomes `rejected`.
* The user is not added to the project.

---

# 10. Notifications

Route:

```text
/notifications
```

The initial notification system is intentionally simple.

The primary notification is:

**Pending project invitations**

A logged-in user should be able to see invitations where:

```text
invited_email = current user's email
AND
status = pending
```

The notification area should allow the user to:

* View the invitation
* Accept it
* Reject it

A separate notification database table is not currently required.

---

# 11. Task Management

Route:

```text
/create-task
```

Tasks belong to projects.

## Task Information

A task contains:

* Task token
* Title
* Description
* Status
* Priority
* Assignee
* Due date
* Creator
* Creation date

The task description contains the task's requirements/instructions.

There is no separate requirements field.

---

# 12. Task Creation

Only:

```text
admin
super_admin
```

can create tasks.

Members cannot create tasks.

When creating a task:

1. Select the project.
2. Enter task title.
3. Enter task description/requirements.
4. Select priority.
5. Select an assignee.
6. Set due date.
7. Create the task.

The assignee must be a member of the selected project.

The system should not allow a task to be assigned to an unrelated user.

---

# 13. Task Token

Task tokens are automatically generated.

Expected format:

```text
TASK-1
TASK-2
TASK-3
...
```

Users should not normally need to manually generate task tokens.

Each task token must be unique.

---

# 14. Task Status

Only three task statuses are valid:

```text
todo
in_progress
done
```

Normal workflow:

```text
todo
  ↓
in_progress
  ↓
done
```

The Kanban board uses these statuses.

---

# 15. Task Priority

Only three priority values are valid:

```text
high
medium
low
```

UI colors:

```text
high   → red
medium → yellow
low    → green
```

## Permissions

Admin:

* Can set/change priority.

Super Admin:

* Can set/change priority.

Member:

* Can view priority.
* Cannot change priority.

---

# 16. Task Due Date

The due date represents the task deadline.

Members should be able to clearly see the due date of their assigned work.

Admin and Super Admin:

* Can set due dates.
* Can modify due dates.

Member:

* Can view due dates.
* Cannot modify due dates.

Invalid/past due dates should be prevented according to the database/application validation rules.

---

# 17. Task Assignment

A task must be assigned to a member of its project.

Example:

```text
Project A
 ├── Member 1
 ├── Member 2
 └── Member 3

Task
 └── Assignee → Member 2
```

The system should prevent:

```text
Project A
Task
 └── Assignee → User who is not in Project A
```

Only authorized Admins and Super Admins can assign tasks.

Members cannot assign tasks to other users.

---

# 18. Kanban Board

Route:

```text
/kanban
```

The Kanban board provides visual task workflow management.

Columns:

```text
TODO
IN PROGRESS
DONE
```

Tasks can be moved using drag and drop.

Technology:

```text
@hello-pangea/dnd
```

When a task is moved:

```text
Drag task
   ↓
Determine new status
   ↓
Update tasks.status in Supabase
   ↓
Update UI
```

Members can move/update their assigned tasks according to their permissions.

Admins and Super Admins have broader task-management access.

---

# 19. Task Detail

Route:

```text
/task/:taskId
```

The Task Detail page should provide complete information about one task.

Display:

* Task token
* Title
* Description/requirements
* Status
* Priority
* Due date
* Assignee
* Creator
* Creation date
* Comments

The page should clearly communicate what the task requires and who is responsible for it.

---

# 20. Task Comments

Comments provide TaskFlow's primary communication mechanism.

Comments are attached to individual tasks.

Authorized users can:

* View comments
* Add comments

Comments are not currently:

* Editable
* Deletable

Keep the comment system simple.

Comments should display useful information such as:

* User name
* Comment text
* Creation time/date

---

# 21. Real-Time Task Updates

TaskFlow should support real-time updates for important task interactions.

Initial real-time scope:

### Task Status

When a task status changes, relevant users should see the updated status without manually refreshing.

### Comments

When a new comment is added, users viewing the task should see the new comment without manually refreshing.

Do not implement unnecessary real-time functionality outside these areas.

---

# 22. Workload

Route:

```text
/workload
```

The Workload page helps Admins and authorized users understand how much open work is assigned to team members.

Example:

```text
Member       Open Tasks
-----------------------
Rahul             5
Priya             2
Amit              7
```

Open tasks are tasks that are not completed.

Since the official completed status is:

```text
done
```

the initial workload calculation should count tasks where:

```text
status != done
```

The workload view should help an Admin identify uneven task distribution.

---

# 23. Profile

Route:

```text
/profile
```

The Profile page allows the current user to view and edit their application profile.

Display:

* Full name
* Email
* Role

The role should be displayed clearly.

The user should be able to edit appropriate profile information such as:

* Full name

Authentication credentials remain managed by Supabase Auth.

The Profile page must not directly modify passwords through the `users` table.

---

# 24. Super Admin Features

The Super Admin has system-wide authority.

Super Admin capabilities include:

### Users

* View users
* Manage users
* Change user roles

### Projects

* View all projects
* Manage projects
* Manage project membership
* Allocate projects/admin responsibilities

### Tasks

* View tasks
* Create tasks
* Assign tasks
* Modify task priority
* Modify due dates
* Manage task status

### System

* Access system-wide information
* Manage users and project access

The Super Admin is not restricted by normal project-level Admin boundaries.

---

# 25. Admin Features

Admins are team/project leaders.

An Admin can manage projects allocated to them by the Super Admin.

Admin capabilities include:

* View allocated projects
* Manage allocated projects
* Add project members
* Invite members
* Create tasks
* Assign tasks
* Set task priority
* Set task due dates
* Monitor task progress
* View workload
* Add/view task comments

An Admin must not automatically gain access to every project in the system.

---

# 26. Member Features

Members are focused on completing assigned work.

Members can:

* View projects they belong to
* View assigned tasks
* View task details
* View task requirements
* View task priority
* View due dates
* Update assigned task status
* Add task comments
* View task comments
* Provide work updates through comments

Members cannot:

* Create tasks
* Assign tasks
* Change priority
* Change due dates
* Manage projects
* Manage project members
* Change roles
* Access unrelated projects

---

# 27. Role Permission Summary

| Feature                     | Super Admin | Admin | Member           |
| --------------------------- | ----------- | ----- | ---------------- |
| View all users              | Yes         | No    | No               |
| Manage users                | Yes         | No    | No               |
| Change roles                | Yes         | No    | No               |
| View all projects           | Yes         | No    | No               |
| Manage allocated projects   | Yes         | Yes   | No               |
| Create projects             | Yes         | Yes*  | No               |
| Manage members              | Yes         | Yes   | No               |
| Invite members              | Yes         | Yes   | No               |
| Create tasks                | Yes         | Yes   | No               |
| Assign tasks                | Yes         | Yes   | No               |
| View assigned tasks         | Yes         | Yes   | Yes              |
| Update assigned task status | Yes         | Yes   | Yes              |
| Change priority             | Yes         | Yes   | No               |
| Change due date             | Yes         | Yes   | No               |
| View task comments          | Yes         | Yes   | Yes              |
| Add task comments           | Yes         | Yes   | Yes              |
| Edit comments               | No          | No    | No               |
| Delete comments             | No          | No    | No               |
| View workload               | Yes         | Yes   | Limited/relevant |
| Manage system               | Yes         | No    | No               |

`*` Project creation permissions should follow the finalized project-management workflow and authorization rules.

---

# 28. Current Feature Status

## Completed

* [x] Login
* [x] Signup
* [x] Dashboard
* [x] Create Project
* [x] Create Task
* [x] Kanban Board
* [x] Drag-and-drop task status updates
* [x] Add Member
* [x] Project invitations/basic invite functionality

## To Build / Improve

* [ ] Project Detail
* [ ] Task Detail
* [ ] Task Comments
* [ ] Workload
* [ ] Notifications
* [ ] Profile
* [ ] Real-time task status updates
* [ ] Real-time task comments
* [ ] Complete role-based authorization
* [ ] Complete RLS policies
* [ ] Shared reusable UI/layout components

---

# 29. Scope Control

TaskFlow is intentionally a small-scale project.

Do not add the following unless explicitly requested:

* Dedicated chat system
* File sharing
* File storage
* Payment system
* Mobile application
* Advanced analytics
* Complex reporting
* AI features
* External integrations
* Enterprise-level workflow automation
* Custom backend server
* Complex notification infrastructure

The goal is a polished, functional, understandable task-management system rather than a large enterprise platform.

---

# 30. Feature Development Rules

When implementing a feature:

1. Read this document first.
2. Check the database schema before writing database queries.
3. Check the architecture before introducing new technical patterns.
4. Inspect existing code before modifying it.
5. Preserve existing working functionality.
6. Respect role permissions.
7. Use Supabase Auth for authentication.
8. Use `public.users` for profile/role data.
9. Do not invent database columns.
10. Do not invent status/role values.
11. Handle loading states.
12. Handle errors.
13. Provide useful success feedback where appropriate.
14. Keep UI consistent with TaskFlow's design system.
15. Avoid unnecessary dependencies.
16. Keep implementations simple and suitable for a beginner-level project.
