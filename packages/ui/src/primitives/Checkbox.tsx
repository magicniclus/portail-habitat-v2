import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  children: ReactNode;
}

/** Case native avec son libellé cliquable sur toute la ligne (44 px). */
export function Checkbox({ children, className, ...rest }: CheckboxProps) {
  return (
    <label
      className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-base', className)}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-5 flex-none cursor-pointer accent-accent-action"
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}
