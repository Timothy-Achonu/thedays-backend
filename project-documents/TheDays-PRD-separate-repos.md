# Product Requirements Document

## TheDays

### 1. Product Summary

The TheDays is a web application that enables users to track cumulative progress toward habits, routines, or personal commitments.

Unlike traditional streak-based habit trackers, missing a day does not reset previous progress. Each completed day contributes one unit to the user's total TheDays, regardless of whether completed days are consecutive.

For example:

* Day 1: Completed
* Day 2: Completed
* Day 3: Missed
* Day 4: Completed
* Day 5: Missed
* Day 6: Completed

The resulting TheDays is:

**4 days**

The application is designed around the principle that progress can continue to accumulate even when consistency is imperfect.

---

# 2. Product Goals

The application should enable users to:

1. Create and manage a personal account.
2. Create one or more TheDays entries.
3. Define a title, description, start date, and completion mode for each TheDays.
4. View every elapsed calendar day from the selected start date through the current day.
5. Mark individual days as completed, according to the tracker's completion mode.
6. Automatically calculate the total number of completed days.
7. Miss days without resetting previously accumulated progress.
8. Add personal landmarks to a TheDays.
9. Define a celebration or reward associated with each landmark.
10. Track progress toward upcoming landmarks.

---

# 3. Non-Goals for MVP

The initial version of the product will not include:

* Social features.
* Following other users.
* Public profiles.
* Leaderboards.
* Traditional streak tracking.
* Native mobile applications.
* Push notifications.
* Gamification points.
* AI-generated recommendations.
* Shared or collaborative trackers.
* Complex analytics.
* Third-party calendar integrations.

These capabilities may be considered in later versions.

---

# 4. Target Platform

The MVP will be delivered as a responsive web application.

The application should support:

* Desktop browsers.
* Tablet browsers.
* Mobile browsers.

The mobile experience should be optimized for quick daily interactions. For a Practice TheDays, that action is marking the current day as completed. For an Abstinence TheDays, that action is marking the most recent finished day (usually yesterday) after the calendar day has ended.

---

# 5. Recommended Technology Stack

## Frontend

The frontend should use:

* React
* Vite
* TypeScript
* TanStack Router
* TanStack Query

### React

React will be used to build the user interface and reusable application components.

### Vite

Vite will be used as the development server and frontend build tool.

### TanStack Router

TanStack Router will manage client-side routing, route parameters, route guards, and authenticated routes.

Suggested application routes include:

```text
/
 /login
 /register
 /dashboard
 /trackers/new
 /trackers/:trackerId
 /trackers/:trackerId/edit
 /settings
```

### TanStack Query

TanStack Query should manage asynchronous server state, including:

* Fetching tracker data.
* Fetching completed days.
* Fetching landmarks.
* Caching API responses.
* Updating data after mutations.
* Loading states.
* Error states.
* Optimistic UI updates where appropriate.

---

# 6. Backend Technology

The backend should use:

* Node.js
* Express
* TypeScript

The backend should expose a REST API consumed by the React frontend.

Suggested backend structure:

```text
server/
  src/
    controllers/
    routes/
    services/
    middleware/
    validators/
    db/
    utils/
    app.ts
    server.ts
```

Example REST endpoints:

```text
GET    /api/trackers
POST   /api/trackers
GET    /api/trackers/:id
PATCH  /api/trackers/:id
DELETE /api/trackers/:id
```

---

# 7. Database Recommendation

## PostgreSQL

PostgreSQL is the recommended database.

The application's primary entities have clear relationships:

```text
User
  |
  └── Tracker
        |
        ├── CompletedDay
        └── Landmark
```

A relational database is suitable because:

* A user owns many trackers.
* A tracker belongs to one user.
* A tracker has many completed days.
* A tracker has many landmarks.
* Referential integrity is important.
* Duplicate completion records must be prevented.
* Ownership relationships must be enforced.

PostgreSQL also provides strong support for:

* Constraints.
* Transactions.
* Indexing.
* Date handling.
* Relational queries.
* Production-scale deployments.

---

# 8. ORM Recommendation

## Prisma

Prisma is the recommended ORM for interacting with PostgreSQL from the Node.js backend.

The application architecture should follow:

```text
React Application
       ↓
Express REST API
       ↓
Prisma ORM
       ↓
PostgreSQL
```

Prisma should be used for:

* Database schema definitions.
* Database migrations.
* Queries.
* Inserts.
* Updates.
* Deletes.
* Relations.
* Unique constraints.
* Referential actions.

---

# 9. Authentication

Users must be able to:

* Register.
* Log in.
* Log out.
* Remain authenticated across page refreshes and browser sessions, according to session policy.

## Registration

Required registration fields:

* Name
* Email
* Password

or

Google Auth

The email address must be unique.

Passwords must never be stored in plain text.

