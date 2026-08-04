/**
 * Hook para leer de la base sin que un error quede escondido.
 *
 * Un "hook" es una función de React que le agrega memoria y ciclo de vida a un
 * componente; los propios empiezan siempre con `use`.
 *
 * Este devuelve el estado de una lectura en uno de tres momentos posibles
 * —cargando, error, listo— y obliga a la pantalla a contemplar los tres. Es la
 * forma de cumplir "errores visibles" de CLAUDE.md §5: si la base falla, el
 * usuario lo ve escrito en pantalla, no en la consola.
 *
 * `load` tiene que venir envuelta en `useCallback` desde la pantalla, si no se
 * vuelve a crear en cada render y la lectura se dispara en loop.
 */

import { useCallback, useEffect, useState } from 'react';

export type DbData<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** `unknown` en vez de `any`: lo que se atrapa en un catch puede ser cualquier
 *  cosa, así que se valida antes de usarlo (CLAUDE.md §5). */
function describeError(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message;
  return 'Error desconocido al leer los datos.';
}

export function useDbData<T>(load: () => Promise<T>): {
  state: DbData<T>;
  reload: () => void;
} {
  const [state, setState] = useState<DbData<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Si la pantalla se cierra mientras la lectura está en curso, `cancelled`
    // evita escribir estado en un componente que ya no existe.
    let cancelled = false;
    setState({ status: 'loading' });

    load()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: describeError(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [load, version]);

  /** Vuelve a leer. Se llama después de guardar o modificar algo. */
  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { state, reload };
}
