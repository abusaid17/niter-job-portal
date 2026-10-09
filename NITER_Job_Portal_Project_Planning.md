# NITER Job Portal

## University Career & Recruitment Management System

A centralized university job portal connecting **NITER Students, Alumni, Faculty/Career Advisors, Recruiters, and Administrators** through a single career and recruitment platform.

---

## 1. Project Vision

### Goal

Build a secure, role-based university career platform where:

- Students can create profiles, manage CVs, search jobs, apply, and track applications.
- Alumni can search/apply for jobs and post verified vacancies from their organizations.
- Recruiters can manage company profiles, publish jobs, screen applicants, shortlist candidates, and schedule interviews.
- Faculty/Career Advisors can verify students, recommend candidates, organize career activities, and view employment statistics.
- Admins can control the complete platform, approve users/jobs, manage data, and monitor recruitment activities.

### Core Statement

> Connect NITER Students, Alumni, Faculty and Employers through a centralized university career and recruitment platform.

---

# 2. Recommended User Roles

| Role                   | Main Responsibility                                      |
| ---------------------- | -------------------------------------------------------- |
| Admin                  | Complete platform and institutional management           |
| Student                | Job/internship search and application                    |
| Alumni                 | Job search/application, networking, verified job posting |
| Recruiter              | Company and recruitment management                       |
| Faculty/Career Advisor | Student verification, recommendation and career support  |

## Role Permission Summary

### Admin

Can:

- Manage all users
- Approve/reject registrations
- Verify recruiters
- Approve/reject job posts
- Manage companies
- Manage applications
- Manage interviews
- Manage career events
- View analytics
- Suspend users
- Remove reported jobs
- View placement statistics

### Student

Can:

- Register/login
- Manage own profile
- Upload/update CV
- Add education, skills, projects and experience
- Search/filter jobs
- Apply for jobs
- Apply for internships
- Track application status
- Register for career events
- Receive notifications
- Communicate with recruiters through internal messaging

### Alumni

Can:

- Manage alumni profile
- Search jobs
- Apply for jobs
- Maintain company/experience information
- Submit job vacancies from their organization
- Refer eligible students
- Participate in career events/networking

**Important:** Alumni job posts should require verification/approval before publication.

### Recruiter

Can:

- Create/manage company profile
- Submit job/internship posts
- Edit/close own jobs
- View applicants
- Review CVs
- Shortlist/reject candidates
- Message candidates
- Schedule interviews
- Update application status

### Faculty/Career Advisor

Can:

- Verify student profiles
- Review CV/profile information
- Recommend suitable students
- View career-related student information according to permission
- Organize career events
- View employment/placement statistics

---

# 3. MVP Scope

The first working version should focus on the complete recruitment workflow.

## Phase 1 — Must Have

> Status update (Oct 2026 audit): all items below are Done except Internship posting (posted via job type, no dedicated flow — Open).

- [x] Registration/login
- [x] JWT-based authentication
- [x] Role-based authorization
- [x] Student profile
- [x] Alumni profile
- [x] Recruiter profile
- [x] Company profile
- [x] Faculty profile
- [x] CV upload/update
- [x] Job posting
- [ ] Internship posting
- [x] Job search/filter
- [x] Job application
- [x] Application tracking
- [x] Admin approval
- [x] Recruiter applicant management
- [x] Candidate shortlisting
- [x] Interview scheduling
- [x] Faculty/student verification
- [x] Notifications
- [x] Admin dashboard

## Phase 2 — Strong Features

> Status update (Oct 2026 audit): all Done. Job matching is basic (skill-match display + recommendations); full AI matching stays in Phase 3.

- [x] Alumni job posting
- [x] Alumni referral
- [x] Faculty recommendation
- [x] Career events
- [x] Campus recruitment
- [x] Job matching
- [x] Profile/CV completeness
- [x] Job reporting
- [x] Analytics
- [x] Employment/placement statistics

## Phase 3 — Advanced/AI

- [ ] AI job recommendation
- [ ] CV-job matching
- [ ] Skill-gap analysis
- [ ] AI CV feedback
- [ ] Career recommendation

---

# 4. Features to Avoid in the First Version

To keep the project manageable, do not build these initially:

- Real-time video interview system
- Payment/salary processing
- Full social-media-style feed
- Complex AI CV generator
- Complex ML recommendation model
- Full external HR/ATS integration

For interviews, store a **meeting link** instead of building video calling.

---

# 5. Core Recruitment Workflow

