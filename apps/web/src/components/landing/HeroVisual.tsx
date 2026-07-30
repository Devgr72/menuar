/**
 * Hero artwork — the QR table stand, brand lockup and phone showing a dish in AR.
 * The peach backdrop, dotted accent and table surface are all baked into the
 * image, so this only handles the bleed toward the right edge of the viewport.
 */
export default function HeroVisual() {
  return (
    <div className="relative lg:-mr-10 xl:-mr-16">
      <picture>
        <source srcSet="/images/hero.webp" type="image/webp" />
        <img
          src="/images/hero.jpg"
          alt="A DishDekho QR table stand next to a phone showing Paneer Tikka previewed in augmented reality"
          width={1400}
          height={921}
          decoding="async"
          loading="eager"
          className="h-auto w-full"
        />
      </picture>
    </div>
  )
}
