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

## ☁️ Deploying to Vercel (Instead of GitHub Pages)

Vercel is the recommended hosting platform for EduTracker due to its lightning-fast static CDN, automatic previews, and direct GitHub integration.

### Method 1: Git Integration (Recommended - Auto Deploy on Push)
1. Sign in or sign up at [vercel.com](https://vercel.com).
2. Click the **Add New...** button and select **Project**.
3. Select **Import** next to your `edutracker` repository.
4. Vercel will automatically detect that this is a **Static Project** (no build settings required).
5. Click **Deploy**.
6. Every time you commit and push to your GitHub repository, Vercel will build and deploy a live preview automatically.

### Method 2: Vercel CLI (Command Line)
If you have Vercel CLI installed on your machine:
```bash
npm i -g vercel
vercel login
vercel
```
Follow the interactive prompts to deploy the website instantly.
