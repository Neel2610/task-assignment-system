````md
# TaskFlow — Database Schema

## 1. Database Overview

TaskFlow uses Supabase PostgreSQL as its primary database.

The database stores:

- User profiles and roles
- Projects
- Project membership
- Tasks
- Task comments
- Project invitations

Authentication is handled separately by Supabase Auth.

The application must never implement its own password storage.

---

## 2. Authentication vs Application User Data

TaskFlow separates authentication from application profile information.

### Supabase Auth

Supabase Auth is responsible for:

- Signup
- Login
- Password management
- Authentication sessions
- Authenticated user identity

The application should use:

```js
supabase.auth
````

for authentication operations.

### public.users

The `users` table stores application-level information:

* User ID
* Full name
* Email
* Role
* Account creation date

The application should use:

```js
supabase.from('users')
```

for profile and role information.

### Important Rule

The `users` table must NOT be used for password authentication.

Do not:

* Add `password_hash`
* Store passwords
* Query passwords
* Update passwords manually
* Implement custom authentication

Always use Supabase Auth for authentication.

---

# 3. Database Tables

TaskFlow currently contains six main tables:

1. `users`
2. `projects`
3. `project_members`
4. `tasks`
5. `comments`
6. `invites`

---

# 4. users

Stores application-level user profile information.

## Columns

| Column     | Type      | Description                                                                |
| ---------- | --------- | -------------------------------------------------------------------------- |
| id         | UUID      | User identifier; intended to correspond to the authenticated Supabase user |
| full_name  | VARCHAR   | User's display/full name                                                   |
| email      | VARCHAR   | User's email address; unique                                               |
| role       | VARCHAR   | Global application role                                                    |
| created_at | TIMESTAMP | Account/profile creation timestamp                                         |

## Allowed Roles

Only these global roles are valid:

```text
super_admin
admin
member
```

No other global role values should be introduced without an explicit project decision.

## Important Rules

* `email` must be unique.
* Passwords are not stored here.
* Authentication is handled by Supabase Auth.
* Role information is used for application authorization.
* Super Admin can manage/change user roles.

---

# 5. projects

Stores project information.

## Columns

| Column      | Type      | Description                  |
| ----------- | --------- | ---------------------------- |
| id          | UUID      | Unique project identifier    |
| name        | VARCHAR   | Project name                 |
| description | TEXT      | Project description          |
| owner_id    | UUID      | User who created the project |
| status      | VARCHAR   | Current project status       |
| created_at  | TIMESTAMP | Project creation timestamp   |

## Allowed Project Statuses

Only these values are valid:

```text
active
on_hold
completed
```

No other project status values should be introduced without an explicit decision.

## owner_id

`owner_id` represents the user who created the project.

Project ownership is separate from project membership.

A project can contain multiple admins and members through the `project_members` table.

The owner does not automatically represent every person who can work on the project.

---

# 6. project_members

Connects users to projects.

This table represents project membership and the user's role within that project.

## Columns

| Column          | Type      | Description                           |
| --------------- | --------- | ------------------------------------- |
| id              | SERIAL    | Unique membership record              |
| project_id      | UUID      | Related project                       |
| user_id         | UUID      | Related user                          |
| role_in_project | VARCHAR   | User's role within the project        |
| joined_at       | TIMESTAMP | Date/time the user joined the project |

## Project Role Values

The intended project-level roles are:

```text
admin
member
```

Project ownership is represented separately by:

```text
projects.owner_id
```

Do not introduce an `owner` project-member role unless explicitly required later.

## Unique Membership

A user should not be added to the same project more than once.

The combination should be unique:

```text
project_id + user_id
```

Example:

```text
Project A + User 1 → allowed once
Project A + User 1 → duplicate and should be rejected
Project B + User 1 → allowed
```

## Membership Model

A user can belong to multiple projects.

A project can contain multiple users.

Conceptually:

```text
users
   |
   | many-to-many
   |
project_members
   |
   | many-to-many
   |
