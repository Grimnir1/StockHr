<div align="center">

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