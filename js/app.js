/**
 * EDU TRACKER V9 - PLACEMENTS & RESUMES
 * - Faculty Creation/Management of Drives
 * - Student Resume Upload
 * - Applicant Status Tracking (Selected/Rejected/Waiting)
 */

// ==========================================
// 1. DATA STORE (Persistent)
// ==========================================

const COMMON_SUBJECTS = [
    "Data Structures", "Web Development", "Mathematics IV", "Ethics",
    "Operating Systems", "DBMS", "Computer Networks", "Software Engg",
    "Artificial Intelligence", "Cloud Computing", "Cyber Security", "Mobile Comp",
    "Digital Logic", "Theory of Comp", "Compiler Design", "Project Phase I"
];

// Local State Cache (Syncs with Firebase)
const STORE = {
    currentUser: null,
    users: [], // Admin needs this
    assignments: [],
    placements: [],
    notifications: []
};

// ==========================================
// 2. AUTH & FIREBASE INIT
// ==========================================
// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User Logged In:", user.email);
            // Ensure Utils is available (it is defined later in file, but due to hoisting/event loop it should be fine if called async)
            // However, Utils is const, not hoisted. But this callback runs later, so Utils is defined.
            if (typeof Utils !== 'undefined') {
                await Utils.fetchUserData(user);
            }
        } else {
            console.log("No User");
            STORE.currentUser = null;
            if (typeof Auth !== 'undefined') Auth.init();
        }
    });
} else {
    console.error("Firebase SDK not loaded");
    alert("Error: Firebase SDK not loaded. Check internet connection.");
}

function saveData() {
    // Deprecated for Global Save. Used for specific updates now.
    // We will update Firestore directly in actions.
    console.warn("saveData() called - redirecting to firestore updates where possible");
}

