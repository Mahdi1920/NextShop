"use client";

import * as React from "react";
import { InputAdornment, MenuItem, Select, TextField } from "@mui/material";

type Country = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
};

const COUNTRIES: Country[] = [
  { code: "DZ", name: "Algeria", dialCode: "213", flag: "🇩🇿" },
  { code: "AR", name: "Argentina", dialCode: "54", flag: "🇦🇷" },
  { code: "AU", name: "Australia", dialCode: "61", flag: "🇦🇺" },
  { code: "AT", name: "Austria", dialCode: "43", flag: "🇦🇹" },
  { code: "BH", name: "Bahrain", dialCode: "973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", dialCode: "880", flag: "🇧🇩" },
  { code: "BE", name: "Belgium", dialCode: "32", flag: "🇧🇪" },
  { code: "BR", name: "Brazil", dialCode: "55", flag: "🇧🇷" },
  { code: "BG", name: "Bulgaria", dialCode: "359", flag: "🇧🇬" },
  { code: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦" },
  { code: "CL", name: "Chile", dialCode: "56", flag: "🇨🇱" },
  { code: "CN", name: "China", dialCode: "86", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", dialCode: "57", flag: "🇨🇴" },
  { code: "HR", name: "Croatia", dialCode: "385", flag: "🇭🇷" },
  { code: "CY", name: "Cyprus", dialCode: "357", flag: "🇨🇾" },
  { code: "CZ", name: "Czechia", dialCode: "420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", dialCode: "45", flag: "🇩🇰" },
  { code: "EG", name: "Egypt", dialCode: "20", flag: "🇪🇬" },
  { code: "FI", name: "Finland", dialCode: "358", flag: "🇫🇮" },
  { code: "FR", name: "France", dialCode: "33", flag: "🇫🇷" },
  { code: "GE", name: "Georgia", dialCode: "995", flag: "🇬🇪" },
  { code: "DE", name: "Germany", dialCode: "49", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭" },
  { code: "GR", name: "Greece", dialCode: "30", flag: "🇬🇷" },
  { code: "HK", name: "Hong Kong", dialCode: "852", flag: "🇭🇰" },
  { code: "HU", name: "Hungary", dialCode: "36", flag: "🇭🇺" },
  { code: "IN", name: "India", dialCode: "91", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", dialCode: "62", flag: "🇮🇩" },
  { code: "IE", name: "Ireland", dialCode: "353", flag: "🇮🇪" },
  { code: "IT", name: "Italy", dialCode: "39", flag: "🇮🇹" },
  { code: "JP", name: "Japan", dialCode: "81", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", dialCode: "962", flag: "🇯🇴" },
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪" },
  { code: "KW", name: "Kuwait", dialCode: "965", flag: "🇰🇼" },
  { code: "LB", name: "Lebanon", dialCode: "961", flag: "🇱🇧" },
  { code: "LU", name: "Luxembourg", dialCode: "352", flag: "🇱🇺" },
  { code: "MY", name: "Malaysia", dialCode: "60", flag: "🇲🇾" },
  { code: "MX", name: "Mexico", dialCode: "52", flag: "🇲🇽" },
  { code: "MA", name: "Morocco", dialCode: "212", flag: "🇲🇦" },
  { code: "NP", name: "Nepal", dialCode: "977", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", dialCode: "31", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", dialCode: "64", flag: "🇳🇿" },
  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬" },
  { code: "NO", name: "Norway", dialCode: "47", flag: "🇳🇴" },
  { code: "PK", name: "Pakistan", dialCode: "92", flag: "🇵🇰" },
  { code: "PH", name: "Philippines", dialCode: "63", flag: "🇵🇭" },
  { code: "PL", name: "Poland", dialCode: "48", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dialCode: "351", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", dialCode: "974", flag: "🇶🇦" },
  { code: "RO", name: "Romania", dialCode: "40", flag: "🇷🇴" },
  { code: "RU", name: "Russia", dialCode: "7", flag: "🇷🇺" },
  { code: "SA", name: "Saudi Arabia", dialCode: "966", flag: "🇸🇦" },
  { code: "SG", name: "Singapore", dialCode: "65", flag: "🇸🇬" },
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", dialCode: "82", flag: "🇰🇷" },
  { code: "ES", name: "Spain", dialCode: "34", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", dialCode: "94", flag: "🇱🇰" },
  { code: "SE", name: "Sweden", dialCode: "46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialCode: "41", flag: "🇨🇭" },
  { code: "TW", name: "Taiwan", dialCode: "886", flag: "🇹🇼" },
  { code: "TH", name: "Thailand", dialCode: "66", flag: "🇹🇭" },
  { code: "TN", name: "Tunisia", dialCode: "216", flag: "🇹🇳" },
  { code: "TR", name: "Türkiye", dialCode: "90", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", dialCode: "380", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", dialCode: "971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "1", flag: "🇺🇸" },
  { code: "VN", name: "Vietnam", dialCode: "84", flag: "🇻🇳" },
];

function FlagImage({ country }: { country: Country }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
      alt={`${country.name} flag`}
      width={24}
      height={18}
      loading="lazy"
      style={{ display: "inline-block", objectFit: "cover", verticalAlign: "middle" }}
    />
  );
}

type PhoneNumberInputProps = {
  id: string;
  label: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
};

function toStoredNumber(country: Country, nationalNumber: string) {
  const nationalDigits = nationalNumber.replace(/\D/g, "").replace(/^0+/, "");
  return nationalDigits ? `${country.dialCode}${nationalDigits}` : "";
}

export function PhoneNumberInput({
  id,
  label,
  onChange,
  error,
  helperText,
  required,
}: PhoneNumberInputProps) {
  const [countryCode, setCountryCode] = React.useState("TN");
  const [nationalNumber, setNationalNumber] = React.useState("");
  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];

  function handleCountryChange(nextCode: string) {
    const nextCountry = COUNTRIES.find((item) => item.code === nextCode) ?? COUNTRIES[0];
    setCountryCode(nextCountry.code);
    onChange(toStoredNumber(nextCountry, nationalNumber));
  }

  function handleNumberChange(nextNumber: string) {
    const digits = nextNumber.replace(/\D/g, "");
    setNationalNumber(digits);
    onChange(toStoredNumber(country, digits));
  }

  return (
    <TextField
      id={id}
      fullWidth
      label={label}
      value={nationalNumber}
      onChange={(event) => handleNumberChange(event.target.value)}
      error={error}
      helperText={helperText}
      required={required}
      inputMode="numeric"
      type="tel"
      placeholder={label}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 1, gap: 0.75 }}>
            <Select
              value={countryCode}
              onChange={(event) => handleCountryChange(event.target.value)}
              variant="standard"
              disableUnderline
              renderValue={(selected) => {
                const selectedCountry = COUNTRIES.find((item) => item.code === selected) ?? country;
                return <FlagImage country={selectedCountry} />;
              }}
              inputProps={{ "aria-label": `${label} country` }}
              sx={{
                minWidth: 32,
                '& .MuiSelect-select': { py: 0.5, pl: 0, pr: '20px !important' },
                '& .MuiSelect-icon': { right: 0 },
              }}
            >
              {COUNTRIES.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <FlagImage country={item} />
                    {item.name} (+{item.dialCode})
                  </span>
                </MenuItem>
              ))}
            </Select>
            <span aria-hidden="true">+{country.dialCode}</span>
          </InputAdornment>
        ),
      }}
      inputProps={{ "aria-label": `${label} without country code`, pattern: "[0-9]*" }}
    />
  );
}
