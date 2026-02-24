import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const { supabase, response } = createRouteClient(request);
    await supabase.auth.exchangeCodeForSession(code);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    const redirect = NextResponse.redirect(redirectUrl);
    // Forward auth cookies from the route client response
    response.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirect.cookies.set(name, value, options);
    });
    return redirect;
  }

  // No code — redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}
