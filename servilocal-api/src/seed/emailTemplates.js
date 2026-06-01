const EmailTemplate = require('../models/EmailTemplate');

const baseStyles = `
  body { margin: 0; padding: 0; background: #f5f7fb; font-family: Arial, sans-serif; color: #172033; }
  .wrapper { width: 100%; background: #f5f7fb; padding: 32px 12px; }
  .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e3e8f2; border-radius: 12px; overflow: hidden; }
  .header { background: #0f766e; color: #ffffff; padding: 24px 28px; }
  .brand { margin: 0; font-size: 22px; font-weight: 700; }
  .content { padding: 28px; }
  .title { margin: 0 0 12px; font-size: 20px; line-height: 1.3; color: #172033; }
  .text { margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: #4b5565; }
  .code { display: inline-block; margin: 8px 0 20px; padding: 14px 18px; background: #ecfdf5; border: 1px solid #99f6e4; border-radius: 8px; color: #0f766e; font-size: 28px; font-weight: 700; letter-spacing: 4px; }
  .button { display: inline-block; padding: 13px 18px; background: #0f766e; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; }
  .footer { padding: 18px 28px 26px; font-size: 12px; line-height: 1.5; color: #7b8496; }
`;

const layout = (body) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${baseStyles}</style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="header"><h1 class="brand">ServiLocal</h1></div>
        <div class="content">${body}</div>
        <div class="footer">Se voce nao solicitou este email, pode ignora-lo com seguranca.</div>
      </div>
    </div>
  </body>
</html>`;

const templates = [
  {
    key: 'auth_otp',
    name: 'Codigo de verificacao',
    subject: 'Seu codigo ServiLocal',
    variables: ['otp'],
    text: 'Seu codigo de verificacao ServiLocal: {{otp}}. Ele expira em 10 minutos.',
    html: layout(`
      <h2 class="title">Confirme seu email</h2>
      <p class="text">Use o codigo abaixo para continuar seu cadastro no ServiLocal. Ele expira em 10 minutos.</p>
      <div class="code">{{otp}}</div>
      <p class="text">Nunca compartilhe este codigo com outras pessoas.</p>
    `),
  },
  {
    key: 'auth_resend_otp',
    name: 'Reenvio de codigo',
    subject: 'Seu novo codigo ServiLocal',
    variables: ['otp'],
    text: 'Seu novo codigo de verificacao ServiLocal: {{otp}}. Ele expira em 10 minutos.',
    html: layout(`
      <h2 class="title">Seu novo codigo</h2>
      <p class="text">Aqui esta o novo codigo para verificar seu email no ServiLocal. Ele expira em 10 minutos.</p>
      <div class="code">{{otp}}</div>
      <p class="text">Se voce ja concluiu a verificacao, ignore este email.</p>
    `),
  },
  {
    key: 'auth_reset_password',
    name: 'Redefinicao de senha',
    subject: 'Redefinir senha ServiLocal',
    variables: ['resetUrl'],
    text: 'Clique no link para redefinir sua senha: {{resetUrl}}. O link expira em 1 hora.',
    html: layout(`
      <h2 class="title">Redefina sua senha</h2>
      <p class="text">Recebemos uma solicitacao para redefinir sua senha. Clique no botao abaixo para criar uma nova senha.</p>
      <p><a class="button" href="{{resetUrl}}">Redefinir senha</a></p>
      <p class="text">Este link expira em 1 hora.</p>
    `),
  },
];

module.exports = async function seedEmailTemplates() {
  await Promise.all(templates.map((template) => (
    EmailTemplate.updateOne(
      { key: template.key },
      { $setOnInsert: template },
      { upsert: true }
    )
  )));
};
