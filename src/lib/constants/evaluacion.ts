/** Opciones del formulario de Evaluación Hiperbárica. */

export const ANTECEDENTES = [
  { key: "diabetes", label: "Diabetes" },
  { key: "hipertension", label: "Hipertensión" },
  { key: "cardiopatia", label: "Cardiopatía" },
  { key: "acv", label: "ACV" },
  { key: "asma", label: "Asma" },
  { key: "epoc", label: "EPOC" },
  { key: "insuf_renal", label: "Insuf. renal" },
  { key: "insuf_hepatica", label: "Insuf. hepática" },
  { key: "neurologicos", label: "Neurológicos" },
  { key: "cancer", label: "Cáncer" },
  { key: "cirugias", label: "Cirugías" },
  { key: "tabaquismo", label: "Tabaquismo" },
  { key: "alcohol", label: "Alcohol" },
] as const;

export const INDICACIONES_HBO = [
  { key: "pie_diabetico", label: "Pie diabético" },
  { key: "herida_cronica", label: "Herida crónica" },
  { key: "lesion_traumatica", label: "Lesión traumática" },
  { key: "osteomielitis", label: "Osteomielitis" },
  { key: "injerto_comprometido", label: "Injerto comprometido" },
  { key: "osteonecrosis", label: "Osteonecrosis" },
  { key: "lesion_deportiva", label: "Lesión deportiva" },
  { key: "postquirurgico", label: "Postquirúrgico" },
  { key: "intox_co", label: "Intoxicación por CO" },
] as const;

export const CONTRAINDICACIONES_RELATIVAS = [
  { key: "claustrofobia", label: "Claustrofobia" },
  { key: "epilepsia", label: "Epilepsia" },
  { key: "cirugia_oido", label: "Cirugía de oído" },
  { key: "sinusitis", label: "Sinusitis" },
  { key: "epoc_severo", label: "EPOC severo" },
  { key: "embarazo", label: "Embarazo" },
  { key: "fiebre", label: "Fiebre" },
  { key: "bleomicina", label: "Bleomicina" },
  { key: "doxorrubicina", label: "Doxorrubicina" },
  { key: "cisplatino", label: "Cisplatino" },
  { key: "cirugia_toracica", label: "Cirugía torácica" },
] as const;

/** Prefijos de los checkboxes en el formulario (para agruparlos en JSONB). */
export const PREFIJOS = {
  antecedente: "ant_",
  indicacion: "ind_",
  contraindicacion: "ci_",
} as const;

export const OTOSCOPIA_OPCIONES = ["normal", "alterada"] as const;
