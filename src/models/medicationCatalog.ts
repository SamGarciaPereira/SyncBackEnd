
import type { DosageUnit, MedicationForm } from "@/generated/prisma/client";

/**
 * Exemplos de medicamentos para facilitar a busca no cadastro.
 * Estes dados não representam prescrições ou recomendações de dosagem.
 */
interface CatalogSeedItem {
  name: string;
  activeIngredient: string;
  concentration: string;
  form: MedicationForm;
  defaultUnit: DosageUnit;
  allowedUnits: DosageUnit[];
  allowsSplitting: boolean;
  requiresFasting: boolean;
  defaultInstructions?: string;
}

const FORM_DEFAULTS: Record<
  MedicationForm,
  { defaultUnit: DosageUnit; allowedUnits: DosageUnit[] }
> = {
  TABLET: {
    defaultUnit: "PILULA",
    allowedUnits: ["PILULA", "MG"],
  },
  CAPSULE: {
    defaultUnit: "PILULA",
    allowedUnits: ["PILULA", "MG"],
  },
  DROPS: {
    defaultUnit: "GOTAS",
    allowedUnits: ["GOTAS", "ML"],
  },
  LIQUID: {
    defaultUnit: "ML",
    allowedUnits: ["ML", "MG"],
  },
  INJECTION: {
    defaultUnit: "APLICACAO",
    allowedUnits: ["APLICACAO", "MG", "ML"],
  },
  INHALER: {
    defaultUnit: "JATO",
    allowedUnits: ["JATO", "APLICACAO"],
  },
  TOPICAL: {
    defaultUnit: "APLICACAO",
    allowedUnits: ["APLICACAO", "MG"],
  },
  PATCH: {
    defaultUnit: "APLICACAO",
    allowedUnits: ["APLICACAO", "MG"],
  },
};

function example(
  name: string,
  activeIngredient: string,
  concentration: string,
  form: MedicationForm,
  options: Partial<
    Pick<
      CatalogSeedItem,
      | "defaultUnit"
      | "allowedUnits"
      | "allowsSplitting"
      | "requiresFasting"
      | "defaultInstructions"
    >
  > = {},
): CatalogSeedItem {
  return {
    name,
    activeIngredient,
    concentration,
    form,
    ...FORM_DEFAULTS[form],
    allowsSplitting: false,
    requiresFasting: false,
    ...options,
  };
}

