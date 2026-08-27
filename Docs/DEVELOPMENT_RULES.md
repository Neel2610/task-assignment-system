# TaskFlow — Development Rules

## 1. Purpose

This document contains the non-negotiable development rules for TaskFlow.

AI coding tools must read this file before making changes to the project.

The primary goal is:

> Improve TaskFlow without breaking existing working functionality.

TaskFlow is a college project built with a simple architecture. Prefer straightforward, understandable solutions over unnecessarily complex implementations.

---

# 2. Technology Stack

TaskFlow uses:

- React
- Vite
- Tailwind CSS
- Supabase
- PostgreSQL through Supabase
- Supabase Auth
- react-router-dom v6
- @hello-pangea/dnd

There is currently no separate backend server.

Supabase provides:

- Database
- Authentication
- Real-time functionality
- Database security/RLS

Do not introduce a separate backend unless explicitly requested.

---

# 3. Existing Project Structure

Current structure:

```text
client/
└── src/
    ├── pages/
    │   ├── Login.jsx
    │   ├── Signup.jsx
    │   ├── Dashboard.jsx
    │   ├── CreateProject.jsx
    │   ├── CreateTask.jsx
    │   ├── KanbanBoard.jsx
    │   └── AddMember.jsx
    │
    ├── supabase.js
    └── App.jsx
````

Additional folders/components may be introduced when useful.

Do not reorganize the entire project unnecessarily.

---

# 4. Supabase Client

The existing Supabase client is:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)
```

When importing the client from a page in `src/pages/`, use:

```js
import { supabase } from '../supabase'
```

Do not create multiple Supabase clients unnecessarily.

---

# 5. Authentication Rules

Supabase Auth is the only authentication system.

Always use:

```js
supabase.auth
```

for authentication operations.

Examples:

* Sign in
* Sign up
* Sign out
* Get current user
* Session handling

Do not implement custom password authentication.

---

# 6. Password Security

Never:

* Store passwords in `public.users`
* Query passwords
* Create `password_hash`
* Compare passwords manually
* Implement bcrypt authentication
* Create custom login authentication

The architecture is:

```text
Supabase Auth
    ↓
Authentication
    ↓
Authenticated User ID

public.users
    ↓
Profile information
    ↓
full_name
email
role
```

---

# 7. Authentication Check on Protected Pages

Every protected page must verify authentication.

Use:

```js
supabase.auth.getUser()
```

when loading protected pages.

Expected behavior:

```text
Page loads
   ↓
Check authenticated user
   ↓
User exists?
   ├── Yes → Load page data
   └── No  → Redirect to /
```

Use:

```js
useNavigate()
```

for redirects.

Do not allow unauthenticated users to remain on protected application pages.

---

# 8. Routing

Routing uses:

```text
react-router-dom v6
```

Existing routes must continue working.

Current routes include:

```text
/              → Login
/signup        → Signup
/dashboard     → Dashboard
/create-project → CreateProject
/create-task   → CreateTask
/kanban        → KanbanBoard
/add-member    → AddMember
```

New routes should follow the same routing architecture.

Expected additional routes include:

```text
/project/:projectId
/task/:taskId
/workload
/notifications
/profile
```

Do not replace the routing system.

---

# 9. Navigation

Use:

```js
<Link>
```

for normal navigation links.

Use:

```js
useNavigate()
```

when navigation needs to happen programmatically.

Examples:

* After successful form submission
* After logout
* After authentication failure
* After accepting an invitation

Do not use normal `<a href>` navigation for internal application routes unless there is a specific reason.

---

# 10. Existing Functionality Must Be Preserved

The following functionality is already working and must not be broken:

* Login
* Signup
* Dashboard
* Logout
* Create Project
* Create Task
* Kanban board
* Drag-and-drop task status updates
* Add Member
* Existing invitation functionality

Before changing one of these areas:

1. Inspect the existing implementation.
2. Understand how it currently works.
3. Make the smallest necessary change.
4. Preserve existing behavior.

Do not rewrite working pages simply to make them "cleaner" unless explicitly requested.

---

# 11. Before Editing Code

Before modifying a file:

1. Read the existing file.
2. Understand its imports.
3. Understand its state management.
4. Understand its Supabase queries.
5. Understand its navigation.
6. Check whether another page/component depends on it.
7. Make the smallest reasonable change.

Do not blindly overwrite files.

---

# 12. Database Rules

Before writing database-related code, consult:

```text
DATABASE_SCHEMA.md
```

The documented database structure must be respected.

Do not invent columns.

Do not invent tables.

Do not invent status values.

Do not invent role values.

Do not invent relationships.

If the actual Supabase database differs from the documentation, inspect the actual schema before making assumptions.

---

# 13. Official Role Values

Only these global roles exist:

```text
super_admin
admin
member
```

Do not use:

```text
superadmin
administrator
team_leader
user
```

or other variations unless explicitly requested.

---

# 14. Official Project Status Values

Only:

```text
active
on_hold
completed
```

are valid.

Do not introduce additional project statuses.

---

# 15. Official Task Status Values

Only:

```text
todo
in_progress
done
```

