import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  const schoolDomain = (process.env.NEXT_PUBLIC_SCHOOL_DOMAIN || '').toLowerCase();

  const isSchoolHost =
    host.startsWith('school.') ||
    host.includes('-school.') ||
    (schoolDomain !== '' && host === schoolDomain);

  if (isSchoolHost && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/school';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
