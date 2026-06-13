# 🎓 EduTracker - College Management Web App

EduTracker is a modern, comprehensive, and responsive College Management System designed to streamline academic, administrative, and placement workflows. Built as a Single Page Application (SPA) with a vanilla JavaScript frontend and Google Firebase backend, it provides role-based workspaces for Students, Faculty, and Administrators.

---

## 🚀 Key Features by Role

### 👨‍🎓 Student Workspace
- **Personalized Dashboard**: View real-time statistics including attendance percentages, active assignments, and recent announcements.
- **Attendance Tracker**: View subject-wise attendance logs and check-in history.
- **Results & Grading**: View internal/semester test grades and calculate CGPA/performance metrics.
- **Assignments Workspace**: Download assignments posted by faculty, upload solutions, and track due dates.
- **Placements & Resumes**: Explore active job/internship placement drives, upload PDF resumes, and track recruitment status (Applied, In Review, Selected, Rejected).

### 👩‍🏫 Faculty Workspace
- **Student Enrollment Directory**: View and search details of students enrolled under your department.
- **QR Attendance Generator**: Generate secure, dynamic QR codes in real-time. Students can scan these QR codes using their devices to log their attendance automatically.
- **Grading Console**: Grade student performance for tests and assignments, directly updating the central database.
- **Assignment Hub**: Create and distribute class assignments, set due dates, and view student submissions.
- **Placement Drive Manager**: Create new placement drives, upload job descriptions, and manage student applications.
- **Announcements**: Broadcast class-wide or department-wide announcements.

### 🔑 Administrator Workspace
- **College Overview**: Access high-level analytics of the institution (total users, active drives, and pending approvals).
- **Access Control & Approvals**: Review, approve, or decline new registration requests from students and faculty to maintain platform security.
- **Placement Coordinator Console**: Oversee and approve all placement/internship drives before they are published to students.
- **Announcements Console**: Post campus-wide notices.

---

## 🛠️ Technology Stack

- **Frontend Core**: Vanilla HTML5, CSS3 (with custom modern variables, glassmorphism UI, and dark mode accents), and ES6+ JavaScript.
- **Database & Backend (BaaS)**: 
  - **Firebase Auth**: Secure email/password authentication.
  - **Cloud Firestore**: Real-time Document database for users, drives, assignments, and notifications.
  - **Firebase Storage**: Secure file hosting for student resumes and assignment files.
- **Libraries**:
  - **QR Generation**: [QRCode.js](https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js) for generating attendance check-in codes.
  - **QR Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) for scanning check-in codes via mobile camera.
  - **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) for generating downloadable reports.
  - **Design Elements**: Phosphor Icons, Google Fonts (Outfit).

---

## 🔐 Institutional Login Formats

To enforce safety, the portal validates that users register and log in with specific institutional domains.

- **Students**:
  - **Domain format**: `@student.college.edu.in` or `@college.edu.in` (also supports `@collegename.edu.in` or `@collegename.ac.in` for compatibility).
  - **Example**: `21cs101@student.college.edu.in`
- **Faculty**:
  - **Domain format**: `@faculty.college.edu.in` or `@college.edu.in` (also supports `@collegename.edu.in` or `@collegename.ac.in`).
  - **Example**: `smith.cs@faculty.college.edu.in`
- **Administrators**:
  - **Specific email address**: `admin@college.edu.in`
  - **Default Credentials**: If the database does not contain this user on login, the system will offer to seed it with the default password `admin123`.

---

## 🛡️ Recommended Firebase Security Rules

To ensure your user data, grades, and files are protected, deploy these security configurations inside your [Firebase Console](https://console.firebase.google.com/):

### Cloud Firestore Rules
Paste these into **Firestore Database** -> **Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function checking if user has been approved by Admin
    function isActive() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
    }
    
    // User accounts
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && (request.auth.uid == userId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'faculty');
    }
    
    // Assignments & Grades
    match /assignments/{assignmentId} {
      allow read: if isActive();
      allow create, update, delete: if isActive() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'faculty';
    }
    
    // Placement Drives & Applications
    match /placements/{placementId} {
      allow read: if isActive();
      allow create, update, delete: if isActive() && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'faculty');
    }
    
    // Global & Private Notifications
    match /notifications/{notificationId} {
      allow read: if isActive();
      allow create, update, delete: if isActive();
    }
  }
}
```

---

## 📦 Project Directory Structure

```text
├── css/
│   └── style.css            # Stylesheet containing the responsive design system
├── js/
│   ├── modules/             # Modular JS features (Auth, Dashboard, Placements, etc.)
│   ├── store/
│   │   └── mockData.js      # Mock data for demonstration purposes
│   ├── firebase-config.js   # Firebase application initialization credentials
│   └── app.js               # Central application router, controller, and UI rendering logic
├── index.html               # Main entry point (SPA layout and containers)
└── README.md                # Project documentation
```

---

## 💻 Local Setup and Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/veerajyothish/edutracker.git
   cd edutracker
   ```

2. **Configure Firebase**:
   - Create a project on the [Firebase Console](https://console.firebase.google.com/).
   - Add a Web App to your Firebase project.
   - Copy the configuration keys and update them in [js/firebase-config.js](file:///C:/Users/Jyoth/.gemini/antigravity/scratch/edutracker/js/firebase-config.js):
     ```javascript
     const firebaseConfig = {
         apiKey: "YOUR_API_KEY",
         authDomain: "YOUR_PROJECT.firebaseapp.com",
         projectId: "YOUR_PROJECT",
         storageBucket: "YOUR_PROJECT.firebasestorage.app",
         messagingSenderId: "YOUR_SENDER_ID",
         appId: "YOUR_APP_ID"
     };
     ```

3. **Serve Locally**:
   You can serve the directory using any static web server (e.g. Live Server in VS Code, or python):
   ```bash
   # Python 3
   python -m http.server 8000
   ```
   Open `http://localhost:8000` in your web browser.

---

## ☁️ Deploying to Vercel

This project is deployed on Vercel at **[edutracker-college.vercel.app](https://edutracker-college.vercel.app)**.

Vercel is the recommended hosting platform due to its lightning-fast static CDN, automatic preview branches, and direct GitHub integration.

### Method 1: Git Integration (Recommended - Auto Deploy on Push)
1. Sign in or sign up at [vercel.com](https://vercel.com).
2. Click the **Add New...** button and select **Project**.
3. Select **Import** next to your `edutracker` repository.
4. Vercel will automatically detect that this is a **Static Project** (no build settings required).
5. Click **Deploy**.
6. Every time you commit and push to your GitHub repository, Vercel will build and deploy a live preview automatically.

### Method 2: Vercel CLI (Command Line)
If you want to deploy manually from command line:
```bash
npm i -g vercel
vercel login
vercel
```
Follow the interactive prompts to deploy the website instantly.
