
# PROJECT CONTEXT FOR LLM – NGO ADMINISTRATIVE DONATION PLATFORM

---

# 1. Project Constraints

## 1.1 Nature of the Project

* Academic project
* 6 weeks total delivery time
* New system (no legacy migration required)
* MVP-oriented
* Simplicity prioritized over automation or advanced intelligence

## 1.2 Core Principle

This platform is **administrative**, not autonomous.

The NGO retains full operational control over:

* School registration
* Donor registration
* Donation linking
* Delivery method decisions
* Recording monetary donations made externally (e.g., PayPal)

There is **no automation engine**, **no AI matching**, and **no impact tracking**.

---

# 2. Operational Model (Real Workflow)

## 2.1 Schools

* Schools do NOT self-register.
* Schools contact the NGO offline.
* NGO staff manually register schools into the system.
* School data must not be duplicated.
* Schools may receive multiple donations over time.

The system only stores and tracks:

* School information
* Associated donation processes

---

## 2.2 Donors

* Donors do NOT self-register.
* Donors contact the NGO directly.
* NGO staff registers donors.
* Donors may donate multiple times.
* Donor core data must not be duplicated.

The system must support:

### Recurrent Donors

* One donor profile
* Multiple donation records
* Historical traceability

---

## 2.3 Donation Types

There are two main types:

### 1. Material Donations

Physical goods.

Delivery process must support three mutually exclusive modes:

1. Donor ships directly to school.
2. Donor ships to NGO (NGO stores temporarily).
3. NGO picks up and delivers to school.

This delivery mode must be explicitly stored per donation.

---

### 2. Monetary Donations

* Processed externally (e.g., PayPal).
* Staff manually registers the donation in the platform.
* No payment gateway integration required.

---

## 2.4 Linking Logic

The NGO decides:

* Which donor supports which school
* Which delivery process applies
* When the process changes state

There is NO matching engine.

---

# 3. Donor-Facing Dashboard

Although the system is administrative:

* Donors can view available schools.
* Donors can filter by region and category.
* Donors can decide which school they want to support.
* After that, they contact the NGO.
* The NGO registers the donor and donation internally.

Important:

Donors DO NOT:

* Log into the system
* Complete donation inside the system
* Directly link themselves to a school

This dashboard is informational and filtering-oriented.

---

# 4. Scope Clarification

## Included

* NGO administrative panel
* School registry
* Donor registry
* Donation registry
* Delivery tracking (3 delivery modes)
* Workflow states
* Filtering dashboard
* Progress bar per school
* Reporting (process-based only)

## Excluded

* Automation
* AI matching
* Impact measurement
* Financial reconciliation
* Payment integration
* Messaging system between actors
* School user accounts
* Donor user accounts

---

# 5. Functional Requirements (Revised)

## 5.1 Authentication & Authorization

Users:

* NGO Admin
* NGO Staff

Role-based access control required.

---

## 5.2 School Management

CRUD operations:

* Create school
* Update school
* View school
* Archive school

Fields:

* Name
* Region
* Category of need
* Description
* Funding goal
* Current funding
* Status

---

## 5.3 Donor Management

CRUD operations:

* Create donor
* Update donor
* View donor
* Donation history

Fields:

* Name
* Contact info
* Type (individual / corporate)
* Notes

Must prevent duplicate donors.

---

## 5.4 Donation Management

Each donation record must include:

* Donor ID
* School ID
* Type (material / monetary)
* Description
* Amount (if monetary)
* Estimated value (if material)
* Delivery mode (3 options)
* Current workflow state
* Dates
* Observations

---

## 5.5 Workflow States

Explicit finite-state model required.

Suggested states:

* Registered
* Approved
* In Delivery
* Delivered
* Completed
* Cancelled

State transitions must be controlled and validated.

---

## 5.6 Progress Bar Logic

Per school:

Funding progress =
(sum of confirmed monetary donations + estimated material value)
/ funding goal

Must reflect real database values.

---

## 5.7 Reporting

Administrative reports:

* Donations per school
* Donations per donor
* Pending deliveries
* Completed processes
* Export (CSV/PDF optional if feasible)

Focus on process tracking, not impact metrics.

---

# 6. Non-Functional Requirements

Existing NFRs are accepted and integrated.

## Performance

* Filter results ≤ 2 seconds
* Confirmation ≤ 3 seconds
* 100 concurrent users ≤ 3 seconds response

## Usability

* 80% of first-time users complete search in < 3 minutes
* Clear progress bar interpretation
* Mobile responsive

## Correctness

* Filters must strictly match region and category
* Progress bar percentage must match DB value

## Error Handling

* No blank screens
* Required fields validation
* Prevent incomplete submissions

## Additional Technical NFRs

### Security

* HTTPS only
* JWT-based authentication
* Role-based route protection
* Input validation server-side
* Basic audit logging

### Reliability

* Daily DB backup
* Graceful error responses
* Proper HTTP status codes

### Maintainability

* Clear modular architecture
* Clean API contract
* Documented endpoints
* Environment separation (dev / prod)

---

# 7. Architecture (Confirmed)

## Frontend

* React + Next.js
* SSR for public dashboard
* Admin panel protected routes

## Backend

* REST API
* Go or Python (final decision pending)
* Modular structure
* Stateless services

## Database

* PostgreSQL
* Normalized schema
* Referential integrity enforced

## Deployment

* Azure Kubernetes Service (AKS)
* Microservices architecture
* Containerized services
* Separate environments

Important constraint:

Microservices must remain reasonable for a 6-week academic scope. Avoid unnecessary over-segmentation.

---

# 8. Suggested Domain Model (Minimal and Clean)

Entities:

* User
* School
* Donor
* Donation
* Delivery
* AuditLog (optional but recommended)

Relationships:

* Donor 1:N Donation
* School 1:N Donation
* Donation 1:1 Delivery configuration

---

# 9. Development Prioritization (6 Weeks)

## Week 1

* Finalize schema
* Define API contracts
* UI wireframes

## Week 2–3

* Auth
* School CRUD
* Donor CRUD

## Week 4

* Donation management
* Workflow state logic

## Week 5

* Public dashboard
* Filters
* Progress bar logic

## Week 6

* Testing
* Performance checks
* Bug fixing
* Deployment on AKS
* Documentation

---

# 10. LLM Behavioral Guidance

When assisting the team, the LLM must:

* Reject scope expansion beyond 6-week feasibility
* Avoid suggesting automation or AI
* Prefer simplicity over architectural sophistication
* Flag overengineering
* Encourage schema normalization
* Validate state transitions explicitly
* Promote testable API contracts
* Keep microservices count minimal
* Focus on delivery clarity and traceability

---

