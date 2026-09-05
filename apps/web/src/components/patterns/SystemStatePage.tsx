import type { ReactNode } from 'react';
import { Link, isRouteErrorResponse, useLocation, useRouteError } from 'react-router-dom';
import './SystemStatePage.css';

type SystemStateTone = 'info' | 'warning' | 'error' | 'success';

interface SystemStatePageProps {
  tone: SystemStateTone;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  detail?: string;
}

const CHUNK_ERROR_PATTERN = /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i;

function readableError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return typeof error.data === 'string' ? error.data : error.statusText;
  }
  return error instanceof Error ? error.message : '';
}

function isChunkLoadFailure(error: unknown): boolean {
  const name = error instanceof Error ? error.name : '';
  return CHUNK_ERROR_PATTERN.test(`${name} ${readableError(error)}`);
}

export function SystemStatePage({
  tone,
  icon,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  detail,
}: SystemStatePageProps) {
  return (
    <main className={`system-state-page is-${tone}`}>
      <section className="system-state-card" aria-labelledby="system-state-title">
        <div className="system-state-mark" aria-hidden="true">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p className="system-state-eyebrow">{eyebrow}</p>
        <h1 id="system-state-title">{title}</h1>
        <p className="system-state-description">{description}</p>
        {detail ? <p className="system-state-detail">{detail}</p> : null}
        <div className="system-state-actions">
          {primaryAction}
          {secondaryAction}
        </div>
        <p className="system-state-support">If this keeps happening, contact your institution administrator.</p>
      </section>
    </main>
  );
}

function reloadCurrentPage() {
  window.location.reload();
}

export function RouteFailurePage() {
  const error = useRouteError();
  const chunkFailure = isChunkLoadFailure(error);
  const routeStatus = isRouteErrorResponse(error) ? error.status : 0;

  if (chunkFailure) {
    return (
      <SystemStatePage
        tone="info"
        icon="system_update_alt"
        eyebrow="TMS UPDATE"
        title="A newer version is ready"
        description="This page belongs to an older version that is no longer available. Reload once to continue with the latest TMS update."
        primaryAction={<button type="button" className="system-state-primary" onClick={reloadCurrentPage}>Load latest version</button>}
        secondaryAction={<Link className="system-state-secondary" to="/login">Return to sign in</Link>}
      />
    );
  }

  if (routeStatus === 403) {
    return (
      <SystemStatePage
        tone="warning"
        icon="lock"
        eyebrow="ACCESS RESTRICTED"
        title="You cannot open this page"
        description="Your account does not have permission for this workspace. Return to your dashboard or ask an administrator to review your role."
        primaryAction={<button type="button" className="system-state-primary" onClick={() => window.history.back()}>Go back</button>}
        secondaryAction={<Link className="system-state-secondary" to="/login">Return to sign in</Link>}
      />
    );
  }

  if (routeStatus === 404) {
    return (
      <SystemStatePage
        tone="warning"
        icon="search_off"
        eyebrow="PAGE NOT FOUND"
        title="This page is unavailable"
        description="The address may be outdated or the page may have moved."
        primaryAction={<button type="button" className="system-state-primary" onClick={() => window.history.back()}>Go back</button>}
        secondaryAction={<Link className="system-state-secondary" to="/login">Return to sign in</Link>}
      />
    );
  }

  return (
    <SystemStatePage
      tone="error"
      icon="error"
      eyebrow="APPLICATION ERROR"
      title="We could not open this page"
      description="Your information is safe. Reload the page and try again."
      detail={readableError(error) ? 'The technical details have been hidden for security.' : undefined}
      primaryAction={<button type="button" className="system-state-primary" onClick={reloadCurrentPage}>Try again</button>}
      secondaryAction={<Link className="system-state-secondary" to="/login">Return to sign in</Link>}
    />
  );
}

export function SessionStatePage() {
  const location = useLocation();
  const reason = new URLSearchParams(location.search).get('reason');
  const unavailable = reason === 'unavailable';
  const missing = reason === 'missing';

  return (
    <SystemStatePage
      tone={unavailable ? 'error' : 'warning'}
      icon={unavailable ? 'cloud_off' : missing ? 'shield_lock' : 'schedule'}
      eyebrow={unavailable ? 'CONNECTION ERROR' : 'SECURE SESSION'}
      title={unavailable ? 'We could not verify your session' : missing ? 'Sign in required' : 'Your session has ended'}
      description={unavailable
        ? 'TMS could not reach the authentication service. Check your connection and try again.'
        : missing
          ? 'No valid login session was found for this protected page.'
          : 'Your login cookie is missing, invalid, or expired. Sign in again to continue securely.'}
      primaryAction={unavailable
        ? <button type="button" className="system-state-primary" onClick={reloadCurrentPage}>Try again</button>
        : <Link className="system-state-primary" to="/login">Sign in securely</Link>}
      secondaryAction={unavailable ? <Link className="system-state-secondary" to="/login">Go to sign in</Link> : undefined}
    />
  );
}

export function NotFoundPage() {
  return (
    <SystemStatePage
      tone="warning"
      icon="search_off"
      eyebrow="PAGE NOT FOUND"
      title="This page is unavailable"
      description="Check the address or return to sign in to open your workspace."
      primaryAction={<button type="button" className="system-state-primary" onClick={() => window.history.back()}>Go back</button>}
      secondaryAction={<Link className="system-state-secondary" to="/login">Return to sign in</Link>}
    />
  );
}
