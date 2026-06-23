"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

type Cat = { id: string; nombre: string };

export function FiltroCategorias({
  categorias,
  seleccion,
}: {
  categorias: Cat[];
  seleccion: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const ir = (ids: string[]) => {
    const params = new URLSearchParams();
    const desde = sp.get("desde");
    const hasta = sp.get("hasta");
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    ids.forEach((id) => params.append("cat", id));
    router.push(`/finanzas?${params.toString()}`);
  };

  const toggle = (id: string) => {
    const set = new Set(seleccion);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    ir(Array.from(set));
  };

  const chip = (activo: boolean) =>
    `inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-breath ${
      activo
        ? "border-primary bg-primary text-primary-foreground shadow-soft"
        : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => ir([])} className={chip(seleccion.length === 0)}>
        Todas
      </button>
      {categorias.map((c) => {
        const activo = seleccion.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => toggle(c.id)} className={chip(activo)}>
            {activo && <Check className="h-3.5 w-3.5" />}
            {c.nombre}
          </button>
        );
      })}
    </div>
  );
}
