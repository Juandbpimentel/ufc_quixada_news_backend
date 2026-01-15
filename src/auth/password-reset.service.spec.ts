import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  let svc: PasswordResetService;
  const mockPrisma: any = {
    usuario: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockMeuContato: any = { sendContact: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new PasswordResetService(mockPrisma, mockMeuContato);
  });

  test('requestReset should create token and send email with html containing token', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({
      id: 1,
      nome: 'Test User',
      email: 'test@example.com',
    });
    let capturedToken = '';
    mockPrisma.passwordResetToken.create.mockImplementation(
      async ({ data }: any) => {
        capturedToken = data.token;
        return { id: 1, ...data };
      },
    );
    mockMeuContato.sendContact.mockResolvedValue({ ok: true });

    const res = await svc.requestReset(
      'test@example.com',
      'https://frontend/reset',
    );
    expect(res).toEqual({ ok: true });
    expect(mockMeuContato.sendContact).toHaveBeenCalledTimes(1);
    const payload = mockMeuContato.sendContact.mock.calls[0][0];
    expect(payload.to).toBe('test@example.com');
    expect(payload.html).toBeDefined();
    expect(payload.html).toContain(capturedToken);
    expect(payload.html).toContain('Test User');
  });

  test('resetPassword should validate token and update password and token usage', async () => {
    const fakeToken = 'token123';
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      token: fakeToken,
      usuarioId: 2,
      used: false,
      expiresAt: new Date(Date.now() + 100000),
    });
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 2 });
    mockPrisma.usuario.update.mockResolvedValue({
      id: 2,
      versaoToken: 'newver',
    });
    mockPrisma.passwordResetToken.update.mockResolvedValue({
      token: fakeToken,
      used: true,
    });

    const res = await svc.resetPassword(fakeToken, 'newPass123');
    expect(res).toEqual({ ok: true });
    // password update call (first update)
    expect(mockPrisma.usuario.update).toHaveBeenCalled();
    // token marked used
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { token: fakeToken },
      data: { used: true },
    });
  });
});
