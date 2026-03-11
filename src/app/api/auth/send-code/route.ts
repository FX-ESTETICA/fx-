import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 生成一个 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 在生产环境中，您应该将此验证码存储在数据库或 Redis 中，并设置过期时间
    // 这里为了演示，我们假设验证码发送成功
    
    const { data, error } = await resend.emails.send({
      from: 'Rapallo <onboarding@resend.dev>', // 测试模式只能发给自己注册 Resend 的邮箱
      to: email,
      subject: '您的验证码 - Rapallo',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>欢迎使用 Rapallo</h2>
          <p>您正在进行登录/注册操作，您的验证码是：</p>
          <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 8px; letter-spacing: 5px;">
            ${code}
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">验证码有效期为 5 分钟。如果不是您本人操作，请忽略此邮件。</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
