export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

export interface SafeExampleUrl {
  label: string;
  category: "legitimate" | "phishing" | "suspicious";
  url: string;
  description: string;
}

export const SAFE_EXAMPLE_URLS: SafeExampleUrl[] = [
  {
    label: "Legitimate Reference URL",
    category: "legitimate",
    url: "https://www.wikipedia.org/wiki/Machine_learning",
    description: "Standard HTTPS domain structure with clean encyclopedic resource path.",
  },
  {
    label: "Brand-Subdomain Phishing Pattern",
    category: "phishing",
    url: "http://secure-login.paypal.com.account-verify.xyz/signin?session=demo_token_9481",
    description: "Embedded brand subdomain, hyphenated lure tokens, and non-standard TLD.",
  },
  {
    label: "IP Literal + @ Redirection Pattern",
    category: "phishing",
    url: "http://account.google.com@192.168.42.18/verify/password/reset?user=demo@example.org",
    description: "Uses '@' credential prefix and raw IPv4 host with credential harvesting keywords.",
  },
  {
    label: "Multi-Subdomain Portal URL",
    category: "legitimate",
    url: "https://www.calculatorsoup.com/calculators/math/fractions.php",
    description: "Established domain with multi-segment directory path.",
  },
];

export function validateClientUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a URL to analyze." };
  }

  if (trimmed.length > 2048) {
    return {
      valid: false,
      error: "URL exceeds the maximum allowed length of 2,048 characters.",
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      error: "URL cannot contain spaces or control characters.",
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      error: "URL must start with explicit 'http://' or 'https://' scheme.",
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      return {
        valid: false,
        error: "URL must include a valid domain name (e.g., https://example.com).",
      };
    }
  } catch {
    return {
      valid: false,
      error: "Malformed URL structure. Please verify the address format.",
    };
  }

  return { valid: true };
}
