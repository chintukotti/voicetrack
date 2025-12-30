# 🎤 Voice Expense Tracker – Chaduvimpulu Management System

A **browser-based voice-enabled expense tracker** built to digitize and simplify the traditional Indian practice of recording **“Chaduvimpulu”** (monetary contributions) during weddings and family functions.

🔗 **Live Project:** https://voicetrack.netlify.app/

---

## 📌 Problem Statement

In traditional Indian gatherings, particularly weddings and family functions, tracking monetary contributions ("Chaduvimpulu") is a critical yet chaotic task. Organizers struggle to manually record names and amounts in fast-paced environments. This manual process is:

- Prone to human errors
- Difficult when handling mixed languages (Telugu & English)
- Time-consuming with no instant backup or reporting

---

## 💡 Abstract / Solution

To address this problem, I engineered a **fully browser-based Voice Expense Tracker** that automates the recording of contributions.

The application uses the **Web Speech API** to capture real-time audio and convert spoken input into text. A **custom-built NLP engine** processes mixed Telugu-English speech, separates names and currency values, converts spoken number words into numeric values, and instantly stores them in a structured digital ledger.

The system supports **real-time auto-save**, **secure cloud storage using Firebase**, and allows organizers to **export professional PDF reports** instantly with proper Telugu font rendering.

---

## 🚀 Features

### 🔐 1. Authentication & Security
- Google Login using **Firebase Authentication**
- Secure session management with logout
- Local cache cleared on logout
- User-specific data isolation (each user sees only their files)

---

### 🎙 2. Voice Recognition & NLP (Core Engine)
- Real-time **Speech-to-Text** using Web Speech API
- Dual-language support (Telugu + English)
- Smart name extraction from spoken sentences
- Spoken number processing:
  - `"five hundred"`, `"veyya"`, `"vondala"`, `"lakh"` → numeric values
- Live transcript display while the user is speaking

---

### 🗂 3. Data Management (CRUD)
- Create a new Chaduvimpulu table instantly
- Auto-save to **Local Storage** and **Cloud Draft**
- Save finalized reports with custom filenames
- “My Files” history modal with saved reports
- Load any saved report instantly

---

### 🔒 4. View Only Mode & Data Integrity
- Automatically switches to **Read Only** mode for loaded files
- Voice recording disabled in View Only mode
- Action/Delete column hidden for clean UI
- Inline name editing enabled only in active mode

---

### 📄 5. Exporting & Reporting
- One-click **PDF generation**
- Full Telugu font support using `html2pdf.js`
- Professional PDF layout:
  - Report Title & City centered at the top
  - S.No, Name, Rupees (center-aligned)
- Auto-calculated total (excluding deleted entries)

---

### 🎨 6. UI / UX Enhancements
- Fully responsive design (Mobile & Desktop)
- Mobile hamburger navigation
- Soft delete with strike-through (data preserved)
- Visual indicators:
  - “Listening” animation
  - “View Only” status badge

---

## 🛠 Technologies Used

### Frontend
- HTML5
- CSS3 (Responsive Design)
- Vanilla JavaScript (ES6+)

### Voice & NLP
- Web Speech API
- Custom NLP logic for Telugu–English parsing
- Number-word to numeric conversion engine

### Backend & Cloud
- Firebase Authentication
- Firebase Cloud Firestore
- Firebase Realtime Database

### PDF & Fonts
- html2pdf.js
- Google Fonts – **Noto Sans Telugu**

---

## 📦 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/your-username/voice-expense-tracker.git

# Open index.html in a browser


👨‍💻 Author

Kotti Satyanarayana (Satya)
3rd Year CSE Student | Full Stack Web Developer