projects
```

---

# 7. tasks

Stores individual units of work within a project.

## Columns

| Column      | Type      | Description                           |
| ----------- | --------- | ------------------------------------- |
| id          | UUID      | Unique task identifier                |
| task_token  | VARCHAR   | Human-readable unique task identifier |
| project_id  | UUID      | Project containing the task           |
| title       | VARCHAR   | Task title                            |
| description | TEXT      | Task description and requirements     |
| status      | VARCHAR   | Current task status                   |
| priority    | VARCHAR   | Task priority                         |
| assignee_id | UUID      | User assigned to the task             |
| due_date    | DATE      | Task deadline                         |
| created_by  | UUID      | Authorized user who created the task  |
| created_at  | TIMESTAMP | Task creation timestamp               |

---

# 8. Task Token

Every task has a unique `task_token`.

The token is automatically generated.

Expected format:

```text
TASK-1
TASK-2
TASK-3
...
```

The exact generated number should remain unique.

Users should not normally have to manually create the task token.

The token provides a simple human-readable identifier for tasks.

---

# 9. Task Description

TaskFlow does not currently have a separate `requirements` database column.

The `description` field should contain both:

* Task description
* Requirements/instructions for completing the work

Example:

```text
Build the login page.

Requirements:
- Email input
- Password input
- Validation
- Supabase authentication
```

Do not add a separate requirements field unless the project requirements change later.

---

# 10. Task Status

Only these three task statuses are valid:

```text
todo
in_progress
done
```

No other status values should be introduced.

The normal workflow is:

```text
todo
  ↓
in_progress
  ↓
done
```

The Kanban board uses these statuses as its columns.

Members can update the status of tasks assigned to them.

Admins and Super Admins have broader task-management authority.

---

# 11. Task Priority

Only these priority values are valid:

```text
high
medium
low
```

UI representation:

```text
high   → red
medium → yellow
low    → green
```

Members can view task priority but cannot change it.

Admins and Super Admins can set/manage task priority.

---

# 12. Task Assignment

Tasks contain:

```text
assignee_id
```

which identifies the user responsible for the task.

A task should only be assigned to a user who is already a member of the corresponding project.

Required relationship:

```text
Task
 |
 +-- project_id → Project
 |
 +-- assignee_id → User
                       |
                       ↓
               Project Membership
```

Before assigning a task, the system should verify that the assignee belongs to that project.

This validation should not rely only on the frontend.

Important authorization rules should eventually be enforced using Supabase RLS/database-level controls where practical.

---

# 13. Task Creation

Tasks may be created by authorized:

```text
admin
super_admin
```

`created_by` stores the ID of the authenticated user who created the task.

Members cannot create tasks.

The creator must have permission to create tasks within the selected project.

---

# 14. Task Due Date

`due_date` stores the task deadline.

The due date should be displayed clearly to the assigned member.

The system should prevent invalid/past due dates during task creation where required by the existing application validation.

Members can view the due date but cannot change it.

Admins and Super Admins can manage due dates.

---

# 15. comments

Stores comments associated with tasks.

## Columns

| Column       | Type      | Description                      |
| ------------ | --------- | -------------------------------- |
| id           | UUID      | Unique comment identifier        |
| task_id      | UUID      | Task associated with the comment |
| user_id      | UUID      | User who created the comment     |
| comment_text | TEXT      | Comment content                  |
| created_at   | TIMESTAMP | Comment creation timestamp       |

## Comment Behavior

Comments are task-based communication.

Users who have access to the task can:

* View comments
* Add comments

Comments are currently:

* Not editable
* Not deletable

Do not build comment editing/deletion functionality unless explicitly requested later.

---

# 16. invites

Stores project invitations.

## Columns

| Column        | Type      | Description                            |
| ------------- | --------- | -------------------------------------- |
| id            | UUID      | Unique invitation identifier           |
| project_id    | UUID      | Project the user is invited to         |
| invited_email | VARCHAR   | Email address receiving the invitation |
| status        | VARCHAR   | Current invitation status              |
| invited_by    | UUID      | User who created the invitation        |
| created_at    | TIMESTAMP | Invitation creation timestamp          |

## Allowed Invite Statuses

Only these values are valid:

```text
pending
accepted
rejected
```

Do not use `declined`.

The database terminology is officially:

```text
rejected
```

---

# 17. Invitation Workflow

The intended workflow is:

```text
Admin/Super Admin
       ↓
Invite user by email
       ↓
invites.status = pending
       ↓
Invited user sees notification
       ↓
User accepts or rejects
       |
       +---- accepted
       |       ↓
       |   Project membership created
       |
       +---- rejected
