# **Activity: Mockup**

**a) Project name**

**ImpulsaEdu**

**b) Introduction or context of the problem to be solved**

For this project we will be working with the NGO, Mexicanos Primero, a group dedicated to boosting the quality of education in Mexico by supporting educational institutions. Our mission is to improve educational outcomes by bridging the gap between institutional needs and corporate/private donations.

Their current donor management process relies heavily on manual methods that use PDFs and Excel files. This leads to inefficiency, fragmentation, and a wide margin for human error, with long response times for donors, hindering their engagement.

The proposed Dynamic Web Platform revolutionizes donor interaction with accessibility and smart filtering, transforming the lengthy manual process into a swift, engaging experience, enhancing empowerment, engagement, and satisfaction.


**c) List of functional requirements**

| ID | Category | Description |
| ----- | ----- | ----- |
| **FR-01** | Authentication & Authorization | The system shall provide secure login for NGO Admins and NGO Staff with Role-Based Access Control (RBAC) to restrict sensitive administrative functions. |
| **FR-02** | School Management | The system shall allow users to Create, Read, Update, and Archive (CRUD) school records, including Name, Region, Category of Need, Description, Funding Goal, and Status. |
| **FR-03** | School Management | The system must implement duplicate detection logic to prevent the creation of multiple records for the same school. |
| **FR-04** | Donor Management | The system shall maintain donor profiles (Individual/Corporate) including contact info and donation history, supporting full CRUD operations. |
| **FR-05** | Donor Management | The system must prevent duplicate donor entries based on unique identifiers (e.g., email or tax ID). |
| **FR-06** | Donation Management | The system shall record donations linked to both a Donor ID and School ID, capturing type (Material/Monetary), value, delivery mode, and observations. |
| **FR-07** | Workflow Management | The system shall enforce a Finite-State Model for donations, transitioning through: *Registered, Approved, In Delivery, Delivered, Completed,* and *Cancelled*. |
| **FR-08** | Workflow Management | The system must validate state transitions to ensure records cannot move between illogical states (e.g., "Cancelled" to "Delivered"). |
| **FR-09** | Progress Logic | The system shall automatically calculate a school's Funding Progress using the formula:Progress \=  Monetary \+  Material value Funding goal |
| **FR-10** | Progress Logic | The progress bar must reflect real-time database values to ensure accuracy across all administrative views. |
| **FR-11** | Reporting | The system shall generate administrative reports for Donations per School and Donations per Donor. |
| **FR-12** | Reporting | The system shall provide tracking reports for operational status, specifically Pending Deliveries and Completed Processes. |
| **FR-13** | Reporting | The system shall support data portability by allowing users to Export reports in CSV or PDF formats. |

**d) Definition of User Profiles**

* User Persona

```
As a potential donor...
I want to filter school needs by region and category,
so that I can find a project that matches my specific capacity 
to help without waiting for a manual response.
```

```
The who: A potential donor or individual philanthropist
The what: Independentally filter browse and filter a unified, 
real-time catalog of institutional needs.
The wow: Transform a 48 hours manual search into a 2-minute 
interactive experience with 100% data accuracy.
```

* Journey Map

* **Scenarios**

**Scenario**: Donor filters school needs and donates to a school.

We have a potential donor who wants to support schools in Guadalajara, specifically those that need infrastructure improvements. The donor visits the ImpulsaEdu website and uses the filtering system to select “Guadalajara” as the region and “Infrastructure” as the category.

The system displays matching schools with progress bars showing how much funding has already been collected, clicks on one school card to see more details about the project and decides to proceed with a donation.

The donor completes the donation form and receives a confirmation message immediately after submitting. 

* **Relevant User Stories**  
1. *Filtering story:*   
   As a potential donor, I want to filter schools by region and category to quickly find projects that match my interests.

2. *Check the details of the story:*  
   As a potential donor, I want to view detailed information about a school project so that I can decide if I want to support it.

3. *Progress visibility story:*  
   As a potential donor, I want to see a progress bar showing current funding levels so that I can understand how urgent the need is.

4. *Donation story:*  
    As a potential donor, I want to complete a donation online so that I can support a school without going through a manual process.

5. *Confirmation story:*  
   As a donor, I want to receive confirmation after donating so that I know my contribution was successfully processed.

**e) List of Non-functional requirements:**

A table of requirements with: 

* ID: A unique name for this requirement.  
* Category: Recommended to use Quesenbery 5 E's  
* Description: ¿What is this requirement about?  
* Metric: Measurement to validate this requirement (Pass/Fail)

