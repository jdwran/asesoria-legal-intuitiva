import { z } from "zod";

import { ORIENTATION_FORM_LIMITS } from "./orientation-form.ts";

export const orientationRequestSchema = z.object({
  story: z
    .string()
    .trim()
    .min(ORIENTATION_FORM_LIMITS.storyMin)
    .max(ORIENTATION_FORM_LIMITS.storyMax),
  city: z
    .string()
    .trim()
    .min(ORIENTATION_FORM_LIMITS.cityMin)
    .max(ORIENTATION_FORM_LIMITS.cityMax),
  processingConsent: z.literal(true),
});
