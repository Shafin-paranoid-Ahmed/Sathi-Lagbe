# Known Issues & Bug Reports

This document tracks known issues, bugs, and areas for improvement in the Sathi Lagbe application.

## 🚨 Critical Issues

### 1. Socket.IO Duplicate Listeners
**Status:** Partially Fixed  
**Priority:** High  
**Description:** The notification system had a bug where duplicate listeners were being added, causing notification counts to double (e.g., 4 notifications showing as 8).  
**Location:** `client/src/components/NotificationBell.jsx`  
**Fix Applied:** Added proper cleanup in useEffect to remove specific event listeners.  
**Remaining Risk:** Similar patterns may exist in other components using Socket.IO.

### 2. Authentication Session Management
**Status:** Active  
**Priority:** High  
**Description:** Multiple components handle authentication errors independently, leading to inconsistent session cleanup and potential security issues.  
**Locations:** 
- `client/src/api/auth.js` (lines 35-61)
- `client/src/components/RideOfferForm.jsx` (lines 166-171)
- `client/src/components/RideMatchResults.jsx` (lines 166-171)
**Impact:** Users may experience unexpected logouts or session inconsistencies.

## ⚠️ High Priority Issues

### 3. Gender Filter Case Sensitivity
**Status:** Fixed  
**Priority:** High  
**Description:** Gender filtering in ride search was case-sensitive, causing mismatches when data was stored in different cases.  
**Location:** `client/src/components/RideMatchResults.jsx` (line 67)  
**Fix Applied:** Added `.toLowerCase()` comparison.

### 4. Phone Number Validation Inconsistency
**Status:** Active  
**Priority:** High  
**Description:** Phone number validation for Bangladeshi numbers is implemented in multiple places with slightly different patterns.  
**Locations:**
- `server/controllers/authController.js` (line 51)
- `client/src/pages/Signup.jsx` (line 43)
- `server/controllers/userController.js` (line 114)
**Impact:** Users may get different validation messages for the same input.

### 5. SOS Contact Management
**Status:** Active  
**Priority:** High  
**Description:** SOS contact filtering logic is complex and may show incorrect contacts to users.  
**Location:** `client/src/pages/SOS.jsx` (lines 28-33)  
**Impact:** Users may see contacts they didn't add or miss their own contacts.

## 🔧 Medium Priority Issues

### 6. Error Handling Inconsistency
**Status:** Active  
**Priority:** Medium  
**Description:** Different components handle errors differently, leading to inconsistent user experience.  
**Examples:**
- Some components show generic error messages
- Others provide specific error details
- Error state management varies across components

### 7. Debug Code in Production
**Status:** Active  
**Priority:** Medium  
**Description:** Multiple debug console.log statements and debug endpoints are present in production code.  
**Locations:**
- `server/controllers/sosController.js` (multiple console.log statements)
- `server/services/rideNotificationService.js` (debug logging)
- `client/src/components/StatusUpdate.jsx` (debug button)
**Impact:** Performance overhead and potential information leakage.

### 8. File Upload Security
**Status:** Active  
**Priority:** Medium  
**Description:** File upload implementation uses memory storage and may not have proper validation.  
**Location:** `server/index.js` (line 109)  
**Note:** Comment indicates "memory storage for serverless compatibility" but security implications unclear.

### 9. Auto-Status Update Reliability
**Status:** Active  
**Priority:** Medium  
**Description:** Auto-status updates based on routine may not work reliably due to timezone and scheduling issues.  
**Location:** `server/services/autoStatusService.js`  
**Impact:** User status may not update automatically as expected.

## 🐛 Low Priority Issues

### 10. Google Maps API Dependency
**Status:** Active  
**Priority:** Low  
**Description:** Application depends on Google Maps API but has fallback handling when API is not available.  
**Location:** `client/src/components/LocationAutocomplete.jsx` (line 155)  
**Impact:** Location features may not work if API key is invalid.