```text
User Registration
       |
       v
Account Verification
       |
       +------------------+
       |                  |
       v                  v
Student/Alumni        Recruiter
       |                  |
       v                  v
Profile + CV        Company Profile
       |                  |
       |                  v
       |              Job Posting
       |                  |
       |            Admin Approval
       |                  |
       +---------> Published Job
                         |
                         v
                  Student Applies
                         |
                         v
                  Recruiter Screening
                         |
                         v
                     Shortlist
                         |
                         v
                Faculty Recommendation
                         |
                         v
                     Interview
                         |
                  +------+------+
                  |             |
                  v             v
               Selected       Rejected
                  |
                  v
            Placement Record
```

> Faculty recommendation can be optional depending on the recruitment type. Recruiters should be able to proceed without it unless Admin configures a job as requiring recommendation.

---

# 6. Alumni Job Posting Workflow

```text
Alumni
  |
  v
Create Job Post
  |
  v
Select/Verify Company
  |
  v
Submit for Approval
  |
  v
Admin/Career Advisor Review
  |
  +----------+----------+
  |                     |
Approved              Rejected
  |                     |
  v                     v
Published             Feedback
```

## Recommended Rule

An Alumni should only be able to post a vacancy if:

1. The Alumni account is verified.
2. The company information is valid.
3. The job information is complete.
4. The job passes Admin/Career Advisor approval.

If the Alumni is an authorized company recruiter, Admin can upgrade/link the account to the Recruiter role.

---

# 7. Student Module

## 7.1 Student Profile

Recommended fields:

```text
Full Name
Student ID
Department
Program
Batch
Semester
Email
Phone
Profile Photo
CGPA
Skills
Projects
Certifications
Experience
LinkedIn
GitHub
Portfolio
Career Interests
Preferred Job Type
Preferred Location
```

## 7.2 CV Management

Students should be able to:

- Upload CV
- Replace CV
- Download/view CV
- Set default CV
- Delete old CV
- Attach CV to applications

## 7.3 Profile Completeness

Example:

```text
Profile Completion: 85%

Personal Information   ✓
Education              ✓
Skills                 ✓
Projects               ✓
Experience             ✗
CV                     ✓
```

---

# 8. Job Search Module

## Search

Allow searching by:

- Job title
- Company
- Keyword
- Skill

## Filters

- Job type
- Internship
- Full-time
- Part-time
- Remote
- Location
- Department
- Salary range
- Deadline
- Experience level

## Job Card

Example:

```text
Software Engineer
ABC Technologies

Location: Dhaka
Type: Full-time
Experience: Entry Level
Skills: React, Node.js, MySQL

Deadline: 20 September 2026

[View Details] [Apply]
```

---

# 9. Job Details Page

Every job should contain:

```text
Job Title
Company
Company Logo
Location
Employment Type
Salary/Compensation
Vacancy Count
Experience Requirement
Education Requirement
Required Skills
Job Description
Responsibilities
Benefits
Application Deadline
Posted Date
Application Instructions
Contact/Recruiter Information
Verification Badge
```

Example verification:

```text
✓ NITER Verified
```

---

# 10. Application Module

## Application Status

Recommended statuses:

```text
Applied
   ↓
Under Review
   ↓
Shortlisted
   ↓
Interview Scheduled
   ↓
Selected
```

Alternative final state:

```text
Rejected
Withdrawn
Expired
```

## Student Application Dashboard

| Job               | Company | Applied Date | Status       |
| ----------------- | ------- | ------------ | ------------ |
| Software Engineer | ABC     | 10 Sep       | Shortlisted  |
| Web Developer     | XYZ     | 11 Sep       | Under Review |
| Intern            | DEF     | 12 Sep       | Interview    |
| Data Analyst      | PQR     | 13 Sep       | Rejected     |

---

# 11. Recruiter Module

## Company Profile

```text
Company Name
Logo
Industry
Website
Location
Description
Company Size
Contact Information
Verification Status
```

## Recruiter Dashboard

Show:

```text
Active Jobs
Total Applicants
Shortlisted Candidates
Interviews
Selected Candidates
Closed Jobs
```

## Applicant Pipeline

```text
All Applicants
      |
      +--> Under Review
      |
      +--> Shortlisted
      |
      +--> Interview
      |
      +--> Selected
      |
      +--> Rejected
```

Recruiter should be able to filter applicants by:

- Department
- CGPA
- Skills
- Experience
- Application status
- Graduation/batch

---

# 12. Faculty/Career Advisor Module

## Student Verification

```text
Pending Student
      |
      v
Faculty Review
      |
      +----> Approved
      |
      +----> Rejected / Needs Correction
```

## Faculty Recommendation

For eligible jobs:

```text
Job
 |
 v
Eligible Students
 |
 v
Faculty Review
 |
 v
Recommended Students
```

Faculty recommendation should not expose unnecessary private student information.

---

# 13. Campus Recruitment

