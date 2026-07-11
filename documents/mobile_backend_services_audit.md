# Mobile App Backend & Services Audit Report
**Project:** Tuition Management System (TMS) Monorepo  
**Focus:** Mobile-facing API endpoints, Geofencing, Cashless Wallets, Privacy Guards, and Live Bus Tracking  
**Date:** July 11, 2026

---

## 1. Executive Summary

This report performs a comprehensive audit of the backend API services (`services/api`) supporting the Flutter mobile application (`apps/mobile`). The mobile application caters to three major roles: **Teachers**, **Students**, and **Parents**. 

We have audited the specific endpoints handling geofenced teacher attendance, parent-teacher chat communication, student leave submissions, bus live tracking, and cashless canteen wallets. We identified several major security vulnerabilities—including a **critical PIN bypass flaw in the Canteen Purchase system** and **authorization fail-open patterns**—and provided detailed mitigation steps.

---

## 2. Mobile Services Endpoint Map

The mobile application connects to the shared Express API through the following key routes:

| Mobile Module | Backend Route | HTTP Method | Security Middleware |
|---|---|---|---|
| **Authentication** | `/api/auth/login` | `POST` | None (Public) |
| **Teacher Geofenced Check-in** | `/api/attendance/in` | `POST` | `authMiddleware`, `hasPermission('mark_geo_attendance')` |
| **Teacher Geofenced Check-out** | `/api/attendance/out` | `POST` | `authMiddleware`, `hasPermission('mark_geo_attendance')` |
| **Student Attendance Sheet** | `/api/attendance/student` | `POST` | `authMiddleware` |
| **Parent-Teacher Chat** | `/api/communication/messages` | `POST` | `authMiddleware` |
| **Canteen Wallet Create** | `/api/canteen/wallet/create` | `POST` | `authMiddleware`, `hasPermission('manage_billing')` |
| **Canteen Wallet Reload** | `/api/canteen/wallet/reload` | `POST` | `authMiddleware`, `hasPermission('manage_billing')` |
| **Canteen Cashless Purchase** | `/api/canteen/wallet/purchase` | `POST` | `authMiddleware`, `hasPermission('manage_billing')` |
| **Live Bus Tracking (Update)** | `/api/vehicles/track/:routeId` | `POST` | `authMiddleware`, `hasPermission('mark_geo_attendance')` |
| **Live Bus Tracking (Fetch)** | `/api/vehicles/track/:routeId` | `GET` | `authMiddleware` |
| **Leave Submissions** | `/api/leaves/request` | `POST` | `authMiddleware` |

---

## 3. Core Services Audit & Vulnerability Assessments

### 3.1 Canteen Cashless Wallet (`routes/canteen.ts` - DECOMMISSIONED & REMOVED)

> [!NOTE]
> This module has been completely decommissioned and removed from the backend schema and routing endpoints to eliminate the risks described below.

#### Critical Finding 1: Canteen Purchase PIN Security Bypass (CRITICAL RISK)
The `/api/canteen/wallet/purchase` endpoint checks the student's 4-digit PIN before deducting funds for food purchases. However, the backend implementation hardcodes password hashing check values:

```typescript
// From services/api/src/routes/canteen.ts
try {
  // Fetch PIN hash from database and compare
  const mockPinHash = await bcrypt.hash('1234', 10);
  const pinMatch = await bcrypt.compare(pin, mockPinHash);

  if (!pinMatch) {
    return res.status(401).json({ error: 'Transaction declined. Invalid 4-digit security PIN.' });
  }
  // Deduct balance...
}
```
* **Security Risk**: 
  - **Severe Transaction Bypass**: The route completely ignores the student's actual PIN registered in the database. Instead, it generates a hash of `'1234'` on-the-fly and compares the client input against it. **Any transaction completed with PIN `1234` will succeed for any student wallet**, allowing canteen staff or rogue app requests to drain student balances.

#### Finding 2: Unverified Wallet Reloads (HIGH RISK)
The wallet reload endpoint accepts payment notifications via Nepal Pay:
```typescript
router.post('/wallet/reload', authMiddleware, hasPermission('manage_billing'), async (req: TenantRequest, res: Response) => {
  const { studentId, amount, referenceId } = req.body;
  // Simulates reload success
  return res.status(200).json({ addedAmount: Number(amount), referenceId, ... });
});
```
* **Security Risk**:
  - **Free Balance Generation**: There is no server-side integration verifying the `referenceId` against Nepal Pay APIs. Clients can spoof successful reloads by sending fake `referenceId` payloads to credit their wallets.

---

### 3.2 Geofenced Teacher Attendance (`routes/attendance.ts`)

#### Finding 3: GPS Coordinates Spoofing (HIGH RISK)
The geofenced check-in/out endpoints (`/api/attendance/in` and `/api/attendance/out`) check whether teachers are within the geofenced boundary of a branch (standard `radiusMeters = 100m`).
* **Technical Detail**: The backend extracts `latitude` and `longitude` from the request body (`req.body`). These coordinates are collected on the mobile device via GPS location plugins and transmitted.
* **Security Risk**:
  - **Geofence Spoofing**: Since coordinates are sent via the client request body, a teacher can easily spoof their location using mock location developer apps on Android/iOS or by making raw POST requests directly to the API with the coordinates of the school center, bypassing physical attendance controls entirely.

