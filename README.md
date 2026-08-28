<div align="center">
  <img width="1200" height="475" alt="StockHR Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  # 📦 StockHR — Intelligent Inventory & Decision Support System

  <p align="center">
    <strong>A high-performance, real-time inventory management and automated decision support platform powered by React 19, Vite, TailwindCSS, and Firebase.</strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Firebase-12.1-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
  </p>
</div>

---

## 🌟 Overview

**StockHR** is an enterprise-grade Inventory Management System (IMS) and Decision Support System (DSS) engineered to eliminate stockouts, prevent overstocking, and optimize purchasing decisions. 

Built with **React 19**, **TypeScript**, and **Firebase Firestore**, StockHR combines real-time stock ledgering with automated mathematical engines to calculate key supply chain metrics such as **Economic Order Quantity (EOQ)**, **Reorder Points (ROP)**, and **Average Daily Usage (ADU)**.

---

## 🚀 Key Features

### 1. 📊 Intelligent Decision Support System (DSS)
- **Economic Order Quantity (EOQ)**: Calculates optimal order sizes balancing holding costs and procurement expenses.
- **Dynamic Reorder Point (ROP)**: Computes reorder thresholds based on supplier lead times, average daily consumption, and safety stock.
- **Stock Depletion Forecasting**: Predicts days remaining before stockouts occur with automated urgency indicators.

### 2. ⚡ Automated Velocity Engine
- **Consumption-Driven ADU**: Calculates 7-day rolling Average Daily Usage based exclusively on verified stock outbound movements.
- **Percentile-Ranked Velocity**: Automatically assigns velocity tiers (`fast`, `moderate`, `slow`) to products based on consumption percentiles.
- **Inactivity & Stagnation Detection**: Automatically flags inactive and slow-moving inventory to release tied-up capital.

