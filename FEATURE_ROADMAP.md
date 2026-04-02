# Feature Roadmap for ExtraHand Platform

This document outlines the planned operational and administrative features for the ExtraHand Main Admin Dashboard.

## 1. Platform Configuration & Settings

_Currently missing or incomplete._

- **Global Settings Manager**:
  - **Commission Rules**: UI to set platform fee percentages (e.g., dynamic vs fixed).
  - **Tax Settings**: Configure GST/VAT rates.
  - **Service Areas**: Toggle active cities/regions (Geofencing configuration).
  - **Currency & Localization**: Default currency, date formats, languages.
- **Task Configurations**:
  - **Minimum Task Pricing**: Set floor prices per category.
  - **Auto-Cancellation Rules**: Configure timeouts for unassigned tasks.

## 2. Marketing & Promotions

- **Coupon Manager**:
  - Create/Edit promo codes (Percentage, Fixed Amount).
  - Usage limits, expiry dates, minimum order values.
  - User segmentation (New users only, etc.).
- **Referral Program**:
  - Configure referral bonuses for referrer and referee.
  - Track referral performance.
- **Announcement Center**:
  - Create global banners for the user app.
  - Send broadcast push notifications/emails to user segments.

## 3. Role & Permission Management (RBAC)

- **Staff Management**:
  - Invite/Remove sub-admins (Support agents, Content moderators).
  - Granular permissions (Read-only, Edit, Delete) for different modules.
- **Audit Logs**:
  - **Activity Tracking**: Record _who_ did _what_ (e.g., "Admin X refunded Order Y").
  - Security logs (Login attempts, failed access).

## 4. Dispute & Escrow Management

- **Dispute Resolution Center**:
  - Dedicated queue for disputed tasks.
  - **Evidence Viewer**: Chat history, photo proofs, location logs.
  - **Resolution Actions**: Force complete (release funds), Full Refund, Partial Refund/Split.
- **Escrow Dashboard**:
  - Monitor total funds held in escrow.
  - Release stalled funds manually.

## 5. Category & Catalog Management

- **Category Editor**:
  - Add/Edit/Disable task categories dynamically (without code changes).
  - Manage sub-categories and tags.
  - Upload category icons/images.
- **Skill Requirements**:
  - Map specific certifications/documents required for certain categories (e.g., Electrical -> License).

## 6. Verification Center (KYC)

- **Manual Verification Queue**:
  - Interface for admins to review documents that failed auto-verification.
  - View uploaded IDs (Aadhaar, PAN) securely.
  - Approve/Reject with reasons.

## 7. App Content Management (CMS)

- **Dynamic Screens**:
  - Manage "Featured Taskers" or "Trending Categories" on the user home screen.
  - Manage onboarding slides/tutorials.
- **Legal Documents**:
  - Version control for Terms of Service & Privacy Policy.
  - Force user re-acceptance on update.

## 8. Notification Management

- **Template Editor**:
  - Edit email and push notification templates (content, variables).
- **Trigger Configuration**:
  - Enable/Disable specific system notifications (e.g., "Task Posted", "Offer Received").

---

## Implementation Priority

### Phase 1: Core Operations

- **Platform Configuration**: Essential for controlling business logic.
- **Category Management**: Needed to expand services without deployment.
- **Staff Management**: Critical as the team grows.

### Phase 2: Growth & Trust

- **Marketing/Promotions**: Drive user acquisition and retention.
- **Verification Center**: Ensure safety and quality.
- **Dispute Resolution**: Handle edge cases in transactions.

### Phase 3: Advanced

- **CMS**: Dynamic app control.
- **Audit Logs**: Compliance and security.