are valid.

Do not use:

```text
pending
active
completed
on_hold
```

as task status values.

The completed task status is officially:

```text
done
```

---

# 16. Official Priority Values

Only:

```text
high
medium
low
```

are valid.

---

# 17. Official Invite Status Values

Only:

```text
pending
accepted
rejected
```

are valid.

Do not replace `rejected` with `declined`.

---

# 18. Role-Based Access

Role checks must be respected throughout the application.

### Super Admin

Has system-wide authority.

### Admin

Manages projects allocated to them.

### Member

Works with assigned tasks and participates in project communication.

Frontend role checks improve UX but are not sufficient as the only security mechanism.

Important authorization should be enforced through Supabase RLS/database policies.

---

# 19. Member Restrictions

A Member must not be allowed to:

* Create tasks
* Assign tasks
* Change task priority
* Change task due date
* Manage project members
* Change user roles
* Access unrelated projects

Do not merely hide buttons and assume the operation is secure.

Database authorization should also prevent unauthorized operations.

---

# 20. Task Assignment Validation

Before assigning a task:

```text
assignee
    ↓
must belong to
    ↓
selected project
```

Do not allow:

```text
Project A
   ↓
Task
   ↓
User from Project B
```

The application should validate this relationship.

Where practical, database/RLS rules should also enforce it.

---

# 21. Supabase Queries

Use async/await for Supabase operations.

Preferred structure:

```text
try
    perform operation
    handle result
catch
    show error
finally
    stop loading
```

Do not silently ignore Supabase errors.

---

# 22. Error Handling

Supabase operations should check for errors.

Do not assume that a query succeeded.

Users should receive understandable messages.

Avoid displaying raw technical/database errors unless they are useful for debugging.

Example:

```text
Unable to load project.
Please try again.
```

instead of exposing unnecessary database internals.

---

# 23. Loading States

Every asynchronous page operation should have an appropriate loading state.

Examples:

```text
Loading project...
Loading tasks...
Saving...
Creating task...
Adding member...
Updating profile...
```

Prevent duplicate form submissions while an operation is in progress.

---

# 24. Success Feedback

Important successful operations should provide feedback.

Examples:

```text
Project created successfully.
Task created successfully.
Member added successfully.
Invitation sent successfully.
Comment added successfully.
Profile updated successfully.
```

Do not leave the user guessing whether an action worked.

---

# 25. Empty States

Handle empty database results gracefully.

Do not render broken-looking blank sections.

Examples:

```text
No projects found.
No tasks found.
No comments yet.
No pending invitations.
```

Where appropriate, provide a useful next action.

---

# 26. React State Management

Use React's built-in state management unless a real requirement for another state-management library appears.

Prefer:

```js
useState
useEffect
useMemo
useCallback
```

when appropriate.

Do not introduce Redux, Zustand, or another state library for simple application state unless explicitly requested.

---

# 27. Data Loading

When a page depends on multiple related pieces of data:

* Load the authenticated user first when necessary.
* Determine permissions/project access.
* Load the required data.
* Handle loading and error states.

Avoid unnecessary duplicate Supabase requests.

---

# 28. useEffect Rules

Be careful with `useEffect`.

Avoid:

* Infinite request loops
* Missing dependencies
* Fetching the same data repeatedly
* Updating state after unnecessary rerenders

Effects should have clear purposes.

---

# 29. Reusable Components

If the same UI pattern appears on multiple pages, consider extracting it into a reusable component.

Examples:

```text
Sidebar
Layout
Button
Badge
Card
LoadingSpinner
EmptyState
ErrorMessage
```

Do not create abstractions simply for the sake of abstraction.

Keep components understandable for a beginner-level project.

---

# 30. UI Consistency

Before creating a new page, read:

```text
UI_DESIGN.md
```

Follow the existing visual system.

Maintain:

* Sidebar
* Colors
* Cards
* Buttons
* Forms
* Badges
* Spacing
* Typography
* Loading states
* Error states

Do not create a completely different design for one page.

---

# 31. Tailwind CSS

Tailwind CSS is the primary styling system.

Prefer Tailwind utility classes over creating large custom CSS files.

Use the established color system:

```text
Primary: blue-600
Sidebar: slate-900
Background: gray-50
Cards: white
```

Maintain responsive behavior using Tailwind breakpoints.

---

# 32. Animations

Animations should be subtle.

Good:

```text
transition
duration-200
hover effects
```

Avoid excessive animation.

Do not introduce animation libraries unless explicitly required.

---

# 33. Drag and Drop

The Kanban board uses:

```text
@hello-pangea/dnd
```

Do not replace the drag-and-drop library.

When a task is moved:

1. Determine the destination status.
2. Update the task in Supabase.
3. Update the UI.
4. Handle errors appropriately.

Valid destination statuses remain:

```text
todo
in_progress
done
```

---

# 34. Real-Time Features

Supabase real-time functionality should be used for the features that benefit from it.

Initial real-time scope:

* Task status updates
* Task comments

Do not build a complex real-time architecture.

If real-time updates fail, the application should remain usable and should not crash.

