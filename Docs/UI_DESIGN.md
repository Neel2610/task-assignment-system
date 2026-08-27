## 1. Purpose

This document defines the visual and interaction standards for TaskFlow.

All pages and components should follow this design system unless there is a specific reason not to.

The goal is a:

- Professional
- Clean
- Modern
- Simple
- Consistent
- Responsive

interface suitable for a college project while still looking like a real-world application.

---

# 2. Overall Visual Style

TaskFlow uses a modern productivity-dashboard style.

The primary visual structure is:

```text
Dark Sidebar
      +
Light Main Content Area
      +
White Cards
      +
Blue Primary Actions
````

The interface should feel clean and functional rather than overly decorative.

Avoid excessive gradients, unnecessary illustrations, excessive shadows, or visually complicated layouts.

---

# 3. Color System

## Primary

Primary action color:

```text
blue-600
```

Use for:

* Primary buttons
* Important links
* Active actions
* Selected states
* Primary navigation indicators
* Focus states where appropriate

Hover:

```text
blue-700
```

---

## Sidebar

Sidebar background:

```text
slate-900
```

Sidebar is the primary dark visual element of the application.

Use light text against the dark background.

Active navigation items should have a clearly visible highlighted state.

---

## Main Background

Main application background:

```text
gray-50
```

This creates contrast between the page background and white content cards.

---

## Cards

Card background:

```text
white
```

Cards should generally use:

* Rounded corners
* Subtle border
* Light shadow where useful
* Consistent internal padding

Avoid heavy shadows.

---

# 4. Priority Colors

Task priority should be visually recognizable.

### High

```text
red
```

Suggested Tailwind treatment:

```text
bg-red-100
text-red-700
```

### Medium

```text
yellow
```

Suggested treatment:

```text
bg-yellow-100
text-yellow-700
```

### Low

```text
green
```

Suggested treatment:

```text
bg-green-100
text-green-700
```

Priority should normally appear as a compact badge.

---

# 5. Status Colors

## Project Status

### Active

```text
green
```

Suggested treatment:

```text
bg-green-100
text-green-700
```

### On Hold

```text
yellow
```

Suggested treatment:

```text
bg-yellow-100
text-yellow-700
```

### Completed

```text
blue
```

Suggested treatment:

```text
bg-blue-100
text-blue-700
```

---

## Task Status

Task statuses are:

```text
todo
in_progress
done
```

Suggested visual treatment:

### Todo

Neutral/slate styling.

### In Progress

Blue styling.

### Done

Green styling.

The exact shade can be adjusted to maintain accessibility and visual consistency.

---

# 6. Typography

Use a clean modern sans-serif font.

The typography hierarchy should be clear.

## Page Title

Large and visually prominent.

Example:

```text
text-2xl
font-bold
```

or an equivalent size appropriate to the existing layout.

## Section Heading

Use a medium/large heading with strong weight.

## Card Title

Use:

```text
font-semibold
```

## Body Text

Use comfortable readable text.

Avoid making normal content excessively small.

## Secondary Text

Use muted gray text for:

* Dates
* Supporting information
* Descriptions
* Metadata

---

# 7. Sidebar

The sidebar is a consistent part of the main authenticated application layout.

Background:

```text
slate-900
```

It should contain navigation such as:

* Dashboard
* Projects
* Workload
* Notifications
* Profile

and an appropriate Logout action.

The sidebar should clearly show the current page.

---

# 8. Sidebar Navigation

Navigation items should have:

* Icon where appropriate
* Text label
* Comfortable vertical spacing
* Hover state
* Active state
* Smooth transition

Active navigation should be visually distinguishable from inactive navigation.

Do not use excessive animations.

---

# 9. Responsive Sidebar

On desktop:

```text
Sidebar | Main Content
```

On smaller screens, the sidebar should adapt appropriately.

Possible behavior:

* Collapsible sidebar
* Mobile navigation
* Hamburger menu

Use the simplest implementation that fits the existing application.

Do not introduce a complicated navigation framework.

---

# 10. Page Layout

Authenticated pages should generally follow:

```text
┌──────────────────────────────────────────────┐
│ Sidebar │ Header / Page Content              │
│         │                                    │
│         │ Page Title                         │
│         │ Description                        │
│         │                                    │
│         │ Cards / Tables / Forms              │
│         │                                    │
└──────────────────────────────────────────────┘
```

Main content should have consistent padding.

Use a centered content container when appropriate.

Avoid layouts that become excessively wide on large screens.

---

# 11. Cards

Cards are one of the primary UI patterns.

Recommended characteristics:

```text
bg-white
rounded-xl
border
shadow-sm
```

Cards should have consistent padding.

Cards should respond to hover when they are interactive.

Interactive cards can use:

```text
transition
hover:shadow-md
```

Do not add hover effects to cards that are purely informational unless there is a clear visual reason.

---

# 12. Buttons

Buttons should clearly communicate their purpose.

## Primary Button

Use:

```text
bg-blue-600
hover:bg-blue-700
text-white
```

Used for:

* Create Project
* Create Task
* Save
* Add Member
* Accept
* Other primary actions

## Secondary Button

Use a lighter neutral style.

Used for:

* Cancel
* Back
* Secondary navigation
* Supporting actions

## Destructive Button

Use red styling.

Used for:

* Delete
* Reject where appropriate
* Other destructive operations

Destructive actions should be visually distinct.

---

# 13. Button Interaction

Buttons should include:

* Hover state
* Active/pressed state where useful
* Disabled state
* Loading state when performing async operations

Example loading behavior:

```text
Saving...
```

instead of allowing the user to repeatedly click the button.

Buttons performing Supabase operations must prevent accidental duplicate submissions while loading.

---

# 14. Forms

Forms should be simple and clean.

Each field should have:

* Clear label
* Input
* Helpful placeholder where useful
* Validation feedback when needed

Inputs should have:

* White background
* Border
* Rounded corners
* Clear focus state
* Appropriate spacing

Use consistent form widths and spacing.

---

# 15. Form Validation

Validation errors should appear close to the relevant field where possible.

Examples:

```text
Task title is required.
Please select a project.
Please select an assignee.
Due date cannot be in the past.
```

Error messages should be clear and understandable.

Avoid technical database error messages when a user-friendly message can be provided.

---

# 16. Loading States

Every page that loads Supabase data should provide a loading state.

Possible patterns:

* Spinner
* Skeleton
* Loading text
* Disabled loading button

Use the simplest appropriate pattern.

Avoid leaving a blank page while data is loading.

---

# 17. Error States

Errors should be visible and understandable.

An error state should generally include:

* Clear message
* Appropriate styling
* Retry option where useful

Example:

```text
Unable to load project.

