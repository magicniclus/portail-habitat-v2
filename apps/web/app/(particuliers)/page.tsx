import { Logo } from '@ph/ui';

// Page provisoire, remplacée par l'accueil particuliers au lot 6.
export default function Accueil() {
  return (
    <main className="mx-auto flex max-w-contenu flex-col gap-4 px-page py-10">
      <Logo />
      <h1 className="m-0 text-[clamp(32px,4.5vw,54px)] leading-[1.06]">
        Portail Habitat, <span className="accent-editorial">bientôt.</span>
      </h1>
      <p className="m-0 text-lg text-neutre-800">
        Socle technique et système de composants en place.
      </p>
    </main>
  );
}