Passwords should be securely hashed using a modern password hashing algorithm such as Argon2.

---

# 10. Authentication Strategy

The recommended authentication approach is cookie-based authentication using secure HTTP-only cookies.

Authentication cookies should be configured with appropriate production settings such as:

* `HttpOnly`
* `Secure`
* `SameSite`

Authentication credentials should not be stored in browser `localStorage`.

The backend must be responsible for determining whether a request is authenticated.

---

# 11. User Model

The user entity should contain:

```text
User

id
name
email
passwordHash
timezone
createdAt
updatedAt
```

Example:

```ts
{
  id: "user_123",
  name: "Example User",
  email: "user@example.com",
  passwordHash: "...",
  timezone: "Africa/Lagos",
  createdAt: "...",
  updatedAt: "..."
}
```

---

# 12. TheDays Entry

The main tracking entity will be referred to as a **TheDays** in the user interface and may be represented internally as a **Tracker**.

A user may create multiple TheDayss.

Examples include:

```text
Practice:
Days I Went Running
Days I Studied
Days I Read
Days I Practised Guitar
Days I Wrote

Abstinence:
Days Without Soda
```

---

# 13. Create TheDays

A user should be able to create a TheDays with the following fields.

### Required

* Title
* Start date
* Completion mode

### Optional

* Description

Completion mode has two values. The create form must require an explicit choice. There is no default.

### Practice

For something you want to do. A day can be marked complete as soon as the activity is completed.

Today is completable. Future dates are not.

### Abstinence

For something you want to avoid. A day can only be marked complete after the day has ended.

“Day has ended” means the calendar date is strictly before today in the user's timezone. Today is displayed but not completable. Future dates are not displayed.

Completion mode cannot be changed after creation in the MVP.

Practice example:

```text
Title:
Days I Went Running

Description:
Track every day on which a run is completed.

Start Date:
August 1, 2026

Completion mode:
Practice
```

Abstinence example:

```text
Title:
Days Without Soda

Description:
Track each calendar day on which no soda is consumed.

Start Date:
August 1, 2026

Completion mode:
Abstinence
```

---

# 14. Tracker Model

The tracker entity should contain:

```text
Tracker

id
userId
title
description
startDate
completionMode
createdAt
updatedAt
```

`completionMode` is `"practice"` or `"abstinence"`. It is required at creation and is not editable in the MVP.

Example:

```ts
{
  id: "tracker_123",
  userId: "user_123",
  title: "Days I Went Running",
  description: "Track every day on which a run is completed.",
  startDate: "2026-08-01",
  completionMode: "practice",
  createdAt: "...",
  updatedAt: "..."
}
```

---

# 15. Core Tracking Behaviour

For each TheDays, the application should display every calendar day beginning from the selected start date through the current date.

For example, if the start date is August 12 and the current date is August 16, the application should display:

```text
August 12    ☐
August 13    ☐
August 14    ☐
August 15    ☐
August 16    ☐
```

Which of those days may be marked completed depends on completion mode.

On a Practice TheDays, the user may mark any displayed date, including today.

On an Abstinence TheDays, the user may mark any displayed date strictly before today. Today's checkbox is visible and disabled.

Practice example, current date August 16:

```text
August 12    ☑
August 13    ☑
August 14    ☐
August 15    ☑
August 16    ☑
```

Abstinence example, current date August 16:

```text
August 12    ☑
August 13    ☑
August 14    ☐
August 15    ☑
August 16    ☐  (today; not yet completable)
```

The total TheDays would be:

```text
4 days
```

---

# 16. Cumulative Counting Rules

The TheDays is cumulative rather than consecutive.

The following rules apply:

* Every completed day adds exactly one to the total.
* Every incomplete day adds zero.
* Missing a day does not reset the total.
* Completing a later day continues from the existing total.
* Unchecking a previously completed day decreases the total by one.
* The same date must never contribute more than one to the total.
* Completing today is allowed only on a Practice TheDays.
* On an Abstinence TheDays, a day cannot be marked complete until that calendar day has ended in the user's timezone.
* Unmarking an existing completion is allowed in both modes.

Example:

```text
Monday      Completed
Tuesday     Completed
Wednesday   Missed
Thursday    Missed
Friday      Completed
```

TheDays:

```text
3
```

Friday does not begin a new count. It increases the existing total from two to three.

---

# 17. Day Generation Strategy

The system should not create a database record for every elapsed day.

Instead, calendar days should be generated dynamically from:

```text
tracker.startDate → current date
```

Only completed days should be stored in the database.

For example, instead of storing:

```text
August 12 - completed
August 13 - completed
August 14 - incomplete
August 15 - completed
August 16 - completed
```

the database should store only:

```text
August 12
August 13
August 15
August 16
```

Any generated date without a corresponding completion record is treated as incomplete.

