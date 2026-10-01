# Sprint 5 Functional and Integration Test Results

Test date: 1 October 2026  
Scope: Booking, notification, authentication, authorization, property, agent, viewing, and communication workflows. Payment and maintenance are deferred to Sprint 6.

## Critical booking workflow scenarios

| Test ID | Scenario | Expected result | Actual result | Result | Retest status |
| --- | --- | --- | --- | --- | --- |
| T5-01 | Landlord approves a pending tenant application with valid offer terms | Booking becomes confirmed and the offer values persist | Status changed to `CONFIRMED`; application stage and offer values persisted | Pass | Passed |
| T5-02 | Landlord supplies an expired offer | Approval is rejected without changing the booking | Validation rejected the expired offer before a database update | Pass | Passed |
| T5-03 | Tenant attempts to withdraw another tenant's application | Request is rejected and the booking remains unchanged | Ownership validation rejected the request | Pass | Passed |
| T5-04 | Landlord attempts move-in without a signed agreement | Tenancy remains inactive | Move-in was rejected and neither booking nor property was updated | Pass | Passed |
| T5-05 | Landlord confirms move-in after both parties have signed | Booking becomes active and property becomes rented | Booking changed to `CHECKED_IN`; handover date was recorded; property changed to `RENTED` | Pass | Passed |
| T5-06 | Landlord confirms move-out for the final active tenancy | Booking closes and property becomes available | Booking changed to `CHECKED_OUT`; inspection and closure dates were recorded; property changed to `AVAILABLE` | Pass | Passed |

## Regression result

| Check | Result | Notes |
| --- | --- | --- |
| Backend automated test suite | Pass | 66 tests across 11 suites passed |
| Backend production build | Pass | TypeScript compilation completed successfully |
| Frontend production build | Pass | Vite production build completed successfully |

The frontend build reports a non-blocking bundle-size warning. It does not prevent compilation or affect the tested workflow behavior.

## Final regression review

The final Sprint 5 regression pass confirmed:

- All 66 backend tests pass across 11 suites.
- Backend and frontend production builds complete successfully.
- Booking, agreement, notification, dashboard, and role-protection files pass their targeted lint checks.
- Booking pages now schedule their initial asynchronous refresh without a synchronous effect update.
- Agreement draft and signing state resets no longer run synchronously during an effect.

No critical or high-severity defect remains in the active Sprint 5 scope. The repository-wide frontend lint still reports 130 errors and 12 warnings in older or deferred modules. These do not block the production build and are recorded as technical debt rather than being included in the Sprint 5 booking and notification fixes. Payment and maintenance findings remain deferred to Sprint 6.
