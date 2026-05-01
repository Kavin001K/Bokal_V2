# MahalBook — Replit AI Build Prompt

> **Instructions for use:** Copy this entire prompt and paste it into Replit AI. Replit AI will use this to scaffold, build, and wire up the complete MahalBook application. This prompt is self-contained and comprehensive.

---

## MASTER BUILD PROMPT

You are building **MahalBook** — a complete internal mobile-friendly booking management web application for a venue business in Tamil Nadu, India. The business has **1 Mahal (large event hall)** and **3 AC Rooms** that employees book for customers.

Build a **full-stack web application** (React frontend + Node.js/Express backend + PostgreSQL database) that works as a **mobile-first PWA** (Progressive Web App). Use a mobile-first responsive design so it works perfectly on employee phones via browser without needing an app store installation.

---

## TECH STACK TO USE

**Frontend:** React 18 + Vite + React Router v6 + Zustand (state) + React Hook Form + Axios + Tailwind CSS + Lucide React (icons)  
**Backend:** Node.js + Express.js + Prisma ORM + JWT authentication + Multer (file upload) + pdf-lib (PDF generation) + bcryptjs + node-cron  
**Database:** PostgreSQL (use Replit's built-in PostgreSQL or connect to Supabase)  
**File Storage:** Local filesystem in `/uploads/` folder  
**PDF:** pdf-lib for generation, merge booking PDF with admin-uploaded rules PDF

Set up both frontend and backend in the **same Replit project** using a monorepo structure:
```
/
├── backend/     (Node.js Express API on port 3001)
├── frontend/    (React Vite on port 5173)
└── package.json (root scripts to run both)
```

---

## DESIGN SYSTEM — IMPLEMENT EXACTLY

Use these CSS custom properties in your global CSS:

```css
:root {
  --primary: #C75B2A;
  --primary-light: #F4A261;
  --primary-dark: #A04520;
  --bg-base: #FDF8F3;
  --bg-card: #FFFFFF;
  --text-primary: #1A1209;
  --text-secondary: #6B5744;
  --text-muted: #A89080;
  --success: #2A9D5C;
  --warning: #E9C46A;
  --danger: #E63946;
  --border: #E8DDD4;
  --shadow-card: 0px 4px 16px rgba(199,91,42,0.08), 0px 1px 4px rgba(0,0,0,0.04);
  --shadow-btn: 0px 6px 20px rgba(199,91,42,0.30);
  --radius-card: 16px;
  --radius-input: 12px;
  --radius-btn: 14px;
}
```

**Fonts:** Import from Google Fonts:
- `Playfair Display` — headings and app title
- `Poppins` — body text, labels, buttons
- `Noto Sans Tamil` — Tamil text

**App background:** always `var(--bg-base)` (#FDF8F3 — warm off-white)

**Design aesthetic:** Warm, professional, Tamil Nadu-inspired. Think terracotta and off-white, like a premium South Indian business. NOT generic corporate blue. Cards with soft shadows. Rounded inputs. Everything feels premium but approachable.

---

## COMPLETE FEATURE LIST — BUILD ALL OF THESE

### AUTHENTICATION SYSTEM

Create a login screen that is the first thing users see. No registration — admin creates accounts.

**Login Screen layout:**
- Warm gradient background: linear-gradient(160deg, #FDF8F3 0%, #F5E6D8 100%)
- Centered card (max-width 420px on desktop, full-width on mobile)
- App logo area: large "🏛️" emoji + "MahalBook" in Playfair Display 32px
- Tagline: "Venue Booking Made Simple" in English, below: "இடம் பதிவு எளிமையாக" in Noto Sans Tamil
- Phone number input field (used as username)
- Password input with show/hide toggle
- Login button: gradient background (#C75B2A to #E07340), full width, 56px height, shadow
- Error message in red below button on failed login
- Version number at bottom: "v1.0"

**JWT Auth:**
- On login: validate phone + password, return JWT token (24hr expiry)
- Store JWT in localStorage (key: 'mahalbook_token')
- On every API request: send as `Authorization: Bearer <token>` header
- If token expired: redirect to login
- Role stored in JWT payload: `{ userId, phone, name, role: 'admin' | 'employee' }`

**Seed the database with an initial admin account:**
```
Phone: 9999999999
Password: Admin@123
Role: admin
Name: Admin
```

---

### NAVIGATION — BOTTOM TAB BAR (Mobile Style)

After login, show a fixed bottom tab bar with these tabs:

```
🏠 Home | 📋 New Booking | ⚙️ Settings | 📊 Reports
```

- Home and New Booking: visible to ALL users (employee + admin)
- Settings and Reports: visible ONLY to admin
- If employee visits /settings or /reports URL: redirect to /home with "Access Denied" toast

Bottom tab bar styles:
- Fixed to bottom, 100% width
- Height: 64px
- Background: white
- Box shadow: 0 -2px 12px rgba(0,0,0,0.08)
- Active tab: icon and label in `--primary` color, icon filled
- Inactive tab: icon and label in `--text-muted`
- Labels: Poppins 11px below icon

Also show a **top header bar** on each screen:
- Screen title (left) in Playfair Display
- User avatar circle (right) showing initials, tap → profile dropdown (Change Password, Logout)

---

### SCREEN 1: HOME SCREEN (/home)

**Top Section — Greeting Card:**
```
Good Morning, Ravi 👋
Today: Wednesday, May 1, 2026
       சித்திரை 19, 2083
```
- Time-based greeting: Good Morning / Good Afternoon / Good Evening
- Both English and Tamil dates shown (auto-computed)
- Background: gradient card, --primary color

**Stats Strip (horizontal scroll on mobile):**
4 stat cards in a row (scroll horizontally on small screens):
1. "Today's Bookings" — number
2. "Mahal" — "Available" (green) or "Booked" (red) based on today
3. "Rooms Free" — "X / 3" showing how many rooms are free today
4. "This Month Revenue" — ₹XX,XXX (admin only; show nothing for employees here)

**Booking List Sections:**

Organize bookings into sections: "Today", "Tomorrow", "This Week", "Upcoming", "Past"

Each booking shown as a **BookingCard** component:
```
┌─ left colored border (4px) ──────────────────────────┐
│  🏛️ Mahal + 🏨 AC Room 1          ● Confirmed       │
│  Kavin Kumar                                          │
│  📅 May 1, 2026 | சித்திரை 19                       │
│  🕐 10:00 AM → 4:00 PM (6 hrs)                      │
│  📞 +91 98765 43210                                  │
│                                        ₹ 15,000      │
└───────────────────────────────────────────────────────┘
```

Left border color:
- Confirmed (future): `--warning` (yellow/orange)
- Completed (past): `--success` (green)  
- Cancelled: `--danger` (red)
- Today: `--primary`

Status badge top-right: pill with matching color

Tap any booking card → navigate to Booking Detail page (/booking/:id)

**Empty state:** 
- Illustration: 📅 large emoji centered
- Text: "No upcoming bookings"
- Button: "Create First Booking" → navigates to New Booking

**FAB button:** Fixed bottom-right circle button (+), --primary colored, 60px, navigates to /new-booking. Don't show when on /new-booking tab.

**Search bar:** At top below greeting card, search by customer name or phone number, filters the booking list in real-time.

**Availability toggle:** Button "📅 Calendar View" → shows a simple month calendar where each date cell is color-coded: green (available), yellow (partial), red (full). Clicking a date filters bookings to that date.

---

### SCREEN 2: BOOKING DETAIL PAGE (/booking/:id)

Show all booking details:
- Booking Ref number (large, styled: MBK-2026-0042)
- Status badge
- Customer name (large)
- All phone numbers (each as a tappable `tel:` link — tap to call)
- Address
- ID proof: thumbnail image, tap to open full-screen
- English date (large) + Tamil date (below, smaller, muted)
- Time: Start → End (Duration in hours)
- Venues booked (with icons)
- Price breakdown table
- Total amount (large)
- "Booked by: [employee name]" + timestamp
- Notes

**Action buttons at bottom:**
1. "📄 Download PDF" — primary button — calls GET /api/bookings/:id/pdf
2. "📱 Share via WhatsApp" — opens WhatsApp with pre-filled message
3. "✏️ Edit Booking" — opens edit form (only if status is 'confirmed' and date is future)
4. "❌ Cancel Booking" — shows confirmation dialog, requires reason text

**WhatsApp message template:**
```
Booking Confirmation - MahalBook
Booking Ref: MBK-2026-0042
Customer: Kavin Kumar
Date: May 1, 2026 (சித்திரை 19, 2083)
Time: 10:00 AM - 4:00 PM
Venue: Mahal, AC Room 1
Amount: ₹15,000
Thank you for choosing us!
```

---

### SCREEN 3: NEW BOOKING SCREEN (/new-booking)

Build this as a multi-step form with a step progress indicator at top.

**Step indicator:**
```
① Customer Details → ② Date & Time → ③ Venue & Price → ④ Review
```
Show current step highlighted in --primary. Allow going back between steps.

---

**STEP 1: Customer Details**

Fields:

**Customer Name** (required)
- Text input, full width
- Placeholder: "Enter customer name"
- Label floats to top on focus (animated)

**Phone Numbers** (1 required, up to 5)
- First field is required, labeled "Primary Phone"
- "+ Add Phone Number" button below — appears up to 4 more times (max 5 fields)
- Each extra field has a red "×" button to remove it
- Each field: number input with +91 prefix shown
- Placeholder: "98765 43210"

**Address** (optional)
- Multi-line textarea, 3 rows
- Placeholder: "Enter customer address"

**ID Proof Upload** (optional)
- Big upload button: dashed border, center icon and "Upload ID Proof"
- Accepts: JPG, PNG, PDF (max 5MB)
- After upload: shows file thumbnail or filename with a "×" to remove
- On mobile: shows option for Camera or Gallery (use input accept="image/*,application/pdf" with capture option)

**"Next Step →" button** (validates required fields before proceeding)

---

**STEP 2: Date & Time Selection**

**Dual Date Selector:**

At top: a toggle switch / pill toggle:
```
[ English 🇬🇧 ] | [ தமிழ் ☀️ ]
```

**When "English" is selected:**
- Show a calendar grid (month view, custom built with React)
- Days of week: Sun Mon Tue Wed Thu Fri Sat
- Current month shown, arrows to navigate months
- Past dates are grayed out (not selectable)
- On date select: auto-compute and display Tamil equivalent below
- Tamil date shown: "📅 Selected: சித்திரை 19, 2083 (Chithirai)"

**When "தமிழ்" is selected:**
- Show 3 dropdowns: Tamil Month | Tamil Date | Tamil Year
- Tamil Months dropdown: சித்திரை, வைகாசி, ஆனி, ஆடி, ஆவணி, புரட்டாசி, ஐப்பசி, கார்த்திகை, மார்கழி, தை, மாசி, பங்குனி
- Tamil Date: 1–30 (numbers in Tamil numerals: ௧, ௨, ௩... but also show Arabic numeral beside)
- Tamil Year: show current and next 3 years
- On selection: auto-compute and display corresponding English date below
- English date shown: "📅 Corresponds to: May 1, 2026 (Wednesday)"

**Tamil Calendar Lookup Table:**
Implement a JavaScript object mapping Gregorian dates to Tamil dates for years 2024-2030. Here is the logic to implement:
- Tamil new year starts around April 14 each year
- சித்திரை starts ~April 14
- Each month is approximately 30-31 days
- Use this approximate mapping and make it configurable:

```javascript
// Implement this mapping for 2024-2030 (approximate, can be refined)
const TAMIL_MONTH_START_DATES = {
  2024: { சித்திரை: "2024-04-14", வைகாசி: "2024-05-15", ஆனி: "2024-06-15", ஆடி: "2024-07-16", ஆவணி: "2024-08-17", புரட்டாசி: "2024-09-17", ஐப்பசி: "2024-10-18", கார்த்திகை: "2024-11-16", மார்கழி: "2024-12-16", தை: "2025-01-14", மாசி: "2025-02-13", பங்குனி: "2025-03-14" },
  2025: { சித்திரை: "2025-04-14", வைகாசி: "2025-05-15", ஆனி: "2025-06-15", ஆடி: "2025-07-16", ஆவணி: "2025-08-17", புரட்டாசி: "2025-09-17", ஐப்பசி: "2025-10-18", கார்த்திகை: "2025-11-16", மார்கழி: "2025-12-16", தை: "2026-01-14", மாசி: "2026-02-13", பங்குனி: "2026-03-14" },
  2026: { சித்திரை: "2026-04-14", வைகாசி: "2026-05-15", ஆனி: "2026-06-15", ஆடி: "2026-07-16", ஆவணி: "2026-08-17", புரட்டாசி: "2026-09-17", ஐப்பசி: "2026-10-18", கார்த்திகை: "2026-11-16", மார்கழி: "2026-12-16", தை: "2027-01-14", மாசி: "2027-02-13", பங்குனி: "2027-03-14" },
};

// Tamil year 2083 corresponds to Gregorian 2025-2026 (Kali year-based)
// For the purposes of this app, Tamil year = Gregorian year - some offset
// Implement: tamilYear for a given gregorianDate = if month >= April 14, it's tamilYear (gregorianYear - 57 + 1), else same calculation
// Exact formula: if gregorianDate >= April 14 of that year: tamilYear = gregorianYear - 56, else tamilYear = gregorianYear - 57

function getTamilYear(gregorianDate) {
  const year = gregorianDate.getFullYear();
  const tamilNewYear = new Date(year, 3, 14); // April 14
  return gregorianDate >= tamilNewYear ? year - 56 : year - 57;
}
```

Function `gregorianToTamil(gregorianDateString)`:
- Takes "2026-05-01"
- Returns `{ tamilDate: 19, tamilMonth: "சித்திரை", tamilYear: 2083, display: "சித்திரை 19, 2083" }`

Function `tamilToGregorian(tamilMonth, tamilDate, tamilYear)`:
- Takes "சித்திரை", 19, 2083
- Returns "2026-05-01"

**Time Selection:**

Two time pickers (Start Time and End Time):
- Styled dropdown or scroll picker
- Options: Every 30 minutes from 6:00 AM to 11:30 PM
- Format: "10:00 AM", "2:30 PM"
- Default start: 10:00 AM, Default end: 2:00 PM (4 hours later)
- Duration badge: auto-updates showing "Duration: X hours"

**Conflict Check:**
After selecting date + time + in next step when venues are selected:
- Call GET /api/bookings/availability?date=&venueId=&start=&end=
- If conflict: show red warning banner:
  ```
  ⚠️ Mahal is already booked on this date from 10:00 AM – 6:00 PM (Kavin Kumar)
  Please select a different time or venue.
  ```

---

**STEP 3: Venue & Pricing**

**Venue Selection (multi-select cards):**

Show 4 venue cards in a 2×2 grid:
```
┌─────────────────┐  ┌─────────────────┐
│  🏛️ Mahal       │  │  🏨 AC Room 1   │
│  ₹2,000/hr      │  │  ₹500/hr        │
│  [Available]    │  │  [Booked]       │
│  Tap to Select  │  │  (grayed out)   │
└─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│  🏨 AC Room 2   │  │  🏨 AC Room 3   │
│  ₹500/hr        │  │  ₹500/hr        │
│  [Available]    │  │  [Available]    │
│  Tap to Select  │  │  Tap to Select  │
└─────────────────┘  └─────────────────┘
```

Selected state: card border --primary, checkmark badge top-right, background tinted.
Unavailable (conflicted): gray with "Booked" badge, not tappable.

At least one venue must be selected to proceed.

**Pricing Section (appears for each selected venue):**

For each selected venue, show a row:
```
🏛️ Mahal
Rate per hour: [ ₹ 2,000 ] (editable input)
Duration: 6 hours (auto-calculated from step 2)  
Subtotal: ₹ 12,000 (auto-calculated, not editable)
```

If user edits the rate: show "Custom rate" badge in orange.
Subtotal = rate × duration (recalculates live).

**Total Summary Card:**
```
┌─────────────────────────────────────────┐
│ 💰 Booking Total                        │
│ ─────────────────────────────────────  │
│ Mahal (6 hrs × ₹2,000)     ₹12,000    │
│ AC Room 1 (6 hrs × ₹500)   ₹3,000     │
│ ─────────────────────────────────────  │
│ TOTAL                        ₹15,000   │
└─────────────────────────────────────────┘
```
Amount displayed in `font-variant-numeric: tabular-nums` for alignment.

**Notes field:** Optional, plain text area, "Special requirements or notes..."

---

**STEP 4: Review & Confirm**

Show a read-only summary of everything:
- Customer info section
- Date & Time section (both English and Tamil dates)
- Venues & Pricing section
- Total amount (large, bold, --primary color)

Two buttons:
- "← Edit Details" (secondary, goes back to step 1)
- "✅ Create Booking & Generate PDF" (primary, full width, big)

On clicking Create:
1. POST to /api/bookings with all data
2. Show loading state on button: spinner + "Creating booking..."
3. On success: show success animation + success card:
   ```
   ✅ Booking Created Successfully!
   Booking Ref: MBK-2026-0042
   Customer: Kavin Kumar
   Date: May 1, 2026
   Total: ₹15,000
   ```
4. Two buttons: "📄 Download PDF" and "🏠 Go to Home"
5. Automatically trigger PDF download
6. On error: show error toast with message

---

### SCREEN 4: SETTINGS SCREEN (/settings) — ADMIN ONLY

**Section 1: Venue Pricing**

Header: "💰 Venue Pricing"
For each of the 4 venues:
```
┌──────────────────────────────────────┐
│ 🏛️ Mahal                            │
│ Price per hour                       │
│ ₹ [___2000___]                      │
│ Last updated: 3 days ago by Admin    │
└──────────────────────────────────────┘
```
- Input: number, prefix ₹ symbol
- "Save Pricing" button at bottom of section
- Show success toast on save

**Section 2: Rules & Documents**

Header: "📄 Rules PDF"
```
┌──────────────────────────────────────┐
│ Current Rules PDF:                   │
│ 📎 rules_v2.pdf                      │
│    Uploaded 3 days ago               │
│                                      │
│ [ 👁️ Preview PDF ]                   │
│ [ 📤 Upload New Rules PDF ]          │
└──────────────────────────────────────┘
```
- If no PDF uploaded: show "⚠️ No rules PDF uploaded. Booking PDFs won't include rules."
- Upload button: file picker (PDF only, max 10MB)
- On upload: POST /api/settings/rules-pdf with multipart form
- Preview: opens PDF in new tab

**Section 3: App Settings**

Header: "⚙️ App Settings"
- Default booking duration: dropdown (2hr, 4hr, 6hr, 8hr)
- Session timeout: dropdown (8 hours, 24 hours, 7 days)

**Section 4: My Team (visible to admin here)**

Small link: "Manage Employees →" → opens employee management panel

---

### SCREEN 5: REPORTS SCREEN (/reports) — ADMIN ONLY

**Date Range Selector at top:**
Quick buttons: Today | This Week | This Month | Custom Range
Custom range: two date pickers (From, To)

**Summary Cards (top):**
- Total Bookings: XX
- Total Revenue: ₹XX,XXX
- Mahal Bookings: XX
- Room Bookings: XX
- Avg Booking Value: ₹X,XXX

**Revenue Bar Chart:**
Simple bar chart using a canvas or SVG (build a basic one without heavy libraries):
- X axis: dates in range
- Y axis: revenue
- Bars colored --primary
- Hover tooltip: date + amount

**Venue Utilization:**
Simple donut/pie chart or horizontal progress bars:
- Mahal: XX% utilized
- AC Room 1: XX% utilized
- AC Room 2: XX% utilized
- AC Room 3: XX% utilized

**Bookings Table:**
Sortable, filterable table of all bookings in selected range:
Columns: Ref | Customer | Date | Venues | Amount | Status | Created By
- Clickable rows → booking detail
- Filter by status, venue, employee

**Export Buttons:**
- "📥 Export CSV" — generates CSV of bookings table and downloads
- "📄 Export PDF Report" — calls API to generate a summary PDF report

---

### EMPLOYEE MANAGEMENT (accessible via Reports or Settings)

Show as a modal/slide-up panel:

**Employee List:**
Each employee card:
```
[RK] Ravi Kumar         Employee   ● Active
     Phone: 9876543210
     Joined: Jan 2026
     [Edit] [Deactivate]
```

Avatar: circle with initials, --primary background, white text.

**Add New Employee button (top right):**
Opens a form modal:
- Full Name (required)
- Phone Number (required, becomes their login username)
- Temporary Password (required, min 8 chars)
- Role: Employee | Admin (toggle)
- "Create Employee" button

On creation:
- POST /api/users with the data
- Employee can now login; they will be forced to change password on first login

**Change Password:**
- "⚠️ First Login" banner shown if `mustChangePassword = true` in token
- Forces user to change password before accessing any other screen
- Old password not required for first-time change

---

### MY PROFILE (all users)

Accessible via user avatar tap in header:

Dropdown menu:
- 👤 Profile (shows name, role, phone)
- 🔑 Change Password → opens modal with: Current Password, New Password, Confirm Password
- 🚪 Logout → clears localStorage token, redirects to login

---

## BACKEND — BUILD THESE EXACT API ENDPOINTS

### Database Setup (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  fullName      String
  phone         String   @unique
  passwordHash  String
  role          String   // 'admin' | 'employee'
  isActive      Boolean  @default(true)
  mustChangePw  Boolean  @default(false)
  createdById   String?
  createdAt     DateTime @default(now())
  lastLogin     DateTime?
  bookings      Booking[]
  auditLogs     AuditLog[]
}

model Venue {
  id            String   @id @default(cuid())
  name          String
  type          String   // 'mahal' | 'room'
  pricePerHour  Decimal  @default(0)
  isActive      Boolean  @default(true)
  displayOrder  Int      @default(0)
  bookingVenues BookingVenue[]
}

model Booking {
  id              String   @id @default(cuid())
  bookingRef      String   @unique
  customerName    String
  phoneNumbers    String[]
  address         String?
  idProofUrl      String?
  bookingDate     DateTime
  tamilDateLabel  String?
  startTime       String   // "10:00"
  endTime         String   // "16:00"
  durationHours   Decimal
  totalAmount     Decimal
  notes           String?
  status          String   @default("confirmed") // 'confirmed'|'cancelled'|'completed'
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  cancelledAt     DateTime?
  cancelledById   String?
  cancelReason    String?
  createdBy       User     @relation(fields: [createdById], references: [id])
  bookingVenues   BookingVenue[]
}

model BookingVenue {
  id           String  @id @default(cuid())
  bookingId    String
  venueId      String
  pricePerHour Decimal
  subtotal     Decimal
  booking      Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  venue        Venue   @relation(fields: [venueId], references: [id])
}

model Setting {
  id         String   @id @default(cuid())
  key        String   @unique
  value      String
  updatedAt  DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String
  entityType String?
  entityId   String?
  details    Json?
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}
```

### Seed Data

Create a seed script that inserts:
```javascript
// Initial venues
await prisma.venue.createMany({ data: [
  { name: "Mahal", type: "mahal", pricePerHour: 2000, displayOrder: 1 },
  { name: "AC Room 1", type: "room", pricePerHour: 500, displayOrder: 2 },
  { name: "AC Room 2", type: "room", pricePerHour: 500, displayOrder: 3 },
  { name: "AC Room 3", type: "room", pricePerHour: 500, displayOrder: 4 },
]});

// Initial admin
const hash = await bcrypt.hash("Admin@123", 12);
await prisma.user.create({ data: {
  fullName: "Admin",
  phone: "9999999999",
  passwordHash: hash,
  role: "admin"
}});

// Settings
await prisma.setting.createMany({ data: [
  { key: "rules_pdf_path", value: "" },
  { key: "default_duration_hours", value: "4" },
  { key: "session_timeout_hours", value: "24" },
]});
```

### API Routes — Implement All of These

**POST /api/auth/login**
- Accepts: `{ phone, password }`
- Returns: `{ token, user: { id, name, role, mustChangePw } }`
- Validates phone + password, returns JWT

**POST /api/auth/change-password**
- Authenticated
- Accepts: `{ currentPassword, newPassword }`
- Updates password hash, sets mustChangePw to false

**POST /api/auth/reset-password/:userId**
- Admin only
- Sets new password for any user

---

**GET /api/bookings**
- Authenticated
- Query params: `?date=2026-05-01&status=confirmed&venueId=&search=&from=&to=&page=1&limit=20`
- Returns paginated list of bookings with venue info included
- Include: createdBy name, venue names

**GET /api/bookings/:id**
- Authenticated
- Returns full booking detail with venues, employee who created it

**POST /api/bookings**
- Authenticated
- Accepts:
  ```json
  {
    "customerName": "Kavin Kumar",
    "phoneNumbers": ["+919876543210", "+919876511111"],
    "address": "12 Main Street",
    "idProofUrl": "/uploads/id-proofs/filename.jpg",
    "bookingDate": "2026-05-01",
    "tamilDateLabel": "சித்திரை 19, 2083",
    "startTime": "10:00",
    "endTime": "16:00",
    "venues": [
      { "venueId": "...", "pricePerHour": 2000 },
      { "venueId": "...", "pricePerHour": 500 }
    ],
    "notes": "Birthday event"
  }
  ```
- Server calculates: durationHours, subtotals, totalAmount
- Server generates bookingRef (MBK-YYYY-NNNN format)
- Check conflicts before creating (return 409 if conflict)
- Log to audit_logs
- Returns created booking

**PUT /api/bookings/:id**
- Authenticated
- Update booking details (same fields)
- Re-check conflicts

**DELETE /api/bookings/:id**
- Authenticated
- Body: `{ reason: "Customer requested" }`
- Sets status to 'cancelled', logs cancel reason and who cancelled

**GET /api/bookings/:id/pdf**
- Authenticated
- Generates booking PDF using pdf-lib
- If rules PDF exists in settings: append its pages
- Returns PDF as binary stream with headers:
  `Content-Type: application/pdf`
  `Content-Disposition: attachment; filename="Kavin Kumar Booking Mahal May 1 2026.pdf"`

**GET /api/bookings/availability**
- Authenticated
- Query: `?venueId=&date=2026-05-01&startTime=10:00&endTime=16:00&excludeBookingId=`
- Returns: `{ available: true }` or `{ available: false, conflict: { bookingRef, customerName, startTime, endTime } }`

---

**GET /api/venues**
- Authenticated
- Returns all active venues with current prices

**PUT /api/venues/:id/price**
- Admin only
- Accepts: `{ pricePerHour: 2500 }`
- Updates venue price

---

**GET /api/settings**
- Admin only
- Returns all settings as object

**PUT /api/settings**
- Admin only
- Accepts: `{ key: value }` pairs
- Updates settings

**POST /api/settings/rules-pdf**
- Admin only
- Multipart form upload
- Saves file to /uploads/rules/, updates setting 'rules_pdf_path'

**GET /api/settings/rules-pdf**
- Admin only
- Returns current rules PDF as stream

---

**GET /api/users**
- Admin only
- Returns list of all users (no password hashes)

**POST /api/users**
- Admin only
- Creates new user with temp password
- Sets mustChangePw: true

**PUT /api/users/:id**
- Admin only
- Update name, role, isActive

---

**GET /api/reports/summary**
- Admin only
- Query: `?from=2026-05-01&to=2026-05-31`
- Returns: `{ totalBookings, totalRevenue, byVenue: [...], byDay: [...], byEmployee: [...] }`

**GET /api/reports/export**
- Admin only
- Query: `?from=&to=&format=csv`
- Returns CSV of bookings

---

**POST /api/upload/id-proof**
- Authenticated
- Multer single file upload
- Accepts: image/jpeg, image/png, application/pdf (max 5MB)
- Returns: `{ url: "/uploads/id-proofs/filename.jpg" }`

---

### PDF GENERATION — IMPLEMENT WITH pdf-lib

Install: `npm install pdf-lib @pdf-lib/fontkit`

In `backend/src/services/pdfService.js`:

```javascript
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

async function generateBookingPDF(booking) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  
  // Embed standard fonts (use Helvetica for English text)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Try to embed Noto Sans Tamil for Tamil text
  // If Tamil font file available at /fonts/NotoSansTamil.ttf:
  // const tamilFontBytes = fs.readFileSync('/fonts/NotoSansTamil.ttf');
  // const tamilFont = await pdfDoc.embedFont(tamilFontBytes);
  
  // Colors
  const primaryColor = rgb(0.78, 0.36, 0.16); // #C75B2A
  const textColor = rgb(0.10, 0.07, 0.04);    // #1A1209
  const mutedColor = rgb(0.42, 0.34, 0.27);   // #6B5744
  const borderColor = rgb(0.91, 0.87, 0.83);  // #E8DDD4
  
  let y = height - 40;
  
  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: primaryColor });
  
  // Title
  page.drawText('MAHALBOOK', { x: 40, y: height - 35, size: 22, font: boldFont, color: rgb(1,1,1) });
  page.drawText('BOOKING CONFIRMATION', { x: 40, y: height - 58, size: 10, font: regularFont, color: rgb(1,0.9,0.85) });
  
  // Booking Ref (right side of header)
  const ref = `Ref: ${booking.bookingRef}`;
  page.drawText(ref, { x: width - 200, y: height - 40, size: 11, font: boldFont, color: rgb(1,1,1) });
  
  y = height - 110;
  
  // Section helper function
  const drawSection = (title, yStart) => {
    page.drawText(title, { x: 40, y: yStart, size: 10, font: boldFont, color: primaryColor });
    page.drawLine({ start: { x: 40, y: yStart - 4 }, end: { x: width - 40, y: yStart - 4 }, thickness: 0.5, color: borderColor });
    return yStart - 20;
  };
  
  const drawRow = (label, value, yPos) => {
    page.drawText(label, { x: 40, y: yPos, size: 9, font: regularFont, color: mutedColor });
    page.drawText(value || '-', { x: 180, y: yPos, size: 9, font: regularFont, color: textColor });
    return yPos - 18;
  };
  
  // Customer Details
  y = drawSection('CUSTOMER DETAILS', y);
  y = drawRow('Customer Name', booking.customerName, y);
  booking.phoneNumbers.forEach((phone, i) => {
    y = drawRow(i === 0 ? 'Phone Number' : '', phone, y);
  });
  y = drawRow('Address', booking.address || 'N/A', y);
  y -= 10;
  
  // Booking Details
  y = drawSection('BOOKING DETAILS', y);
  const dateObj = new Date(booking.bookingDate);
  const englishDate = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  y = drawRow('Date (English)', englishDate, y);
  y = drawRow('Date (Tamil)', booking.tamilDateLabel || '-', y);
  y = drawRow('Time', `${booking.startTime} – ${booking.endTime}`, y);
  y = drawRow('Duration', `${booking.durationHours} hours`, y);
  y -= 10;
  
  // Venues & Pricing
  y = drawSection('VENUE & PRICING', y);
  let total = 0;
  booking.bookingVenues.forEach(bv => {
    const label = `${bv.venue.name} (${booking.durationHours} hrs × ₹${bv.pricePerHour}/hr)`;
    const amount = `Rs. ${bv.subtotal.toLocaleString('en-IN')}`;
    page.drawText(label, { x: 40, y, size: 9, font: regularFont, color: textColor });
    page.drawText(amount, { x: width - 140, y, size: 9, font: regularFont, color: textColor });
    y -= 18;
    total += Number(bv.subtotal);
  });
  
  // Total line
  page.drawLine({ start: { x: 40, y: y + 5 }, end: { x: width - 40, y: y + 5 }, thickness: 0.5, color: borderColor });
  y -= 5;
  page.drawText('TOTAL AMOUNT', { x: 40, y, size: 11, font: boldFont, color: textColor });
  page.drawText(`Rs. ${total.toLocaleString('en-IN')}`, { x: width - 160, y, size: 13, font: boldFont, color: primaryColor });
  y -= 30;
  
  // Notes
  if (booking.notes) {
    y = drawSection('NOTES', y);
    page.drawText(booking.notes, { x: 40, y, size: 9, font: regularFont, color: textColor });
    y -= 30;
  }
  
  // Footer
  y = 60;
  page.drawLine({ start: { x: 40, y: y + 20 }, end: { x: width - 40, y: y + 20 }, thickness: 0.5, color: borderColor });
  page.drawText(`Booked by: ${booking.createdBy.fullName}  |  Created: ${new Date(booking.createdAt).toLocaleString('en-IN')}`, { x: 40, y: y + 8, size: 8, font: regularFont, color: mutedColor });
  page.drawText('Thank you for choosing our venue. Please present this confirmation on the day of the event.', { x: 40, y, size: 8, font: regularFont, color: mutedColor });
  
  // Signature area
  page.drawLine({ start: { x: 40, y: 40 }, end: { x: 200, y: 40 }, thickness: 0.5, color: borderColor });
  page.drawText('Customer Signature', { x: 60, y: 28, size: 8, font: regularFont, color: mutedColor });
  page.drawLine({ start: { x: width - 200, y: 40 }, end: { x: width - 40, y: 40 }, thickness: 0.5, color: borderColor });
  page.drawText('Authorized Signature & Stamp', { x: width - 195, y: 28, size: 8, font: regularFont, color: mutedColor });
  
  // Now merge with rules PDF if it exists
  const rulesPdfPath = await getRulesPdfPath(); // function to fetch from settings
  if (rulesPdfPath && fs.existsSync(rulesPdfPath)) {
    const rulesPdfBytes = fs.readFileSync(rulesPdfPath);
    const rulesPdf = await PDFDocument.load(rulesPdfBytes);
    const rulesPages = await pdfDoc.copyPages(rulesPdf, rulesPdf.getPageIndices());
    rulesPages.forEach(p => pdfDoc.addPage(p));
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { generateBookingPDF };
```

**PDF filename sanitization:**
```javascript
function getBookingPDFFilename(booking) {
  const venueName = booking.bookingVenues.map(bv => bv.venue.name).join(' ');
  const date = new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const name = `${booking.customerName} Booking ${venueName} ${date}.pdf`
    .replace(/[^a-zA-Z0-9 ._-]/g, '')
    .replace(/\s+/g, '_');
  return name;
}
```

---

### BOOKING REFERENCE NUMBER GENERATION

```javascript
async function generateBookingRef() {
  const year = new Date().getFullYear();
  const prefix = `MBK-${year}-`;
  const lastBooking = await prisma.booking.findFirst({
    where: { bookingRef: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' }
  });
  const lastNum = lastBooking 
    ? parseInt(lastBooking.bookingRef.split('-')[2]) 
    : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
}
```

---

### AUTO-COMPLETE BOOKINGS CRON JOB

```javascript
const cron = require('node-cron');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59);
  
  await prisma.booking.updateMany({
    where: {
      status: 'confirmed',
      bookingDate: { lt: yesterday }
    },
    data: { status: 'completed' }
  });
  console.log('Auto-completed past bookings');
});
```

---

## ADDITIONAL SMART FEATURES TO IMPLEMENT

### 1. Repeat Booking
On booking detail page: "🔄 Repeat This Booking" button.
Clicking it navigates to New Booking form with all customer details pre-filled.
Date is reset (empty). Employee just needs to select new date and confirm.

### 2. Customer Search in Booking Form
At top of Step 1 in the booking form: a search input "🔍 Search existing customer..."
As user types name or phone: GET /api/customers/search?q=kavin
Returns list of past customers (from previous bookings).
Click a customer → auto-fills Name, Phones, Address.

Create GET /api/customers/search endpoint:
```javascript
// Returns distinct customer data from bookings table
const customers = await prisma.booking.findMany({
  where: {
    OR: [
      { customerName: { contains: q, mode: 'insensitive' } },
      { phoneNumbers: { has: q } }
    ]
  },
  select: { customerName: true, phoneNumbers: true, address: true },
  distinct: ['customerName'],
  take: 10
});
```

### 3. WhatsApp Share
After creating a booking, a "📱 Share via WhatsApp" button.
Build URL: `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`
Opens in new tab / deep links to WhatsApp.

### 4. CSV Export for Reports
GET /api/reports/export?from=&to=&format=csv

Build CSV manually in backend:
```javascript
const rows = bookings.map(b => ({
  'Booking Ref': b.bookingRef,
  'Customer': b.customerName,
  'Phone': b.phoneNumbers[0],
  'Date': b.bookingDate.toISOString().split('T')[0],
  'Tamil Date': b.tamilDateLabel,
  'Start': b.startTime,
  'End': b.endTime,
  'Venues': b.bookingVenues.map(bv => bv.venue.name).join('; '),
  'Total (₹)': b.totalAmount.toString(),
  'Status': b.status,
  'Created By': b.createdBy.fullName
}));