This approach reduces unnecessary database records and simplifies the data model.

---

# 18. Completed Day Model

The completed day entity should contain:

```text
CompletedDay

id
trackerId
date
createdAt
```

Example:

```ts
{
  id: "completed_123",
  trackerId: "tracker_123",
  date: "2026-08-16"
}
```

---

# 19. Duplicate Completion Prevention

The combination of:

```text
trackerId + date
```

must be unique.

The database must prevent duplicate records such as:

```text
tracker_123 + 2026-08-16
tracker_123 + 2026-08-16
```

This should be enforced through a database-level unique constraint.

---

# 20. Marking a Day as Completed

When a user marks a day as completed, the frontend should send a request to the backend.

Example endpoint:

```http
POST /api/trackers/:trackerId/completed-days
```

Request body:

```json
{
  "date": "2026-08-16"
}
```

The backend must verify:

1. The user is authenticated.
2. The requested tracker exists.
3. The tracker belongs to the authenticated user.
4. The date is valid.
5. The date is not earlier than the tracker start date.
6. The date is allowed for the tracker's completion mode:
   * Practice: the date is on or before today in the user's timezone (`startDate <= date <= today`).
   * Abstinence: the date is strictly before today in the user's timezone (`startDate <= date < today`).
7. The date has not already been recorded as completed.

If validation succeeds, a completed day record should be created.

---

# 21. Unmarking a Completed Day

Users should be able to correct accidental completions.

Example endpoint:

```http
DELETE /api/trackers/:trackerId/completed-days/:date
```

If the completion exists and belongs to the user's tracker, it should be removed.

The TheDays should immediately decrease by one.

---

# 22. TheDays Calculation

The TheDays should equal the number of completion records associated with a tracker.

For example:

```text
Completed days:

August 2
August 3
August 6
August 7
August 10
```

TheDays:

```text
5
```

The count must not be calculated from the difference between the current date and the start date because that would represent elapsed days rather than successful days.

---

# 23. Future Dates

Future dates must not appear in the day list.

If the current date is August 16, the application should not display:

```text
August 17
August 18
August 19
```

Each date becomes available in the list automatically when it becomes the user's current calendar date.

Today is always displayed.

* On a Practice TheDays, today may be marked complete.
* On an Abstinence TheDays, today is visible and disabled until the calendar day has ended. The primary daily action is the most recent finished day, usually yesterday.

If an Abstinence TheDays has a start date of today, no date is completable until tomorrow. The interface should explain that the first day becomes available after it ends, rather than appearing empty or broken.

---

# 24. Start Date Rules

The start date may be:

* The current date.
* Any valid date in the past.

A future start date should not be allowed in the MVP.

If the current date is August 16:

Valid:

```text
August 16
August 10
July 1
```

Invalid:

```text
August 17
September 1
```

---

# 25. Tracker Detail Page

Each tracker should have a dedicated detail page.

Example route:

```text
/trackers/:trackerId
```

The page should display:

* Title.
* Description.
* Completion mode.
* Current TheDays.
* Start date.
* The primary daily completion control (today on Practice; the latest finished day on Abstinence).
* Today's state (completable, completed, or in progress / not yet completable).
* Upcoming landmark.
* Day history.
* Landmarks.
* Edit action.
* Delete action.

Example header:

```text
Days I Went Running
Practice

42 DAYS

Started August 1, 2026
```

---

# 26. Day History

The day history should display the most recent dates first.

Example:

```text
Today

☑ Sunday, August 16

Previous

☐ Saturday, August 15
☑ Friday, August 14
☑ Thursday, August 13
☐ Wednesday, August 12
```

On an Abstinence TheDays, today's row remains visible and disabled while the day is in progress, for example:

```text
Today

☐ Sunday, August 16
Available after the day ends

Previous

☐ Saturday, August 15
```

Reverse chronological order ensures that the most relevant days remain easily accessible.

---

# 27. Today Interaction

The current day should be visually prominent.

## Practice

Today should be easy to complete.

Incomplete example:

```text
TODAY

Sunday, August 16

[ Mark as completed ]
```

Completed example:

```text
TODAY

Sunday, August 16

[ ✓ Completed ]
```

Completing the current day should require minimal interaction.

## Abstinence

Today should remain visible and disabled while the calendar day is in progress.

```text
TODAY

Sunday, August 16

Available after the day ends
```

The primary daily control should be the most recent finished day, usually yesterday:

```text
YESTERDAY

Saturday, August 15

[ Mark as completed ]
```

If yesterday is already completed, the control should show that completed state. If the tracker started today, there is no finished day yet; explain that the first completion becomes available after today ends.

---

# 28. Dashboard

After authentication, users should be taken to the dashboard.

Suggested route:

```text
/dashboard
```

The dashboard should display all TheDayss owned by the user.

Each tracker card should include:

