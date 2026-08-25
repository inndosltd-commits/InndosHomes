type Props = {
  inverse?: boolean;
  className?: string;
};

export function BrandWordmark({ inverse = false, className = "" }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center leading-none font-[Outfit] font-bold tracking-[-0.09em] text-[34px]",
        inverse
          ? "bg-black px-2 py-1 text-white"
          : "bg-transparent text-black dark:bg-black dark:px-2 dark:py-1 dark:text-white",
        className,
      ].join(" ")}
      aria-label="inndos"
    >
      inndos
    </span>
  );
}