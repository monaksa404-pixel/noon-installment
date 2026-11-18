import "./AcceptedCards.css";

const CARDS = [
  { src: "/images/cards/visa.jpeg", alt: "Visa" },
  { src: "/images/cards/mastercard.jpeg", alt: "Mastercard" },
  { src: "/images/cards/mada.jpeg", alt: "mada" },
];

export default function AcceptedCards({ variant = "row" }) {
  return (
    <div className={variant === "otp" ? "accepted-cards accepted-cards-otp" : "accepted-cards"} aria-label="Accepted cards">
      {CARDS.map((card) => (
        <span key={card.alt}>
          <img src={card.src} alt={card.alt} />
        </span>
      ))}
    </div>
  );
}