* Tracker title.
* Completion mode.
* Current TheDays.
* Start date.
* Daily completion status for the mode (today on Practice; today in progress plus yesterday / latest finished day on Abstinence).
* Next landmark, if applicable.
* Remaining completed days required to reach the next landmark.

Practice example:

```text
Running
Practice

42 days

Today:
✓ Completed

Next Landmark:
50 days

8 days remaining
```

Abstinence example:

```text
Days Without Soda
Abstinence

12 days

Today:
In progress

Yesterday:
☐ Not yet marked

Next Landmark:
30 days

18 days remaining
```

Selecting a tracker should open its detail page.

---

# 29. Landmarks

A user should be able to create one or more landmarks for each TheDays.

A landmark represents a target TheDays the user would like to reach.

Each landmark should also include a description of how the user plans to celebrate reaching that target.

Example:

```text
Tracker:
Days I Went Running

Landmark:
50 days

Celebration:
Buy a new pair of running shoes.
```

---

# 30. Landmark Fields

A landmark should contain:

### Required

* Target TheDays
* Celebration description

### Optional

* Title

Example:

```text
Title:
The Big 50

Target:
50 days

Celebration:
Buy a new pair of running shoes and go out for dinner.
```

---

# 31. Landmark Model

The landmark entity should contain:

```text
Landmark

id
trackerId
title
targetCount
celebrationDescription
createdAt
updatedAt
```

Example:

```ts
{
  id: "landmark_123",
  trackerId: "tracker_123",
  title: "The Big 50",
  targetCount: 50,
  celebrationDescription: "Buy a new pair of running shoes.",
  createdAt: "...",
  updatedAt: "..."
}
```

---

# 32. Landmark Progress

The application should calculate progress toward each landmark.

Example:

```text
Current TheDays:
37

Landmark:
50
```

The interface should display:

```text
37 / 50 days

13 completed days remaining
```

A visual progress indicator may also be displayed.

The remaining amount should be calculated as:

```text
targetCount - currentDaysCount
```

---

# 33. Reached Landmarks

A landmark should be considered reached when:

```text
currentDaysCount >= landmark.targetCount
```

Example:

```text
Landmark reached

50 Days

Celebration:
Buy a new pair of running shoes.
```

Reached landmarks should remain visible as part of the user's tracker history.

They should not be deleted or hidden automatically.

---

# 34. Multiple Landmarks

A tracker may contain multiple landmarks.

Example:

```text
10 days
Celebrate with dinner

30 days
Buy a new book

50 days
Buy new running shoes

100 days
Take a weekend trip
```

Users should be able to:

* Add landmarks.
* Edit landmarks.
* Delete landmarks.
* View upcoming landmarks.
* View reached landmarks.

---

# 35. Next Landmark

The application should automatically identify the closest unreached landmark.

Example:

```text
Current TheDays:
37

Landmarks:
10
30
50
100
```

The next landmark is:

```text
50
```

The tracker may display:

```text
Next Landmark

50 Days

13 completed days remaining

Celebration:
Buy new running shoes.
```

---

# 36. Tracker Ownership

Users must only be able to access trackers they own.

This rule must be enforced on the backend.

Changing a route manually, for example:

```text
/api/trackers/abc123
```

must never allow one authenticated user to access another user's tracker.

Every tracker request must verify ownership.

The same ownership rules must apply to:

* Completed days.
* Landmarks.

Frontend route protection alone must not be considered sufficient security.

---

# 37. Database Relationships

Recommended relationship structure:

```text
User
│
├── Tracker
│   │
│   ├── CompletedDay
│   ├── CompletedDay
│   ├── Landmark
│   └── Landmark
│
└── Tracker
    │
    ├── CompletedDay
    └── Landmark
```

---

# 38. Suggested Prisma Schema

A suitable initial Prisma schema could resemble:

```prisma
model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  timezone     String

  trackers     Tracker[]

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Tracker {
  id              String                 @id @default(cuid())
  title           String
  description     String?
  startDate       DateTime
  completionMode  TrackerCompletionMode

  userId          String
  user            User                   @relation(fields: [userId], references: [id], onDelete: Cascade)

  completedDays   CompletedDay[]
  landmarks       Landmark[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
}

enum TrackerCompletionMode {
  practice
  abstinence
}

model CompletedDay {
  id        String   @id @default(cuid())
  date      DateTime

  trackerId String
  tracker   Tracker  @relation(fields: [trackerId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([trackerId, date])
  @@index([trackerId])
}

model Landmark {
  id                     String   @id @default(cuid())
  title                  String?
  targetCount            Int
  celebrationDescription String

  trackerId              String
  tracker                Tracker  @relation(fields: [trackerId], references: [id], onDelete: Cascade)

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([trackerId])
}
```

