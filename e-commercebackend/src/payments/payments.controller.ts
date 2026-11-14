import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { SimulateCardPaymentDto } from './dto/simulate-card-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@Post('simulate/card')
	@Roles(UserRole.CUSTOMER)
	simulateCard(@Req() req: Request & { user?: any }, @Body() dto: SimulateCardPaymentDto) {
		return this.paymentsService.simulateCardPayment(req.user.sub, dto);
	}
}
