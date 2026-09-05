'use client';

import { useEffect, useRef } from 'react';
import { shell } from './shell';

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    import('./mission-control').then(({ mount }) => {
      if (!cancelled && root.current) dispose = mount(root.current);
    }).catch(() => {
      const status = root.current?.querySelector('#boot-status');
      if (status) status.textContent = 'The console could not load. Reload to reconnect.';
    });
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div ref={root} dangerouslySetInnerHTML={{ __html: shell }} />;
}
