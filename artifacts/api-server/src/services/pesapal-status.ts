export type PesapalTransactionStatus = {
  paymentMethod: string;
  amount: number;
  createdDate: string;
  confirmedDate: string;
  status: string;
  description: string;
  paymentStatusDescription: string;
  merchantReference: string;
  currency: string;
};

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function firstString(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = stringValue(data[key]).trim();
    if (value) return value;
  }
  return "";
}

export function normalizePesapalTransactionStatus(data: Record<string, unknown>): PesapalTransactionStatus {
  return {
    paymentMethod: firstString(data, "payment_method", "paymentMethod"),
    amount: Number(data.amount),
    createdDate: firstString(data, "created_date", "createdDate"),
    confirmedDate: firstString(data, "confirmed_date", "confirmedDate"),
    status: firstString(data, "status_code", "status"),
    description: firstString(data, "description"),
    paymentStatusDescription: firstString(data, "payment_status_description", "paymentStatusDescription"),
    merchantReference: firstString(data, "merchant_reference", "merchantReference"),
    currency: firstString(data, "currency"),
  };
}

function normalizedStatusText(status: PesapalTransactionStatus): string {
  return `${status.paymentStatusDescription} ${status.description}`.trim().toLowerCase();
}

export function isCompletedPesapalPayment(status: PesapalTransactionStatus): boolean {
  const description = normalizedStatusText(status);
  if (/(failed|invalid|cancel|revers)/.test(description)) return false;
  return (
    description.includes("completed") ||
    description.includes("paid") ||
    status.status.trim().toLowerCase() === "completed" ||
    status.status.trim() === "1"
  );
}

export type PesapalPaymentState = "completed" | "pending" | "failed" | "cancelled";

export function getPesapalPaymentState(status: PesapalTransactionStatus): PesapalPaymentState {
  if (isCompletedPesapalPayment(status)) return "completed";

  const description = normalizedStatusText(status);
  const statusCode = status.status.trim();
  if (description.includes("cancel")) return "cancelled";
  if (description.includes("failed") || statusCode === "2") return "failed";
  if (description.includes("invalid") || statusCode === "0") return "failed";
  if (description.includes("revers") || statusCode === "3") return "failed";
  return "pending";
}

export function parsePesapalDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}