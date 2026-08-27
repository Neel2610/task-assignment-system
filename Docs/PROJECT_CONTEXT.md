# TaskFlow — Project Context

## 1. Project Identity

**Application Name:** TaskFlow

**Official Academic Project Title:** Task Assignment System

**Project Type:** College project / beginner-level web application

TaskFlow is a small-scale, general-purpose project and task management application designed to help teams organize their work, assign responsibilities, communicate about tasks, and maintain clear visibility of project progress.

Although TaskFlow is being developed and submitted as a college project, its concept is general-purpose rather than being restricted to academic or student use.

---

## 2. Main Purpose

The primary purpose of TaskFlow is to manage **workflow, task responsibility, and task-related communication** in one place.

The system should help users understand:

* What work needs to be done
* Who is responsible for each task
* What the requirements of a task are
* When a task is due
* What the current status of the work is
* What updates or discussions are associated with a task
* What work has already been completed

The application should provide a clear understanding of the project's work without requiring users to rely on separate communication or task-tracking methods.

---

## 3. Core Concept

TaskFlow follows a simple workflow:

**User Login**
→ **Dashboard**
→ **Project**
→ **Project Team**
→ **Create Tasks**
→ **Assign Tasks**
→ **Work on Tasks**
→ **Update Task Status**
→ **Discuss Through Task Comments**
→ **Monitor Project Progress**

The system should keep this workflow simple and understandable.

TaskFlow is not intended to be an enterprise project-management platform. It is a focused, beginner-level system demonstrating the core concepts of project management and task assignment.

---

## 4. User Roles

TaskFlow has three main roles.

### 4.1 Super Admin

The Super Admin is the highest-authority user in the system.

The Super Admin is responsible for managing the overall system and has authority over all users, projects, tasks, and teams.

The Super Admin can:

* View all users
* Manage users
* Manage user roles
* View all projects
* Manage all projects
* Manage project members
* View and manage tasks
* Assign/manage admins for projects
* Control which projects an admin can manage
* Access system-wide information
* Perform actions available to lower-level roles when necessary

The Super Admin should have the highest level of access and should not be restricted to a single project.

---

### 4.2 Admin

An Admin acts as a **team leader / project manager**.

An Admin manages projects allocated to them by the Super Admin.

An Admin may manage multiple projects, but access to those projects is controlled by the Super Admin.

Admin responsibilities include:

* Managing allocated projects
* Managing project members
* Creating tasks
* Assigning tasks to team members
* Setting task priority
* Setting task due dates
* Monitoring task progress
* Viewing project workload
* Communicating with team members through task comments
* Monitoring whether work is progressing as expected

An Admin should not automatically have access to every project in the system. Their project access must be based on projects allocated to them.

---

### 4.3 Member

A Member is a team member responsible for completing assigned work.

Members should have access to the work they are responsible for and should be able to provide updates about that work.

Members can:

* View projects they belong to
* View tasks assigned to them
* Update the status of their assigned tasks
* Add comments to tasks they can access
* Provide task-related updates
* View task requirements/details
* View task priority
* View task due dates
* View relevant project information

Members cannot:

* Create tasks
* Assign tasks to other users
* Change task priority
* Change task due dates
* View other members' private/assigned task workload through the task list
* Manage project members
* Manage projects

The Member role should remain focused on **completing assigned work and communicating updates**.

---

## 5. TaskFlow's Main Value

TaskFlow should provide users with a clear picture of project work.

For a team member, the application should answer questions such as:

* What task do I need to complete?
* What are the requirements of the task?
* When is it due?
* What is its current status?
* What priority does it have?
* What discussion or updates exist for the task?

For an Admin, the application should additionally answer:

* Who is responsible for each task?
* Which tasks are still open?
* What is the progress of the project?
* How much work is assigned to each team member?
* What updates are team members providing?

For the Super Admin, the application should provide system-wide visibility and authority.

---

## 6. Communication Model

TaskFlow uses **task-based communication**.

