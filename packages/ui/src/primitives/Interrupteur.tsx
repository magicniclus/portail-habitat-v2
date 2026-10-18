import { Switch } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../cn';

export type InterrupteurProps = Omit<ComponentProps<typeof Switch.Root>, 'children'>;

/**
 * Interrupteur marche/arrêt (rôle `switch`, Radix) : zone cliquable de 44 px autour d'un rail de
 * 40 × 24 px ; désactivé = réglage imposé (ex. emails de sécurité, toujours envoyés).
 */
export function Interrupteur({ className, ...rest }: InterrupteurProps) {
  return (
    <Switch.Root
      className={cn(
        'group inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-6 w-10 items-center rounded-full bg-neutre-600 p-0.5 transition-colors motion-reduce:transition-none',
          'group-data-[state=checked]:bg-accent-action',
        )}
      >
        <Switch.Thumb className="block size-5 rounded-full bg-blanc shadow-sm transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-4" />
      </span>
    </Switch.Root>
  );
}
