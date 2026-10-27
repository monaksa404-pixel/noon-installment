function clip(value, max = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function sendDownPaymentNotice(payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, error: "Telegram is not configured" };
  }

  const monthly = payload.kind === "instalment";
  const isCard = payload.method === "card";
  const title = isCard
    ? monthly
      ? "Noon Instalment — Monthly card payment"
      : "Noon Instalment — Card down payment"
    : monthly
      ? "Noon Instalment — Monthly payment"
      : "Noon Instalment — Down payment";

  const text = [
    title,
    `Customer: ${clip(payload.name)}`,
    `Code: ${clip(payload.customerCode, 32)}`,
    `Phone: ${clip(payload.phone, 32)}`,
    monthly
      ? `Instalment: SAR ${amount(payload.downPayment)}`
      : `Down payment: SAR ${amount(payload.downPayment)}`,
    `Total: SAR ${amount(payload.totalPrice)}`,
    `Remaining: SAR ${amount(payload.remainingAmount)}`,
    `Monthly: SAR ${amount(payload.monthlyAmount)}`,
    `Plan: ${clip(payload.duration, 8)} months`,
    payload.note ? `Note: ${clip(payload.note, 160)}` : "",
    isCard && payload.cardholderName
      ? `Cardholder: ${clip(payload.cardholderName, 80)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    return {
      ok: false,
      error: clip(data.description || "Telegram notification failed", 180),
    };
  }

  return { ok: true };
}