// ==========================================
// 2. AUTH & NAV MODULE
// ==========================================
const Auth = {
    init() {
        const m = document.getElementById('reusable-modal');
        if (m) m.style.display = 'none';

        if (!STORE.currentUser) {
            this.renderLanding();
            document.getElementById('auth-view').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
        } else {
            document.getElementById('auth-view').style.display = 'none';
            document.getElementById('app').style.display = 'grid';
            this.setupSession();
        }
    },

    renderLanding() {
        const container = document.getElementById('auth-view');
        container.innerHTML = `
            <div id="auth-cards-wrapper" style="display:flex; gap:30px;">
                <div class="auth-split-card" onclick="Auth.showForm('student', 'login')">
                    <i class="ph ph-student auth-split-icon"></i>
                    <h2>Student</h2>
                </div>
                <div class="auth-split-card" onclick="Auth.showForm('faculty', 'login')">
                    <i class="ph ph-chalkboard-teacher auth-split-icon"></i>
                    <h2>Faculty</h2>
                </div>
                <div class="auth-split-card" onclick="Auth.showForm('admin', 'login')" style="border-color: var(--secondary-color);">
                    <i class="ph ph-shield-check auth-split-icon" style="color: var(--secondary-color);"></i>
                    <h2>Admin</h2>
                </div>
            </div>
            <div id="auth-form-wrapper" class="auth-form-container"></div>
        `;
    },

    showForm(role, mode) {
        document.getElementById('auth-cards-wrapper').style.display = 'none';
        const wrapper = document.getElementById('auth-form-wrapper');
        wrapper.style.display = 'block';
        wrapper.dataset.role = role;

        if (mode === 'login') {
            wrapper.innerHTML = `
                <h2 style="color:white; margin-bottom:20px;">${role.toUpperCase()} LOGIN</h2>
                <form onsubmit="Auth.handleLogin(event)">
                    <input type="email" id="l-email" class="input-field" placeholder="Email" required>
                    <input type="password" id="l-password" class="input-field" placeholder="Password" required>
                    <button type="submit" class="btn-primary">Login</button>
                    ${role === 'admin' ? '' : `<button type="button" class="btn-text" onclick="Auth.showForm('${role}', 'signup')">Request Access</button>`}
                    <button type="button" class="btn-text" onclick="Auth.init()">Back</button>
                    <div id="auth-error" style="color:var(--danger-text); margin-top:10px;"></div>
                </form>
            `;
        } else {
            wrapper.innerHTML = `
                <h2 style="color:white; margin-bottom:20px;">${role.toUpperCase()} REGISTER</h2>
                <form onsubmit="Auth.handleSignup(event)">
                    <input type="text" id="s-name" class="input-field" placeholder="Full Name" required>
                    <input type="email" id="s-email" class="input-field" placeholder="Email" required>
                    <input type="password" id="s-pass" class="input-field" placeholder="Create Password" required>
                    <input type="text" id="s-phone" class="input-field" placeholder="Phone" required>
                    <input type="text" id="s-enroll" class="input-field" placeholder="Enrollment / ID" required>
                    <input type="text" id="s-course" class="input-field" placeholder="Course / Dept" required>
                    <button type="submit" class="btn-primary">Request Access</button>
                    <button type="button" class="btn-text" onclick="Auth.showForm('${role}', 'login')">Back to Login</button>
                </form>
            `;
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const role = document.getElementById('auth-form-wrapper').dataset.role;
        const email = document.getElementById('l-email').value;
        const pass = document.getElementById('l-password').value;
        const err = document.getElementById('auth-error');

        try {
            const result = await firebase.auth().signInWithEmailAndPassword(email, pass);
            // Check Status explicitly from Firestore
            const uid = result.user.uid;
            const doc = await firebase.firestore().collection('users').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.status !== 'active') {
                    await firebase.auth().signOut();
                    err.innerText = "Account Pending Approval.";
                    return;
                }
                if (data.role !== role) {
                    await firebase.auth().signOut();
                    err.innerText = `Invalid Role. You are a ${data.role}.`;
                    return;
                }
            } else {
                // Edge case: Auth exists but DB doc missing (e.g. legacy data issue)
                // For Admin, we might auto-fix, but better to fail safe
            }
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.log("Login Error Code:", error.code);
            if (error.code === 'auth/user-not-found' && email === 'admin@college.edu.in') {
                // AUTO-SEED ADMIN
                if (confirm("Admin account not found. Create it now with password 'admin123'?")) {
                    try {
                        const adminCred = await firebase.auth().createUserWithEmailAndPassword('admin@college.edu.in', 'admin123');
                        const adminUser = {
                            id: adminCred.user.uid,
                            role: 'admin',
                            status: 'active',
                            email: 'admin@college.edu.in',
                            name: 'System Admin',
                        };
                        await firebase.firestore().collection('users').doc(adminCred.user.uid).set(adminUser);
                        alert("Admin Accepted Created! Logging in...");
                        // Auth listener will catch the login
                    } catch (err2) {
                        err.innerText = "Creation Error: " + err2.message;
                    }
                } else {
                    err.innerText = "Admin account does not exist.";
                }
            } else {
                err.innerText = error.message;
            }
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const role = document.getElementById('auth-form-wrapper').dataset.role;
        const email = document.getElementById('s-email').value;
        const pass = document.getElementById('s-pass').value;

        try {
            const userCred = await firebase.auth().createUserWithEmailAndPassword(email, pass);

            const newUser = {
                id: userCred.user.uid,
                role: role,
                status: 'pending', // FORCE PENDING
                email: email,
                name: document.getElementById('s-name').value,
                details: {
                    phone: document.getElementById('s-phone').value,
                    enrollment: document.getElementById('s-enroll').value,
                    course: document.getElementById('s-course').value
                },
                subjects: role === 'student' ? ['Data Structures', 'Web Dev', 'Math IV', 'Ethics'] : [],
                attendance: role === 'student' ? {
                    'Data Structures': { present: 0, total: 0 },
                    'Web Dev': { present: 0, total: 0 },
                    'Math IV': { present: 0, total: 0 },
                    'Ethics': { present: 0, total: 0 }
                } : {},
                grades: {},
                dept: role === 'faculty' ? document.getElementById('s-course').value : null,
                students: role === 'faculty' ? [] : null
            };

            await firebase.firestore().collection('users').doc(newUser.id).set(newUser);

            // CRITICAL FIX: Sign out immediately so they don't auto-login
            await firebase.auth().signOut();
            alert("Account Created! You must wait for Admin Approval before logging in.");
            Auth.init();
        } catch (error) {
            alert(error.message);
        }
    },

    setupSession() {
        const u = STORE.currentUser;
        if (!u) { this.logout(); return; }

        document.getElementById('user-name-display').innerText = u.name;
        document.getElementById('user-role-display').innerText = u.role.toUpperCase();

        const avatar = document.getElementById('user-avatar');
        avatar.onerror = function () { this.style.display = 'none'; };
        avatar.src = `https://ui-avatars.com/api/?name=${u.name}&background=0D8ABC&color=fff`;

        const nav = document.querySelector('.nav-links');
        const common = `
            <a href="#notifications" class="nav-item" data-target="notifications"><i class="ph ph-bell"></i> Notifications</a>
            <a href="#profile" class="nav-item" data-target="profile"><i class="ph ph-user"></i> Profile</a>
        `;

        let menuItems = '';
        if (u.role === 'admin') menuItems = `
            <a href="#dashboard" class="nav-item" data-target="dashboard"><i class="ph ph-chart-bar"></i> Overview</a>
            <a href="#approvals" class="nav-item" data-target="approvals"><i class="ph ph-check-circle"></i> Approvals</a>
            <a href="#placements" class="nav-item" data-target="placements"><i class="ph ph-briefcase"></i> Placements/Internships</a>
            <a href="#announcements" class="nav-item" data-target="announcements"><i class="ph ph-megaphone"></i> Announcements</a>`;
        else if (u.role === 'faculty') menuItems = `
            <a href="#dashboard" class="nav-item" data-target="dashboard"><i class="ph ph-squares-four"></i> Dashboard</a>
            <a href="#students" class="nav-item" data-target="students"><i class="ph ph-users"></i> Enrolled Students</a>
            <a href="#attendance" class="nav-item" data-target="attendance"><i class="ph ph-check-square"></i> Attendance</a>
            <a href="#grading" class="nav-item" data-target="grading"><i class="ph ph-exam"></i> Grading</a>
            <a href="#assignments" class="nav-item" data-target="assignments"><i class="ph ph-files"></i> Assignments</a>
            <a href="#placements" class="nav-item" data-target="placements"><i class="ph ph-briefcase"></i> Placements/Drives</a>
            <a href="#announcements" class="nav-item" data-target="announcements"><i class="ph ph-megaphone"></i> Announcements</a>`;
        else menuItems = `
            <a href="#dashboard" class="nav-item" data-target="dashboard"><i class="ph ph-squares-four"></i> Dashboard</a>
            <a href="#attendance" class="nav-item" data-target="attendance"><i class="ph ph-check-circle"></i> Attendance</a>
            <a href="#results" class="nav-item" data-target="results"><i class="ph ph-exam"></i> Results</a>
            <a href="#assignments" class="nav-item" data-target="assignments"><i class="ph ph-files"></i> Assignments</a>
            <a href="#placements" class="nav-item" data-target="placements"><i class="ph ph-briefcase"></i> Placements/Internships</a>`;

        nav.innerHTML = menuItems + common;

        document.getElementById('show-qr-btn').style.display = u.role === 'faculty' ? 'flex' : 'none';
        const scanBtn = document.getElementById('scan-qr-btn');
        if (scanBtn) scanBtn.style.display = 'none';

        const userNotifs = STORE.notifications.filter(n => n.type === 'global' || n.userId === u.id);
        const unread = userNotifs.filter(n => !n.read).length;
        const b = document.getElementById('notif-badge');
        if (b) { b.style.display = unread > 0 ? 'block' : 'none'; b.innerText = unread; }

        Router.init();
    },

    logout() {
        firebase.auth().signOut().then(() => {
            STORE.currentUser = null;
            location.reload();
        });
    }
};