Recruiters can request campus recruitment.

Workflow:

```text
Company
   |
   v
Campus Recruitment Request
   |
   v
Admin Approval
   |
   v
Define Eligibility
   |
   v
Eligible Students
   |
   v
Applications
   |
   v
Shortlisting
   |
   v
Interview
   |
   v
Selection
```

Eligibility can include:

```text
Department
Batch
Minimum CGPA
Required Skills
Graduation Year
```

---

# 14. Career Event Module

Admin/Career Advisor can create:

- Job Fair
- Career Fair
- Seminar
- Workshop
- Internship Fair
- Recruitment Event

Event fields:

```text
Event Name
Description
Date
Start Time
End Time
Venue
Organizer
Registration Deadline
Participating Companies
Capacity
```

Students can:

- View events
- Register
- Cancel registration
- Receive reminders

---

# 15. Alumni Networking

Alumni profile:

```text
Name
Graduation Year
Department
Current Company
Current Position
Industry
Skills
Experience
LinkedIn
```

## Alumni Referral

Possible workflow:
 
```text
Job
 |
 v
Alumni sees vacancy
 |
 v
Select Eligible Student
 |
 v
Submit Referral
 |
 v
Student receives notification
```

The referral system should not guarantee selection.

---

# 16. Messaging System

Use internal messaging between:

- Recruiter ↔ Student
- Recruiter ↔ Alumni
- Faculty ↔ Student
- Admin ↔ User

For the first version, simple one-to-one messaging is enough.

Do not expose personal phone/email unnecessarily.

---

# 17. Notification System

## Student

Notify for:

- New matching jobs
- Application status changes
- Shortlisting
- Interview schedule
- Interview reminder
- Deadline reminder
- Faculty recommendation
- Alumni referral

## Recruiter

Notify for:

- New applications
- Candidate responses
- Interview confirmations
- Admin approval/rejection

## Admin

Notify for:

- New registration
- New recruiter
- New job awaiting approval
- Reported job
- Campus recruitment request

---

# 18. Admin Dashboard

Recommended dashboard cards:

```text
Total Students
Total Alumni
Total Recruiters
Total Faculty
Active Jobs
Active Internships
Total Applications
Pending Approvals
Scheduled Interviews
Selected Candidates
```

## Analytics

Charts:

- Jobs by department
- Applications by month
- Applications by job type
- Selected candidates by department
- Company recruitment statistics
- Placement rate
- Internship statistics
- Alumni participation

---

# 19. Database Design

Recommended main entities:

```text
users
students
alumni
faculty
recruiters
companies
jobs
applications
cvs
skills
student_skills
education
projects
experience
interviews
messages
notifications
events
event_registrations
recommendations
referrals
job_reports
campus_recruitment
placements
```

---

# 20. Database Relationship Concept

```text
USERS
 |
 +---- STUDENTS
 |       |
 |       +---- CVs
 |       +---- Education
 |       +---- Skills
 |       +---- Projects
 |       +---- Experience
 |       +---- Applications
 |
 +---- ALUMNI
 |       |
 |       +---- Experience
 |       +---- Referrals
 |       +---- Job Posts
 |
 +---- RECRUITERS
 |       |
 |       +---- Company
 |              |
 |              +---- Jobs
 |                    |
 |                    +---- Applications
 |
 +---- FACULTY
 |
 +---- ADMIN
```

---

# 21. Suggested MySQL Core Tables

## users

```text
id
name
email
password_hash
role
status
is_verified
created_at
updated_at
```

## students

```text
id
user_id
student_id
department
program
batch
semester
cgpa
phone
profile_photo
linkedin_url
github_url
portfolio_url
bio
created_at
updated_at
```

## alumni

```text
id
user_id
student_id
graduation_year
department
current_company
current_position
industry
linkedin_url
bio
is_verified
created_at
updated_at
```

## recruiters

```text
id
user_id
company_id
designation
is_verified
created_at
updated_at
```

## faculty

```text
id
user_id
department
designation
employee_id
created_at
updated_at
```

## companies

```text
id
name
logo
industry
website
location
description
company_size
verification_status
created_by
created_at
updated_at
```

## jobs

```text
id
company_id
posted_by
source_type
title
description
responsibilities
requirements
employment_type
location
salary_min
salary_max
vacancy_count
deadline
status
verification_status
created_at
updated_at
```

`source_type` examples:

```text
ADMIN
RECRUITER
ALUMNI
```

## applications

```text
id
job_id
student_id
cv_id
cover_letter
status
applied_at
updated_at
```

## interviews

```text
id
application_id
scheduled_by
interview_date
start_time
end_time
venue
meeting_link
notes
status
created_at
updated_at
```

## notifications