---

# 35. Comments

Comments are intentionally simple.

Users with access to the task can:

* View comments
* Add comments

Current scope does not include:

* Comment editing
* Comment deletion
* Reactions
* Threading
* Attachments

Do not implement these unless explicitly requested.

---

# 36. Notifications

The initial notification system is intentionally simple.

Pending invitations can be retrieved from:

```text
invites
```

using the current user's email.

Do not introduce a separate notification system unless the feature requirements change.

---

# 37. Profile

Profile information comes from:

```text
public.users
```

The Profile page should not manage authentication credentials directly.

For password/authentication changes, use Supabase Auth functionality if such functionality is added later.

---

# 38. Deletion

Project deletion uses cascade behavior.

Deleting a project should remove its dependent:

* Project memberships
* Tasks
* Task comments
* Invitations

Deleting a task should remove its comments.

Do not manually leave orphaned records.

---

# 39. Environment Variables

Supabase credentials should come from Vite environment variables.

Expected variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not hardcode Supabase credentials in source files.

Do not commit sensitive environment files unnecessarily.

---

# 40. Security

Never expose secrets in frontend source code.

The frontend uses the Supabase anonymous/public key intended for client-side use.

Database security must be handled through Supabase authentication and RLS policies.

Never attempt to hide security-sensitive authorization solely through UI controls.

---

# 41. Dependency Rules

Avoid adding dependencies unless they provide clear value.

Before adding a package:

1. Check whether the functionality already exists.
2. Check whether it can be implemented simply with existing tools.
3. Consider the project's small scope.
4. Avoid unnecessary complexity.

The existing dependency set should remain lightweight.

---

# 42. Do Not Over-Engineer

TaskFlow is intentionally a small-scale college project.

Prefer:

```text
simple
clear
maintainable
```

over:

```text
complex
enterprise-level
over-abstracted
```

Do not introduce:

* Microservices
* Backend servers
* Complex state management
* Complex event systems
* Advanced caching
* Unnecessary design patterns
* Large third-party frameworks

unless explicitly requested.

---

# 43. AI Development Workflow

When asked to implement a feature, follow this process:

### Step 1 — Read Context

Read the relevant documentation:

```text
PROJECT_CONTEXT.md
DATABASE_SCHEMA.md
FEATURES.md
UI_DESIGN.md
DEVELOPMENT_RULES.md
```

Read only the relevant files if the task is small.

### Step 2 — Inspect Existing Code

Find the relevant page/component/query.

Understand the current implementation.

### Step 3 — Plan

Determine:

* Files that need modification
* Data that needs to be queried
* Permissions required
* UI changes required
* Whether a database change is actually necessary

### Step 4 — Implement

Make the smallest clean implementation that satisfies the requirement.

### Step 5 — Preserve Existing Functionality

Check that unrelated functionality has not been changed or broken.

### Step 6 — Verify

Check:

* Authentication
* Role permissions
* Supabase errors
* Loading states
* Empty states
* Navigation
* Responsive UI
* Existing features affected by the change

---

# 44. When Something Is Unclear

Do not immediately invent a solution.

First check:

1. Project documentation
2. Existing code
3. Database schema
4. Existing application behavior

If the ambiguity can be resolved safely from existing context, make the reasonable decision.

Ask the developer only when the decision could:

* Change the database schema
* Change permissions
* Delete or modify user data
* Change an established feature
* Conflict with an explicit project requirement

Avoid unnecessary clarification questions.

---

# 45. Database Changes

Do not modify the database schema simply because a new feature could theoretically use another column/table.

First determine whether the existing schema is sufficient.

If a schema change is genuinely required:

1. Explain why it is necessary.
2. Identify affected features.
3. Provide the required SQL/migration.
4. Avoid destructive changes unless explicitly approved.

Never silently drop columns, tables, or data.

---

# 46. Preserve Data

Never use destructive database operations casually.

Before performing operations such as:

```text
DROP TABLE
DROP COLUMN
DELETE
TRUNCATE
```

verify that the operation is intentional and authorized.

For application-level delete functionality, respect the defined cascade relationships.

---

# 47. Code Quality

Code should be:

* Readable
* Consistent
* Simple
* Maintainable
* Appropriately commented

Avoid comments that simply repeat what the code obviously does.

Comments should explain non-obvious decisions when needed.

---

# 48. Avoid Duplicate Logic

If the same logic is repeated across several pages, consider extracting it.

Examples:

* Authentication checking
* Role checking
* Formatting dates
* Loading states
* Common UI

However, do not prematurely abstract code that is only used once or twice.

---

# 49. Error Recovery

When possible, allow users to recover from failures.

Examples:

```text
Failed to load tasks.
[Try Again]
```

or:

```text
Failed to save changes.
Please try again.
```

The application should not become unusable because one Supabase request failed.

---

# 50. Final Rule

The most important rule:

> Never break working functionality while implementing a new feature.

TaskFlow should evolve incrementally.

Every change should fit the existing:

```text
Architecture
Database
Features
UI Design
Authorization
```

Keep the implementation simple, consistent, and appropriate for the project's scope.
