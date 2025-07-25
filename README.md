﻿# College Check-In/Check-Out System

This is a Node.js + HTML app for managing college attendance using:
- Google Sheets API (check-in/out records)
- Local JSON storage (`students.json`) for registered students

## 🌐 Live Demo
[Visit Deployed Site](https://college-entry-system.onrender.com)


## 🚀 How it Works
- New students register via the front-end.
- Check-in/check-out info is pushed to Google Sheets.
- Student details are stored in a local `students.json` (not committed for security).

## 🔒 Security Notes
- `credentials.json` contains Google API private keys and is ignored from Git.
- Never expose private keys publicly.

## 📦 Setup
1. Clone the repo
2. Run `npm install`
3. Add your `credentials.json` and `students.json` manually
4. Run with `node server.js`

## License
MIT