Calendar dates such as tracker start dates and completed days must be stored using date-only semantics rather than timestamps. Completed days should be represented as YYYY-MM-DD values and persisted using PostgreSQL's DATE type. Timestamps should only be used for metadata such as createdAt and updatedAt. The user's configured timezone should determine the current calendar date used to decide which days are available for completion. Practice allows dates on or before today. Abstinence allows dates strictly before today.

---

# 39. Date and Timezone Requirements

The product tracks calendar days rather than arbitrary timestamps.

A completed day represents:

```text
August 16, 2026
```

rather than a particular instant such as:

```text
August 16, 2026 at 11:53 PM UTC
```

The frontend and backend must therefore use consistent calendar-date semantics.

Dates sent through the API should use:

```text
YYYY-MM-DD
```

Example:

```json
{
  "date": "2026-08-16"
}
```

The application must not rely solely on UTC timestamps when determining the user's current day, as timezone conversion may incorrectly move a completion into the previous or following calendar date.

---

# 40. User Timezone

Each user should have a timezone associated with their account.

Example:

```text
Africa/Lagos
```

The browser timezone may initially be detected using:

```js
Intl.DateTimeFormat().resolvedOptions().timeZone
```

The application should eventually allow users to update their timezone through account settings.

---

# 41. Authentication API

## Register

```http
POST /api/auth/register
```

Example body:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "..."
}
```

## Login

```http
POST /api/auth/login
```

## Logout

```http
POST /api/auth/logout
```

## Current User

```http
GET /api/auth/me
```

---

# 42. Tracker API

## Get User Trackers

```http
GET /api/trackers
```

## Create Tracker

```http
POST /api/trackers
```

Example body:

```json
{
  "title": "Days I Went Running",
  "description": "Track every day on which a run is completed.",
  "startDate": "2026-08-01",
  "completionMode": "practice"
}
```

`completionMode` is required and must be `"practice"` or `"abstinence"`.

## Get Tracker

```http
GET /api/trackers/:trackerId
```

## Update Tracker

```http
PATCH /api/trackers/:trackerId
```

`completionMode` must not be accepted on update in the MVP.

## Delete Tracker

```http
DELETE /api/trackers/:trackerId
```

---

# 43. Completed Days API

## Complete Day

```http
POST /api/trackers/:trackerId/completed-days
```

Body:

```json
{
  "date": "2026-08-16"
}
```

## Uncomplete Day

```http
DELETE /api/trackers/:trackerId/completed-days/:date
```

## Get Completed Days

```http
GET /api/trackers/:trackerId/completed-days
```

Example response:

```json
{
  "completedDays": [
    "2026-08-12",
    "2026-08-13",
    "2026-08-15",
    "2026-08-16"
  ]
}
```

---

# 44. Landmark API

## Get Landmarks

```http
GET /api/trackers/:trackerId/landmarks
```

## Create Landmark

```http
POST /api/trackers/:trackerId/landmarks
```

Example body:

```json
{
  "title": "The Big 50",
  "targetCount": 50,
  "celebrationDescription": "Buy a new pair of running shoes."
}
```

## Update Landmark

```http
PATCH /api/trackers/:trackerId/landmarks/:landmarkId
```

## Delete Landmark

```http
DELETE /api/trackers/:trackerId/landmarks/:landmarkId
```

---

# 45. Backend Libraries

Recommended backend dependencies include:

```text
express
typescript
prisma
@prisma/client
zod
argon2
cookie-parser
cors
helmet
```

Additional libraries may be introduced for:

* Rate limiting.
* Logging.
* Environment variable validation.
* Testing.
* Session storage.

---

# 46. Request Validation

All backend input should be validated before use.

Zod is recommended for request validation.

Example:

```ts
const createTrackerSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string(),
  completionMode: z.enum(["practice", "abstinence"]),
});
```

Frontend validation should improve user experience, but the backend must independently validate all incoming data.

---

# 47. Suggested Frontend Structure

```text
src/
  components/
  features/
    auth/
    trackers/
    completed-days/
    landmarks/
  routes/
  hooks/
  lib/
  api/
  types/
  utils/
```

Example feature structure:

```text
features/
  trackers/
    components/
      TrackerCard.tsx
      TrackerForm.tsx
      TrackerHeader.tsx

  completed-days/
    components/
      DayList.tsx
      DayRow.tsx
      TodayRow.tsx

  landmarks/
    components/
      LandmarkCard.tsx
      LandmarkForm.tsx
      LandmarkProgress.tsx
```

---

# 48. Main User Flow: Registration

```text
User opens application
        ↓
Selects Create Account
        ↓
Enters name, email, and password
        ↓
Account is created
        ↓
User enters dashboard
```

---

# 49. Main User Flow: Create Tracker

```text
Dashboard
   ↓
Create TheDays
   ↓
Enter title
   ↓
Enter description
   ↓
Choose start date
   ↓
Choose Practice or Abstinence
   ↓
