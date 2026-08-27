import { useAuth } from '@immediately-run/sdk/auth';
import type { Config } from '../lib/types';

/** Who is acting: the host login when signed in, else the name typed into
 *  settings, else '' (callers display 'someone'). */
export function useMe(config: Config): { me: string; fromHost: boolean } {
  const { user } = useAuth();
  const login = user?.login?.trim() ?? '';
  if (login) return { me: login, fromHost: true };
  return { me: config.name?.trim() ?? '', fromHost: false };
}

export const SOMEONE = 'someone';