```text
id
user_id
title
message
type
is_read
created_at
```

---

# 22. Recommended Constraints

Important database rules:

- User email must be unique.
- Student ID must be unique.
- Employee ID must be unique.
- One student should not apply to the same job more than once.
- A job cannot be published without approval when approval is required.
- Only authorized recruiters can manage company jobs.
- Alumni job posts require verification.
- Expired jobs should stop accepting applications.
- Deleted users/jobs should be handled safely using status/soft-delete where appropriate.

---

# 23. API Structure

Recommended REST API organization:

```text
/api/auth
/api/users
/api/students
/api/alumni
/api/faculty
/api/recruiters
/api/companies
/api/jobs
/api/applications
/api/interviews
/api/cvs
/api/messages
/api/notifications
/api/events
/api/referrals
/api/recommendations
/api/admin
/api/analytics
```

Example:

```text
POST   /api/auth/register
POST   /api/auth/login

GET    /api/jobs
GET    /api/jobs/:id
POST   /api/jobs
PUT    /api/jobs/:id
DELETE /api/jobs/:id

POST   /api/jobs/:id/apply
GET    /api/applications/my
GET    /api/recruiter/applications

POST   /api/interviews
PUT    /api/applications/:id/status

GET    /api/notifications
PUT    /api/notifications/:id/read
```

---

# 24. Backend Authorization

Never rely only on frontend role restrictions.

Backend middleware should enforce permissions.

Example concept:

```text
authenticateUser()
        |
        v
checkRole("ADMIN")
        |
        v
Controller
```

Examples:

```text
Admin → All management operations

Student → Own profile + own applications

Alumni → Own profile + approved job submission

Recruiter → Own company + own jobs/applications

Faculty → Authorized students/recommendations
```

---

# 25. Authentication Flow

```text
Register
   |
   v
Validate Data
   |
   v
Hash Password
   |
   v
Create User
   |
   v
Email/Institution Verification
   |
   v
Login
   |
   v
Generate JWT
   |
   v
Access Protected APIs
```

Use:

- bcrypt/Argon2 for password hashing
- JWT access authentication
- Secure HTTP-only cookies if appropriate
- Input validation
- Rate limiting
- Secure error handling

---

# 26. Frontend Page Structure

## Public Pages

```text
/
 /jobs
 /jobs/:id
 /companies
 /events
 /login
 /register
 /about
 /contact
```

## Student

```text
/student/dashboard
/student/profile
/student/cv
/student/jobs
/student/applications
/student/interviews
/student/messages
/student/notifications
/student/events
```

## Alumni

```text
/alumni/dashboard
/alumni/profile
/alumni/jobs
/alumni/my-job-posts
/alumni/referrals
/alumni/applications
/alumni/messages
```

## Recruiter

```text
/recruiter/dashboard
/recruiter/company
/recruiter/jobs
/recruiter/jobs/create
/recruiter/jobs/:id
/recruiter/applicants
/recruiter/interviews
/recruiter/messages
```

## Faculty

```text
/faculty/dashboard
/faculty/students
/faculty/student/:id
/faculty/recommendations
/faculty/events
/faculty/reports
```

## Admin

```text
/admin/dashboard
/admin/users
/admin/students
/admin/alumni
/admin/recruiters
/admin/faculty
/admin/companies
/admin/jobs
/admin/applications
/admin/interviews
/admin/events
/admin/reports
/admin/analytics
/settings
```

---

# 27. UI/UX Structure

## Main Navigation

Public:

```text
Home
Jobs
Companies
Internships
Career Events
About
Login
Register
```

After login, navigation should change based on role.

## Student Dashboard

```text
Dashboard
My Profile
My CV
Find Jobs
Applications
Interviews
Messages
Notifications
Events
```

## Recruiter Dashboard

```text
Dashboard
Company
Jobs
Applicants
Interviews
Messages
Notifications
```

## Admin Dashboard

```text
Dashboard
Users
Jobs
Companies
Applications
Interviews
Events
Reports
Analytics
Settings
```

---

# 28. Technology Stack

## Frontend

```text
React.js
Vite
Tailwind CSS
DaisyUI
React Router
Axios
React Hook Form
```

## Backend

```text
Node.js
Express.js
JWT
bcrypt/Argon2
Multer
Nodemailer
```

## Database

```text
MySQL
```

## File Storage

Choose one:

```text
Cloudinary
OR
Firebase Storage
```

## Analytics

```text
Recharts
```

## Future AI

```text
Python
FastAPI
Scikit-learn / PyTorch
```

---

# 29. Recommended Project Folder Structure

## Frontend

