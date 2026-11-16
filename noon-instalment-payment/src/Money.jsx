import "./Money.css";

function Glyph({ code }) {
  if (code === "AED") {
    return (
      <svg className="money-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.2v17.6M7 4.4h6.1A6.7 6.7 0 0 1 20 12a6.7 6.7 0 0 1-6.9 7.6H7" />
        <path d="M4.2 9.1h13.2M4.2 14.4h13.2" />
      </svg>
    );
  }
  if (code === "OMR") {
    return (
      <svg className="money-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 12.2c2.4-5.4 9.4-6.6 12.4-2.4 1.3 1.8-.4 3.6-3 3.4H11" />
        <path d="M3.2 15.6h17.6M3.2 19.4h17.6" />
      </svg>
    );
  }
  return (
    <svg className="money-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.8 2.8v8.8c0 5-3.4 8.6-8.6 8.6" />
      <path d="M4.4 8.2h13.2M4.4 12.4h13.2" />
    </svg>
  );
}

export default function Money({ value, currency = "SAR" }) {
  const amount = Number(value || 0).toLocaleString("en-US");
  const code = String(currency || "SAR").trim().toUpperCase();
  const drawn = code === "SAR" || code === "AED" || code === "OMR";
  return (
    <span className="money-amount">
      {drawn ? <Glyph code={code} /> : <span className="money-code">{code}</span>}
      <span>{amount}</span>
    </span>
  );
}
