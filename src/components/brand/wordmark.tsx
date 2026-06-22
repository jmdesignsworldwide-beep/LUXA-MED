import { cn } from "@/lib/utils";

/**
 * Marca LUXAMED escrita como en el logo: LUXAMED grande con HIPERBÁRICA
 * más pequeña debajo. Fuente única — úsala en vez de escribir el nombre a mano.
 *
 * El color se hereda del contenedor (text-primary por defecto). Para fondos
 * de marca (azul), pásale className="text-white".
 */
export function Wordmark({
  className,
  size = "md",
  sub = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  sub?: boolean;
}) {
  const main = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-5xl sm:text-6xl",
  }[size];

  const subSize = {
    sm: "text-[0.5rem] tracking-[0.3em]",
    md: "text-[0.62rem] tracking-[0.35em]",
    lg: "text-xs tracking-[0.42em]",
    xl: "text-sm tracking-[0.5em] sm:text-base",
  }[size];

  return (
    <div className={cn("leading-none text-primary", className)}>
      <div className={cn("font-extrabold tracking-tight", main)}>LUXAMED</div>
      {sub && (
        <div className={cn("mt-1 font-semibold uppercase opacity-80", subSize)}>
          Hiperbárica
        </div>
      )}
    </div>
  );
}
