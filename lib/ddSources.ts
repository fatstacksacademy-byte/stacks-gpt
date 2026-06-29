// Common sources people route a qualifying "direct deposit" from, used for the
// optional "which DD worked?" capture on the Bonus Posted step (in both the
// sequencer tracker and the dashboard quick-action). The picker accepts free
// text too — this list is just fast-pick suggestions, not an allow-list.
export const DD_SOURCES = [
  "Chase", "Bank of America", "Wells Fargo", "Citi", "Capital One", "U.S. Bank",
  "PNC", "TD Bank", "Truist", "Ally", "SoFi", "Discover", "American Express",
  "Fidelity", "Charles Schwab", "Vanguard", "Robinhood", "Betterment",
  "PayPal", "Cash App", "Venmo", "Wise", "Chime", "Varo", "Current",
  "Navy Federal", "USAA", "Gusto (payroll)", "ADP (payroll)", "Deel (payroll)",
]

export const DD_EMPLOYER = "Employer / payroll"