| ID | Category | Description | Metric |
| ----- | ----- | ----- | ----- |
| NFR-01 | Efficient | The platform should show filtered results quickly so users don’t have to wait too long. | Results load in 2 seconds or less during testing. |
| NFR-02 | Effective | The filters must actually show only the schools that match the selected region and category. | During testing, all displayed schools match the selected filters. |
| NFR-03 | Engaging | The progress bar should be easy to understand so donors can quickly see how much funding is completed. | In usability testing, most users correctly understand what the progress bar means. |
| NFR-04 | Error Tolerant | If no schools match the filters, the system should clearly inform the user instead of showing a blank page. | When no results are found, a message appears explaining that there are no matches. |
| NFR-05 | Easy to Learn | A new user should be able to use the filtering system without needing instructions. | At least 80% of first-time users can complete a search in under 3 minutes without help. |
| NFR-06 | Efficient | The donation confirmation should appear quickly after the user submits their donation. | A confirmation message appears in 3 seconds or less after submission. |
| NFR-07 | Error Tolerant | The system should prevent users from submitting incomplete donation forms. | The form does not allow submission if required fields are empty. |
| NFR-08 | Effective | The progress bar percentage must correctly reflect the actual amount of donations collected. | The percentage displayed matches the database value during testing. |
| NFR-09 | Engaging | The website should work properly on different devices like phones and laptops. | The interface adjusts correctly on mobile, tablet, and desktop screens. |
| NFR-10 | Efficient | The system should handle multiple users at the same time without slowing down too much. | With 100 users connected at the same time, response time stays under 3 seconds. |

**f) Test plan**

We will implement a multi-layered testing strategy integrated into a CI/CD pipeline using GitHub Actions. Testing will follow industry-recognized practices such as those promoted by the International Software Testing Qualifications Board (ISTQB).

[https://www.civo.com/blog/the-role-of-the-ci-cd-pipeline-in-cloud-computing](https://www.civo.com/blog/the-role-of-the-ci-cd-pipeline-in-cloud-computing) 

First, we plan to have unit testing that runs automatically in every pull request. We will validate the individual business logic functions from our functional requirements, like:

- Duplicate detection algorithms (FR-03, FR-05)  
- Funding progress formula (FR-09)  
- State transition validation (FR-08)

Second, we would like to have some integration testing to validate the interaction between our different systems. These could include the authentication flow and donation creation. We can use some test database and auth environments to test the following:

- Authentication \+ RBAC (FR-01)  
- Donation creation \+ school progress update (FR-06 \+ FR-09)  
- Workflow transitions (FR-07 \+ FR-08)

Third, it is important to test all of the APIs that our application relies on. It is important to validate the response codes, validation errors, and our security measures. We also need to validate our CRUD endpoints for:

- Schools (FR-02)  
- Donors (FR-04)  
- Donations (FR-06)

Finally, we need to do End to End Testing to simulate the real user flow on our application. This includes going through the following stages:

- Admin login  
- Create a school  
- Register a donation  
- Approve it  
- Deliver said donation  
- Mark as completed

Throughout these steps, we also need to validate the behaviour of our UI, like:

- Real-time progress bar updates (FR-10)  
- Report generation (FR-11 to FR-13)

Utilizing the platform of GitHub Actions, we will run tests for our Dynamic Web Platform in order to ensure quality to the highest of standards. We will use the testing principles of institutions like the International Software Testing Qualifications Board. Applying some of their ideas like: **Absence-of-errors is a fallacy** and **Defects cluster together**.

GitHub Actions CI/CD pipelines will provide the infrastructure to perform automated test on:

- Pull Requests  
- Merge to main  
- Release builds

[Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)

[ISTQB Foundation Level – Seven Testing Principle](https://astqb.org/istqb-foundation-level-seven-testing-principles/)s

Following the ISTQB principle that “Defects cluster together”, we will focus on the following areas as they represent a higher risk:

1. **Authentication & Authorization (FR-01)**

Security High Risk Area

- Improper RBAC implementation may allow privilege escalation.  
- Risk of unauthorized access to administrative functions.  
- Security vulnerabilities (session hijacking, token misuse).


2. **Duplicate Detection (FR-03, FR-05)**

Risk to the integrity of our data:

- Duplicate schools (distorting our funding metrics)  
- Duplicate donors (affecting reporting accuracy)

3. **Workflow State Machine (FR-07, FR-08)**

Critical Logic Risk

- Incorrect state transitions that can corrupt operational processes.  
- Edge cases in state changes.
