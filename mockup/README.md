# **Mockup for the web application** 

This is an HTML + CSS based mockup to **design (not implement)** the UI/UX. 

This is a preliminar phase, so changes are allowed under documentation.

## **Files Structure**

- `style.css` - Main stylesheet with all styling for the application
- `login.html` - Authentication page
- `dashboard.html` - Staff dashboard (main hub with overview cards)
- `schools.html` - School management list and search
- `schools-form.html` - Form to add/edit schools
- `donors.html` - Donor management list and search
- `donors-form.html` - Form to add/edit donors
- `donations.html` - Donation management list and search
- `donations-form.html` - Form to add/edit donations
- `preferences.html` - User settings and preferences
- `public.html` - Public informational dashboard for donors 

## **Use Case diagram**

![Use case diagram of proposed solution](/docs/UseCase.png)

* **Stakeholders**: Staff members and Donors. 

## **Mockup screens** 

### **0. Login screen**

### **1. Staff Dashboard**

The staff dashboard is the main interface for NGO staff to manage schools, donors, donations, and preferences. It provides an overview of the current status of some schools and donations, as well as access to various management features. 

Here the staff members can:
* View the donations in progress and their status (little overview cards).
* View the schools in progress and their status (little overview cards).
* Access the following management sections:
    * School management
    * Donor management
    * Donation management
    * Preferences

### **2. School management**
In this section, staff members can manage the schools registered in the system. They can:
* View (search and filter) registered schools with their details (name, location, contact information, status, progress, etc.). (Check the use case diagram for details).
* Add new schools by filling out a form with the required information. (this can be a new page or a popup/modal).
* Edit existing school information by selecting a school and updating its details. (this can be a new page or a popup/modal).
* Archive or delete schools that are no longer active or relevant. (this can be just a button on the school card or details page).
* View the donation processes associated with each school, including the status of each donation and the history of donations received by the school. (this can be a new page or a popup/modal).

### **3. Donor management**
In this section, staff members can manage the donors registered in the system. They can:
* View (search and filter) registered donors with their details (name, contact information, donation history, etc.). (Check the use case diagram for details).
* Add new donors by filling out a form with the required information. (this can be a new page or a popup/modal).
* Edit existing donor information by selecting a donor and updating their details. (this can be a new page or a popup/modal).
* Archive or delete donors that are no longer active or relevant. (this can be just a button on the donor card or details page).
* View the donation history of each donor, including the details of each donation and the associated schools. (this can be a new page or a popup/modal).

### **4. Donation management**
In this section, staff members can manage the donations registered in the system. They can:
* View (search and filter) registered donations with their details (type, amount, associated school, donor, status, etc.). (Check the use case diagram for details).
* Add new donations by filling out a form with the required information. (this can be a new page or a popup/modal).
* Edit existing donation information, status by selecting a donation and updating its details. (this can be a new page or a popup/modal).
* Cancel or mark donations as completed. (this can be just a button on the donation card or details page).
* View the details of each donation, including the associated school and donor information. (this can be a new page or a popup/modal).

### **5. Preferences**
In this section, staff members can manage the preferences and settings of the system. They can:
* Update their profile information (name, email, password, etc.). (this can be a new page or a popup/modal).
* Configure notification settings (email notifications, reminders, etc.). (this can be a new page or a popup/modal).
* Set up system preferences (language, timezone, etc.). (this can be a new page or a popup/modal).
* Access help and support resources (FAQs, contact support, etc.). (this can be a new page or a popup/modal).

### **Additional details**
#### Sidebar navigation

A sidebar navigation menu is available on the left side of the dashboard for easy access to the different sections (Dashboard, School management, Donor management, Donation management, Preferences). The sidebar can be collapsible for better usability on smaller screens.

#### Header with user profile and notifications

The header at the top of the dashboard includes the user profile information (name, profile picture) and a notifications icon for alerts related to donations, schools, or system updates.

#### Responsive design for mobile and desktop views

The mockup should be designed with a responsive layout to ensure usability on both desktop and mobile devices. The layout can adjust based on the screen size, with the sidebar collapsing into a hamburger menu on smaller screens and the content adjusting accordingly for optimal viewing and interaction.