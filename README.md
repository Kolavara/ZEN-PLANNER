# 🌿 Zen Planner

**The Ultimate Undated Digital Planner** — 525 pages of clean, minimalist design with fully interactive features, habit trackers, and productivity frameworks.

![Zen Planner](./cover-bg.png)

---
live now : https://zen-planner.onrender.com
## ✨ Features

### 🆕 New Additions
- **Ambient Focus Music** — Built-in lo-fi and jazz background tracks to help you enter a deep work state. Features an interactive music player with play/pause, track skipping, and volume control right in the navigation bar.
- **Dynamic Year Engine** — Automatically detects the current year (e.g., 2026), calculates leap years, and perfectly aligns daily/weekly pages to the exact dates. Seamlessly rolls over on January 1st!
- **True Black & White Mode** — Instantly strip away all color for a pure, distraction-free grayscale aesthetic via the top navigation toggle.
- **Immersive Full-Screen Layout** — Built as a modern web app that fills your screen edge-to-edge.
- **Responsive Mobile UI** — Layout intelligently adapts to phones and tablets, converting sidebars into horizontal scrollable strips.

### 📖 Comprehensive Planning System
- **Monthly Calendars** — Dynamic 12-month calendar views with clickable day navigation
- **Monthly Goals** — Set top 3 goals, track action items, and reflect on progress
- **Weekly Spreads** — Organize your week with daily notes and focus areas
- **Daily Pages** — Detailed time scheduling, task matrix, and intention setting

### ✅ Productivity Tools
- **Habit Trackers** — Monitor 12 habits across each month
- **Task Priority Matrix** — Eisenhower Matrix (Important/Urgent) for smart prioritization
- **Task Categories** — Organize tasks (Do, Delegate, Schedule, Eliminate)
- **Time Slots** — 14 customizable time slots per day for scheduling

### 📚 Knowledge Base
- **10 Curated Cheat Sheets** covering:
  - Atomic Habits by James Clear
  - Deep Work by Cal Newport
  - Eat That Frog! by Brian Tracy
  - The 7 Habits by Stephen R. Covey
  - Getting Things Done by David Allen
  - The ONE Thing by Gary Keller
  - Essentialism by Greg McKeown
  - Make Time by Jake Knapp & John Zeratsky
  - The Power of Habit by Charles Duhigg
  - Digital Minimalism by Cal Newport

### 📓 Notes Section
- **60 Notes Pages** for free-form writing and ideas

### 🔐 Full Authentication & Cloud Sync
- Secure sign-up and login with Supabase
- Real-time data persistence across all devices
- All your planner data synced to the cloud

---

## 🚀 Quick Start

