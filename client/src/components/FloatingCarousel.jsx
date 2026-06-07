import { useEffect, useState } from 'react';

const INTERVAL_MS = 5000;

export default function FloatingCarousel({ items, renderSlide, emptyMessage = 'Nothing scheduled', accent = '#1e4d8c' }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (!items?.length || items.length <= 1) return undefined;

    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 400);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [items]);

  if (!items?.length) {
    return <div className="floating-carousel empty">{emptyMessage}</div>;
  }

  const slide = items[index];

  return (
    <div className="floating-carousel" style={{ '--carousel-accent': accent }}>
      <div className={`floating-slide ${visible ? 'in' : 'out'}`}>
        {renderSlide(slide, index)}
      </div>
      {items.length > 1 && (
        <div className="floating-dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`floating-dot ${i === index ? 'active' : ''}`}
              aria-label={`Slide ${i + 1}`}
              onClick={() => {
                setVisible(false);
                setTimeout(() => {
                  setIndex(i);
                  setVisible(true);
                }, 200);
              }}
            />
          ))}
        </div>
      )}
      {items.length > 1 && (
        <div className="floating-counter">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}