### 3. 🔄 Real-Time Stock Movement Ledger
- Multi-mode transaction recording: **Stock In** (Procurement/Receipts), **Stock Out** (Dispatch/Usage), and **Adjustments** (Audit discrepancy resolution).
- Real-time stock recalculation with automated reference tracking (e.g., PO #, Invoice #).
- Immutable transaction logs linked directly to user profiles.

### 4. 🔔 Smart Alerts & Notification Center
- Proactive alerts for **Low Stock**, **Out of Stock**, and **Slow-Moving / Inactive Stock**.
- Alert resolution workflows with acknowledgement status and direct links to supplier purchase workflows.

### 5. 👥 Role-Based Access Control (RBAC)
- **Admin**: Full access including user administration, role assignment, system settings, and complete audit trails.
- **Manager**: Catalog management, supplier network management, purchase authorization, and movement approvals.
- **Staff**: Day-to-day operations (stock check-in/check-out, movements, product viewing).

### 6. 🛡️ Comprehensive Audit Trail
- System-wide logging for all mutations (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`).
- Complete forensic tracking with timestamp, user ID, user name, target entity, and IP metadata.

---

## 🏗️ Tech Stack & Architecture

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling & UI**: [TailwindCSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Framer Motion](https://motion.dev/)
- **Data & Tables**: [TanStack React Table v8](https://tanstack.com/table/v8), [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Auth & UI stores), [SWR](https://swr.vercel.app/)
- **Backend & Real-Time DB**: [Firebase Auth & Cloud Firestore](https://firebase.google.com/)
- **AI Integration**: [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai)

---

## 📁 Directory Structure

```text
StockHR/
├── src/
│   ├── components/
│   │   ├── StockMovementModal.tsx   # Modal for recording stock in/out/adjustments
│   │   └── ui/                      # Modular UI component library
│   │       ├── AlertBanner.tsx      # System warning and notification banners
│   │       ├── AppShell.tsx         # Sidebar navigation and responsive layout
│   │       ├── DataTable.tsx        # High-performance sorting & paginated table
│   │       ├── FormField.tsx        # Accessible form input wrappers
│   │       ├── KPICard.tsx          # Key metric and statistic cards
│   │       ├── Modal.tsx            # Accessible modal dialog primitive
│   │       ├── RoleGuard.tsx        # Client-side RBAC guard component
│   │       └── StatusBadge.tsx      # Velocity and operational status indicators
│   ├── lib/
│   │   ├── audit.ts                 # Audit logging helper (writes to Firestore)
│   │   ├── utils.ts                 # Currency/date formatters & class merger
│   │   └── velocity.ts              # Mathematical engine for ADU, EOQ, and velocity
│   ├── pages/                       # Route views
│   │   ├── DashboardPage.tsx        # Executive summary dashboard
│   │   ├── ProductListPage.tsx      # Inventory catalog & search
│   │   ├── ProductDetailPage.tsx    # Comprehensive product ledger & metrics
│   │   ├── ProductFormPage.tsx      # Product creation/editing interface
│   │   ├── StockMovementsPage.tsx   # Stock movement history & logging
│   │   ├── DSSDashboardPage.tsx     # Decision Support System & reorder matrix
│   │   ├── AlertsCentrePage.tsx     # Low stock & anomaly alert manager
│   │   ├── SupplierManagementPage.tsx # Supplier directory & relationships
│   │   ├── CategoryManagementPage.tsx # Product grouping & color categorization
│   │   ├── UserManagementPage.tsx   # RBAC user directory & assignment
│   │   ├── AuditTrailPage.tsx       # System security logs & forensics
│   │   ├── ReportsPage.tsx          # Analytical reports & data export
│   │   ├── SettingsPage.tsx         # System threshold configuration
│   │   └── LoginPage.tsx            # Firebase Auth login portal
│   ├── stores/                      # Zustand state slices (Auth & UI)
│   ├── types.ts                     # TypeScript schemas & interfaces
│   ├── firebase.ts                  # Firebase app initialization
│   ├── App.tsx                      # App root & client-side router
│   └── main.tsx                     # React application mounting
├── firestore.rules                  # Firestore security & access rules
├── firebase-blueprint.json          # System schema specifications
├── vite.config.ts                   # Vite bundler configuration
└── package.json                     # Project manifest & scripts
```

---

## 🚦 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm** / **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/StockHR.git
cd StockHR
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory (refer to `.env.example`):

```env
# Google Gemini AI API Key (optional for AI capabilities)
GEMINI_API_KEY="your-gemini-api-key"

# Application URL
APP_URL="http://localhost:3000"
```

> **Note**: Firebase configuration is maintained in `firebase-applet-config.json`. Ensure your Firebase project credentials match the configuration file.

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
```

---

## 🔐 Role-Based Permissions Matrix

| Feature / Page | Admin | Manager | Staff |
| :--- | :---: | :---: | :---: |
| **View Dashboard & Inventory** | ✅ | ✅ | ✅ |
| **Record Stock Movement (In/Out)** | ✅ | ✅ | ✅ |
| **Create / Edit Products** | ✅ | ✅ | ❌ |
| **Supplier & Category Management** | ✅ | ✅ | ❌ |
| **DSS & Reorder Recommendations** | ✅ | ✅ | ❌ |
| **User & Role Administration** | ✅ | ❌ | ❌ |
| **Audit Logs & Security Trail** | ✅ | ❌ | ❌ |
| **System Threshold Settings** | ✅ | ❌ | ❌ |

---

## 📈 Decision Support Formulas

- **Economic Order Quantity (EOQ)**:
  $$\text{EOQ} = \sqrt{\frac{2 \cdot D \cdot S}{H}}$$
  *Where $D$ = Annual Demand (ADU $\times$ 365), $S$ = Cost per order, $H$ = Annual holding cost per unit.*

- **Reorder Point (ROP)**:
  $$\text{ROP} = (\text{ADU} \times \text{Lead Time in Days}) + \text{Safety Stock}$$

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project repository
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
