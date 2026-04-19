import React from "react";

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  description?: string;
  bullets?: string[];
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  description,
  bullets,
}) => {
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">{title}</h1>
          {subtitle && <div className="page__subtitle">{subtitle}</div>}
        </div>
      </header>

      <section className="page__body">
        <div className="placeholder">
          <div className="placeholder__badge">Coming soon</div>
          <h2 className="placeholder__title">{title} workspace</h2>
          <p className="placeholder__desc">
            {description ??
              `The dedicated ${title.toLowerCase()} view is on the way. Core data for this area is already flowing through the backend.`}
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="placeholder__list">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default PlaceholderPage;
