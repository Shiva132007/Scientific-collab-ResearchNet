TL Brief — Collaboration Features (5 minutes)

Slide 1 — Title (20s)
- Title: "Collaboration Features — Projects, Teams, and Co‑authors"
- Speaker: "Quick overview of how teams and co-authorship are managed in our system. I'll show data flow and permissions, then demo the common flows."

Slide 2 — Core Concepts (40s)
- Bullets:
  - Researcher: user profile (linked to user id)
  - Project: project record with metadata and visibility
  - Publication: publication record with authors
  - Member/Author link: association tables (`project_members`, `publication_authors`) with `role` and ordering
- Speaker: "These primitives drive collaboration features and are represented in the DB and API." 

Slide 3 — Data model & API (50s)
- Bullets:
  - `GET /projects/` returns projects with `members` (now includes nested researcher info)
  - `POST /projects/{id}/members` assign member
  - `DELETE /projects/{id}/members/{researcher_id}` remove member
  - `GET /publications/` returns publications with `authors` (now includes nested researcher info)
  - `POST /publications/{id}/authors` add co-author
- Speaker: "We return nested researcher objects inside member/author records so frontend can render names without extra requests." 

Slide 4 — Permissions (40s)
- Bullets:
  - SystemAdmin & project creator: full access
  - InstitutionAdmin: full access for their institution's records
  - Lead Investigator: full project control
  - Researcher (project member): can now manage members (assign/remove)
  - Co‑author: can modify publication they are on
- Speaker: "Permissions enforce who can change team composition; we've expanded reasonable writer roles to avoid bottlenecks." 

Slide 5 — UI / UX notes (40s)
- Bullets:
  - Projects page: inline assign/remove operations, inline error messaging
  - Publications: inline co-author add/remove, authors shown with researcher name
  - Error handling: backend details are surfaced inline to help users fix issues
- Speaker: "UI reflects server state and shows backend error details so users know why an action failed." 

Slide 6 — Demo plan (40s)
- Steps:
  1. Log in as researcher — show researcher profile (user_id match)
  2. Create project — show auto-assignment of creator as Lead Investigator
  3. Add a team member — select researcher, assign role, show success and member appearing
  4. Add a co-author to a publication — select researcher, set order, add
  5. Toggle visibility and show how another user sees it
- Speaker: "I'll run these 5 quick steps to illustrate the end-to-end flow." 

Slide 7 — Troubleshooting & Next steps (50s)
- Bullets:
  - Common failures: missing researcher profile, permission 403, duplicate assignment 400
  - Immediate fixes: create researcher profile, confirm user roles, inspect network response body
  - Suggested improvements: return richer researcher summary with member records, real-time updates, clearer audit view
- Speaker: "If we encounter issues, these are the usual causes and immediate fixes. For longer-term, we can add real-time notifications and richer audit trails."

Closing (20s)
- Ask for questions and propose follow-up: demo in environment or provide a short how-to doc for admins.
