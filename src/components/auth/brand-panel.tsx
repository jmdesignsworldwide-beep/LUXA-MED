import Image from "next/image";

/**
 * Panel de marca del login. Azul institucional + atmósfera de oxígeno (cian
 * sutil) + el logo (que ya incluye LUXAMED / HIPERBÁRICA). Sin frase.
 *
 * Responsive: en móvil es una banda superior compacta; en desktop ocupa la
 * mitad izquierda a pantalla completa.
 */
export function BrandPanel() {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden bg-primary px-6 py-12 lg:p-12">
      {/* Atmósfera de oxígeno (degradados sutiles) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-cyan/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Logo dentro de una cápsula blanca (rima con la marca) */}
      <div className="relative z-10">
        <div className="rounded-capsule bg-white p-6 shadow-lift lg:p-9">
          <Image
            src="/luxamed-logo.jpeg"
            alt="LUXAMED Hiperbárica"
            width={1172}
            height={798}
            priority
            className="h-auto w-44 lg:w-80"
          />
        </div>
      </div>
    </div>
  );
}
