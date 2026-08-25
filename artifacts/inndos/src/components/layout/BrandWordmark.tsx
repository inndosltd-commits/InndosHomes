type Props = {
  inverse?: boolean;
  className?: string;
};

export function BrandWordmark({ inverse = false, className = "" }: Props) {
  return (
    <img
      src="/logo.png"
      alt="inndos"
      className={`w-auto ${className}`}
      style={{
        height: "36px",
        maxWidth: "none",
        ...(inverse ? { filter: "invert(1)" } : {}),
      }}
    />
  );
}