// ==========================================
// 3. ROUTER
// ==========================================
const Router = {
    init() {
        window.addEventListener('hashchange', () => this.route());
        this.route();
    },
    route() {
        let hash = location.hash.slice(1) || 'dashboard';
        if (!STORE.currentUser) return;

        const viewFn = Views[hash] || Views.dashboard;
        document.getElementById('view-container').innerHTML = viewFn();
        document.getElementById('page-title').innerText = hash.toUpperCase();

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-target="${hash}"]`);
        if (activeNav) activeNav.classList.add('active');
    }
};

const Views = {
    dashboard() {
        const u = STORE.currentUser;
        if (u.role === 'admin') return `
            <div class="grid-3">
                <div class="card"><h3>Active Users</h3><div style="font-size:3em;">${STORE.users.filter(x => x.status === 'active').length}</div></div>
                <div class="card" onclick="location.hash='#approvals'" style="cursor:pointer; border-color:var(--warning-text);">
                    <h3>Pending Requests</h3>
                    <div style="font-size:3em; color:var(--warning-text);">${STORE.users.filter(x => x.status === 'pending').length}</div>
                </div>
                <div class="card"><h3>Active Drives</h3><div style="font-size:3em;">${STORE.placements.filter(p => p.status === 'Open').length}</div></div>
            </div>`;

        if (u.role === 'student') return `
            <div class="grid-3">
                 <div class="card center">
                    <h3>Academic Status</h3>
                    <div style="font-size:1.5em; color:var(--primary-color);">On Track</div>
                </div>
                 <div class="card"><h3>Active Assignments</h3><div style="font-size:2em;">${STORE.assignments.length}</div></div>
                 <div class="card">
                    <h3>My Faculty</h3>
                    <div style="margin-bottom:10px; font-size:1.2em; color:var(--secondary-color);">${u.facultyId ? (STORE.users.find(x => x.id === u.facultyId)?.name || 'Unknown') : 'Not Selected'}</div>
                    <select id="fac-select" class="input-field" onchange="Utils.linkFaculty(this.value)">
                        <option value="">Link Faculty...</option>
                        ${STORE.users.filter(x => x.role === 'faculty').map(f => `<option value="${f.id}" ${u.facultyId === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                    </select>
                </div>
            </div>`;

        return `
            <div class="grid-2">
                <div class="card"><h3>My Enrolled Students</h3><div style="font-size:3em;">${(u.students || []).length}</div></div>
                 <div class="card" onclick="QR.showModal()" style="cursor:pointer; text-align:center;">
                    <i class="ph ph-qr-code" style="font-size:40px; color:var(--primary-color);"></i>
                    <h3>Launch Attendance QR</h3>
                 </div>
            </div>`;
    },

    attendance() {
        const u = STORE.currentUser;
        if (u.role !== 'student') return Views.attendanceFaculty();

        const subjectRows = Object.entries(u.attendance || {}).map(([subj, data]) => {
            const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
            return `<tr>
                <td>${subj}</td>
                <td>${data.present}/${data.total}</td>
                <td><span class="status-badge ${pct < 75 ? 'status-rejected' : 'status-approved'}">${pct}%</span></td>
             </tr>`;
        }).join('');

        return `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2>Attendance Record</h2>
                    <button class="btn-primary" onclick="QR.openScanner()">
                        <i class="ph ph-camera"></i> Scan QR
                    </button>
                </div>
                <table style="margin-top:20px;">
                    <thead><tr><th>Subject</th><th>Classes</th><th>%</th></tr></thead>
                    <tbody>${subjectRows}</tbody>
                </table>
            </div>`;
    },

    attendanceFaculty() {
        const u = STORE.currentUser;
        const myStudents = STORE.users.filter(s => (u.students || []).includes(s.id));
        return `
            <div class="card">
                <h2>Manual Attendance Update</h2>
                <div class="grid-2" style="margin-top:20px;">
                    <select id="ma-student" class="input-field">
                        <option value="">Select Student...</option>
                        ${myStudents.map(s => `<option value="${s.id}">${s.name} (${s.details.enrollment})</option>`).join('')}
                    </select>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                         <select id="ma-subject-select" class="input-field">
                            <option value="">Select Subject...</option>
                            ${COMMON_SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                        <input id="ma-subject-custom" class="input-field" placeholder="Or type Custom Subject...">
                    </div>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button class="btn-primary" onclick="Utils.updateAttendance(1)">Mark Present</button>
                    <button class="action-btn" style="background:var(--danger-text)" onclick="Utils.updateAttendance(-1)">Mark Absent</button>
                    <button class="action-btn" onclick="Utils.updateAttendance(0)">Reset</button>
                </div>
            </div>
        `;
    },

    results() {
        const u = STORE.currentUser;
        return `
            <div class="card">
                <h2>Semester Results</h2>
                <table style="margin-top:20px;">
                    <thead><tr><th>Subject</th><th>Grade</th></tr></thead>
                    <tbody>
                        ${Object.keys(u.attendance || {}).length === 0 ? '<tr><td colspan="2">No records found.</td></tr>' :
                Object.keys(u.attendance || {}).map(sub => {
                    const grade = u.grades?.[sub] || '-';
                    return `<tr><td>${sub}</td><td><b style="color:var(--secondary-color)">${grade}</b></td></tr>`;
                }).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    grading() {
        const u = STORE.currentUser;
        const myStudents = STORE.users.filter(s => (u.students || []).includes(s.id));
        return `
            <div class="card">
                <h2>Subject Grading</h2>
                <div class="grid-3" style="margin-top:20px;">
                    <select id="gr-student" class="input-field">
                        <option value="">Select Student...</option>
                        ${myStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                     <div style="display:flex; flex-direction:column; gap:5px;">
                         <select id="gr-subject-select" class="input-field">
                            <option value="">Select Subject...</option>
                            ${COMMON_SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                        <input id="gr-subject-custom" class="input-field" placeholder="Or type Custom...">
                    </div>
                    <input id="gr-value" class="input-field" placeholder="Grade (A, B+...)">
                </div>
                <button class="btn-primary" style="margin-top:10px;" onclick="Utils.assignGrade()">Assign Grade</button>
            </div>
        `;
    },

    placements() {
        const u = STORE.currentUser;
        // Allowed for Admin OR Faculty
        const canManage = u.role === 'admin' || u.role === 'faculty';
        const controls = canManage ?
            `<button class="action-btn" onclick="Utils.addPlacement()">+ Add Drive</button>` : '';

        // Student View: Simple Apply List
        if (u.role === 'student') {
            return `
            <div class="card">
                <div style="display:flex; justify-content:space-between;"><h2>Active Drives</h2></div>
                <table style="margin-top:20px;">
                     <thead><tr><th>Company</th><th>Role</th><th>CTC</th><th>Status/Action</th></tr></thead>
                     <tbody>
                        ${STORE.placements.length === 0 ? '<tr><td colspan="4">No active drives.</td></tr>' : STORE.placements.map(p => {
                const app = (p.applications || []).find(a => a.studentId === u.id);
                let action = `
                                <form onsubmit="Utils.applyPlacement(event, ${p.id})" style="display:flex; gap:5px;">
                                    <input type="file" required style="width:90px;" id="resume-${p.id}">
                                    <button class="action-btn">Apply</button>
                                </form>
                            `;
                if (app) {
                    let badgeClass = 'status-pending';
                    if (app.status === 'Selected') badgeClass = 'status-approved';
                    if (app.status === 'Rejected') badgeClass = 'status-rejected';
                    action = `<span class="status-badge ${badgeClass}">${app.status}</span>`;
                }

                return `
                            <tr>
                                <td>${p.company}</td>
                                <td>${p.role}</td>
                                <td>${p.ctc}</td>
                                <td>${action}</td>
                            </tr>`;
            }).join('')}
                     </tbody>
                </table>
            </div>`;
        }

        // Admin/Faculty View: Application Management
        return `
            <div class="card">
                <div style="display:flex; justify-content:space-between;"><h2>Placement Management</h2>${controls}</div>
                <div style="margin-top:20px;">
                    ${STORE.placements.map(p => `
                        <div style="background:rgba(255,255,255,0.03); padding:15px; margin-bottom:15px; border-radius:8px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <h3>${p.company} <span style="font-size:0.6em; color:var(--text-muted);">(${p.role} | ${p.ctc})</span></h3>
                            </div>
                            <table style="font-size:0.9em;">
                                <thead><tr><th>Candidate</th><th>Resume</th><th>Status</th><th>Action</th></tr></thead>
                                <tbody>
                                    ${(p.applications || []).length === 0 ? '<tr><td colspan="4">No applicants yet.</td></tr>' : (p.applications || []).map(app => {
            const stuName = STORE.users.find(x => x.id === app.studentId)?.name || app.studentId;
            return `
                                        <tr>
                                            <td>${stuName}</td>
                                            <td><button class="action-btn" style="padding:2px 8px; font-size:10px;" onclick="Utils.viewFile('${app.resume}')">View PDF</button></td>
                                            <td><span class="status-badge status-pending">${app.status}</span></td>
                                            <td style="display:flex; gap:5px;">
                                                <button class="action-btn" style="background:var(--success-text); color:black;" onclick="Utils.updateAppStatus(${p.id}, '${app.studentId}', 'Selected')">Select</button>
                                                <button class="action-btn" style="background:var(--warning-text); color:black;" onclick="Utils.updateAppStatus(${p.id}, '${app.studentId}', 'Waiting')">Wait</button>
                                                <button class="action-btn" style="background:var(--danger-text); color:white;" onclick="Utils.updateAppStatus(${p.id}, '${app.studentId}', 'Rejected')">Reject</button>
                                            </td>
                                        </tr>`;
        }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    assignments() {
        const u = STORE.currentUser;
        const controls = u.role === 'faculty' ?
            `<button class="action-btn" onclick="Utils.createAssignment()">+ New Assignment</button>` : '';

        if (u.role === 'student') {
            return `
            <div class="card">
                <h2>Assignments</h2>
                <table style="margin-top:20px;">
                    <thead><tr><th>Title</th><th>Deadline</th><th>Your Grade</th><th>Action</th></tr></thead>
                    <tbody>
                        ${STORE.assignments.map(a => {
                const sub = (a.submissions || []).find(s => s.studentId === u.id);
                return `
                            <tr>
                                <td>${a.title}</td>
                                <td>${a.deadline}</td>
                                <td><b style="color:var(--success-text)">${sub && sub.grade ? sub.grade : '-'}</b></td>
                                <td>
                                    ${sub ? '<span class="status-badge status-submitted">Submitted</span>' :
                        `<form onsubmit="Utils.submitAssignment(event, ${a.id})" style="display:flex; gap:10px;">
                                        <input type="file" required style="width:90px;">
                                        <button class="action-btn">Upload</button>
                                    </form>`}
                                </td>
                            </tr>`;
            }).join('')}
                    </tbody>
                </table>
            </div>`;
        } else {
            return `
            <div class="card">
                 <div style="display:flex; justify-content:space-between;"><h2>Assignments Management</h2>${controls}</div>
                 <div style="margin-top:20px;">
                    ${STORE.assignments.map(a => `
                        <div style="background:rgba(255,255,255,0.03); padding:15px; margin-bottom:15px; border-radius:8px;">
                            <h3>${a.title}</h3>
                            <table style="font-size:0.9em;">
                                <thead><tr><th>Student</th><th>Grade</th><th>Action</th></tr></thead>
                                <tbody>
                                    ${(a.submissions || []).length === 0 ? '<tr><td colspan="3">No submissions.</td></tr>' : (a.submissions || []).map(s => {
                const stuName = STORE.users.find(x => x.id === s.studentId)?.name || s.studentId;
                return `<tr>
                    <td>${stuName}</td>
                    <td>${s.grade || '-'}</td>
                    <td>
                        <button class="action-btn" onclick="Utils.gradeAssignment(${a.id}, '${s.studentId}')">Grade</button>
                        ${s.file ? `<button class="action-btn" onclick="Utils.viewFile('${s.file}')">View File</button>` : ''}
                    </td>
                </tr>`;
            }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    },

    announcements() {
        return `
            <div class="grid-2">
                <div class="card">
                    <h3>Post Announcement</h3>
                    <textarea id="news-in" class="input-field" style="height:100px; margin-top:10px;" placeholder="Message..."></textarea>
                    <button class="btn-primary" onclick="Utils.postNews()">Post</button>
                </div>
                <div class="card">
                    <h3>Recent Posts</h3>
                    ${STORE.notifications.filter(n => n.type === 'global').map(n => `<div style="padding:10px; border-bottom:1px solid #333;">${n.text}</div>`).join('')}
                </div>
            </div>`;
    },

    notifications() {
        const u = STORE.currentUser;
        const userNotifs = STORE.notifications.filter(n => n.type === 'global' || n.userId === u.id);
        
        userNotifs.forEach(async n => {
            if (!n.read) {
                n.read = true;
                try {
                    await firebase.firestore().collection('notifications').doc(String(n.id)).update({ read: true });
                } catch (e) { console.error(e); }
            }
        });

        const b = document.getElementById('notif-badge');
        if (b) b.style.display = 'none';

        return `
            <div class="card">
                <h2>My Notifications</h2>
                <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                    ${userNotifs.length === 0 ? '<p>No notifications.</p>' : userNotifs.map(n => `
                        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; border-left:4px solid var(--secondary-color);">
                            <div style="font-size:0.8em; color:var(--text-muted);">${new Date(Number(n.id) || n.id).toLocaleString()}</div>
                            <div style="font-size:1.1em; margin-top:5px;">${n.text}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    approvals() {
        const pending = STORE.users.filter(x => x.status === 'pending');
        return `
            <div class="card">
                <h2>Pending Approvals</h2>
                <table style="margin-top:20px;">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
                    <tbody>
                        ${pending.length === 0 ? '<tr><td colspan="4">No pending requests</td></tr>' : pending.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.email}</td>
                                <td>${p.role}</td>
                                <td>
                                    <button class="action-btn" onclick="Utils.approve('${p.id}', true)">Approve</button>
                                    <button class="action-btn" style="background:var(--danger-text)" onclick="Utils.approve('${p.id}', false)">Reject</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    students() {
        const u = STORE.currentUser;
        const myStudents = STORE.users.filter(s => (u.students || []).includes(s.id));
        return `
            <div class="card">
                <h2>Enrolled Students</h2>
                <table style="margin-top:20px;">
                     <thead><tr><th>Name</th><th>Email</th><th>Enrollment</th></tr></thead>
                    <tbody>
                        ${myStudents.length === 0 ? '<tr><td colspan="3">No students enrolled.</td></tr>' : myStudents.map(stu => `
                            <tr><td>${stu.name}</td><td>${stu.email}</td><td>${stu.details.enrollment}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    profile() {
        const u = STORE.currentUser;
        return `
            <div class="card">
                <h2>Profile</h2>
                <div class="grid-2" style="margin-top:20px;">
                    <div><label>Name</label><input class="input-field" value="${u.name}" id="p-name"></div>
                    <div><label>Phone</label><input class="input-field" value="${u.details?.phone || ''}" id="p-phone"></div>
                    <div><label>Email</label><input class="input-field" value="${u.email}" disabled style="opacity:0.5"></div>
                    <div><label>New Password</label><input class="input-field" type="password" placeholder="Leave empty to keep current" id="p-pass"></div>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button class="btn-primary" style="width:auto;" onclick="Utils.saveProfile()">Save Changes</button>
                    ${u.role === 'student' ? `<button class="action-btn" style="width:auto;" onclick="Utils.genResume()">Generate Resume</button>` : ''}
                </div>
            </div>`;
    }
};

// ==========================================
// 4. UTILS & CONTROLLERS
// ==========================================
const Utils = {
    async fetchUserData(firebaseUser) {
        try {
            const doc = await firebase.firestore().collection('users').doc(firebaseUser.uid).get();
            if (doc.exists) {
                STORE.currentUser = doc.data();

                // Load Global Data (Simulating the old Monolithic STORE)
                // In a real app, we would paginate or only load what's needed.
                const db = firebase.firestore();

                const [usersSnap, assSnap, placeSnap, notifSnap] = await Promise.all([
                    db.collection('users').get(),
                    db.collection('assignments').get(),
                    db.collection('placements').get(),
                    db.collection('notifications').get()
                ]);

                STORE.users = usersSnap.docs.map(d => d.data());
                STORE.assignments = assSnap.docs.map(d => d.data());
                STORE.placements = placeSnap.docs.map(d => d.data());
                STORE.notifications = notifSnap.docs.map(d => d.data());

                Auth.init(); // Re-render
            } else {
                console.error("User doc not found in Firestore");
                alert("User profile not found. Contact Admin.");
                firebase.auth().signOut();
            }
        } catch (e) {
            console.error("Error fetching data:", e);
            alert("Network Error: " + e.message);
        }
    },

    async approve(id, start) {
        try {
            const status = start ? 'active' : 'rejected';
            await firebase.firestore().collection('users').doc(id).update({ status: status });
            // Update local store to reflect change immediately without waiting for reload
            const u = STORE.users.find(x => x.id === id);
            if (u) u.status = status;
            alert('User ' + status);
            Router.route();
        } catch (e) { console.error(e); alert('Error: ' + e.message); }
    },

    async linkFaculty(facId) {
        if (!facId) return;
        const student = STORE.currentUser;
        try {
            const batch = firebase.firestore().batch();
            const stuRef = firebase.firestore().collection('users').doc(student.id);
            const facRef = firebase.firestore().collection('users').doc(facId);

            batch.update(stuRef, { facultyId: facId });
            batch.update(facRef, { students: firebase.firestore.FieldValue.arrayUnion(student.id) });

            await batch.commit();

            // Local update
            student.facultyId = facId;
            const fac = STORE.users.find(x => x.id === facId);
            if (fac) {
                if (!fac.students) fac.students = [];
                if (!fac.students.includes(student.id)) fac.students.push(student.id);
            }
            alert('Faculty Linked!');
            Router.route();
        } catch (e) { console.error(e); alert('Error: ' + e.message); }
    },

    async saveProfile() {
        const u = STORE.currentUser;
        const newName = document.getElementById('p-name').value;
        const newPhone = document.getElementById('p-phone').value;
        const newPass = document.getElementById('p-pass').value;

        try {
            await firebase.firestore().collection('users').doc(u.id).update({
                name: newName,
                'details.phone': newPhone
            });
            u.name = newName;
            u.details.phone = newPhone;

            if (newPass && newPass.length >= 6) {
                const user = firebase.auth().currentUser;
                await user.updatePassword(newPass);
                alert('Profile & Password Saved!');
            } else if (newPass) {
                alert('Profile Saved, but Password must be 6+ chars.');
            } else {
                alert('Profile Saved!');
            }
        } catch (e) { console.error(e); alert('Error: ' + e.message); }
    },

    async createAssignment() {
        const t = prompt("Assignment Title:");
        if (t) {
            const newAss = { id: Date.now().toString(), title: t, deadline: '2024-12-30', submissions: [] };
            try {
                await firebase.firestore().collection('assignments').doc(newAss.id).set(newAss);
                STORE.assignments.push(newAss);
                Router.route();
            } catch (e) { console.error(e); alert('Error: ' + e.message); }
        }
    },

    async submitAssignment(e, assId) {
        e.preventDefault();
        // File Upload Logic
        const fileInput = e.target.querySelector('input[type="file"]');
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) return alert("Please select a file.");

        try {
            alert("Uploading...");
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`assignments/${assId}/${STORE.currentUser.id}_${file.name}`);
            await fileRef.put(file);
            const url = await fileRef.getDownloadURL();

            const sub = {
                studentId: STORE.currentUser.id,
                file: url, // Store URL
                fileName: file.name,
                grade: null
            };

            const assRef = firebase.firestore().collection('assignments').doc(String(assId));
            // We use arrayRemove to avoid duplicates if re-submitting, then arrayUnion
            // Note: In real app, we'd handle re-submissions better.
            await assRef.update({
                submissions: firebase.firestore.FieldValue.arrayUnion(sub)
            });

            // Update local
            const ass = STORE.assignments.find(a => String(a.id) === String(assId));
            if (ass) {
                if (!ass.submissions) ass.submissions = [];
                ass.submissions.push(sub);
            }

            alert('Submitted Successfully!');
            Router.route();
        } catch (e) { console.error(e); alert('Error: ' + e.message); }
    },

    async gradeAssignment(assId, stuId) {
        const g = prompt("Enter Grade (0-100 or A-F):");
        if (g) {
            const ass = STORE.assignments.find(a => String(a.id) === String(assId));
            const sub = ass.submissions.find(s => s.studentId === stuId);
            if (sub) {
                sub.grade = g;
                try {
                    await firebase.firestore().collection('assignments').doc(String(assId)).update({
                        submissions: ass.submissions
                    });
                    
                    const notif = {
                        id: Date.now().toString(),
                        text: `Assignment ${ass.title} Graded: ${g}`,
                        type: 'personal',
                        read: false,
                        userId: stuId
                    };
                    await firebase.firestore().collection('notifications').doc(notif.id).set(notif);
                    STORE.notifications.unshift(notif);

                    alert("Assignment Graded!");
                    Router.route();
                } catch (e) {
                    console.error(e);
                    alert("Error saving grade: " + e.message);
                }
            }
        }
    },

    async updateAttendance(delta) {
        const sid = document.getElementById('ma-student').value;
        const customSub = document.getElementById('ma-subject-custom').value;
        const selectSub = document.getElementById('ma-subject-select').value;
        const subj = customSub || selectSub;

        if (!sid || !subj) return alert("Select Student & Select/Enter Subject");

        const stu = STORE.users.find(x => x.id === sid);
        if (!stu.attendance) stu.attendance = {};
        if (!stu.attendance[subj]) stu.attendance[subj] = { present: 0, total: 0 };

        if (delta === 0) {
            stu.attendance[subj] = { present: 0, total: 0 };
        } else {
            stu.attendance[subj].total += 1;
            if (delta === 1) stu.attendance[subj].present += 1;
        }

        try {
            await firebase.firestore().collection('users').doc(sid).update({
                [`attendance.${subj}`]: stu.attendance[subj]
            });
            alert(delta === 0 ? "Attendance Reset." : `Updated! ${subj}: ${stu.attendance[subj].present}/${stu.attendance[subj].total}`);
            Router.route();
        } catch (e) {
            console.error(e);
            alert("Error updating attendance: " + e.message);
        }
    },

    async assignGrade() {
        const sid = document.getElementById('gr-student').value;
        const customSub = document.getElementById('gr-subject-custom').value;
        const selectSub = document.getElementById('gr-subject-select').value;
        const subj = customSub || selectSub;
        const val = document.getElementById('gr-value').value;

        if (!sid || !subj || !val) return alert("Fill all fields");
        const stu = STORE.users.find(x => x.id === sid);
        if (!stu.grades) stu.grades = {};
        stu.grades[subj] = val;

        try {
            await firebase.firestore().collection('users').doc(sid).update({
                [`grades.${subj}`]: val
            });

            const notif = {
                id: Date.now().toString(),
                text: `New Grade in ${subj}: ${val}`,
                type: 'personal',
                read: false,
                userId: sid
            };
            await firebase.firestore().collection('notifications').doc(notif.id).set(notif);
            STORE.notifications.unshift(notif);

            alert("Grade Assigned!");
            Router.route();
        } catch (e) {
            console.error(e);
            alert("Error assigning grade: " + e.message);
        }
    },

    async addPlacement() {
        const c = prompt("Company Name:");
        const r = prompt("Job Role:");
        const sal = prompt("CTC (e.g. 10 LPA):");
        if (c && r && sal) {
            const newP = {
                id: Date.now().toString(), company: c, role: r, ctc: sal, status: 'Open', applications: []
            };
            try {
                await firebase.firestore().collection('placements').doc(newP.id).set(newP);
                STORE.placements.push(newP);
                Router.route();
            } catch (e) { console.error(e); alert('Error: ' + e.message); }
        }
    },

    async applyPlacement(e, pid) {
        e.preventDefault();
        const fileInput = document.getElementById('resume-' + pid);
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) return alert("Please select a resume.");

        try {
            alert("Uploading Resume...");
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`resumes/${pid}/${STORE.currentUser.id}_${file.name}`);
            await fileRef.put(file);
            const url = await fileRef.getDownloadURL();

            const app = {
                studentId: STORE.currentUser.id,
                resume: url,
                status: 'Applied'
            };

            const pRef = firebase.firestore().collection('placements').doc(String(pid));
            await pRef.update({
                applications: firebase.firestore.FieldValue.arrayUnion(app)
            });

            // Update local
            const p = STORE.placements.find(x => String(x.id) === String(pid));
            if (p) {
                if (!p.applications) p.applications = [];
                p.applications.push(app);
            }

            alert("Application Submitted with Resume!");
            Router.route();
        } catch (e) { console.error(e); alert('Error: ' + e.message); }
    },

    async updateAppStatus(pid, sid, status) {
        const p = STORE.placements.find(x => String(x.id) === String(pid));
        const app = p.applications.find(a => a.studentId === sid);
        if (app) {
            app.status = status;
            try {
                await firebase.firestore().collection('placements').doc(String(pid)).update({
                    applications: p.applications
                });

                const notif = {
                    id: Date.now().toString(),
                    text: `Placement Update [${p.company}]: ${status}`,
                    type: 'personal',
                    read: false,
                    userId: sid
                };
                await firebase.firestore().collection('notifications').doc(notif.id).set(notif);
                STORE.notifications.unshift(notif);

                alert("Status Updated!");
                Router.route();
            } catch (e) {
                console.error(e);
                alert("Error updating application status: " + e.message);
            }
        }
    },

    viewResume(sid) {
        // Find URL from applications? The view only passed SID.
        // We'd need to find the specific application context, or just look up user?
        // Ideally we pass the URL directly in the onClick.
        // For now, let's just alert.
        const u = STORE.users.find(x => x.id === sid);
        alert("To view resume, we need the URL. (Update View to pass URL)");
    },

    viewFile(url) {
        if (url && url.startsWith('http')) window.open(url, '_blank');
        else alert("No valid file linked.");
    },

    async postNews() {
        const t = document.getElementById('news-in').value;
        if (t) {
            const notif = {
                id: Date.now().toString(),
                text: `[${STORE.currentUser.name}]: ${t}`,
                type: 'global',
                read: false
            };
            try {
                await firebase.firestore().collection('notifications').doc(notif.id).set(notif);
                STORE.notifications.unshift(notif);
                alert('Posted');
                document.getElementById('news-in').value = '';
                Router.route();
            } catch (e) {
                console.error(e);
                alert("Error posting announcement: " + e.message);
            }
        }
    },

    async markAttendanceForDay(date) {
        const u = STORE.currentUser;
        if (u.role !== 'student') return alert("Only students can mark attendance.");
        if (u.lastAttendanceDate === date) return alert("Attendance already marked for today!");

        try {
            const batch = firebase.firestore().batch();
            const userRef = firebase.firestore().collection('users').doc(u.id);

            // Update all enrolled subjects
            const updates = {};
            // We increment counters. 
            // Note: Firestore update with nested fields needs "attendance.Subject.present" syntax
            // OR we read, modify, write.
            // Since we have the user doc loaded, we can construct the update.

            if (!u.attendance) u.attendance = {};
            const subjects = u.subjects || [];

            subjects.forEach(sub => {
                if (!u.attendance[sub]) u.attendance[sub] = { present: 0, total: 0 };
                u.attendance[sub].present += 1;
                u.attendance[sub].total += 1;
                updates[`attendance.${sub}.present`] = firebase.firestore.FieldValue.increment(1);
                updates[`attendance.${sub}.total`] = firebase.firestore.FieldValue.increment(1);
            });

            updates['lastAttendanceDate'] = date;

            await userRef.update(updates);

            // Local update (STORE already mutated above somewhat, but let's be safe)
            u.lastAttendanceDate = date;

            alert(`Attendance Marked for ${subjects.length} subjects!`);
            Router.route();

        } catch (e) { console.error(e); alert('Error: ' + e.message); }
    },

    genResume() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Resume: " + STORE.currentUser.name, 20, 20);
        doc.text("Email: " + STORE.currentUser.email, 20, 30);
        doc.save("resume.pdf");
    }
};

const QR = {
    timer: null,
    scanner: null,

    showModal() {
        const m = document.getElementById('reusable-modal');
        m.style.display = 'flex';
        m.querySelector('#modal-content').innerHTML = `
            <h2 style="text-align:center; color:white;">Attendance QR</h2>
            <div id="qrcode-target" style="background:white; padding:20px; margin:20px auto; width: fit-content; border-radius:10px;"></div>
            <p style="text-align:center;">Updates daily. Scan to mark all today's subjects.</p>
        `;
        this.gen();
    },

    gen() {
        const el = document.getElementById('qrcode-target');
        if (el) {
            el.innerHTML = '';
            // Generate for TODAY
            const today = new Date().toISOString().split('T')[0];
            new QRCode(el, { text: 'ATTENDANCE_SESSION_' + today, width: 200, height: 200 });
        }
    },

    openScanner() {
        const m = document.getElementById('reusable-modal');
        m.style.display = 'flex';
        m.querySelector('#modal-content').innerHTML = `
            <h2 style="text-align:center; color:white;">Scan Attendance</h2>
            <div id="reader" style="width: 100%; max-width: 400px; margin:20px auto;"></div>
            <p style="text-align:center;" id="scan-status">Requesting Camera...</p>
        `;

        setTimeout(() => {
            if (!this.scanner) {
                if (typeof Html5QrcodeScanner === 'undefined') {
                    document.getElementById('scan-status').innerHTML = 'Error: Scanner Lib not loaded.';
                    return;
                }
                this.scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
                this.scanner.render((txt) => {
                    if (txt.startsWith('ATTENDANCE_SESSION_')) {
                        this.scanner.clear();
                        m.style.display = 'none';
                        const date = txt.split('ATTENDANCE_SESSION_')[1];
                        alert(`QR Validated for Date: ${date}`);
                        Utils.markAttendanceForDay(date);
                    } else {
                        alert("Invalid QR Code");
                    }
                }, (err) => { /* Ignore */ });
            }
        }, 500);
    }
};

document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => {
    document.getElementById('reusable-modal').style.display = 'none';
    if (QR.timer) clearInterval(QR.timer);
    if (QR.scanner) { QR.scanner.clear(); QR.scanner = null; }
}));

document.addEventListener('DOMContentLoaded', () => {
    // Auth.init() handled by onAuthStateChanged
    if (document.getElementById('logout-btn')) document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
    if (document.getElementById('show-qr-btn')) document.getElementById('show-qr-btn').addEventListener('click', () => QR.showModal());
});