const csv = [
  Object.keys(rows[0]).join(','),
  ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))
].join('\n');

res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', `attachment; filename="MahalBook_Report_${from}_to_${to}.csv"`);
res.send(csv);
```

### 5. Availability Calendar View (Home Screen)
In home screen, add a tab toggle: "📋 List" | "📅 Calendar"

Calendar view: render a month grid where each date cell shows:
- Green: no bookings
- Yellow: 1-2 bookings  
- Orange: 3+ bookings
- Red: fully booked (Mahal AND all 3 rooms booked for full day)

Clicking a date shows a bottom sheet with bookings for that date.

### 6. Today's Quick Stats Toast
When user opens the app (Home mounts): show a small banner at top if there are bookings today:
"📅 3 bookings today | Next: 10:00 AM - Kavin Kumar (Mahal)"
Dismissable with X.

### 7. Offline Draft
If booking form submission fails (network error): save form data to localStorage as draft.
Show a banner on home screen: "⚠️ 1 draft booking pending sync"
When clicked: restore form with draft data and retry.

---

## FRONTEND COMPONENT SPECIFICATIONS

### BookingCard Component

```jsx
// Props: booking object, onClick handler
// Shows: venue icons, customer name, date (both Tamil + English), time, amount, status badge
// Left border: colored by status
// Entire card is tappable
// Has a subtle press animation (scale 0.98 on press)
```

### DualDatePicker Component

```jsx
// Props: value (English date string), onChange (receives both dates)
// Internal toggle state: 'english' | 'tamil'
// When toggle changes: convert current value to other format and keep selection
// Emits: { englishDate: "2026-05-01", tamilDate: { month: "சித்திரை", date: 19, year: 2083, display: "சித்திரை 19, 2083" } }
```

### PhoneNumberList Component

```jsx
// Props: value (array of phone strings), onChange
// Renders first phone (required) and additional phones
// Plus button: adds empty field up to max 5
// Remove button: removes that phone (min 1 remains)
// Each input: formatted as +91 prefix + 10 digit number
```

### VenueCard Component

```jsx
// Props: venue, isSelected, isDisabled, conflictInfo, onToggle
// States: default, selected (--primary border + checkmark), disabled/booked (gray)
// Shows: venue icon emoji, venue name, price per hour
// If disabled: shows "Booked" chip and conflict details on hover/long-press
```

### PricingRow Component

```jsx
// Props: venueName, icon, pricePerHour (default), durationHours, onPriceChange
// Editable price input with ₹ prefix
// Shows: "Custom" badge if price != default
// Auto-calculates subtotal: pricePerHour * durationHours
```

---

## ENVIRONMENT VARIABLES

Create `.env` in backend:
```env
DATABASE_URL=postgresql://user:pass@host:5432/mahalbook
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
PORT=3001
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
NODE_ENV=development
```

Create `.env` in frontend:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## PACKAGE.JSON SCRIPTS (Root Level)

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "start": "npm run start --prefix backend",
    "setup": "cd backend && npm install && npx prisma generate && npx prisma migrate dev && npx prisma db seed && cd ../frontend && npm install"
  }
}
```

