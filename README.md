# Training Assessment Portal

A full-stack **Next.js** app for running MCQ quizzes after training sessions (e.g. IT / software audit training).
It has two panels:

- **Admin panel**: create assessments, upload MCQ question banks, share the link, and see stats and results.
- **User panel**: open the shared link, log in or register, take a randomized quiz, and see the result right away.

## Quick start

```bash
npm install
cp .env.example .env        # then change AUTH_SECRET
npm run setup               # creates the SQLite DB and seeds demo data
npm run dev                 # http://localhost:3000
```

Demo accounts created by `npm run setup`:

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Admin   | admin@example.com     | admin123     |
| Student | student@example.com   | student123   |

There is also a sample **IT Audit Fundamentals** assessment at `/a/it-audit-fundamentals`. It has 40 questions across 4 topics, and each student gets 10.

## Workflow

1. **Admin → Assessments → New assessment.** Set the title, training session, questions per student, time limit, pass mark, attempts allowed, and an optional open/close window.
2. **Add questions.** Add them one by one, or **bulk upload a CSV** (a template is available on the Questions tab):
   ```
   question,option_a,option_b,option_c,option_d,answer,explanation,topic
   ```
   `answer` can be a letter (`B`), a number (`2`) or the exact option text. Each question can have 2–8 options. Invalid rows are reported with their line numbers, and duplicates are skipped.
3. **Publish** and **copy the share link** (`/a/<slug>`). Send it to participants after the session.
4. **Participants** click the link. They are asked to log in or register, then land straight back on the assessment and click *Start*. Answers save automatically. A timer is shown if you set one, and the quiz auto-submits when time runs out. The result and answer review appear right after submitting.
5. **Admin** sees the dashboard stats, the score distribution, the pass rate, the hardest questions and every attempt. Admins can review any attempt, reset an attempt so the student can retake it, and **export results to CSV**.

## The randomization engine (`src/lib/engine.ts`)

Example: the pool has **40** questions and **10** are given to each student. For each new attempt, the engine:

1. **Picks the least-used questions first, breaking ties at random.** Each question counts how often it has been served (`timesServed`). Because of this, the first 4 students get 4 completely different papers, and over time every question is used equally often.
2. **Balances topics.** If questions have a `topic`, the 10 slots are split across topics in proportion to the pool, so every student gets a comparable paper.
3. **Never repeats a set.** Each set gets a signature (a hash of its sorted question IDs). If a new set matches a set already issued for that assessment, questions are swapped until it is unique.
4. **Gives retakes new questions.** A student who retakes the test gets questions they have not seen before, where possible.
5. **Shuffles question order, and option order within each question.**
6. **Saves the paper.** The exact paper (questions, order, option permutation) is stored for each attempt, so a page refresh doesn't reshuffle it. Grading happens on the server, and the answer key is never sent to the browser.

On the assessment's **Overview** tab, admins can see how many different sets are possible (C(40,10) = 847,660,528). They can also **run a simulation**, for example 30 students, to see how many questions students share on average.

Run `npm run engine:check` for a quick command-line simulation. Sample output: 100 students, 100 unique sets, students who sit next to each other share under 1 question on average, and every question is used 25 times.

The engine warns you when the pool is too small. If the pool has the same number of questions as the paper, every student gets the same questions in a different order.

## Other features

- Role-based auth (bcrypt-hashed passwords, signed HTTP-only JWT cookie). Admins can promote other users.
- Assessment open/close times, attempt limits, an optional time limit enforced on the server, and an option to show or hide the answer review.
- Question analytics: how often each question was served and its correct-answer rate.
- Deactivate questions. Deleting a question that students have already seen deactivates it instead, so past results stay intact.
- Duplicate an assessment to reuse it for the next training batch.
- Results search and filter, and CSV export.

## Tech stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Prisma 6 · SQLite · Tailwind CSS 4 · Zod · jose · bcryptjs

### Production

- Set a strong `AUTH_SECRET` and `APP_URL` (used to build the share links).
- For multiple users at once, switch `prisma/schema.prisma` to `provider = "postgresql"` and point `DATABASE_URL` at your database. Then run `npx prisma db push` and `npm run db:seed`.
- Run `npm run build && npm start`.
- Dates in the open/close fields use the server's time zone (set `TZ`, e.g. `TZ=Asia/Dhaka`).

## Project structure

```
prisma/schema.prisma          data model (User, Assessment, Question, Attempt, AttemptQuestion)
prisma/seed.ts                admin + demo student + 40-question sample assessment
src/lib/engine.ts             randomization engine (pure, testable)
src/lib/quiz.ts               start/resume attempt, save answer, grade
src/lib/auth.ts               sessions & guards
src/lib/csv.ts                CSV import/export
src/app/a/[slug]              assessment landing (the shared link)
src/app/attempt/[id]          quiz runner + result page
src/app/dashboard             participant's results
src/app/admin/...             admin dashboard, assessments, questions, results, users
src/app/actions/              server actions
```
