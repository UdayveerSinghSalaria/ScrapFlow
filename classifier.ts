export type ClassifierMaterial = "Iron" | "Steel" | "Stainless Steel" | "Aluminium" | "Copper" | "Brass" | "Plastic" | "Mixed Scrap"

export type ClassifierComposition = {
  material: ClassifierMaterial
  percentage: number
  grade: string
  confidence: number
}

export type ClassifierResult = {
  success: boolean
  classification?: {
    material: ClassifierMaterial
    grade: string
    confidence: number
    contamination_percent: number
    reason: string
    manual_verification_required: boolean
    composition: ClassifierComposition[]
  }
  fallback?: ClassifierResult["classification"]
  error?: string
}

const API_URL = import.meta.env.VITE_CLASSIFIER_API_URL || "http://127.0.0.1:8000"

export async function classifyScrap(
  file: File | null,
  kg: number,
  materialHint?: string,
  notes?: string,
): Promise<ClassifierResult> {
  if (!file) throw new Error("Upload a scrap image before running the scan.")
  const form = new FormData()
  form.append("image", file)
  form.append("weight_kg", String(kg))
  if (materialHint) form.append("material_hint", materialHint)
  if (notes) form.append("notes", notes)
  const response = await fetch(`${API_URL}/classify/upload`, { method: "POST", body: form })
  if (!response.ok) throw new Error(`Classifier request failed (${response.status}).`)
  const result = await response.json() as ClassifierResult
  if (!result.success) throw new Error(result.error || "The classifier could not analyze this image.")
  return result
}
