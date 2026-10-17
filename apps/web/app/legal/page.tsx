import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function Legal() {
  redirect(routes.legal('particuliers', 'cgu'));
}
