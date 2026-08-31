import {
  PartialProductionFormSchema,
  type PartialProductionFormData,
} from "../types/production-form.types.js";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function validateProductionFormInput(
  input: unknown,
): ValidationResult<PartialProductionFormData> {
  if (typeof input !== "object" || input === null) {
    return { success: false, errors: ["Input payload must be a non-null object"] };
  }

  const result = PartialProductionFormSchema.safeParse(input);

  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    );
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