Create
   ↓
Tracker detail page
```

---

# 50. Main User Flow: Complete a Day

## Practice: Complete Today

```text
Open tracker
   ↓
View current day
   ↓
Mark current day as completed
   ↓
Completion is stored
   ↓
TheDays increases by one
   ↓
Landmark progress updates
```

Example:

```text
41 DAYS
```

becomes:

```text
42 DAYS
```

## Abstinence: Complete Yesterday

```text
Open tracker
   ↓
Today is visible and not completable
   ↓
Mark yesterday (or the latest finished incomplete day) as completed
   ↓
Completion is stored
   ↓
TheDays increases by one
   ↓
Landmark progress updates
```

---

# 51. Main User Flow: Missed Day

Example sequence:

```text
Monday      ✓
Tuesday     ✓
Wednesday   ☐
Thursday    ☐
```

The TheDays remains:

```text
2
```

If Friday is completed:

```text
Friday      ✓
```

the count becomes:

```text
3
```

Previous progress remains intact.

---

# 52. Main User Flow: Create Landmark

```text
Tracker
   ↓
Landmarks
   ↓
Add Landmark
   ↓
Enter target TheDays
   ↓
Enter celebration description
   ↓
Save
```

Example result:

```text
Current:
42 days

Next Landmark:
50 days

8 completed days remaining
```

---

# 53. Empty States

## No Trackers

The dashboard should display an empty state when the user has no TheDayss.

Example:

```text
No TheDayss yet.

Create the first one to begin tracking progress.
```

Primary action:

```text
[ Create TheDays ]
```

## No Landmarks

The landmark section should display an empty state when none exist.

Example:

```text
No landmarks have been added yet.

Add a target and define how it will be celebrated.
```

Primary action:

```text
[ Add Landmark ]
```

---

# 54. Loading States

The interface should clearly communicate when data is loading or a mutation is being processed.

Suitable approaches include:

* Skeleton loading states.
* Inline loading indicators.
* Disabled submit buttons during mutations.

Checkbox interactions should feel immediate.

Optimistic updates may be used for completed-day interactions.

If an API request fails, the interface should revert the optimistic change and display an appropriate error message.

---

# 55. Error Handling

The application should handle common failure cases gracefully.

Examples include:

### Expired Session

```text
Your session has expired. Please sign in again.
```

### Invalid Start Date

```text
Start date cannot be in the future.
```

### Network Failure

```text
The change could not be saved. Please try again.
```

### Duplicate Completion

The backend should prevent duplicate completion records through database constraints.

The user should never see the TheDays increase twice for the same date.

---

# 56. Deleting a Tracker

Deleting a tracker is a destructive action.

Deleting a tracker should also delete:

* All completed days belonging to the tracker.
* All landmarks belonging to the tracker.

The user should receive a confirmation dialog before deletion.

Example:

```text
Delete "Days I Went Running"?

This will permanently delete the tracker, its completed days, and its landmarks.
```

Database cascading deletes should be used where appropriate.

---

# 57. Editing a Start Date

Changing the start date can conflict with existing completion records.

Example:

```text
Original Start Date:
August 1

Completed Days:
August 3
August 5
August 10
```

If the user attempts to change the start date to August 7, the completed records for August 3 and August 5 would fall outside the tracker's valid range.

For the MVP, the application should not allow a start date to be changed to a date later than the earliest completed day.

This avoids silently deleting or invalidating existing progress.

Completion mode cannot be changed after creation in the MVP. Changing Practice to Abstinence could leave a completion for today, which Abstinence does not allow.

---

# 58. Sorting

## Tracker List

Trackers may initially be sorted by either:

* Most recently created.
* Most recently updated.

The final choice should remain consistent across the dashboard.

## Day History

Days should be ordered:

```text
Newest → Oldest
```

## Landmarks

Landmarks should be ordered:

```text
Lowest target → Highest target
```

---

# 59. Long History Handling

A tracker may eventually contain years of elapsed days.

The interface should not render thousands of rows simultaneously.

The MVP may load historical days in batches such as:

```text
30
60
or
90
```

Example:

```text
Today
...
July 18

[ Load Earlier Days ]
```

Virtualized rendering may be considered in a later version.

---

# 60. Accessibility Requirements

Interactive controls must be accessible.

Checkboxes should use semantic form controls or equivalent accessible components.

Each day should have an accessible label such as:

```text
Mark August 16, 2026 as completed
```

The application should support:

* Keyboard navigation.
* Visible focus states.
* Screen readers.
* Sufficient color contrast.

Interactive controls should not rely solely on visual styling to communicate state.

---

# 61. Responsive Design Requirements

The interface should adapt appropriately to:

* Mobile devices.
* Tablets.
* Desktop screens.

Important daily actions should remain easily accessible on smaller screens: marking today on a Practice TheDays, and marking the latest finished day on an Abstinence TheDays.

---

# 62. MVP Screens

The MVP should include:

1. Landing page.
2. Registration page.
3. Login page.
4. Dashboard.
5. Create TheDays interface.
6. Tracker detail page.
7. Edit tracker interface.
8. Add landmark interface.
9. Edit landmark interface.
10. Account/settings page.
11. Delete confirmation dialogs.

---

# 63. Dashboard Requirements

Each TheDays card should display at minimum:

```text
Title
Completion mode
Current TheDays
Daily completion status for that mode
Next landmark
```

Practice example:

```text
Days I Went Running
Practice

