#!/bin/bash
FILE=~/stacks-gpt/lib/data/bonuses.ts

# Helper: insert cooldown_months after bonus_amount for a given id
patch() {
  local id=$1
  local val=$2
  # Insert "cooldown_months": X, after the line containing bonus_amount that follows the id
  python3 - <<PYEOF
import re

with open('$FILE', 'r') as f:
    content = f.read()

# Find the bonus block for this id and insert cooldown_months after bonus_amount
pattern = r'("id":\s*"$id".*?"bonus_amount":\s*\d+)(,)'
replacement = r'\1,\n    "cooldown_months": $val'

new_content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)

with open('$FILE', 'w') as f:
    f.write(new_content)

print("Patched $id -> $val")
PYEOF
}

patch "psecu-300-checking-2026" "null"
patch "capital-one-360-checking-300-offer300" "36"
patch "varo-money-100-referral-dd" "null"
patch "bank-of-america-500-tiered-checking-2026" "12"
patch "316-financial-100-checking-relevant2026" "null"
patch "pnc-400-virtual-wallet-performance-select-2026" "24"
patch "chase-checking-savings-900-combo-2026" "24"
patch "wells-fargo-400-everyday-checking-2026" "12"
patch "bmo-400-checking-2026" "12"
patch "affinity-fcu-100-checking-referral" "12"
patch "figfcu-250-high-yield-checking-ghycheck" "null"
patch "keypoint-cu-300-money4me-nm26" "24"
patch "etrade-max-rate-checking-300-checking25" "12"
patch "teachers-fcu-300-checking-smart26" "null"
patch "chime-100-referral-checking" "null"
patch "sofi-checking-savings-300-dd-2026" "null"

echo "Done! All cooldown_months patched."
