import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let mailService: Partial<MailService>;
  let userModel: any;

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mockJwtToken'),
      verify: jest.fn(),
    };

    mailService = {
      sendUserActivationEmail: jest.fn(),
    };

    userModel = {
      exists: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should register a user and send an activation email', async () => {
    const dto = {
      id: 'test-id',
      fullname: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    const mockUser = { id: '1', email: dto.email, fullname: dto.fullname };
    (usersService.createUser as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.register(dto);

      expect(usersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, isActive: false }),
        undefined,
        undefined,
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { userId: mockUser.id },
        { expiresIn: '1d' },
      );
      expect(mailService.sendUserActivationEmail).toHaveBeenCalledWith(
        dto.email,
        expect.stringContaining('mockJwtToken'),
        dto.fullname,
      );
      expect(result).toEqual({
        message: 'Registration successful. Please check your email to activate your account.',
      });
    });
  });

  describe('activateAccount', () => {
    it('should activate a user account', async () => {
      const token = 'mockJwtToken';
      const payload = { userId: '1' };
      const mockUser = { id: '1', isActive: true };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.activateAccount(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        payload.userId,
        { isActive: true },
        { new: true },
      );
      expect(result).toEqual({
        message: 'Account successfully activated. You can now log in.',
      });
    });

    it('should throw an error if the token is invalid', async () => {
      const token = 'invalidToken';
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.activateAccount(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw an error if the user is not found', async () => {
      const token = 'mockJwtToken';
      const payload = { userId: '1' };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.activateAccount(token)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});