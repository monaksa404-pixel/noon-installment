import "./Money.css";

const ICONS = {
  SAR: "/images/currency/sar.svg",
  AED: "/images/currency/aed.svg",
  OMR: "/images/currency/omr.svg",
};

export default function Money({ value, currency = "SAR" }) {
  const amount = Number(value || 0).toLocaleString("en-US");
  const code = String(currency || "SAR").trim().toUpperCase();
  const icon = ICONS[code];
  return (
    <span className="money-amount">
      {icon ? (
        <img className="money-glyph" src={icon} alt="" />
      ) : (
        <span className="money-code">{code}</span>
      )}
      <span>{amount}</span>
    </span>
  );
}
