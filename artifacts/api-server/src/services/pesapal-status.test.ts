import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's built-in TypeScript runner requires the explicit extension.
import { getPesapalPaymentState, isCompletedPesapalPayment, normalizePesapalTransactionStatus, parsePesapalDate } from "./pesapal-status.ts";

test("normalizes both PesaPal snake_case and camelCase responses", () => {
  const status = normalizePesapalTransactionStatus({
    payment_method: "MPESA",
    amount: "599",
    created_date: "2026-08-31T08:38:40Z",
    confirmed_date: "2026-08-31T08:39:00Z",
    status_code: 1,
    payment_status_description: "Completed",
    merchant_reference: "INNDOS-123",
    currency: "KES",
  });

  assert.equal(status.paymentMethod, "MPESA");
  assert.equal(status.amount, 599);
  assert.equal(status.status, "1");
  assert.equal(status.paymentStatusDescription, "Completed");
  assert.equal(status.merchantReference, "INNDOS-123");
  assert.equal(getPesapalPaymentState(status), "completed");
});

test("accepts completed status code 1 when the description is omitted", () => {
  const status = normalizePesapalTransactionStatus({
    amount: 599,
    status_code: 1,
    merchant_reference: "INNDOS-123",
    currency: "KES",
  });

  assert.equal(isCompletedPesapalPayment(status), true);
  assert.equal(getPesapalPaymentState(status), "completed");
});

test("does not treat a contradictory failure description as completed", () => {
  const status = normalizePesapalTransactionStatus({
    amount: 599,
    status_code: 1,
    payment_status_description: "Failed",
    merchant_reference: "INNDOS-123",
    currency: "KES",
  });

  assert.equal(isCompletedPesapalPayment(status), false);
  assert.equal(getPesapalPaymentState(status), "failed");
});

test("maps terminal gateway codes and leaves unknown responses pending", () => {
  const failed = normalizePesapalTransactionStatus({ status_code: 2 });
  const invalid = normalizePesapalTransactionStatus({ status_code: 0 });
  const reversed = normalizePesapalTransactionStatus({ status_code: 3 });
  const cancelled = normalizePesapalTransactionStatus({ payment_status_description: "Cancelled" });
  const unknown = normalizePesapalTransactionStatus({ status_code: 99 });

  assert.equal(getPesapalPaymentState(failed), "failed");
  assert.equal(getPesapalPaymentState(invalid), "failed");
  assert.equal(getPesapalPaymentState(reversed), "failed");
  assert.equal(getPesapalPaymentState(cancelled), "cancelled");
  assert.equal(getPesapalPaymentState(unknown), "pending");
});

test("parses gateway confirmation dates and rejects invalid dates", () => {
  assert.equal(parsePesapalDate("2026-08-31T08:39:00Z")?.toISOString(), "2026-08-31T08:39:00.000Z");
  assert.equal(parsePesapalDate("not-a-date"), null);
  assert.equal(parsePesapalDate(""), null);
});