Please try again.
```

Do not expose raw technical/database errors unnecessarily.

---

# 18. Success Messages

Successful operations should provide clear feedback.

Examples:

```text
Project created successfully.
Task created successfully.
Member added successfully.
Comment added successfully.
Profile updated successfully.
```

Success feedback can use a subtle green alert/toast/message.

Avoid excessive notifications for minor UI interactions.

---

# 19. Empty States

Empty data should never look like a broken page.

Examples:

### No Projects

```text
No projects yet.

Create your first project to get started.
```

### No Tasks

```text
No tasks found for this project.
```

### No Comments

```text
No comments yet.
Start the discussion for this task.
```

### No Notifications

```text
You're all caught up.
No pending invitations.
```

Empty states should provide an action when one is appropriate.

---

# 20. Tables and Lists

Use tables when displaying structured information such as:

* Users
* Workload
* Project members

Use cards/list layouts when information is more task-oriented.

Tables should remain readable on smaller screens.

If a table becomes too wide on mobile, use horizontal scrolling or an appropriate responsive card layout.

---

# 21. Task Cards

Task cards should clearly communicate the most important information.

Recommended information:

```text
Task Token
Task Title
Short Description
Priority
Status
Assignee
Due Date
```

Do not overload task cards with unnecessary information.

The full information belongs on the Task Detail page.

---

# 22. Project Cards

Project cards should display:

* Project name
* Short description
* Project status
* Relevant task information
* Optional member count

Interactive project cards should have a subtle hover effect.

Clicking a project should navigate to:

```text
/project/:projectId
```

---

# 23. Kanban UI

The Kanban board should have three columns:

```text
TODO
IN PROGRESS
DONE
```

Each column should be visually distinct but maintain the overall TaskFlow design.

Tasks should appear as draggable cards.

Dragging should provide clear visual feedback.

Do not use excessive animation.

---

# 24. Task Detail UI

The Task Detail page should prioritize readability.

Suggested structure:

```text
Task Header
├── Task Token
├── Title
├── Status
└── Priority

