# PENDIENTES — Decisiones abiertas (fiscal / legal / RD)

> Marien decide; aquí dejo las dudas que **NO** debemos asumir a la ligera.
> Nada de esto está implementado todavía: son decisiones que afectan el diseño
> de facturación, consentimiento y manejo de datos. Pongo opciones y mi
> recomendación honesta, pero la decisión es tuya.

---

## 1. Comprobante fiscal: NCF vs e-CF (facturación electrónica)

**La duda:** ¿LUXAMED emite comprobantes con **NCF** tradicional o ya entra
directo a **e-CF** (factura electrónica de la DGII)?

- La DGII viene empujando la **facturación electrónica (e-CF)** con un
  calendario obligatorio escalonado por tamaño de contribuyente. Hay que
  confirmar **en qué tramo del calendario cae la clínica y su fecha límite**.
- Diseñar para NCF y migrar luego a e-CF es retrabajo. Si la obligatoriedad
  está cerca, conviene diseñar el modelo de datos pensando en e-CF desde ya.

**Necesito de ti / del contador:**
- [ ] ¿La clínica ya está designada como emisor de e-CF? ¿Fecha de entrada?
- [ ] ¿Qué tipos de comprobante usaremos (consumo, crédito fiscal, etc.)?
- [ ] ¿Hay proveedor/PSF (proveedor de servicios) o se conecta directo a DGII?

**Recomendación:** confirmar con el contador antes de modelar facturación. No
asumir NCF “porque es lo de siempre”.

---

## 2. ITBIS en servicios de salud — **NO asumir 18%**

**La duda:** ¿Los servicios de la clínica hiperbárica están **exentos**,
**gravados** o **mixtos** de ITBIS?

- Muchos **servicios de salud** están **exentos** de ITBIS en RD, pero **no
  todo** lo que factura una clínica es necesariamente “servicio de salud
  exento” (ej. venta de productos, ciertos insumos, servicios no médicos).
- Poner 18% “por defecto” en el sistema sería un **error fiscal**.

**Necesito de ti / del contador:**
- [ ] ¿La terapia hiperbárica se factura como servicio de salud exento?
- [ ] ¿Hay líneas que sí lleven ITBIS (productos, alquileres, etc.)?
- [ ] ¿Cómo se maneja en los comprobantes (exento vs tasa cero vs gravado)?

**Recomendación:** modelar el ITBIS como **configurable por concepto/ítem**,
con default **exento** para servicios médicos hasta confirmación escrita del
contador. Nunca hardcodear 18%.

---

## 3. Consentimiento informado y datos personales — **Ley 172-13**

**La duda:** cumplimiento de la **Ley 172-13** (protección de datos de carácter
personal en RD) para datos médicos sensibles.

- Los datos clínicos son **datos sensibles**. Necesitan **consentimiento
  informado** del paciente para su tratamiento y almacenamiento.
- Hay que definir: texto del consentimiento, cómo se registra (firma física,
  digital, fecha), retención, y derechos del titular (acceso, rectificación).

**Necesito de ti / asesoría legal:**
- [ ] Texto oficial del consentimiento (¿lo redacta un abogado?).
- [ ] ¿Consentimiento en papel digitalizado, o firma dentro del sistema?
- [ ] Política de **retención** y de **eliminación/anonimización** de datos.
- [ ] Definir base legal del tratamiento y encargado/responsable de datos.

**Recomendación:** dejar en el esquema un lugar para **registrar el
consentimiento** (versión del texto, fecha, quién lo capturó) antes de manejar
datos clínicos en producción. La auditoría (`audit_log`) ya ayuda a demostrar
trazabilidad.

---

## Estado

| # | Tema | Estado | Responsable |
|---|------|--------|-------------|
| 1 | NCF vs e-CF | ⏳ Abierto | Marien + contador |
| 2 | ITBIS en salud | ⏳ Abierto | Marien + contador |
| 3 | Consentimiento Ley 172-13 | ⏳ Abierto | Marien + legal |