### Prerequisites
- A **Supabase account** (free tier available at [supabase.com](https://supabase.com))
- A modern web browser

### Setup Instructions

#### 1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and sign up
   - Create a new project
   - Save your **Project URL** and **Anonymous Key** (from Settings > API)

#### 2. **Configure the Planner**
   - Edit `supabase-config.js` in your repository:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

#### 3. **Initialize the Database**
   - Go to your Supabase project dashboard
   - Open **SQL Editor** (left sidebar)
   - Create a new query and paste the contents of `setup.sql`
   - Click **Run**
   - The `planner_data` table will be created with secure row-level security (RLS)

#### 4. **Deploy**
   - Upload all files to your web server or use GitHub Pages
   - Visit your deployed URL and sign up

---

## 📁 File Structure

```
ZEN-PLANNER/
├── index.html              # Main HTML structure
├── app.js                  # Application engine & rendering (43KB)
├── auth.js                 # Authentication handlers
├── styles.css              # Complete styling & theming
├── supabase.js             # Supabase client library
├── supabase-config.js      # Configuration file
├── setup.sql               # Database initialization script
├── cover-bg.png            # Cover page background
├── IMG_3375.webp           # Demo/reference images
├── IMG_3376.webp
├── IMG_3377.webp
└── undated2.001.webp
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
|-----------|---------|
| **HTML5** | Semantic markup |
| **CSS3** | Responsive design with CSS variables for theming |
| **JavaScript (Vanilla)** | Dynamic interactivity, no frameworks |
| **Supabase** | Backend, authentication, and database |
| **PostgreSQL** | Data storage with row-level security |

---

## 📖 Usage Guide

### Navigation
- **Arrow Keys** — Move between pages (← prev, → next)
- **Home Key** — Jump to cover page
- **Month Tabs** — Quick navigation to months/sections
- **Breadcrumbs** — Navigate within hierarchical sections
- **Previous/Next Buttons** — Sequential page navigation

### Editing
- **Click any field** to edit content
- **Press Ctrl+P (Cmd+P on Mac)** to print or export as PDF
- All changes **auto-save** to your cloud account

### Page Organization
The planner contains **525 pages** organized as:
- **1 page** — Cover & branding
- **2 pages** — Table of contents & navigation
- **12 pages** — Monthly calendar views
- **12 pages** — Monthly goals & planning
- **52 pages** — Weekly spreads
- **365 pages** — Daily pages (one per day)
- **12 pages** — Habit trackers (one per month)
- **10 pages** — Productivity cheat sheets
- **60 pages** — Free notes & journaling

---

## 🔐 Security & Privacy

### Authentication
- Email/password authentication via Supabase Auth
- Passwords are hashed and never stored in plain text
- Session management handled securely

### Data Privacy
- **Row-Level Security (RLS)** ensures users can only access their own data
- All queries are secured with user_id validation
- Database encryption in transit and at rest

### To Enable Email Confirmation (Optional)
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Customize verification emails
3. Users will need to verify their email before accessing the planner

---

## 🎨 Customization

### Colors & Fonts
Edit variables in `styles.css`:
```css
:root {
  --bg-primary: #fafaf8;
  --text-primary: #2c2c2a;
  --accent: #8b7355;
  --border-light: #e8e8e6;
  /* ... more variables ... */
}
```

### Monthly Names & Languages
Edit the `MONTHS` array in `app.js`:
```javascript
const MONTHS = ['January','February', /* ... */];
```

### Day Names
Modify `DAYS` and `DAYS_SHORT` arrays in `app.js`

---

## 🐛 Troubleshooting

### "Supabase Setup Required!" Error
- **Cause:** The `planner_data` table doesn't exist
- **Fix:** Run `setup.sql` in your Supabase SQL Editor

### Data Not Saving
- **Check:** Verify your Supabase configuration in `supabase-config.js`
- **Check:** Ensure authentication is working (user email shows in top-right)
- **Check:** Verify RLS policies are enabled (run `setup.sql` again)

### Sign-Up/Login Not Working
- **Check:** Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- **Check:** Ensure you're using HTTPS (required for production)
- **Browser Console:** Open DevTools (F12) and check for errors

### Print/Export Issues
- **Chrome:** Works best with Print → Save as PDF
- **Safari:** Use File → Export as PDF
- **Firefox:** File → Print → Save to PDF

---

## 🌟 Key Components

### DataSync System
```javascript
// Automatically saves editable content with debouncing
DataSync.set(pageId, fieldId, value);  // Auto-saves after 800ms
DataSync.get(pageId, fieldId, fallback); // Retrieves from cache or DB
```

### Editable Fields
All text areas are fully editable with:
- Real-time updates
- HTML content preservation
- Placeholder text support
- Auto-complete capabilities

### Navigation System
- Hash-based routing for client-side navigation
- 525 pages with intelligent page numbering
- Breadcrumb trails for context

---

## 📝 License

This project is provided as-is. Feel free to modify and use for personal or commercial purposes.

---

## 🙏 Credits

**Zen Planner by JDRAO** — Designed with minimalism, productivity, and intentionality in mind.

Built with:
- Inspiration from Atomic Habits, Deep Work, and GTD methodologies
- Clean typography using Cormorant Garamond & Inter
- Minimalist design principles

---

## 🚀 Deployment Options

### GitHub Pages (Free)
1. Push repository to GitHub
2. Enable GitHub Pages in repo settings
3. Set source to `main` branch

### Vercel (Free)
1. Import repository on [vercel.com](https://vercel.com)
2. Deploy with one click
3. No configuration needed

### Netlify (Free)
1. Connect repository on [netlify.com](https://netlify.com)
2. Auto-deploys on git push
3. Includes free SSL

### Self-Hosted
- Copy files to any web server
- Ensure HTTPS is enabled for Supabase authentication

---

## 📧 Support & Feedback

Have questions or suggestions? Found a bug? Feel free to:
- Open an issue in the repository
- Check existing issues for solutions
- Share your planner setup and customizations

---

**Happy Planning! 🌿✨**
