// server.js
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer'); // (if needed later)
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const app = express();
const PORT = 3000;

// Path to persistent student data file.
const DATA_FILE = path.join(__dirname, 'students.json');

// In-memory store for student records.
let students = new Map();

// Load persistent student data from file.
function loadStudents() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      students = new Map(Object.entries(parsed));
      console.log(`Loaded ${students.size} student records.`);
    } else {
      console.log("No existing student data found. Starting fresh.");
    }
  } catch (err) {
    console.error("Error loading student data:", err);
  }
}

// Save student records to file.
function saveStudents() {
  try {
    const obj = Object.fromEntries(students);
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    console.log("Student data saved.");
  } catch (err) {
    console.error("Error saving student data:", err);
  }
}

loadStudents();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ======================================
   Google Sheets Integration Setup
========================================*/
const SPREADSHEET_ID = '1-nn-vEDf-BEdZ38dhI580ACkME8pBSgJY5cpdw97ujk'; // Replace with your actual spreadsheet ID.
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Append an event to the Google Sheet.
// We append: timestamp, entry number, name, status, student phone, parent phone, and photo (if any).
async function appendAttendanceEvent(eventData) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'DailyEvents!A:G', // Ensure your sheet is named "DailyEvents" with columns A through G.
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          [
            eventData.timestamp,
            eventData.entryNumber,
            eventData.name,
            eventData.status,
            eventData.phone || '',
            eventData.parentPhone || '',
            eventData.photo || ''
          ],
        ],
      },
    });
    console.log('Event appended to Google Sheet.');
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
  }
}

/* ======================================
   WhatsApp/Email Integration (Placeholder)
========================================*/
// For now, we simulate WhatsApp messaging.
function sendWhatsAppMessage(phone, message) {
  console.log(`WhatsApp message sent to ${phone}: ${message}`);
}

function scheduleWhatsappMessage(phone, message) {
  setTimeout(async () => {
    await sendWhatsAppMessage(phone, message);
  }, 10000); // 10 seconds delay
}

/* ======================================
   API Endpoints
========================================*/

// POST /register: Register a new student.
app.post('/register', async (req, res) => {
  const { entryNumber, name, batch, branch, course, phone, parentPhone, photo } = req.body;
  // Validate phone numbers: exactly 10 digits.
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Student phone number must be exactly 10 digits.' });
  }
  if (!phoneRegex.test(parentPhone)) {
    return res.status(400).json({ message: 'Parent/Guardian phone number must be exactly 10 digits.' });
  }
  if (students.has(entryNumber)) {
    return res.status(400).json({ message: 'Student already registered' });
  }
  const student = {
    entryNumber,
    name,
    batch,
    branch,
    course,
    phone,
    parentPhone,
    photo: photo || '',
    scanCount: 1, // Registration counts as first scan.
    lastStatus: 'Registered',
  };
  students.set(entryNumber, student);
  saveStudents();
  console.log(`Registered student: ${name} (${entryNumber})`);
  
  await appendAttendanceEvent({
    timestamp: new Date().toLocaleString(),
    entryNumber,
    name,
    status: 'Registered',
    phone,
    parentPhone,
    photo: photo || ''
  });
  
  res.json({ message: 'Registration successful', student });
});

// POST /scan: Process a scan event.
app.post('/scan', async (req, res) => {
  const { entryNumber } = req.body;
  if (!students.has(entryNumber)) {
    return res.status(404).json({ message: 'Student not registered' });
  }
  const student = students.get(entryNumber);
  student.scanCount += 1;
  let status;
  if (student.scanCount % 2 === 0) {
    status = 'Checked In';
  } else {
    status = 'Checked Out';
    try {
      const message = `Hello ${student.name}, you have been checked out at ${new Date().toLocaleString()}.`;
      scheduleWhatsappMessage(student.phone, message);
    } catch (error) {
      console.error('Error scheduling WhatsApp message:', error);
    }
  }
  student.lastStatus = status;
  students.set(entryNumber, student);
  saveStudents();
  console.log(`Student ${student.name} (${entryNumber}) is now ${status} (Scan Count: ${student.scanCount})`);
  
  await appendAttendanceEvent({
    timestamp: new Date().toLocaleString(),
    entryNumber,
    name: student.name,
    status: status,
    phone: student.phone,
    parentPhone: student.parentPhone,
    photo: student.photo || ''
  });
  
  res.json({ message: `Student ${student.name} is now ${status}.`, student });
});

// Optional: GET /students for debugging.
app.get('/students', (req, res) => {
  res.json(Array.from(students.values()));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