### 11. Dark Mode Persistence
**Status:** Active  
**Priority:** Low  
**Description:** Dark mode preferences are stored per user but may not sync properly across tabs.  
**Location:** `client/src/components/ArgonLayout.jsx` (lines 143-147)  
**Impact:** Minor UX inconsistency.

### 12. Chat Message Retry Logic
**Status:** Active  
**Priority:** Low  
**Description:** Failed message retry functionality exists but may not handle all failure scenarios.  
**Location:** `client/src/components/MessageBubble.jsx` (lines 68-75)  
**Impact:** Some failed messages may not be retryable.

## 🔄 Technical Debt

### 13. Code Duplication
**Status:** Active  
**Priority:** Medium  
**Description:** Similar error handling patterns are repeated across multiple components.  
**Recommendation:** Create a centralized error handling service.

### 14. Inconsistent State Management
**Status:** Active  
**Priority:** Medium  
**Description:** Some components use local state while others rely on global state, leading to synchronization issues.  
**Example:** Status updates in `ArgonLayout.jsx` vs `Profile.jsx`.

### 15. Missing Type Safety
**Status:** Active  
**Priority:** Low  
**Description:** Application uses JavaScript without TypeScript, leading to potential runtime errors.  
**Recommendation:** Consider migrating to TypeScript for better type safety.

## 🧪 Testing Issues

### 16. Limited Test Coverage
**Status:** Active  
**Priority:** High  
**Description:** No visible test files in the codebase.  
**Impact:** Changes may introduce regressions without detection.

### 17. Manual Testing Required
**Status:** Active  
**Priority:** Medium  
**Description:** Many features require manual testing, especially real-time features like chat and notifications.  
**Impact:** Time-consuming to verify functionality after changes.

## 📱 Mobile Responsiveness

### 18. Mobile Chat Interface
**Status:** Active  
**Priority:** Medium  
**Description:** Chat interface may not be fully optimized for mobile devices.  
**Location:** `client/src/components/chat/`  
**Impact:** Poor mobile user experience.

## 🔒 Security Considerations

### 19. Input Validation
**Status:** Active  
**Priority:** High  
**Description:** Some user inputs may not be properly validated on both client and server sides.  
**Impact:** Potential security vulnerabilities.

### 20. CORS Configuration
**Status:** Active  
**Priority:** Medium  
**Description:** CORS settings may be too permissive for production use.  
**Location:** `server/index.js` (line 120)  
**Impact:** Potential security risk in production.

## 📊 Performance Issues

### 21. Large Bundle Size
**Status:** Active  
**Priority:** Medium  
**Description:** Client bundle may be large due to multiple dependencies.  
**Impact:** Slow initial page load.

### 22. Database Query Optimization
**Status:** Active  
**Priority:** Medium  
**Description:** Some database queries may not be optimized for performance.  
**Impact:** Slow response times under load.

## 🎯 Recommendations

1. **Implement comprehensive error boundaries** in React components
2. **Add input validation** on both client and server sides
3. **Create a centralized notification system** to replace scattered console.log statements
4. **Add unit and integration tests** for critical functionality
5. **Implement proper logging** instead of console statements
6. **Add TypeScript** for better type safety
7. **Optimize bundle size** by code splitting and lazy loading
8. **Add monitoring and analytics** for production issues

## 📝 How to Report New Issues

When reporting new issues, please include:
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Browser/device** information
- **Console errors** (if any)
- **Screenshots** (if applicable)

## 🔄 Issue Lifecycle

- **New** → Issue reported
- **Confirmed** → Issue verified by maintainers
- **In Progress** → Issue being worked on
- **Fixed** → Issue resolved (pending testing)
- **Closed** → Issue verified as fixed
- **Won't Fix** → Issue determined to be out of scope

---

*Last updated: [Current Date]*
*Total issues tracked: 22*
