import React from 'react';

interface Step {
  label: string;
}

interface WizardProgressProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

/**
 * Horizontal wizard step progress bar with Done ✓ / Active / Pending states.
 * PRD §5.1 and §6
 */
export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="wizard-progress" role="navigation" aria-label="Setup progress">
      {steps.map((step, idx) => {
        const isDone    = idx < currentStep;
        const isActive  = idx === currentStep;
        const isPending = idx > currentStep;
        const stateClass = isDone ? 'wizard-step--done' : isActive ? 'wizard-step--active' : 'wizard-step--pending';

        return (
          <React.Fragment key={idx}>
            <div className={`wizard-step ${stateClass}`}>
              <div className="wizard-step-circle" aria-hidden="true">
                {isDone ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="wizard-step-label">{step.label}</span>
              {isDone && <span className="wizard-step-tag">Done</span>}
              {isActive && <span className="wizard-step-tag wizard-step-tag--active">Active</span>}
              {isPending && <span className="wizard-step-tag wizard-step-tag--pending">Pending</span>}
            </div>
            {idx < steps.length - 1 && (
              <div className={`wizard-connector ${isDone ? 'wizard-connector--done' : ''}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
