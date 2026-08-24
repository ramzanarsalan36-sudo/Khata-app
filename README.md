# Digital Udhar Khata — Production-Grade Multi-Shop Business Ledger

A modern, production-grade, mobile-first **Digital Udhar Khata & Business Ledger Web App** built with **Next.js 14 App Router (JavaScript/JSX)** and **Supabase (PostgreSQL, RLS, Storage, Auth, and Atomic Stored Procedures)**.

Designed primarily for Indian local retail shops, optimized for mobile smartphones with large touch targets, fast numeric entry, receipt image compression, WhatsApp shareable receipts and payment reminders, and full multi-tenant isolation.

---

## 🚀 Key Features

* **Multi-Tenant Architecture**: One Supabase project safely powers multiple shops with role-based access control (`owner`, `manager`, `staff`).
* **Atomic Balance Calculations**: Financial balances are calculated and updated strictly inside PostgreSQL stored procedures (`create_transaction` and `soft_delete_transaction`) with row locks, preventing race conditions.
* **Double-Tap Idempotency**: Unique `client_transaction_id` generated per mutation prevents accidental duplicate charges during network retries or double clicks.
* **Strict Balance Convention**:
  * `Positive Balance` = **Udhaar / GAVE (Diya)** — Red badge (Customer owes shop)
  * `Negative Balance` = **Advance / GOT (Liya)** — Green badge (Shop owes customer)
  * `Zero Balance` = **Settled** — Gray badge (Hisab barabar)
* **Receipt Capture with Client Compression**: Receipts are compressed client-side using `browser-image-compression` to ~50-150KB before uploading to private Supabase Storage (`bill-receipts` bucket) with signed URL generation.
* **WhatsApp Integration**: Instant `wa.me` links for bilingual (Hindi/English) transaction receipts and customized payment reminders.
* **CSV Statement & Ledger Exports**: Generate and download Customer Statement CSVs, Customers List CSVs, and Full Ledger History CSVs.
* **Offline Indicator & PWA**: Mobile standalone manifest and real-time network connectivity detection.
* **Database Keep-Alive**: GitHub Actions workflow to periodically ping the database and maintain active status.

---

## 📁 Project Structure