```text
client/
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── auth/
│   │   ├── student/
│   │   ├── alumni/
│   │   ├── recruiter/
│   │   ├── faculty/
│   │   └── admin/
│   ├── routes/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

## Backend

```text
server/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── uploads/
│   └── app.js
├── .env
└── package.json
```

---

# 30. Development Roadmap

## Step 1 — Project Setup

- [ ] Create Git repository
- [ ] Create React/Vite frontend
- [ ] Create Node/Express backend
- [ ] Connect MySQL
- [ ] Configure environment variables
- [ ] Configure CORS
- [ ] Establish project folder structure

## Step 2 — Database

- [ ] Design ER diagram
- [ ] Create users table
- [ ] Create role-specific tables
- [ ] Create companies table
- [ ] Create jobs table
- [ ] Create applications table
- [ ] Create interviews table
- [ ] Create notifications table
- [ ] Create remaining supporting tables
- [ ] Add foreign keys and constraints
- [ ] Insert sample/seed data

## Step 3 — Authentication

- [ ] Registration
- [ ] Login
- [ ] Logout
- [ ] Password hashing
- [ ] JWT
- [ ] Role-based authorization
- [ ] Email/institution verification
- [ ] Forgot/reset password

## Step 4 — Student

- [ ] Dashboard
- [ ] Profile CRUD
- [ ] Education
- [ ] Skills
- [ ] Projects
- [ ] Experience
- [ ] CV upload
- [ ] Job search
- [ ] Job details
- [ ] Apply
- [ ] Application tracking

## Step 5 — Recruiter

- [ ] Recruiter dashboard
- [ ] Company profile
- [ ] Create job
- [ ] Edit job
- [ ] Close job
- [ ] Applicant list
- [ ] CV review
- [ ] Shortlist/reject
- [ ] Interview scheduling

## Step 6 — Alumni

- [ ] Alumni dashboard
- [ ] Alumni profile
- [x] Job search
- [ ] Job application
- [ ] Job submission
- [ ] Admin approval workflow
- [ ] Referral system

## Step 7 — Faculty

- [ ] Faculty dashboard
- [ ] Student verification
- [ ] Student profile review
- [ ] Recommendation
- [ ] Career events
- [ ] Reports

## Step 8 — Admin

- [ ] Admin dashboard
- [ ] User management
- [ ] Job approval
- [ ] Recruiter/company verification
- [x] Reported jobs
- [ ] Application monitoring
- [ ] Interview monitoring
- [ ] Event management
- [x] Analytics

## Step 9 — Notifications & Messaging

- [x] In-app notifications
- [x] Email notifications
- [x] Internal messaging
- [x] Interview reminders
- [x] Application status notifications

## Step 10 — Testing & Security

- [ ] API testing
- [ ] Authentication testing
- [ ] Authorization testing
- [ ] Input validation
- [ ] File upload validation
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] Rate limiting
- [ ] Error handling
- [ ] Responsive UI testing

## Step 11 — Deployment

- [ ] Production database
- [ ] Backend deployment
- [ ] Frontend deployment
- [ ] File storage configuration
- [ ] Environment variables
- [ ] Domain configuration
- [ ] HTTPS
- [ ] Production testing

---

# 31. Testing Strategy

## Unit Testing

Test:

- Authentication functions
- Validation
- Job status logic
- Application status transitions
- Permission checks

## API Testing

Test:

```text
Register
Login
Create Job
Approve Job
Apply Job
Shortlist Candidate
Schedule Interview
Update Application
Send Message
```

## Role Testing

Verify that:

```text
Student cannot access Admin APIs
Alumni cannot directly publish unapproved jobs
Recruiter cannot access another company's applicants
Faculty cannot modify Admin data
Admin can manage authorized system resources
```

---

# 32. Security Checklist

- [ ] Hash passwords
- [ ] Never store plain-text passwords
- [ ] Validate all input
- [ ] Sanitize user-generated content
- [ ] Protect private APIs
- [ ] Enforce backend authorization
- [ ] Validate uploaded CV file types
- [ ] Limit file size
- [ ] Prevent malicious file uploads
- [ ] Use HTTPS in production
- [ ] Protect environment variables
- [ ] Use rate limiting
- [ ] Avoid leaking sensitive errors
- [ ] Use database constraints
- [ ] Implement audit logs for important Admin actions

---

# 33. Important Business Rules

### Job Posting

```text
Recruiter → Submit → Admin Review → Publish

Alumni → Submit → Admin Review → Publish

Admin → Publish directly
```

### Application

```text
Student can apply only if:
- Job is active
- Deadline has not passed
- Student is eligible
- Student has not already applied
```

### Interview

```text
Only authorized Recruiter/Admin/Faculty can create or manage interviews according to permission.
```

### User Verification

```text
New User
   |
   v