Task Information
├── Description / Requirements
├── Assignee
├── Due Date
├── Creator
└── Created Date

Comments
├── Existing comments
└── Add comment form
```

The task's description should be easy for the assigned member to read because it contains the task requirements.

---

# 25. Workload UI

The Workload page should make workload differences easy to understand.

Example:

```text
Team Member     Open Tasks
---------------------------
Member A             5
Member B             2
Member C             7
```

Use clear numbers and simple visual hierarchy.

Do not introduce complex charts unless they are genuinely useful.

The primary goal is understanding workload, not advanced analytics.

---

# 26. Notification UI

Notifications should be simple.

Pending invitations should clearly show:

* Project name
* Inviting user where useful
* Invitation date
* Accept action
* Reject action

Use clear action buttons.

Accepted/rejected invitations do not need to remain prominent in the initial notification view.

---

# 27. Profile UI

The Profile page should use a simple settings-style layout.

Display:

```text
Full Name
Email
Role
```

Editable fields should be clearly distinguishable from read-only information.

The global role should normally be read-only for the user.

Role changes belong to Super Admin functionality.

---

# 28. Animations

TaskFlow should use subtle animations.

Good uses:

* Button hover
* Card hover
* Sidebar transitions
* Modal appearance
* Loading indicators
* Navigation transitions where appropriate

Use Tailwind transition utilities such as:

```text
transition
duration-200
ease-in-out
```

Avoid:

* Excessive bouncing
* Large page transitions
* Long animations
* Distracting effects

The application should feel responsive rather than animated for the sake of animation.

---

# 29. Icons

Icons may be used to improve usability.

Use a consistent icon style throughout the application.

Icons should support the text rather than replace important labels.

Examples:

* Dashboard
* Projects
* Tasks
* Workload
* Notifications
* Profile
* Logout
* Add
* Edit
* Delete
* Calendar
* User

Do not add a large icon library solely for decorative purposes if a lightweight existing solution is sufficient.

---

# 30. Accessibility

The UI should maintain basic accessibility standards.

Important requirements:

* Sufficient text/background contrast
* Labels for form controls
* Buttons should have meaningful labels
* Interactive elements should be keyboard accessible where practical
* Do not rely only on color to communicate meaning
* Focus states should remain visible

Priority and status should use both text and color.

---

# 31. Responsive Design

TaskFlow should work on:

* Desktop
* Laptop
* Tablet
* Mobile

Desktop is the primary development target, but pages should not break on smaller screens.

Use Tailwind responsive utilities.

Avoid fixed widths that cause horizontal overflow.

---

# 32. UI Consistency Rules

All pages should maintain:

* Same sidebar
* Same general page spacing
* Same button styles
* Same card style
* Same badge style
* Same typography hierarchy
* Same error/success presentation
* Same loading behavior

Do not redesign individual pages independently.

If a new UI pattern is needed, consider whether it should become a reusable component.

---

# 33. Reusable UI Components

As the application grows, common patterns should be extracted into reusable components.

Potential components:

```text
components/
├── Layout.jsx
├── Sidebar.jsx
├── Button.jsx
├── Card.jsx
├── Badge.jsx
├── LoadingSpinner.jsx
├── EmptyState.jsx
├── ErrorMessage.jsx
├── Modal.jsx
└── ...
```

Do not create unnecessary abstractions.

Reusable components should be introduced when they improve consistency or reduce repeated code.

---

# 34. Design Philosophy

TaskFlow's UI should prioritize:

1. Clarity
2. Usability
3. Consistency
4. Professional appearance
5. Responsiveness
6. Simple interactions
7. Fast feedback

The UI should look polished enough for a college project demonstration while remaining simple enough to maintain and explain.

Avoid unnecessary visual complexity.

---

# 35. UI Development Rules

When creating or modifying a page:

1. Follow this design system.
2. Inspect existing UI before changing it.
3. Reuse existing layout/components where possible.
4. Maintain consistent spacing.
5. Use the defined color system.
6. Provide loading states.
7. Provide error states.
8. Provide success feedback for important actions.
9. Provide empty states.
10. Add hover states to interactive elements.
11. Keep animations subtle.
12. Make forms responsive.
13. Avoid unnecessary dependencies.
14. Do not redesign unrelated pages.
15. Do not introduce a completely different visual style.