```text
new_project/
├── .github/
│   └── workflows/
│       └── keepalive.yml               # Supabase database keep-alive workflow
├── public/
│   ├── manifest.json                   # PWA Manifest configuration
│   └── icons/
│       └── icon.svg                    # App icons
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql      # Tables (shops, members, customers, tx, audit)
│       ├── 002_indexes.sql             # Performance indexes
│       ├── 003_rls_policies.sql        # Non-recursive Row Level Security policies
│       ├── 004_functions.sql           # Atomic RPC functions (create/delete transactions)
│       └── 005_storage.sql             # Private storage bucket & access policies
├── src/
│   ├── app/
│   │   ├── layout.jsx                  # Root Layout with fonts & ShopProvider
│   │   ├── page.jsx                    # Root redirect to /dashboard
│   │   ├── globals.css                 # Tailwind CSS & Mobile container layout
│   │   ├── login/
│   │   │   └── page.jsx                # Phone OTP & Email/Password login
│   │   ├── dashboard/
│   │   │   ├── layout.jsx              # Dashboard shell with Navbar & Onboarding
│   │   │   ├── page.jsx                # Summary cards & Customer ledger list
│   │   │   └── customer/
│   │   │       └── [id]/
│   │   │           └── page.jsx        # Customer detail, ledger timeline & actions
│   │   └── settings/
│   │       └── page.jsx                # Shop profile, CSV exports & logout
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx              # Shop switcher & role badge
│   │   │   ├── BottomNav.jsx           # Mobile bottom navigation
│   │   │   ├── OfflineIndicator.jsx    # Real-time offline alert banner
│   │   │   └── LoadingSpinner.jsx      # Animated loading spinner
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.jsx        # Total Udhaar & Advance summary
│   │   │   ├── CustomerList.jsx        # Debounced search, filters & cards
│   │   │   ├── AddCustomerModal.jsx    # Add customer with opening balance
│   │   │   └── CreateShopModal.jsx     # Multi-shop creation wizard
│   │   ├── customer/
│   │   │   ├── CustomerHeader.jsx      # Balance banner, Call, WA & Reminder
│   │   │   ├── LedgerTimeline.jsx      # Grouped transactions & soft-delete
│   │   │   ├── TransactionModal.jsx    # GAVE/GOT keypad modal & photo compression
│   │   │   ├── WhatsAppReceiptModal.jsx# Post-transaction WhatsApp receipt popup
│   │   │   ├── ReminderModal.jsx       # Customizable payment reminder
│   │   │   └── ReceiptViewerModal.jsx  # Fullscreen signed receipt image viewer
│   │   └── settings/
│   │       ├── ShopProfileForm.jsx     # Edit shop details
│   │       └── ExportSection.jsx       # Download CSV statements & ledger
│   ├── lib/
│   │   ├── context/
│   │   │   └── ShopContext.jsx         # Multi-shop state & active shop context
│   │   ├── supabase/
│   │   │   ├── client.js               # Browser client (@supabase/ssr)
│   │   │   ├── server.js               # Server component client (@supabase/ssr)
│   │   │   └── middleware.js           # SSR Session refresh helper
│   │   └── utils/
│   │       ├── cn.js                   # ClassName merger
│   │       ├── currency.js             # INR formatting & status helper
│   │       ├── phone.js                # Indian phone normalization (+91)
│   │       ├── whatsapp.js             # wa.me receipt & reminder URL generator
│   │       ├── csv.js                  # CSV exporter & statement generator
│   │       └── imageCompression.js     # Client image compression (<150KB)
│   └── middleware.js                   # Route protection (/dashboard, /settings)
├── .env.local                          # Supabase environment variables
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 🛠️ Environment Configuration

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📦 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run Database Migrations
All migrations are located in `supabase/migrations/` and have been applied to your connected Supabase PostgreSQL instance:
* `001_initial_schema.sql`
* `002_indexes.sql`
* `003_rls_policies.sql`
* `004_functions.sql`
* `005_storage.sql`

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile device or browser with mobile responsive view enabled.

---

## 🔒 Security Checklist

- [x] **Strict Row Level Security (RLS)**: Enabled across `shops`, `shop_members`, `customers`, `transactions`, and `audit_logs`.
- [x] **Multi-Tenant Isolation**: Membership verification helper (`is_shop_member()`) executes with `SECURITY DEFINER` and `search_path = public`, preventing recursion and isolating shop data.
- [x] **Private Storage Vault**: `bill-receipts` bucket is private (`public = false`) and accessible solely via signed URLs generated for authenticated shop members.
- [x] **Atomic Financial RPC**: Mutations bypass client-side arithmetic; transactions and customer balances are mutated in a single database transaction.
- [x] **Double-Tap Protection**: `client_transaction_id` unique constraint guarantees idempotency under network retries.
- [x] **Role-Based Authorization**: Deletion of transactions and editing of shop settings restricted to `owner` and `manager` roles.
- [x] **No Service-Role Leakage**: Client code operates exclusively with publishable keys; service-role keys are never exposed.

---

## 🧪 Verification & Testing Checklist

- [x] **Authentication**: `/login` route handles Email/Password & Phone OTP with session refresh.
- [x] **Route Protection**: Middleware redirects unauthenticated visits from `/dashboard` or `/settings` to `/login`.
- [x] **Shop Onboarding**: Auto-detects users without shops and displays shop setup wizard.
- [x] **Customer Addition**: Validates name, normalizes Indian phone numbers, and records optional opening balance.
- [x] **GAVE (Diya) Entry**: Adds debit amount, increases customer balance (+), records audit log.
- [x] **GOT (Liya) Entry**: Adds credit amount, decreases customer balance (-), records audit log.
- [x] **Receipt Compression**: Compresses photos on device before uploading to storage.
- [x] **WhatsApp Receipt & Reminder**: Encodes formatted messages with Indian phone numbers (`wa.me/91XXXXXXXXXX`).
- [x] **Soft Delete**: Marks transaction deleted, rolls back balance calculation, and logs audit record.
- [x] **CSV Statements**: Exports verified customer statements and shop ledger.