Pending
   |
   +---- Approved
   |
   +---- Rejected
   |
   +---- Suspended
```

---

# 34. AI Features — Future Roadmap

Do not start development with AI.

First complete the normal recruitment system.

After sufficient data is available:

## AI Job Recommendation

Input:

```text
Student Skills
Education
Projects
Experience
Career Interests
```

Compare with:

```text
Job Requirements
Required Skills
Education
Experience
Job Type
```

Output:

```text
Job Match: 92%
```

## CV-Job Matching

```text
CV
 |
 v
Extract Skills
 |
 v
Compare Job Requirements
 |
 v
Match Score
 |
 v
Missing Skills
```

## Skill Gap Analysis

Example:

```text
Target Role: Backend Developer

Current Skills:
✓ JavaScript
✓ Node.js
✓ MySQL

Missing/Recommended:
- Docker
- Redis
- REST API Design
```

---

# 35. Dashboard Design Principles

Each dashboard should prioritize:

1. Important statistics
2. Pending actions
3. Recent activity
4. Notifications
5. Quick actions

Example Student dashboard:

```text
Welcome, Student

Profile Completion: 85%

Recommended Jobs: 8
Applications: 12
Shortlisted: 3
Interviews: 2

Recent Applications
Upcoming Interviews
Recommended Jobs
```

---

# 36. Project Milestones

## Milestone 1

**Authentication + Database + Roles**

Deliverable:

- Login
- Registration
- JWT
- Role-based dashboard

## Milestone 2

**Student + Job Module**

Deliverable:

- Student profile
- CV
- Job search
- Job details
- Application

## Milestone 3

**Recruiter + Company**

Deliverable:

- Company
- Job posting
- Applicant management
- Shortlisting

## Milestone 4

**Interview + Faculty**

Deliverable:

- Interview scheduling
- Student verification
- Recommendation

## Milestone 5

**Alumni + Campus Recruitment**

Deliverable:

- Alumni job posting
- Referral
- Campus recruitment

## Milestone 6

**Admin + Analytics**

Deliverable:

- Admin dashboard
- Approvals
- Reports
- Placement statistics

## Milestone 7

**Notifications + Messaging + Polish**

Deliverable:

- Notifications
- Messaging
- Responsive UI
- Error handling

## Milestone 8

**Testing + Deployment**

Deliverable:

- Secure production-ready application
- Documentation
- Deployment

---

# 37. Recommended MVP Definition

The application should be considered an MVP when this complete flow works:

```text
Student Registration
        ↓
Verification
        ↓
Student Profile + CV
        ↓
Recruiter Registration
        ↓
Company Verification
        ↓
Job Creation
        ↓
Admin Approval
        ↓
Job Published
        ↓
Student Searches Job
        ↓
Student Applies
        ↓
Recruiter Reviews CV
        ↓
Recruiter Shortlists
        ↓
Interview Scheduled
        ↓
Selected/Rejected
        ↓
Application Status Updated
```

If this workflow works reliably, the project already has a strong foundation.

---

# 38. Final Recommended Scope

## Core

**Authentication**
→ **Profiles**
→ **Companies**
→ **Jobs**
→ **Applications**
→ **Shortlisting**
→ **Interviews**
→ **Notifications**
→ **Admin Management**

## University-Specific

**Student Verification**
→ **Faculty Recommendation**
→ **Campus Recruitment**
→ **Career Events**
→ **Alumni Job Posting**
→ **Alumni Referral**
→ **Placement Analytics**

## Future Intelligence

**Job Recommendation**
→ **CV Matching**
→ **Skill Gap Analysis**
→ **Career Recommendation**

---

# 39. Final Development Principle

Do not attempt to build everything simultaneously.

Follow this order:

```text
1. Database Design
        ↓
2. Authentication
        ↓
3. Role Permission
        ↓
4. Student Module
        ↓
5. Job Module
        ↓
6. Application Module
        ↓
7. Recruiter Module
        ↓
8. Interview Module
        ↓
9. Faculty Module
        ↓
10. Alumni Module
        ↓
11. Admin Dashboard
        ↓
12. Notifications/Messaging
        ↓
13. Analytics
        ↓
14. Testing/Security
        ↓
15. Deployment
        ↓
