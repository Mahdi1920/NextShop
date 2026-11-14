import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../common/enums/role.enum';

export type JwtPayload = {
	sub: string;
	email: string;
	role: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
		});
	}

	async validate(payload: JwtPayload) {
		// This becomes req.user
		return payload;
	}
}

