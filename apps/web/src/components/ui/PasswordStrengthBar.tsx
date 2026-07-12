import { PASSWORD_RULES, getPasswordRuleResults, getPasswordStrength } from '../../features/auth/utils';

interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const ruleResults = getPasswordRuleResults(password);
  const strength = getPasswordStrength(password);

  return (
    <div className="strength-container" aria-live="polite">
      <div className="strength-bars-row" role="presentation">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className="strength-segment"
            style={{
              backgroundColor: strength.score >= segment ? strength.color : 'rgba(21, 96, 189, 0.1)',
            }}
          />
        ))}
        <span className="strength-label" style={{ color: strength.label ? strength.color : 'rgba(44, 62, 80, 0.52)' }}>
          {strength.label || '—'}
        </span>
      </div>

      <ul className="strength-rules">
        {PASSWORD_RULES.map((rule, index) => {
          const isPassing = ruleResults[index];

          return (
            <li key={rule.id} className={`strength-rule${isPassing ? ' strength-rule--pass' : ''}`}>
              <span className="strength-rule-icon" aria-hidden="true">
                {isPassing ? '✓' : '✗'}
              </span>
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
