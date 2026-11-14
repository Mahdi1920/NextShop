import { z } from "zod";

const COMMON_EMAIL_TLDS = new Set(
  `com org net edu gov mil int info biz name pro aero coop museum app dev io ai co me tv xyz online site store shop cloud tech digital email agency solutions company blog design finance media marketing services systems today world live art academy center city global international`
    .split(" "),
);

const hasValidEmailDomain = (email: string) => {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const labels = domain.split(".");
  const tld = labels[labels.length - 1].toLowerCase();

  return (
    domain.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
    ) &&
    tld.length >= 2 &&
    /[a-z]/i.test(tld) &&
    (COMMON_EMAIL_TLDS.has(tld) || /^[a-z]{2}$/i.test(tld))
  );
};

export const emailWithValidDomain = (label = "Email") =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(254, `${label} is too long`)
    .email(`Enter a valid ${label.toLowerCase()} address`)
    .refine((value) => /^[\x00-\x7F]+$/.test(value), `${label} must use English characters`)
    .refine(
      hasValidEmailDomain,
      `Enter an email address with a recognized domain (for example, name@example.com)`,
    );

export const signupSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(100, "Full name must be 100 characters or fewer")
    .regex(/^[\p{L}]+(?: [\p{L}]+)*$/u, "Full name can contain only alphabetic characters and spaces"),

  username: z
    .string()
    .trim()
    .min(3, "Username must contain at least 3 characters")
    .max(30, "Username must be 30 characters or fewer")
    .regex(/^[A-Za-z0-9]+$/, "Username can contain only letters and numbers"),

  email: emailWithValidDomain(),

  password: z
    .string()
    .min(6, "Password must contain at least 6 characters")
    .max(72, "Password must be 72 characters or fewer")
    .regex(
      /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\x21-\x7E]{6,72}$/,
      "Password must use English characters and include an uppercase letter, a number, and a special character",
    ),

  // ADMIN exists in the backend enum, but public registration rejects it.
  role: z.enum(["CUSTOMER", "SELLER"]).optional(),

  address: z.string().trim().min(1, "Address is required").max(1000, "Address must be 1000 characters or fewer"),
  addresses: z.array(z.string().trim().min(1, "Each address is required").max(1000, "Address must be 1000 characters or fewer")).min(1, "At least one address is required").max(10, "You can add up to 10 addresses"),

  phone: z.string().trim().regex(/^\d{8,15}$/, "Phone must contain only digits (8 to 15 digits)"),

  avatar: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .url("Avatar must be a valid URL")
      .refine((value) => /^https?:\/\//i.test(value), "Avatar URL must use HTTP or HTTPS"),
  ]),
});

export type SignupFormData = z.infer<typeof signupSchema>; 
