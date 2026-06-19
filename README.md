# 🌿 ZEN PLANNER

**The Ultimate Digital Planner — Deeply Focused, Ridiculously Useful.**

Zen Planner is a beautifully crafted, 525-page digital productivity suite designed to help you stay organized without the overwhelm. It features a completely dynamic calendar engine, cloud synchronization, and a minimalist aesthetic.

## ✨ Features

- **Dynamic Year Engine:** The planner automatically detects the current year, calculates leap years, and perfectly aligns daily/weekly pages to the correct dates. Come January 1st, the entire planner seamlessly rolls over to the next year.
- **Cloud Sync & Authentication:** Powered by **Supabase**, your planner data is securely saved in the cloud. Log in from any device and pick up right where you left off.
- **True Black & White Mode:** Instantly strip away all color for a pure, distraction-free grayscale aesthetic. This high-contrast mode applies a complete grayscale filter across the entire application, including background paintings and icons.
- **Immersive Full-Screen Layout:** Built as a modern web app that fills your screen edge-to-edge, looking like a native application rather than a floating web page.
- **Responsive Mobile UI:** The layout intelligently adapts to phones and tablets, converting sidebars into horizontal scrollable strips so you can plan on the go.
- **PDF Export:** Native print functionality allows you to export your planner to a PDF or print it out.

## 🚀 Setup & Hosting

### 1. Database Setup (Supabase)
1. Create a free project on [Supabase](https://supabase.com/).
2. Go to the SQL Editor and run the contents of `setup.sql` to create the `planner_data` table and secure it with Row Level Security (RLS).
3. Go to **Authentication > Providers > Email** and ensure **Enable Email Provider** is ON, but **Confirm Email** is OFF.
4. Copy your Project URL and Anon Key into `supabase-config.js`.

### 2. Hosting (Render)
This application is completely serverless and can be hosted for free on [Render](https://render.com/).
1. Push this repository to GitHub.
2. In Render, create a new **Static Site** and connect your GitHub repository.
3. Leave the build command and publish directory blank. Render will automatically serve the files!

---
*Designed for calm, intentional workflows.*
