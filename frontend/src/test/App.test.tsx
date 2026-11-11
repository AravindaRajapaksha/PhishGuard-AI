import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/contexts/ToastContext";
import { UrlScannerForm } from "@/components/scanner/UrlScannerForm";
import { ScanResultView } from "@/components/scanner/ScanResultView";
import { ScannerPage } from "@/pages/ScannerPage";
import { phishGuardApi } from "@/services/api";
import { validateClientUrl } from "@/utils/urlValidation";
import type { ScanResponse } from "@/types/api";

const SAMPLE_SCAN_RESPONSE: ScanResponse = {
  id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  submitted_url:
    "http://secure-login.paypal.com.account-verify.xyz/signin?token=[REDACTED]",
  redacted_url:
    "http://secure-login.paypal.com.account-verify.xyz/signin?token=[REDACTED]",
  hostname: "secure-login.paypal.com.account-verify.xyz",
  prediction: "phishing",
  phishing_score: 0.9942,
  risk_level: "high",
  model_version: "v1.0.0",
  model_name: "XGBoost",
  extracted_features: {
    url_length: 76,
    hostname_length: 42,
    domain_length: 18,
    path_length: 7,
    query_length: 19,
    dot_count: 4,
    hyphen_count: 2,
    hostname_hyphen_count: 2,
    underscore_count: 0,
    slash_count: 1,
    digit_count: 0,
    hostname_digit_count: 0,
    special_char_count: 2,
    at_symbol_present: 0,
    subdomain_count: 3,
    is_https: 0,
    is_ip_address: 0,
    has_punycode: 0,
    suspicious_keyword_count: 5,
    query_param_count: 1,
    url_entropy: 4.18,
    hostname_entropy: 3.92,
    digit_to_length_ratio: 0.0,
    suspicious_hostname_pattern: 1,
  },
  feature_details: [
    {
      name: "suspicious_keyword_count",
      label: "Suspicious Keyword Count",
      category: "Deception & Obfuscation",
      value: 5,
      description: "Count of authentication, urgency, or brand-lure keywords.",
    },
    {
      name: "subdomain_count",
      label: "Subdomain Depth",
      category: "Domain & Protocol",
      value: 3,
      description: "Number of subdomain levels preceding the registrable domain.",
    },
  ],
  risk_signals: [
    {
      id: "suspicious_keywords",
      title: "Contains Sensitive / Lure Keywords (5)",
      severity: "high",
      feature: "suspicious_keyword_count",
      value: 5,
      description: "Detected lexical tokens commonly used in credential harvesting.",
    },
  ],
  scan_duration_ms: 8.4,
  created_at: "2026-11-11T02:00:00Z",
  disclaimer:
    "Machine learning predictions are estimates and cannot guarantee that a URL is safe.",
};

describe("Client URL validation utility", () => {
  it("rejects empty, scheme-less, and malformed URLs", () => {
    expect(validateClientUrl("").valid).toBe(false);
    expect(validateClientUrl("example.com/login").valid).toBe(false);
    expect(validateClientUrl("ftp://example.com/file").valid).toBe(false);
    expect(validateClientUrl("https://example.com/with space").valid).toBe(
      false
    );
  });

  it("accepts well-formed http and https URLs", () => {
    expect(
      validateClientUrl("https://www.wikipedia.org/wiki/Security").valid
    ).toBe(true);
    expect(
      validateClientUrl("http://sub.example.co.uk/login?id=1").valid
    ).toBe(true);
  });
});

describe("UrlScannerForm component", () => {
  it("displays a validation error when submitting an invalid URL", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<UrlScannerForm onScanSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByLabelText(/url to scan/i);
    await user.type(input, "not-a-valid-url");
    await user.click(screen.getByRole("button", { name: /scan url/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /must start with explicit 'http:\/\/' or 'https:\/\/'/i
    );
  });

  it("renders loading indicator when isLoading is true", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UrlScannerForm onScanSubmit={onSubmit} isLoading={true} />);

    expect(
      screen.getByText(/Analyzing URL.../i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Extracting 24 lexical/i)
    ).toBeInTheDocument();
  });
});

describe("ScanResultView component", () => {
  it("renders prediction badge, redacted URL, safety disclaimer, and risk signals", () => {
    render(<ScanResultView result={SAMPLE_SCAN_RESPONSE} />);

    expect(screen.getByText("Phishing Detected")).toBeInTheDocument();
    expect(
      screen.getByText(
        "http://secure-login.paypal.com.account-verify.xyz/signin?token=[REDACTED]"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Machine learning predictions are estimates and cannot guarantee that a URL is safe/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contains Sensitive / Lure Keywords (5)")
    ).toBeInTheDocument();
    expect(screen.getByText("99.4%")).toBeInTheDocument();
  });
});

describe("ScannerPage API integration", () => {
  it("submits URL to API and renders returned ScanResponse", async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(phishGuardApi, "scanUrl")
      .mockResolvedValueOnce(SAMPLE_SCAN_RESPONSE);

    render(
      <MemoryRouter>
        <ToastProvider>
          <ScannerPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/url to scan/i);
    await user.type(
      input,
      "http://secure-login.paypal.com.account-verify.xyz/signin?token=secret"
    );
    await user.click(screen.getByRole("button", { name: /scan url/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Phishing Detected")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("displays toast error message when API returns an error", async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(phishGuardApi, "scanUrl")
      .mockRejectedValueOnce(new Error("Rate limit exceeded (30 scans per minute)."));

    render(
      <MemoryRouter>
        <ToastProvider>
          <ScannerPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/url to scan/i);
    await user.type(input, "https://www.wikipedia.org");
    await user.click(screen.getByRole("button", { name: /scan url/i }));

    expect(
      await screen.findByText(/Rate limit exceeded/i)
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});
