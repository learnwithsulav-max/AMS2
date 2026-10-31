# Firestore Security Specification · Learn With Sulav

## 1. Data Invariants

1. **User Ownership**: A user profile at `/users/{userId}` can only be created or modified if `request.auth.uid == userId`.
2. **Role Immutability & Admin Isolation**: Users cannot escalate their own `role` to `'admin'`. Role updates are strictly forbidden or reserved for administrators.
3. **Policy Ownership**: A policy document at `/policies/{policyId}` must have `incoming().agentId == request.auth.uid`. Agents cannot read, edit, or list policies of other agents unless an admin.
4. **Lead Ownership**: A lead document at `/leads/{leadId}` must have `incoming().agentId == request.auth.uid`. No agent can access or steal leads belonging to another agent.
5. **Feedback Integrity**: Any feedback entry in `/agency_feedback/{feedbackId}` must have `incoming().userId == request.auth.uid`. Agents cannot alter the `status` field after submission; only admins can change status.
6. **Temporal Integrity**: `createdAt` timestamps must be set using the server request timestamp `request.time` and remain immutable on update.
7. **Default Deny Catch-all**: Any path not explicitly matched is completely blocked (`allow read, write: if false;`).

---

## 2. The "Dirty Dozen" Payloads (Adversarial Test Vectors)

1. **Payload 1 (Ghost Field Injection / Shadow Update on User)**:
   - Path: `/users/{targetUid}`
   - Action: `update`
   - Payload: `{"role": "admin", "membership": "premium"}`
   - Expected Result: `PERMISSION_DENIED` (User cannot grant themselves admin rights).

2. **Payload 2 (Cross-User Profile Spoofing)**:
   - Path: `/users/{victimUid}`
   - Action: `create`
   - Payload: `{"uid": "victimUid", "email": "victim@example.com", "name": "Hacker", "role": "agent", "membership": "free", "status": "active", "createdAt": request.time}` by authenticated user `attackerUid`
   - Expected Result: `PERMISSION_DENIED` (`request.auth.uid != userId`).

3. **Payload 3 (Unauthenticated Read of User Profiles)**:
   - Path: `/users/{userId}`
   - Action: `get`
   - Auth: Unauthenticated (`request.auth == null`)
   - Expected Result: `PERMISSION_DENIED`.

4. **Payload 4 (Cross-Agent Policy Theft / Read)**:
   - Path: `/policies/{policyId}` where `resource.data.agentId == "agentA"`
   - Action: `get`
   - Auth: Authenticated as `"agentB"`
   - Expected Result: `PERMISSION_DENIED` (Strict tenant isolation).

5. **Payload 5 (Policy Agent ID Spoofing on Creation)**:
   - Path: `/policies/{policyId}`
   - Action: `create`
   - Payload: `{"agentId": "agentA", "clientName": "Ram Bahadur", "company": "Nepal Life", "premiumMode": "regular", "premium": 50000, "issueDate": "2026-01-01", "createdAt": request.time}` by `"agentB"`
   - Expected Result: `PERMISSION_DENIED` (`incoming().agentId != request.auth.uid`).

6. **Payload 6 (Oversized Payload / Denial of Wallet Attack)**:
   - Path: `/policies/{policyId}`
   - Action: `create`
   - Payload: `{"agentId": "agentA", "clientName": "A".repeat(5000), ...}`
   - Expected Result: `PERMISSION_DENIED` (`clientName.size() <= 120`).

7. **Payload 7 (Lead Pipeline Theft)**:
   - Path: `/leads/{leadId}` where `resource.data.agentId == "agentA"`
   - Action: `get`
   - Auth: Authenticated as `"agentB"`
   - Expected Result: `PERMISSION_DENIED`.

8. **Payload 8 (Agent Lead Hijack on Update)**:
   - Path: `/leads/{leadId}`
   - Action: `update`
   - Payload: `{"agentId": "attackerUid"}`
   - Expected Result: `PERMISSION_DENIED` (`agentId` is immutable).

9. **Payload 9 (Feedback Status Elevation by User)**:
   - Path: `/agency_feedback/{feedbackId}`
   - Action: `update`
   - Payload: `{"status": "completed"}` by normal user
   - Expected Result: `PERMISSION_DENIED` (Only admins can mutate status).

10. **Payload 10 (Client-Forged Timestamp Manipulation)**:
    - Path: `/policies/{policyId}`
    - Action: `create`
    - Payload: `{"agentId": "agentA", ..., "createdAt": timestamp.date(2020, 1, 1)}`
    - Expected Result: `PERMISSION_DENIED` (`incoming().createdAt == request.time`).

11. **Payload 11 (Invalid ID Injection Attack)**:
    - Path: `/users/{inv@lid$$path--!!}`
    - Action: `create`
    - Expected Result: `PERMISSION_DENIED` (`isValidId` check rejects malformed non-alphanumeric keys).

12. **Payload 12 (Blanket List Scrape Query)**:
    - Path: `/policies`
    - Action: `list`
    - Auth: Unauthenticated or unbounded query without `where("agentId", "==", request.auth.uid)`
    - Expected Result: `PERMISSION_DENIED`.