42 days

Today:
✓ Completed

Next:
50 days
8 remaining
```

Abstinence example:

```text
Days Without Soda
Abstinence

12 days

Today:
In progress

Yesterday:
☐ Not yet marked

Next:
30 days
18 remaining
```

Selecting the card should open the tracker detail page.

---

# 64. Authenticated Route Requirements

Unauthenticated users must not be able to access protected routes such as:

```text
/dashboard
/trackers/:trackerId
/settings
```

TanStack Router may enforce frontend navigation guards.

The backend must independently verify authentication on every protected API endpoint.

---

# 65. Security Requirements

The backend should:

* Hash all passwords.
* Never expose password hashes.
* Validate all user input.
* Verify ownership of resources.
* Use secure HTTP-only authentication cookies.
* Use secure cookies in production.
* Configure suitable SameSite settings.
* Use Helmet for HTTP security headers.
* Rate-limit sensitive authentication endpoints.
* Prevent duplicate completion records with database constraints.
* Avoid exposing internal database errors directly to clients.

---

# 66. Recommended Project Architecture

The frontend and backend should be maintained in **separate Git repositories**.

This keeps the client application and server application clearly separated, allows each application to have its own deployment configuration and release history, and makes the boundary between frontend and backend responsibilities explicit.

## Frontend Repository

Suggested repository name:

```text
thedays-web
```

Suggested structure:

```text
thedays-web/
  src/
    components/
    features/
    routes/
    hooks/
    lib/
    api/
    types/
    utils/
  public/
  package.json
  vite.config.ts
  tsconfig.json
```

The frontend repository should contain:

```text
React
Vite
TypeScript
TanStack Router
TanStack Query
```

The frontend should communicate with the backend exclusively through the backend's public HTTP API.

The frontend must not connect directly to PostgreSQL or contain database credentials.

## Backend Repository

Suggested repository name:

```text
thedays-api
```

Suggested structure:

```text
thedays-api/
  src/
    controllers/
    routes/
    services/
    middleware/
    validators/
    db/
    utils/
    app.ts
    server.ts
  prisma/
    schema.prisma
    migrations/
  package.json
  tsconfig.json
```

The backend repository should contain:

```text
Node.js
Express
TypeScript
Prisma
PostgreSQL
```

The backend should be responsible for:

* Authentication and session handling.
* Request validation.
* Authorization and resource ownership checks.
* Business rules.
* Database access.
* Tracker management.
* Completed-day management.
* Landmark management.
* Date and timezone validation.
* Returning structured API responses to the frontend.

## Frontend and Backend Contract

Because the frontend and backend live in separate repositories, shared TypeScript files should not be imported directly between them.

The API contract should instead be kept consistent through clearly documented request and response structures.

For example, creating a tracker should use the same agreed structure on both sides:

```json
{
  "title": "Days I Went Running",
  "description": "Track every day on which a run is completed.",
  "startDate": "2026-08-01",
  "completionMode": "practice"
}
```

The backend remains the authoritative source for validation and business rules, even when the frontend performs equivalent validation for user experience.

If duplication of API types becomes difficult to maintain later, the project may introduce a separately versioned shared package, generated API types, or an API specification such as OpenAPI. This is not required for the MVP.

## Deployment Independence

The two repositories should be deployable independently.

A typical deployment model may be:

```text
thedays-web
    ↓
Frontend hosting platform

thedays-api
    ↓
Backend hosting platform
    ↓
PostgreSQL database
```

The frontend should receive the backend API base URL through environment configuration.

Example:

```text
VITE_API_URL=https://api.example.com
```

The backend should independently manage environment variables such as:

```text
DATABASE_URL
SESSION_SECRET
FRONTEND_URL
```

Production CORS and cookie settings must explicitly allow communication between the deployed frontend and backend origins.

---

# 67. Recommended Implementation Sequence

## Phase 1: Frontend Foundation

Set up:

```text
React
Vite
TypeScript
TanStack Router
```

Build:

* Registration page.
* Login page.
* Dashboard shell.

---

## Phase 2: Backend Foundation

Set up:

```text
Node.js
Express
TypeScript
PostgreSQL
Prisma
```

Create a health endpoint:

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok"
}
```

