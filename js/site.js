// A mouse wheel only scrolls up and down, so over the publications row it
// moves the row sideways instead, until the row's end; then the page carries
// on. Trackpads and touch already scroll sideways and are left alone.
const cards = document.getElementById("cards");

if (cards) {
  cards.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const end = cards.scrollWidth - cards.clientWidth;
      const canMove = event.deltaY > 0 ? cards.scrollLeft < end - 1 : cards.scrollLeft > 1;
      if (!canMove) return;
      event.preventDefault();
      cards.scrollBy({ left: event.deltaY, behavior: "instant" });
    },
    { passive: false }
  );
}