16. AI Features
```

The most important principle is:

> **Build the complete basic recruitment workflow first. Add advanced features only after the core system is stable.**

---

# 40. Current Status (October 2026 audit — see `docs/AUDIT_REPORT.md`)

| Module | Status | Evidence (one line) |
| --- | --- | --- |
| Auth (5 roles, guards) | Done | Login/register/reset + `ProtectedRoute` role checks verified in `client/src/App.jsx`. |
| Student profile | Done | Full sections, completeness checklist, confirm deletes (`pages/student/StudentProfilePage.jsx`). |
| Alumni profile | Done | Parity sections on own `alumni_*` tables (`pages/alumni/AlumniProfilePage.jsx`). |
| Recruiter + company profile | Done | View/edit modes, read-only verification badges (`pages/recruiter/CompanyProfilePage.jsx`). |
| Faculty verification + recommendation | Done | Verify/unverify + recommend flow (`pages/faculty/FacultyStudentReviewPage.jsx`). |
| Jobs (post/search/approve) | Done | DRAFT → PENDING_APPROVAL → PUBLISHED for recruiter + alumni (`JobFormPage`, `AdminJobsPage`). |
| Applications (+70% gate) | Done | DB trigger `trg_applications_guard_completeness` + friendly UI error; withdraw is Open. |
| Interviews | Done | Schedule modals + reminders edge fn; structured feedback is Open. |
| Notifications + email | Partial | In-app center/bell/delete/realtime done; reminder cron still has placeholder ref, deliverability unverified. |
| Messaging | Done | Threads, sender-only delete, unread badges, realtime sync. |
| Admin (10 pages) | Done | Users/jobs/companies/apps/interviews/events/reports/analytics/campus all working. |
| Events | Done | Create/manage + student registration with duplicate handling. |
| Referrals | Done | Alumni referral submit/track flow working. |
| Analytics | Done | Recharts reports + analytics pages. |
| Security / RLS | Partial | 34 tables covered, 27 functions with fixed `search_path`; Critical signup-escalation hole open (A-01). |
| Deployment | Partial | Vercel SPA + Supabase live; no CI/tests, 1.29 MB bundle, cron/bucket/env unverified. |

# 41. Known Issues (from the October 2026 audit — Critical and High only)

| ID | Severity | Title | Affected files | Suggested fix |
| --- | --- | --- | --- | --- |
| A-01 | Critical | Signup privilege escalation: `handle_new_user()` casts client-supplied metadata role straight to `user_role`, so anyone can self-register as ADMIN. | `supabase/migrations/20260831000002_rls_policies.sql:28-43` | New migration: allowlist role to STUDENT/ALUMNI/RECRUITER/FACULTY in the trigger. |
| A-02 | High | Missing indexes on hot FK/filter columns (`cvs`, `education`, `experience`, `projects`, `student_skills`, `event_registrations`, `interviews`, `recommendations`, `referrals`, `alumni_*`). | `supabase/migrations/20260831000001_initial_schema.sql` (indexes section) | New migration adding the missing indexes. |
| A-03 | High | `uploads` storage bucket not created in any migration — fresh deploys break CV/photo uploads. | `supabase/migrations/` (no `storage.buckets` insert anywhere) | New bucket-seed migration (or documented manual step) + verify RLS. |
| A-04 | High | No tests and no CI — zero test files, no workflows; broken commits ship silently. | `client/package.json`, repo root (no `.github/`) | Add CI (lint+build); then smoke tests for auth + apply flow. |

# 42. Roadmap

## Next 10 tasks (most valuable first)

- [ ] 1. Signup role allowlist (PA-01) — closes Critical A-01.
- [ ] 2. CI pipeline: lint + build on every push (PC-01) — stops silent breakage (A-04).
- [ ] 3. Withdraw application button (PB-01) — High-impact missing student action.
- [ ] 4. FK index migration (PA-02) — fixes slow profile/applicant queries (A-02).
- [ ] 5. Route-level code splitting (PC-02) — shrinks the 1.29 MB bundle.
- [ ] 6. Saved jobs table + UI (PB-02) — top missing student feature.
- [ ] 7. Seed `uploads` bucket migration (PA-03) — fixes fresh deploys (A-03).
- [ ] 8. Fix silent admin list failures (PA-04) — error + retry on monitoring pages.
- [ ] 9. Replace blocking `alert()` calls (PA-05) — inline flash feedback.
- [ ] 10. Reports CSV export (PB-03) — quick admin win.

## Phase A — Stabilize and secure

| ID | Title | Description | Impact | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| PA-01 | Signup role allowlist | New migration restricting `handle_new_user()` roles to STUDENT/ALUMNI/RECRUITER/FACULTY. | Critical | S | — |
| PA-02 | FK index migration | Add missing indexes on profile/applicant FK columns. | High | S | — |
| PA-03 | Seed `uploads` bucket | Migration (or documented step) creating the bucket + verifying policies. | High | S | — |
| PA-04 | Admin list error states | Error + retry UI in AdminApplications/AdminInterviews (stop silent empty lists). | Medium | S | — |
| PA-05 | Replace blocking alerts | Inline flash feedback in RecruiterDashboardPage + MessagesPage. | Medium | S | — |
| PA-06 | Company dead-end fix | Hide misleading save when unlinked; admin-contact CTA only. | Medium | S | — |
| PA-07 | Activate reminder cron | Fill project ref, run `cron-setup-production.sql`, confirm `cron.job_run_details`. | Medium | S | — |
| PA-08 | Verify env + secrets | Confirm Vercel `VITE_*` and Supabase `RESEND_API_KEY`/service keys; verify Resend domain. | Medium | S | — |
| PA-09 | Decide edge-function fate | Wire up or delete unused `process-approval` / `validate-upload`. | Low | S | — |
| PA-10 | Policy hygiene | Rename `placements` read policy to match intent; restrict `skills` inserts. | Low | S | — |

## Phase B — Complete core features

Already Done (not tasks): faculty verification, alumni profile parity, event registration, admin analytics, job search/filters, spam reporting.

| ID | Title | Description | Impact | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| PB-01 | Withdraw application | "Withdraw" button setting WITHDRAWN (RLS already permits). | High | S | — |
| PB-02 | Saved jobs | `saved_jobs` table + save/unsave UI on job cards/pages. | High | M | PA-02 |
| PB-03 | Reports CSV export | Download current admin report tables as CSV. | Medium | S | — |
| PB-04 | Job alerts | Email alerts for saved searches via existing `send-email` fn. | High | M | PB-02, PA-08 |
| PB-05 | Public company pages | `/companies` list + detail reusing company read paths. | Medium | M | — |
| PB-06 | Interview feedback | Structured feedback fields on interviews for recruiters. | Medium | M | — |
| PB-07 | Offer letters | Offer status step on applications after selection. | Medium | M | PB-06 |
| PB-08 | Notification preferences | Opt-out/granularity toggles checked in notify triggers. | Medium | S | — |
| PB-09 | Profile photo upload | Storage upload in student profile (CV pattern exists). | Medium | S | PA-03 |
| PB-10 | Verify-email resend | Resend action on VerifyEmailPage (currently static). | Low | S | PA-08 |

## Phase C — Polish and quality

| ID | Title | Description | Impact | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| PC-01 | CI pipeline | GitHub workflow running lint + build on push/PR. | High | S | — |
| PC-02 | Route code splitting | `React.lazy` per route + vendor `manualChunks`. | Medium | S | — |
| PC-03 | Shared UI kit | Extract Section/Flash/EmptyState/ConfirmDialog/TimeAgo to `components/ui/`. | Medium | M | — |
| PC-04 | Smoke tests | Auth + apply-flow tests (then unit tests for hooks/utils). | High | M | PC-01 |
| PC-05 | Dead code cleanup | Remove DashboardPlaceholder, `zustand` dep, dead identifiers, stray console.log. | Low | S | — |
| PC-06 | Guard cleanup | Single `ProtectedRoute` at layout level instead of double nesting. | Low | S | PC-04 |
| PC-07 | Error monitoring | Add Sentry (or equivalent) + confirm Supabase PITR backups. | Medium | S | — |
| PC-08 | Legal + help pages | Terms, Privacy, Help/FAQ routes + first-login checklist. | Low | S-M | — |
| PC-09 | Landing SEO polish | Meta tags, OG image, sitemap for the public pages. | Low | S | — |
| PC-10 | Contrast/keyboard pass | Verify color contrast + keyboard flows visually (audit could not). | Low | S | — |

## Phase D — Smart features

| ID | Title | Description | Impact | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| PD-01 | Job matching upgrade | Score-based recommendations beyond current skill display. | Medium | M | — |
| PD-02 | CV feedback | Automated suggestions on uploaded CVs. | Medium | L | — |
| PD-03 | Skill-gap analysis | Missing-skills hints per target role. | Low | M | PD-01 |
| PD-04 | Bangla language | bn translation + language toggle. | Low | L | — |
| PD-05 | Dark-mode toggle | User theme switch (themes already configured). | Low | S | — |

# 43. Agent Working Rules (for future coding sessions)

1. One task per session — finish the roadmap item fully before starting the next.
2. Read the relevant files first; never assume code state from memory or old notes.
3. Small targeted edits, one section at a time; run `npm run build` after every two edits. If the build fails twice for the same reason, STOP and report the error instead of retrying.
4. Never use `git checkout`, `git reset`, `git restore` or `git stash` — never revert files.
5. Database: new migrations only, never edit old ones; run `supabase db push --dry-run` before pushing; use the cloud Supabase project only.
6. Realtime: no new channels without reusing the shared subscription in the existing hooks.
7. Definition of done: `npm run lint` and `npm run build` pass, manual test steps are written down, and the change is committed.
