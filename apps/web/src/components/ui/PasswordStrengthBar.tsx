import { useMemo } from 'react';

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters',      test: (pw) => pw.length >= 8 },
  { label: 'Uppercase letter (A–Z)',      test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Lowercase letter (a–z)',      test: (pw) => /[a-z]/.test(pw) },
  { label: 'Number (0–9)',               test: (pw) => /[0-9]/.test(pw) },
  { label: 'Special character (!@#$…)',  test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const STRENGTH_META = [
  { label: 'Weak',   cls: 'strength-weak',   color: 'var(--color-error)'   },
  { label: 'Fair',   cls: 'strength-fair',   color: 'var(--color-warning)' },
  { label: 'Good',   cls: 'strength-good',   color: 'var(--color-secondary)'},
  { label: 'Strong', cls: 'strength-strong', color: 'var(--color-success)' },
] as const;

interface PasswordStrengthBarProps {
  password: string;
  showRules?: boolean;
}

/**
 * 4-tier animated password strength bar + rule checklist. PRD §4.2 & §4.3
 */
export function PasswordStrengthBar({ password, showRules = true }: PasswordStrengthBarProps) {
  const { score, passedRules } = useMemo(() => {
    const passed = RULES.map((r) => r.test(password));
    const sc = passed.filter(Boolean).length; // 0–5
    // Map 5 rules to 4 tiers: 0=0, 1-2=1(Weak), 3=2(Fair), 4=3(Good), 5=4(Strong)
    const tier = sc === 0 ? 0 : sc <= 2 ? 1 : sc === 3 ? 2 : sc === 4 ? 3 : 4;
    return { score: tier, passedRules: passed };
  }, [password]);

  if (!password) return null;

  const meta = STRENGTH_META[score - 1] ?? STRENGTH_META[0];

  return (
    <div className="strength-container">
      {/* Bar row */}
      <div className="strength-bars-row">
        {[1, 2, 3, 4].map((tier) => (
          <div
            key={tier}
            className={`strength-segment ${score >= tier ? meta.cls : 'strength-empty'}`}
            style={{ background: score >= tier ? meta.color : undefined }}
          />
        ))}
        <span className="strength-label" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>

      {/* Hint text */}
      {score < 4 && (
        <p className="strength-hint">
          {score <= 1
            ? 'Weak — add uppercase, numbers, or special characters'
            : score === 2
            ? 'Fair — add more complexity'
            : 'Good — almost there!'}
        </p>
      )}

      {/* Rule checklist */}
      {showRules && (
        <ul className="strength-rules">
          {RULES.map((rule, i) => (
            <li
              key={i}
              className={`strength-rule ${passedRules[i] ? 'strength-rule--pass' : ''}`}
            >
              <span className="strength-rule-icon">
                {passedRules[i] ? '✓' : '○'}
              </span>
              {rule.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
