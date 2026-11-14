'use client';

import { XIcon } from '@phosphor-icons/react/ssr';
import { Toast } from 'radix-ui';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '../cn';

type ToneToast = 'info' | 'succes' | 'danger';

interface MessageToast {
  id: number;
  titre: string;
  description?: string;
  tone: ToneToast;
}

type Afficher = (message: Omit<MessageToast, 'id' | 'tone'> & { tone?: ToneToast }) => void;

const Contexte = createContext<Afficher | null>(null);

/** `const afficher = useToast(); afficher({ titre: 'Fiche enregistrée', tone: 'succes' })`. */
export function useToast(): Afficher {
  const afficher = useContext(Contexte);
  if (!afficher) throw new Error('useToast() doit être utilisé sous <ToastProvider>.');
  return afficher;
}

const BORDURES: Record<ToneToast, string> = {
  info: 'border-l-info',
  succes: 'border-l-succes',
  danger: 'border-l-danger',
};

/** Notifications éphémères (Radix Toast : annoncées aux lecteurs d'écran, balayage pour fermer). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MessageToast[]>([]);
  const afficher = useCallback<Afficher>((m) => {
    setMessages((liste) => [...liste, { id: Date.now() + Math.random(), tone: 'info', ...m }]);
  }, []);
  const retirer = (id: number) => setMessages((liste) => liste.filter((m) => m.id !== id));

  return (
    <Contexte.Provider value={afficher}>
      <Toast.Provider swipeDirection="down" label="Notifications">
        {children}
        {messages.map((m) => (
          <Toast.Root
            key={m.id}
            type={m.tone === 'danger' ? 'foreground' : 'background'}
            onOpenChange={(ouvert) => !ouvert && retirer(m.id)}
            className={cn(
              'flex items-start gap-3 rounded-card border border-l-4 border-neutre-200 bg-blanc p-4 shadow-lg',
              BORDURES[m.tone],
            )}
          >
            <div className="flex flex-1 flex-col gap-0.5">
              <Toast.Title className="font-bold">{m.titre}</Toast.Title>
              {m.description && (
                <Toast.Description className="text-[15px] text-neutre-800">
                  {m.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close
              aria-label="Fermer"
              className="-m-2 grid size-11 flex-none cursor-pointer place-items-center rounded-control border-0 bg-transparent text-xl text-texte hover:bg-neutre-100"
            >
              <XIcon aria-hidden="true" />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed inset-x-0 bottom-0 z-[60] m-0 flex list-none flex-col gap-2 p-4 pb-sure sm:right-4 sm:left-auto sm:w-96" />
      </Toast.Provider>
    </Contexte.Provider>
  );
}
