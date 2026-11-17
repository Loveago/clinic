import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_LOGIN !== 'true') {
    return NextResponse.json({ error: 'Demo login is disabled in production' }, { status: 403 });
  }

  try {
    const { role } = await req.json();

    let user = null;
    if (role === 'admin' || role === 'SUPER_ADMIN') {
      user = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
        include: { studentProfile: { include: { programme: true } } },
      });
    } else if (role === 'lecturer' || role === 'LECTURER') {
      user = await prisma.user.findFirst({
        where: { role: 'LECTURER' },
        include: { studentProfile: { include: { programme: true } } },
      });
    } else {
      user = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
        include: { studentProfile: { include: { programme: true } } },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Demo user not found' }, { status: 404 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        studentProfile: user.studentProfile,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Failed to authenticate demo user' }, { status: 500 });
  }
}
