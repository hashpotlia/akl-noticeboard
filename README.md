# AKL NoticeBoard 📋

**Version 1.0 – Comprehensive Review**

---

## Overview
AKL NoticeBoard is a modern, real-time communication and compliance platform designed for DCO AKL cluster management. It streamlines the distribution, acknowledgment, and tracking of critical company notices, ensuring operational transparency and accountability across all user roles.

---

## Key Features
- **Priority-Based Notices:** Supports Critical, High, Medium, and Low priority levels, each visually distinct.
- **Digital Acknowledgment:** Users can digitally acknowledge notices; acknowledgments are tracked per user for compliance.
- **Role-Based Access:** Distinct experiences for USER, MANAGER, and SUPER_ADMIN roles, with seamless portal switching and session management.
- **Smart Filtering & Search:** Filter by acknowledgment status, category, priority, and sort notices. Full-text search is available.
- **Category & Tagging:** Notices can be categorized (Safety, Operations, Policy, HR, etc.) and tagged for easy discovery.
- **Pinning & Expiry:** Important notices can be pinned; expired notices are visually de-emphasized.
- **Mobile-Responsive UI:** Fully responsive, accessible, and visually modern interface using Tailwind CSS.
- **PWA Support:** Offline access and installability via service worker and manifest.
- **Automated Testing:** Jest-based unit and integration tests for user portal features.

---

## Architecture & Technology
- **Frontend:**
  - Vanilla JavaScript (modular, class-based structure)
  - Tailwind CSS for utility-first, responsive design
  - Quill.js for rich text editing in admin panel
  - Service Worker for offline/PWA support
- **Backend:**
  - AWS AppSync (GraphQL API)
  - AWS Cognito for authentication (custom, not Amplify UI)
  - DynamoDB for notice and signature storage
- **Hosting:**
  - AWS Amplify Hosting

---

## User Experience & Flows
- **Main Notice Board (index.html):**
  - Publicly accessible, shows all notices with filtering, search, and acknowledgment status.
  - "Portal Access" button adapts to user session/role; "Logout" available when signed in.
  - Acknowledge button uses logged-in user info, no modal required.
- **User Portal (user-portal.html):**
  - Personalized dashboard for regular users.
  - Header shows user name, role, and department as colored pills.
  - Filter by acknowledgment status (Need to Acknowledge, Already Acknowledged).
  - Profile modal for updating user info and viewing acknowledgment history.
  - Seamless logout and navigation to main board.
- **Admin Portal (admin.html):**
  - Full management of notices, users, and analytics for managers and super admins.
  - Rich text editor for notices, advanced filtering, and user management.
  - Secure authentication and session handling.

---

## Current State (v1.0)
- **Stable, production-ready for DCO AKL cluster.**
- All major features implemented and tested.
- Robust session and role management across all portals.
- Consistent, modern UI/UX with clear role separation.
- Comprehensive filtering, search, and compliance tracking.
- Automated tests in place for user portal logic.
- Easily extensible for future features (e.g., notifications, analytics, more granular permissions).

---

## Getting Started
1. Clone the repository and install dependencies (`npm install` for test/dev tooling).
2. Deploy backend (AppSync, Cognito, DynamoDB) via AWS Amplify or your preferred method.
3. Configure environment variables and endpoints as needed.
4. Serve the frontend (static hosting or Amplify Hosting).

---

## Testing
- Run `npm test` to execute Jest tests for user portal features (filtering, pagination, i18n, etc.).

---

## Authors & License
- Developed by the DCO AKL team.
- MIT License.

---

## Changelog
- **v1.0:** Initial public release with all core features, robust role/session management, and modern UI/UX.
