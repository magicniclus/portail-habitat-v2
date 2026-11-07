import type { ComponentProps } from 'react';
import { cn } from '../cn';

export interface CardProps extends ComponentProps<'div'> {
  /** Carte cliquable : léger soulèvement au survol (README « États »). */
  interactive?: boolean;
  premium?: boolean;
}

/** Carte composable : `<Card><CardHeader><CardTitle/></CardHeader><CardBody/><CardFooter/></Card>`. */
export function Card({ interactive, premium, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border border-neutre-200 bg-blanc p-5 shadow-sm',
        interactive &&
          'transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-md',
        premium && 'border-premium bg-premium-fond',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex items-start justify-between gap-3', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<'h3'>) {
  return <h3 className={cn('m-0 text-lg leading-tight font-bold', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex-1 text-[15.5px] text-neutre-800', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2 pt-1', className)} {...rest} />;
}