---

## STARTUP INSTRUCTIONS FOR REPLIT

1. Run `npm run setup` to install all dependencies, run migrations, and seed initial data
2. Run `npm run dev` to start both frontend and backend
3. Frontend available at port 5173, backend at port 3001
4. Login with phone: `9999999999`, password: `Admin@123`
5. First thing: go to Settings → upload a Rules PDF
6. Then create test bookings from New Booking screen

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Tamil Calendar:** Implement the gregorianToTamil function in both frontend (for display) and return tamilDateLabel from backend on GET endpoints. Store tamilDateLabel as a string in the database.

2. **Mobile-First CSS:** All screens must look perfect on a 375px wide mobile screen. Use max-width containers on desktop. Bottom tab bar must be fixed on mobile.

3. **Touch Targets:** All buttons must be at least 44px tall. Form inputs 52-56px. This is a mobile app used by employees on phones.

4. **Loading States:** Every button that makes an API call must show a loading spinner. Never allow double-submission.

5. **Error Handling:** All API errors must show user-friendly toast messages in Tamil or English (use a toast library like react-hot-toast).

6. **Tamil Text Rendering:** Where Tamil text appears (dates, labels), use font-family: 'Noto Sans Tamil', sans-serif specifically for those elements.

7. **PDF Download on Mobile:** For mobile browsers, the PDF endpoint should return the binary with appropriate headers. Use `window.open(pdfUrl)` or create an `<a>` tag with `download` attribute pointing to the API endpoint with the JWT token as a query parameter for auth (since browser can't send custom headers for file downloads).

8. **Conflict Detection:** Check conflicts in real-time when user completes step 2 and enters step 3. Re-check on final submission too.

9. **Accessibility:** All inputs must have proper labels. All icon buttons must have aria-label. Tab focus visible.

10. **Performance:** Paginate booking list (20 per page with "Load More"). Don't fetch all bookings at once.

---

## BUILD THIS COMPLETELY — ALL SCREENS, ALL APIS, FULL DATABASE

Do not skip any section. Build the complete working application as described above. Start with:
1. Project setup and folder structure
2. Database schema and migrations
3. Backend API (all endpoints)
4. Frontend screens (all screens, in order: Login → Home → New Booking → Booking Detail → Settings → Reports)
5. PDF generation
6. Tamil date conversion utility
7. Seed data and startup scripts

The final application must be fully functional with no placeholder content.

---

*End of MahalBook Replit AI Build Prompt*