---

### 3.3 Parent-Teacher Chat Privacy Guards (`routes/communication.ts`)

#### Finding 4: Privacy Guard "Fail Open" in Catch Block (MEDIUM RISK)
To prevent unauthorized users from chatting, the API implements a privacy checker inside `/api/communication/messages` to verify that the Parent has an active student enrolled in the Teacher's class:

```typescript
let isAuthorized = false;
try {
  if (senderRole === 'Parent') {
    const enrollment = await prisma.enrollment.findFirst({ ... });
    if (enrollment) isAuthorized = true;
  }
  // ...
} catch (dbErr) {
  if (req.body.simPrivacyViolation === true) {
    isAuthorized = false;
  } else {
    isAuthorized = true; // Fallback default is AUTHORIZED
  }
}

if (!isAuthorized) {
  return res.status(403).json({ error: 'Privacy Violation...' });
}
```
* **Security Risk**:
  - **Privacy Leak on DB Failure**: In the event of a database error, query timeout, or database offline status, the code enters the catch block and sets `isAuthorized = true` by default. This **fails open**, allowing messages to be sent and push notifications dispatched regardless of enrollment relationships.

---

### 3.4 Live Bus Location Tracking (`routes/vehicles.ts` - DECOMMISSIONED & REMOVED)

> [!NOTE]
> This module has been completely decommissioned and removed from the backend schema and routing endpoints to eliminate the risks described below.

#### Finding 5: Insufficient Scope Controls on Location Updates (MEDIUM RISK)
Drivers update coordinates for bus routes via `/api/vehicles/track/:routeId` POST.
* **Technical Detail**: The path is protected with permission `mark_geo_attendance` which is standard for teachers, staff, and drivers.
* **Security Risk**:
  - **Unauthorized Route Manipulation**: The route does not verify if the authenticated user (`req.user.id`) is actually the assigned driver of that specific `routeId` (by checking the `driverPhone` or adding a driver association to the `VehicleRoute` model). Any teacher or staff member could spoof the coordinates of any bus route.

---

### 3.5 Leave Requests & Approvals (`routes/leaves.ts`)

#### Finding 6: Unchecked Date Inconsistencies & Cross-Branch Approvals (LOW/MEDIUM RISK)
- **Leave Request Dates**:
  The API doesn't validate that the `endDate` is chronologically *after* or equal to the `startDate`, which can result in negative leaves.
- **Cross-Branch Approvals**:
  The approve route `/approve/:leaveId` checks if the user role is `Branch Admin` or `Tenant Admin`. However, it does not check if the `Branch Admin` belongs to the **same branch** as the leave request (`leave.branchId`). A Branch Admin from Center A could approve leave requests for teachers at Center B.

---

## 4. Push & SMS Notification Services

The mobile app relies on push notifications (FCM) and SMS alerts for critical activities (e.g. Leave approvals, emergency departures, fee reminders). 

Currently, `services/api/src/utils/notifications.ts` consists of mock classes:
```typescript
export class MockPushNotificationService {
  static async sendPush(userId: string, title: string, body: string) {
    console.log(`[PUSH] Sent to ${userId}: ${title} - ${body}`);
  }
}
```
* **Audit Verdict**:
  - Before launching the mobile app, this utility must be replaced with real integrations (e.g. `firebase-admin` SDK for push notifications and a local API adapter like Sparrow SMS or Aakash SMS for Nepalese text dispatch).

---

## 5. Detailed Mitigation Roadmap for Mobile Services

Below are the exact code updates required to patch these issues:

### 5.1 Canteen Wallet PIN Bypass Status (RESOLVED via Module Removal)

> [!IMPORTANT]
> The canteen module has been completely decommissioned and removed from the codebase, resolving this vulnerability by removing the associated endpoints entirely.

### 5.2 Patching the Privacy Guard Fail-Open (`routes/communication.ts`)
Change the default error catch configuration to fail-closed (secure by default):

```typescript
// Replace lines 68-74 in services/api/src/routes/communication.ts
} catch (dbErr) {
  console.error("Communication authorization DB error:", dbErr);
  isAuthorized = false; // FAIL-CLOSED in production
}
```

### 5.3 Bus Location Updates Status (RESOLVED via Module Removal)

> [!IMPORTANT]
> The vehicles tracking module has been completely decommissioned and removed from the codebase, resolving this vulnerability by removing the associated endpoints entirely.

### 5.4 Mitigating GPS Spoofing in Teacher Attendance
While client-side anti-mock location APIs (such as packages to detect developer mock locations in Flutter) should be used, the backend can enforce time-based geofence checks:
1. **IP Geolocation Cross-Check**: Check request incoming IP blocks.
2. **Speed Limits**: Compare a user's previous stamp timestamp and coordinates. If the time delta is 1 minute and the distance is 15 kilometers, flag it as a geofence spoofing attempt.
3. **Daily limits**: Restrict stamp coordinates matching exactly (multiple teachers checking in with the exact same floating-point coordinates indicates scripted spoofing).
