/** The app's logo (public/logo.png): a gold line drawing of a tower. `size` is its height in pixels. */
export function Mark({ size = 28 }: { size?: number }) {
  return <img className="mark" src={`${import.meta.env.BASE_URL}logo.png`} alt="" height={size} width={Math.round(size * 1.06)} />;
}
