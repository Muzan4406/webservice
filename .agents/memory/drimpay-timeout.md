---
name: DrimPay uncertain outcomes
description: Safe handling of pay-ins when DrimPay or the network times out after the operator may have received the request.
---

A timeout or upstream server error during DrimPay pay-in initiation is an ambiguous outcome, not proof that no payment was started. Preserve the pending order, reconcile through its order ID and webhook, and do not blindly initiate a second charge. Treat explicit client-side rejections separately.

**Why:** A mobile operator confirmation prompt can arrive after the app has already displayed a DrimPay timeout, so retrying can risk a duplicate debit.

**How to apply:** Keep this behavior consistent across international deposits and VIP purchases. Use the stable order ID to find late webhook results, and allow a new attempt only after a definitive failure is recorded.
