# PR-018 · Coupon eligibility

Acceptance criterion CP-07: ₹100 off when merchandise subtotal reaches ₹1,000. Delivery is excluded.

## r1 · Proposed change — Changes requested

2026-11-19T06:52:02.220Z

Delivery triggered a discount on a 950-rupee basket.

| Merchandise | Delivery | Expected | Baseline | Reviewed | Result |
|---:|---:|---:|---:|---:|---|
| 950 | 60 | 0 | 0 | 100 | Fail |

## r2 · Correction — Approved

2026-11-19T06:52:03.028Z

Same basket passes with delivery excluded.

| Merchandise | Delivery | Expected | Baseline | Reviewed | Result |
|---:|---:|---:|---:|---:|---|
| 950 | 60 | 0 | 0 | 0 | Pass |
