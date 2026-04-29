/**
 * Proxy: /api/proxy/app/[...path] → APP_API_URL (cluster-internal)
 *
 * All client-side fetches to the app_api service are routed through here so
 * the browser never needs to reach cluster-internal DNS directly. The proxy
 * runs server-side (Node.js runtime) where the cluster DNS resolves fine.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RESPONSE_HEADERS_WHITELIST = [
  'content-type',
  'content-disposition',
  'content-length',
  'www-authenticate',
  'location',
];

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const appApiUrl = process.env.APP_API_URL;
  if (!appApiUrl) {
    return NextResponse.json(
      { error: 'APP_API_URL is not configured' },
      { status: 500 }
    );
  }

  const { path } = await params;
  const targetUrl = new URL(`${appApiUrl}/${path.join('/')}`);
  req.nextUrl.searchParams.forEach((value, key) =>
    targetUrl.searchParams.set(key, value)
  );

  const forwardHeaders = new Headers();
  const auth = req.headers.get('authorization');
  const contentType = req.headers.get('content-type');
  const accept = req.headers.get('accept');
  if (auth) forwardHeaders.set('authorization', auth);
  if (contentType) forwardHeaders.set('content-type', contentType);
  if (accept) forwardHeaders.set('accept', accept);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  const upstream = await fetch(targetUrl.toString(), {
    method: req.method,
    headers: forwardHeaders,
    cache: 'no-store',
    ...(hasBody ? { body: req.body, duplex: 'half' } : {}),
  } as RequestInit);

  const responseHeaders = new Headers();
  for (const header of RESPONSE_HEADERS_WHITELIST) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