```

The exact invitation implementation should be consistent with the existing application.

---

# 18. Notifications

TaskFlow does not currently require a separate `notifications` table.

For the current project scope, pending project invitations can be retrieved directly from the `invites` table.

Conceptually:

```text
invites
   |
   +-- invited_email = current user's email
   |
   +-- status = pending
```

This provides the initial notification/invitation functionality without introducing an unnecessary notification infrastructure.

A dedicated notifications system can be considered later if the project scope expands.

---

# 19. Database Relationships

The major database relationships are:

```text
users
  |
  +------------------------+
  |                        |
  v                        v
projects              project_members
  |                        |
  |                        |
  +--------+---------------+
           |
           v
         tasks
           |
           v
        comments
```

Additional relationships:

```text
users
  |
  +---- projects.owner_id
  |
  +---- tasks.assignee_id
  |
  +---- tasks.created_by
  |
  +---- comments.user_id
  |
  +---- project_members.user_id
  |
  +---- invites.invited_by
```

And:

```text
projects
  |
  +---- project_members.project_id
  |
  +---- tasks.project_id
  |
  +---- invites.project_id
```

---

# 20. Delete / Cascade Behavior

TaskFlow uses cascade deletion for project-related records.

When a project is deleted, its dependent records should also be deleted.

Expected behavior:

```text
Delete Project
     |
     +-- Delete project_members
     |
     +-- Delete tasks
     |      |
     |      +-- Delete comments
     |
     +-- Delete invites
```

This prevents orphaned records.

## Task Deletion

If an individual task is deleted by an authorized user:

```text
Delete Task
     ↓
Delete comments belonging to that task
```

Task deletion is an administrative operation.

Members should not delete tasks.

---

# 21. Sample Data

Any sample records shown in project documentation are examples only.

They are not intended to be production or seed data.

Examples such as:

```text
UUID-001
P-001
TASK-1
```

should not automatically be inserted into the actual database.

---

# 22. Database Authorization

Database authorization is an important unfinished part of the project.

Some RLS policies currently exist, but the complete authorization model has not yet been finalized.

The intended authorization hierarchy is:

```text
Supabase Auth
      ↓
Authenticated User
      ↓
public.users.role
      ↓
Project membership / allocation
      ↓
Allowed operation
      ↓
Supabase RLS
```

Frontend checks are useful for the user experience but must not be considered sufficient security.

Important permissions should eventually be enforced at the database level.

---

# 23. Important Authorization Rules

The final database/RLS implementation should support rules such as:

### Super Admin

Can access and manage system-wide data.

### Admin

Can manage projects allocated to them and their associated project data.

### Member

Can access projects they belong to and work with their assigned tasks.

### Task Assignment

A task can only be assigned to a member of the task's project.

### Task Creation

Only authorized Admins and Super Admins can create tasks.

### Task Priority

Members can read priority but cannot modify it.

### Task Due Date

Members can read due dates but cannot modify them.

### Project Membership

Members cannot arbitrarily add themselves or other users to projects.

---

# 24. Schema Rules for Development

When developing TaskFlow:

1. Do not add password storage.
2. Do not use `users.password_hash`.
3. Use Supabase Auth for passwords and sessions.
4. Use `public.users` for profile and role data.
5. Do not invent new role values.
6. Do not invent new task status values.
7. Do not invent new project status values.
8. Do not invent new invite status values.
9. Tasks must belong to a project.
10. Tasks should only be assigned to project members.
11. Project membership should be unique per user/project combination.
12. Task requirements belong in `description`.
13. Comments are currently immutable after creation.
14. Projects use cascade deletion for dependent records.
15. Task deletion should remove its comments.
16. Sample data in documentation is not production data.
17. Do not introduce additional database tables unless there is a clear project requirement.
18. Verify the actual Supabase schema before making migrations or destructive changes.
19. Never assume a database column exists just because it appears in an older design document.
20. Preserve existing working data and functionality when modifying the schema.

---

# 25. Source of Truth

This file represents the intended application database model.

When implementing database-dependent functionality, AI development tools should:

1. Read this file first.
2. Inspect the actual Supabase schema when possible.
3. Compare the actual schema with this documentation.
4. Avoid blindly changing the database.
5. Ask for clarification only when a discrepancy could affect functionality or data integrity.
```