This confirms that the backend service is available and can communicate with the frontend environment.

---

## Phase 3: Authentication

Implement:

```text
Register
Login
Logout
Current User
```

Authentication should be functional before tracker ownership is introduced.

---

## Phase 4: Trackers

Implement:

```text
Create Tracker
Get Trackers
Get Tracker
Update Tracker
Delete Tracker
```

---

## Phase 5: Completed Days

Implement:

```text
Complete Day
Uncomplete Day
Get Completed Days
Calculate TheDays
Enforce completionMode (Practice allows today; Abstinence does not)
```

At this point, the core product behaviour should be functional.

---

## Phase 6: Day History UI

Generate calendar dates from:

```text
tracker.startDate
```

through:

```text
current date
```

Match generated dates against completed days returned by the backend.

---

## Phase 7: Landmarks

Implement:

```text
Create Landmark
Get Landmarks
Update Landmark
Delete Landmark
Calculate Landmark Progress
Determine Next Landmark
Display Reached Landmarks
```

---

## Phase 8: Product Polish

Complete:

* Loading states.
* Error handling.
* Responsive layout.
* Optimistic updates.
* Confirmation dialogs.
* Accessibility.
* Long-history loading.
* Account settings.

---

# 68. MVP Acceptance Criteria

## Authentication

* [ ] A new user can create an account.
* [ ] A registered user can log in.
* [ ] A logged-in user can log out.
* [ ] Authentication persists across page refreshes.
* [ ] One user cannot access another user's data.

## TheDayss

* [ ] A user can create a TheDays.
* [ ] A TheDays has a title.
* [ ] A TheDays may have a description.
* [ ] A TheDays has a start date.
* [ ] A TheDays has a completion mode of Practice or Abstinence, chosen at creation.
* [ ] Completion mode cannot be changed after creation.
* [ ] A user can view all TheDayss they own.
* [ ] A user can edit a TheDays.
* [ ] A user can delete a TheDays.

## Completed Days

* [ ] All valid dates between the start date and today can be displayed.
* [ ] Future dates are not displayed.
* [ ] On a Practice TheDays, a user can mark today as completed.
* [ ] On an Abstinence TheDays, today is displayed and cannot be marked completed.
* [ ] On an Abstinence TheDays, a user can mark yesterday as completed after that day has ended.
* [ ] The backend rejects completing today on an Abstinence TheDays.
* [ ] A user can unmark a completed day.
* [ ] Completed days remain completed after page refresh.
* [ ] Each completed day contributes exactly one to the TheDays.
* [ ] Incomplete days do not contribute to the TheDays.
* [ ] Missing a day does not reset the TheDays.
* [ ] Completing a later day increases the cumulative TheDays.
* [ ] The same date cannot be counted twice.

## Landmarks

* [ ] A user can create a landmark.
* [ ] A landmark may contain a title.
* [ ] A landmark has a target TheDays.
* [ ] A landmark has a celebration description.
* [ ] A user can edit a landmark.
* [ ] A user can delete a landmark.
* [ ] The next upcoming landmark is visible.
* [ ] Progress toward a landmark is visible.
* [ ] Reached landmarks remain visible.

---

# 69. Example Product Scenario

## Practice

A user creates the following TheDays:

```text
Title:
Days I Read

Description:
Track each day on which at least 30 minutes of intentional reading is completed.

Start Date:
August 1

Completion mode:
Practice
```

By August 7, the history is:

```text
Aug 1 ✓
Aug 2 ✓
Aug 3 ☐
Aug 4 ✓
Aug 5 ☐
Aug 6 ✓
Aug 7 ✓
```

The TheDays is:

```text
5
```

The user adds a landmark:

```text
Target:
10 days

Celebration:
Buy a new novel.
```

The application displays:

```text
5 / 10 days

5 completed days remaining
```

August 8 is missed.

The TheDays remains:

```text
5
```

August 9 is completed during that day.

The TheDays becomes:

```text
6
```

Landmark progress becomes:

```text
6 / 10 days

4 completed days remaining
```

The missed day has no effect on previously accumulated progress.

## Abstinence

A user creates:

```text
Title:
Days Without Soda

Completion mode:
Abstinence

Start Date:
August 1
```

On August 7 during the day, August 7 is visible and disabled. The user marks August 6 complete after that day has ended.

```text
Aug 6 ✓
Aug 7 ☐  (today; available after the day ends)
```

If they drink soda on August 7, they leave August 7 unmarked after midnight. The TheDays does not decrease. Previous completed days remain.

---

# 70. Core Product Principle

The product is based on cumulative achievement rather than consecutive streaks.

A missed day means:

```text
No progress was recorded for that day.
```

It does not mean:

```text
Previous progress has been reset.
```

Every completed day permanently contributes one unit to the TheDays unless the user explicitly removes that completion.
