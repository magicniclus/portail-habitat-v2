'use client';

import type { TypeElement } from '@ph/core/sites';
import {
  ClockCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArticleIcon,
  ChartBarIcon,
  CopyIcon,
  CursorClickIcon,
  FileTextIcon,
  ImageIcon,
  ListBulletsIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MinusIcon,
  PaletteIcon,
  PlayIcon,
  PlusIcon,
  SparkleIcon,
  SquaresFourIcon,
  StackIcon,
  StarIcon,
  TextAlignLeftIcon,
  TextHIcon,
  TextTIcon,
  TrashIcon,
  ColumnsPlusRightIcon,
  ArrowsVerticalIcon,
  HouseIcon,
  NotepadIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { OpSelection } from './selection';

const ACTIONS: Record<OpSelection, Icon> = {
  haut: ArrowUpIcon,
  bas: ArrowDownIcon,
  gauche: ArrowLeftIcon,
  droite: ArrowRightIcon,
  dupliquer: CopyIcon,
  supprimer: TrashIcon,
  bloc: ColumnsPlusRightIcon,
};

export function IconeAction({ op }: { op: OpSelection }) {
  const I = ACTIONS[op];
  return <I size={16} aria-hidden="true" />;
}

/** Barre d'outils de gauche (maquette) : Ajouter, Structure, Pages, SEO, Styles, Modèles, IA. */
export const ICONES_RAIL = {
  ajouter: PlusIcon,
  structure: StackIcon,
  pages: FileTextIcon,
  seo: MagnifyingGlassIcon,
  styles: PaletteIcon,
  modeles: SquaresFourIcon,
  versions: ClockCounterClockwiseIcon,
  ia: SparkleIcon,
} as const;

export const ICONES_ELEMENT: Record<TypeElement, Icon> = {
  titre: TextHIcon,
  surtitre: TextTIcon,
  texte: TextAlignLeftIcon,
  bouton: CursorClickIcon,
  image: ImageIcon,
  liste: ListBulletsIcon,
  avis: StarIcon,
  chiffre: ChartBarIcon,
  formulaire: NotepadIcon,
  video: PlayIcon,
  carte: MapPinIcon,
  espace: ArrowsVerticalIcon,
  separateur: MinusIcon,
  logo: HouseIcon,
  menu: ListIcon,
  blog: ArticleIcon,
};