export const MEDICATION_CATALOG: CatalogSeedItem[] = [
  // Medicamentos originais do SYNC
  example("Losartana Potássica 50mg", "Losartana Potássica", "50mg", "TABLET", {
    allowsSplitting: true,
    defaultInstructions: "Pode ser administrado com ou sem alimentos.",
  }),
  example("Dipirona Monoidratada 500mg/mL (Gotas)", "Dipirona", "500mg/mL", "DROPS", {
    defaultInstructions: "Agitar antes de usar.",
  }),
  example("Omeprazol 20mg", "Omeprazol", "20mg", "CAPSULE", {
    allowedUnits: ["PILULA"],
    requiresFasting: true,
    defaultInstructions:
      "Tomar em jejum, 30 minutos antes do café da manhã. Não abrir ou mastigar a cápsula.",
  }),
  example("Insulina NPH 100 UI/mL", "Insulina Humana", "100 UI/mL", "INJECTION", {
    defaultUnit: "UI",
    allowedUnits: ["UI", "ML"],
    allowsSplitting: true,
    defaultInstructions: "Manter sob refrigeração. Homogeneizar suavemente antes de aplicar.",
  }),
  example("Xarope Cloridrato de Ambroxol 30mg/5mL", "Cloridrato de Ambroxol", "30mg/5mL", "LIQUID", {
    allowedUnits: ["ML"],
    allowsSplitting: true,
    defaultInstructions: "Utilizar o copo dosador.",
  }),

  // Comprimidos
  example("Losartana Potássica 25mg", "Losartana Potássica", "25mg", "TABLET"),
  example("Losartana Potássica 100mg", "Losartana Potássica", "100mg", "TABLET"),
  example("Atenolol 25mg", "Atenolol", "25mg", "TABLET"),
  example("Atenolol 50mg", "Atenolol", "50mg", "TABLET"),
  example("Besilato de Anlodipino 5mg", "Anlodipino", "5mg", "TABLET"),
  example("Besilato de Anlodipino 10mg", "Anlodipino", "10mg", "TABLET"),
  example("Enalapril 10mg", "Enalapril", "10mg", "TABLET"),
  example("Enalapril 20mg", "Enalapril", "20mg", "TABLET"),
  example("Hidroclorotiazida 25mg", "Hidroclorotiazida", "25mg", "TABLET"),
  example("Furosemida 40mg", "Furosemida", "40mg", "TABLET"),
  example("Espironolactona 25mg", "Espironolactona", "25mg", "TABLET"),
  example("Carvedilol 6,25mg", "Carvedilol", "6,25mg", "TABLET"),
  example("Valsartana 80mg", "Valsartana", "80mg", "TABLET"),
  example("Cloridrato de Metformina 500mg", "Metformina", "500mg", "TABLET"),
  example("Cloridrato de Metformina 850mg", "Metformina", "850mg", "TABLET"),
  example("Gliclazida MR 30mg", "Gliclazida", "30mg", "TABLET"),
  example("Sitagliptina 100mg", "Sitagliptina", "100mg", "TABLET"),
  example("Levotiroxina Sódica 25mcg", "Levotiroxina Sódica", "25mcg", "TABLET", {
    allowedUnits: ["PILULA"],
    requiresFasting: true,
  }),
  example("Levotiroxina Sódica 50mcg", "Levotiroxina Sódica", "50mcg", "TABLET", {
    allowedUnits: ["PILULA"],
    requiresFasting: true,
  }),
  example("Levotiroxina Sódica 100mcg", "Levotiroxina Sódica", "100mcg", "TABLET", {
    allowedUnits: ["PILULA"],
    requiresFasting: true,
  }),
  example("Sinvastatina 20mg", "Sinvastatina", "20mg", "TABLET"),
  example("Sinvastatina 40mg", "Sinvastatina", "40mg", "TABLET"),
  example("Atorvastatina 20mg", "Atorvastatina", "20mg", "TABLET"),
  example("Rosuvastatina 10mg", "Rosuvastatina", "10mg", "TABLET"),
  example("Paracetamol 500mg", "Paracetamol", "500mg", "TABLET"),
  example("Paracetamol 750mg", "Paracetamol", "750mg", "TABLET"),
  example("Dipirona Monoidratada 500mg (Comprimido)", "Dipirona", "500mg", "TABLET"),
  example("Ibuprofeno 400mg", "Ibuprofeno", "400mg", "TABLET"),
  example("Loratadina 10mg", "Loratadina", "10mg", "TABLET"),
  example("Cetirizina 10mg", "Cetirizina", "10mg", "TABLET"),
  example("Fexofenadina 120mg", "Fexofenadina", "120mg", "TABLET"),
  example("Pantoprazol 40mg", "Pantoprazol", "40mg", "TABLET"),
  example("Sertralina 50mg", "Sertralina", "50mg", "TABLET"),
  example("Escitalopram 10mg", "Escitalopram", "10mg", "TABLET"),
  example("Clopidogrel 75mg", "Clopidogrel", "75mg", "TABLET"),
  example("Rivaroxabana 20mg", "Rivaroxabana", "20mg", "TABLET"),
  example("Apixabana 5mg", "Apixabana", "5mg", "TABLET"),
  example("Alopurinol 100mg", "Alopurinol", "100mg", "TABLET"),
  example("Donepezila 10mg", "Donepezila", "10mg", "TABLET"),
  example("Memantina 10mg", "Memantina", "10mg", "TABLET"),

  // Cápsulas
  example("Amoxicilina 500mg", "Amoxicilina", "500mg", "CAPSULE"),
  example("Cefalexina 500mg", "Cefalexina", "500mg", "CAPSULE"),
  example("Omeprazol 40mg", "Omeprazol", "40mg", "CAPSULE", {
    requiresFasting: true,
  }),
  example("Fluoxetina 20mg", "Fluoxetina", "20mg", "CAPSULE"),
  example("Pregabalina 75mg", "Pregabalina", "75mg", "CAPSULE"),
  example("Gabapentina 300mg", "Gabapentina", "300mg", "CAPSULE"),
  example("Duloxetina 30mg", "Duloxetina", "30mg", "CAPSULE"),

  // Gotas
  example("Paracetamol 200mg/mL (Gotas)", "Paracetamol", "200mg/mL", "DROPS"),
  example("Simeticona 75mg/mL (Gotas)", "Simeticona", "75mg/mL", "DROPS"),
  example("Ibuprofeno 50mg/mL (Gotas)", "Ibuprofeno", "50mg/mL", "DROPS"),
  example("Clonazepam 2,5mg/mL (Gotas)", "Clonazepam", "2,5mg/mL", "DROPS"),

  // Líquidos
  example("Loratadina 1mg/mL (Xarope)", "Loratadina", "1mg/mL", "LIQUID"),
  example("Paracetamol 32mg/mL (Suspensão oral)", "Paracetamol", "32mg/mL", "LIQUID"),
  example("Amoxicilina 250mg/5mL (Suspensão oral)", "Amoxicilina", "250mg/5mL", "LIQUID"),
  example("Cefalexina 250mg/5mL (Suspensão oral)", "Cefalexina", "250mg/5mL", "LIQUID"),
  example("Lactulose 667mg/mL (Xarope)", "Lactulose", "667mg/mL", "LIQUID"),

  // Injetáveis
  example("Insulina Regular 100 UI/mL", "Insulina Humana", "100 UI/mL", "INJECTION", {
    defaultUnit: "UI",
    allowedUnits: ["UI", "ML"],
  }),
  example("Insulina Glargina 100 UI/mL", "Insulina Glargina", "100 UI/mL", "INJECTION", {
    defaultUnit: "UI",
    allowedUnits: ["UI", "ML"],
  }),
  example("Enoxaparina 40mg/0,4mL", "Enoxaparina", "40mg/0,4mL", "INJECTION"),

  // Inaladores
  example("Salbutamol 100mcg/jato (Aerossol)", "Salbutamol", "100mcg/jato", "INHALER"),
  example("Beclometasona 250mcg/jato (Aerossol)", "Beclometasona", "250mcg/jato", "INHALER"),
  example("Budesonida + Formoterol 160/4,5mcg (Inalador)", "Budesonida + Formoterol", "160/4,5mcg", "INHALER"),

  // Cremes e géis
  example("Diclofenaco Dietilamônio 11,6mg/g (Gel)", "Diclofenaco Dietilamônio", "11,6mg/g", "TOPICAL"),
  example("Clotrimazol 10mg/g (Creme)", "Clotrimazol", "10mg/g", "TOPICAL"),
  example("Cetoconazol 20mg/g (Creme)", "Cetoconazol", "20mg/g", "TOPICAL"),
  example("Dexametasona 1mg/g (Creme)", "Dexametasona", "1mg/g", "TOPICAL"),

  // Adesivos
  example("Rivastigmina 4,6mg/24h (Adesivo)", "Rivastigmina", "4,6mg/24h", "PATCH"),
  example("Rivastigmina 9,5mg/24h (Adesivo)", "Rivastigmina", "9,5mg/24h", "PATCH"),
];