Each task can have a comment section where authorized users can discuss that specific task.

Comments are intended for:

* Progress updates
* Questions
* Clarifications
* Work-related discussions
* Information about task requirements
* Reporting task progress

TaskFlow does not currently include a separate general-purpose chat or messaging system.

Keeping communication attached to tasks helps ensure that discussions remain connected to the work they refer to.

---

## 7. Real-Time Functionality

TaskFlow should use Supabase real-time capabilities where appropriate.

The initial real-time requirements are:

### Task Status Updates

When a task status changes, relevant users should be able to see the updated status without manually refreshing the page.

### Task Comments

When a new comment is added to a task, relevant users should be able to see the new comment without manually refreshing the page.

Real-time functionality should remain focused on these useful project-management interactions rather than introducing unnecessary real-time features.

---

## 8. Project Management Model

A project is the main container for a team's work.

A project can have:

* A project name
* A project description
* An owner/administrator
* A status
* Multiple team members
* Multiple tasks

Projects are managed by authorized Admins and the Super Admin.

An Admin may manage multiple projects when the Super Admin has allocated those projects to them.

---

## 9. Task Management Model

Tasks represent individual units of work inside a project.

A task should provide enough information for the assigned member to understand and complete the work.

Important task information includes:

* Task token / identifier
* Title
* Description
* Requirements or work details
* Status
* Priority
* Assigned member
* Due date
* Creator
* Creation date
* Task comments

Tasks should have a clear lifecycle through their status.

Task assignment and task management are primarily controlled by Admins and the Super Admin.

Members are responsible for working on tasks assigned to them and updating their progress.

---

## 10. Core Features

The core TaskFlow system includes:

1. User authentication
2. User registration
3. Role-based access
4. Dashboard
5. Project creation and management
6. Project member management
7. Task creation
8. Task assignment
9. Kanban board
10. Drag-and-drop task status updates
11. Task details
12. Task comments
13. Workload visibility
14. Project invitations
15. Notifications for pending invitations
16. User profile management
17. Real-time task status updates
18. Real-time task comments

These features represent the intended core scope of TaskFlow.

---

## 11. Project Scope

TaskFlow is intentionally designed as a **simple, small-scale project management system**.

The project should prioritize:

* Functionality
* Clear user roles
* Simple workflow
* Good usability
* Clean UI
* Reliable Supabase integration
* Demonstration of real-world project-management concepts

The system should avoid unnecessary complexity.

The following are currently outside the intended scope:

* Dedicated chat/messaging system
* File upload/document management
* Payment functionality
* Mobile application
* Advanced analytics
* Complex enterprise reporting
* AI-powered features
* External integrations
* Complicated notification infrastructure
* Custom backend server

An email/invitation system may be considered where it supports the existing project workflow, but it should remain simple.

---

## 12. Technology Direction

TaskFlow is a frontend-focused web application.

The application uses:

* React
* Vite
* Tailwind CSS
* Supabase
* PostgreSQL through Supabase
* Supabase Authentication
* React Router
* @hello-pangea/dnd for drag-and-drop functionality

There is no custom backend server.

Supabase provides the application's authentication and database services.

---

## 13. Development Philosophy

TaskFlow should remain:

* Simple
* Maintainable
* Consistent
* Beginner-friendly
* Practical
* Easy to demonstrate
* Easy to explain during a college viva

New functionality should integrate with the existing application instead of unnecessarily replacing existing implementations.

Existing working features should not be broken while adding new features.

When there is a choice between a simple reliable implementation and an unnecessarily complex implementation, prefer the simple reliable implementation.

---

## 14. Primary Success Criteria

TaskFlow should successfully demonstrate that a team can:

**Create a project**
→ **Add team members**
→ **Create and assign tasks**
→ **Allow members to work on assigned tasks**
→ **Update task progress**
→ **Discuss work through task comments**
→ **Track project workload**
→ **Understand the current state of project work**

The application should make it easy for each role to understand **what they are responsible for and what is happening with the work**.
