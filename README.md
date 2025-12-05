# LearnLynk Technical Assignment

This repository contains my implementation for the LearnLynk internship technical test.  
The objective is to design a Supabase-based backend + simple frontend integration.

---

## 📌 Deliverables Included

### 1. **Database Schema & RLS**
- Tables: `leads`, `applications`, `tasks`
- Relationships:
  - `applications.lead_id` → `leads.id`
  - `tasks.related_id` → `applications.id`
- Indexes for optimized queries
- Constraints:
  - `tasks.due_at >= created_at`
  - `task.type IN ('call','email','review')`
- RLS Policies:
  - Admin → full read/insert access
  - Counselor → only leads assigned to them or their team

File: `schema/schema.sql`

---

### 2. **Supabase Edge Function**
- POST `/create-task`
- Validates input (task_type + due_at)
- Inserts into tasks table
- Emits realtime event `"task.created"`
- Returns JSON `{ success: true, task_id }`

File: `supabase/functions/create-task/index.ts`

---

### 3. **Next.js Mini Dashboard**
- Path: `/dashboard/today`
- Fetch tasks due today from Supabase
- Display table with title, related application ID, date & status
- Button to mark task as complete
- Uses Supabase client + React Query

File: `app/dashboard/today/page.tsx` (to add next step)

---

### 4. **Stripe Integration Summary**
- Create Checkout Session
- Store payment_request entry
- Handle webhook after successful payment
- Update application stage/status

Detailed notes will be added in `NOTES.md`

---

### 📂 Repo Structure
