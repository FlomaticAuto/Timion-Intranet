interface TileGridProps {
  children: React.ReactNode;
  /** Use larger tiles, suitable for the Home page hero grid. */
  hero?: boolean;
}

/**
 * Responsive grid for tiles. Children are auto-coloured by position
 * via the CSS `:nth-child(4n+x)` rules in globals.css.
 */
export function TileGrid({ children, hero = false }: TileGridProps) {
  return (
    <div
      className={[
        "tile-grid grid gap-[18px] mb-9",
        hero
          ? "[grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-5"
          : "[grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
