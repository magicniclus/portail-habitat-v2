'use client';

import type { PagePro } from '@ph/core/espace-pro';
import {
  ChartBarIcon,
  ChatCircleTextIcon,
  HouseIcon,
  IdentificationCardIcon,
  LifebuoyIcon,
  MegaphoneIcon,
  ReceiptIcon,
  StarIcon,
  UserCircleIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react';
import { ADRESSES_PRO } from './adresses';

/** Page de l'espace pro → icône (menu, onglets mobiles). */
const ICONES: Record<PagePro, Icon> = {
  tableauDeBord: HouseIcon,
  fiche: IdentificationCardIcon,
  demandes: ChatCircleTextIcon,
  appelsOffres: MegaphoneIcon,
  avis: StarIcon,
  statistiques: ChartBarIcon,
  equipe: UsersThreeIcon,
  facturation: ReceiptIcon,
  compte: UserCircleIcon,
  aide: LifebuoyIcon,
};

export const LIENS_PRO = Object.fromEntries(
  Object.entries(ICONES).map(([cle, Icone]) => [
    cle,
    { href: ADRESSES_PRO[cle as PagePro], Icone },
  ]),
) as Record<PagePro, { href: (typeof ADRESSES_PRO)[PagePro]; Icone: Icon }>;

/** Lien actif : même adresse, ou sous-page (`/pro/demandes/123`). */
export const estActif = (chemin: string, page: PagePro) => {
  const href = LIENS_PRO[page].href as string;
  return chemin === href || chemin.startsWith(`${href}/`);
};
