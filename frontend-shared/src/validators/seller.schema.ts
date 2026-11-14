import { z } from "zod";
import { PaymentMethod } from "@shared/enums";
import { emailWithValidDomain } from "./auth.schema";

const IBAN_PATTERNS: Record<string, RegExp> = {
  AD: /^AD\d{2}\d{8}[A-Z0-9]{12}$/, AE: /^AE\d{2}\d{19}$/, AL: /^AL\d{2}\d{8}[A-Z0-9]{16}$/,
  AT: /^AT\d{2}\d{16}$/, AZ: /^AZ\d{2}[A-Z0-9]{4}\d{20}$/, BA: /^BA\d{2}\d{16}$/,
  BE: /^BE\d{2}\d{12}$/, BG: /^BG\d{2}[A-Z]{4}\d{6}[A-Z0-9]{8}$/, BH: /^BH\d{2}[A-Z]{4}[A-Z0-9]{14}$/,
  BR: /^BR\d{2}\d{23}[A-Z][A-Z0-9]$/, BY: /^BY\d{2}[A-Z0-9]{4}\d{20}$/, CH: /^CH\d{2}\d{5}[A-Z0-9]{12}$/,
  CR: /^CR\d{2}\d{18}$/, CY: /^CY\d{2}\d{8}[A-Z0-9]{16}$/, CZ: /^CZ\d{2}\d{20}$/,
  DE: /^DE\d{2}\d{18}$/, DK: /^DK\d{2}\d{14}$/, DO: /^DO\d{2}[A-Z]{4}\d{20}$/,
  DZ: /^DZ\d{24}$/, EE: /^EE\d{2}\d{16}$/, EG: /^EG\d{2}\d{25}$/, ES: /^ES\d{2}\d{20}$/,
  FI: /^FI\d{2}\d{14}$/, FO: /^FO\d{2}\d{14}$/, FR: /^FR\d{2}\d{10}[A-Z0-9]{11}\d{2}$/,
  GB: /^GB\d{2}[A-Z]{4}\d{14}$/, GE: /^GE\d{2}[A-Z0-9]{2}\d{16}$/, GI: /^GI\d{2}[A-Z]{4}[A-Z0-9]{15}$/,
  GL: /^GL\d{2}\d{14}$/, GR: /^GR\d{2}\d{7}[A-Z0-9]{16}$/, GT: /^GT\d{2}[A-Z0-9]{24}$/,
  HR: /^HR\d{2}\d{17}$/, HU: /^HU\d{2}\d{24}$/, IE: /^IE\d{2}[A-Z]{4}\d{14}$/,
  IL: /^IL\d{2}\d{19}$/, IQ: /^IQ\d{2}[A-Z]{4}\d{15}$/, IR: /^IR\d{2}0\d{2}0\d{18}$/,
  IS: /^IS\d{2}\d{22}$/, IT: /^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/, JO: /^JO\d{2}[A-Z]{4}\d{22}$/,
  KW: /^KW\d{2}[A-Z]{4}[A-Z0-9]{22}$/, KZ: /^KZ\d{2}\d{3}[A-Z0-9]{13}$/, LB: /^LB\d{2}\d{4}[A-Z0-9]{20}$/,
  LC: /^LC\d{2}[A-Z]{4}[A-Z0-9]{24}$/, LI: /^LI\d{2}\d{5}[A-Z0-9]{12}$/, LT: /^LT\d{2}\d{16}$/,
  LU: /^LU\d{2}\d{3}[A-Z0-9]{13}$/, LV: /^LV\d{2}[A-Z]{4}[A-Z0-9]{13}$/, MA: /^MA\d{26}$/,
  MC: /^MC\d{2}\d{10}[A-Z0-9]{11}\d{2}$/, MD: /^MD\d{2}[A-Z0-9]{20}$/, ME: /^ME\d{2}\d{18}$/,
  MK: /^MK\d{2}\d{3}[A-Z0-9]{10}\d{2}$/, MR: /^MR\d{2}\d{23}$/, MT: /^MT\d{2}[A-Z]{4}\d{5}[A-Z0-9]{18}$/,
  MU: /^MU\d{2}[A-Z]{4}\d{19}[A-Z]{3}$/, MZ: /^MZ\d{2}\d{21}$/, NL: /^NL\d{2}[A-Z]{4}\d{10}$/,
  NO: /^NO\d{2}\d{11}$/, PK: /^PK\d{2}[A-Z0-9]{4}\d{16}$/, PL: /^PL\d{2}\d{24}$/,
  PS: /^PS\d{2}[A-Z]{4}[A-Z0-9]{21}$/, PT: /^PT\d{2}\d{21}$/, QA: /^QA\d{2}[A-Z]{4}[A-Z0-9]{21}$/,
  RO: /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/, RS: /^RS\d{2}\d{18}$/, SA: /^SA\d{2}\d{2}[A-Z0-9]{18}$/,
  SC: /^SC\d{2}[A-Z]{4}\d{20}[A-Z]{3}$/, SE: /^SE\d{2}\d{20}$/, SI: /^SI\d{2}\d{15}$/,
  SK: /^SK\d{2}\d{20}$/, SM: /^SM\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/, SV: /^SV\d{2}[A-Z0-9]{4}\d{20}$/,
  TL: /^TL\d{2}\d{19}$/, TN: /^TN\d{2}\d{20}$/, TR: /^TR\d{2}\d{5}[A-Z0-9]{17}$/,
  UA: /^UA\d{2}\d{6}[A-Z0-9]{19}$/, VA: /^VA\d{2}\d{18}$/, VG: /^VG\d{2}[A-Z]{4}\d{16}$/,
  XK: /^XK\d{2}\d{16}$/,
};
const ISO_COUNTRY_CODES = new Set(
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK`
    .split(" "),
);

function isValidIban(value: string): boolean {
  const iban = value.replace(/[\s-]/g, "").toUpperCase();
  if (!IBAN_PATTERNS[iban.slice(0, 2)]?.test(iban)) return false;

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const digits = char >= "A" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export const sellerSchema = z.object({
  shopName: z.string().trim().min(1, "Shop name is required").max(100, "Shop name is too long"),

  businessEmail: emailWithValidDomain("Business email"),

  businessPhone: z.string().trim().regex(/^\d{8,15}$/, "Business phone must contain only digits (8 to 15 digits)"),

  businessAddress: z
    .string()
    .trim()
    .min(1, "Business address is required")
    .max(1000, "Business address must be 1000 characters or fewer"),
  businessAddresses: z.array(z.string().trim().min(1, "Each business address is required").max(1000, "Business address must be 1000 characters or fewer")).min(1, "At least one business address is required").max(10, "You can add up to 10 business addresses"),

  identityDocument: z.object({
    type: z.enum(["ID_CARD", "PASSPORT"]),
  }),

  businessRegistration: z.object({
    registrationNumber: z
      .string()
      .trim()
      .min(1, "Registration number is required")
      .max(100, "Registration number must be 100 characters or fewer"),
  }),

  bankInfo: z.object({
    bankName: z.string().trim().max(100, "Bank name is too long").optional(),

    accountHolder: z
      .string()
      .trim()
      .min(1, "Account holder is required")
      .max(100, "Account holder must be 100 characters or fewer"),

    iban: z
      .string()
      .trim()
      .refine(isValidIban, "Enter a valid IBAN"),

    swift: z
      .string()
      .trim()
      .refine(
        (value) => {
          if (value === "") return true;
          const country = value.slice(4, 6).toUpperCase();
          return (
            /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/i.test(value) &&
            ISO_COUNTRY_CODES.has(country)
          );
        },
        "Enter a valid 8 or 11 character SWIFT/BIC code",
      )
      .optional(),

    paymentMethod: z
      .enum([PaymentMethod.BANK_CARD, PaymentMethod.CASH_ON_DELIVERY])
      .optional(),
  }),
});
