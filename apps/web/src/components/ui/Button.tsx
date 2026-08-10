import type { ButtonHTMLAttributes } from 'react';
import { TMSButton, type TMSButtonProps } from './TMSButton';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  children: TMSButtonProps['children'];
}

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  if (variant === 'outline') {
    return <TMSButton variant='secondary' style={style} {...props} />;
  }

  if (variant === 'danger') {
    return (
      <TMSButton
        variant='primary'
        style={{
          background: 'var(--color-error)',
          borderColor: 'var(--color-error)',
          boxShadow: 'none',
          ...style,
        }}
        {...props}
      />
    );
  }

  if (variant === 'ghost') {
    return <TMSButton variant='text' style={style} {...props} />;
  }

  return <TMSButton variant={variant} style={style} {...props} />;
}
