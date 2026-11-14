import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SellerStatus } from '../common/enums/seller-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { User, UserDocument } from './schemas/user.schema';

type ReviewResult = {
  summary: string;
  recommendation: 'LOOKS_COMPLETE' | 'NEEDS_REVIEW' | 'ISSUES_FOUND';
  checks: Array<{
    document: string;
    documentType: 'IDENTITY_DOCUMENT' | 'BUSINESS_REGISTRATION' | 'COMPANY_CERTIFICATE' | 'OTHER' | 'UNREADABLE';
    extractedSellerName: string;
    sellerNameStatus: 'MATCH' | 'MISMATCH' | 'UNREADABLE' | 'NOT_PRESENT';
    extractedRegistrationNumber: string;
    registrationNumberStatus: 'MATCH' | 'MISMATCH' | 'UNREADABLE' | 'NOT_PRESENT' | 'NOT_APPLICABLE';
    notes: string;
  }>;
  findings: Array<{
    document: string;
    severity: 'INFO' | 'WARNING' | 'HIGH';
    issue: string;
    nextStep: string;
  }>;
};

@Injectable()
export class SellerDocumentReviewService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async review(userId: string, selectedDocumentUrls: string[]): Promise<ReviewResult> {
    const user: any = await this.userModel.findById(userId).select('-password').lean().exec();
    if (!user) throw new NotFoundException('Seller not found');
    if (user.role !== UserRole.SELLER || user.sellerProfile?.status !== SellerStatus.PENDING) {
      throw new NotFoundException('Pending seller request not found');
    }

    const agentUrl = process.env.SELLER_REVIEW_AGENT_URL?.trim() || 'http://localhost:8000';
    const agentToken = process.env.SELLER_REVIEW_AGENT_TOKEN?.trim();
    if (!agentToken) {
      throw new ServiceUnavailableException('Seller review agent is not configured. Set SELLER_REVIEW_AGENT_TOKEN on the backend.');
    }

    const profile = user.sellerProfile ?? {};
    const documents = [
      { label: `Identity document (${profile.identityDocument?.type ?? 'type not specified'})`, url: profile.identityDocument?.fileUrl },
      { label: 'Business registration', url: profile.businessRegistration?.documentUrl },
      { label: 'Company registration certificate', url: profile.companyRegistrationCertificateUrl },
      ...((profile.documents ?? []) as string[]).map((url, index) => ({ label: `Additional document ${index + 1}`, url })),
    ].filter((document) => Boolean(document.url));
    if (!Array.isArray(selectedDocumentUrls) || selectedDocumentUrls.length === 0) {
      throw new BadRequestException('Select at least one seller document to review.');
    }
    if (selectedDocumentUrls.length > 8 || selectedDocumentUrls.some((url) => typeof url !== 'string')) {
      throw new BadRequestException('Select no more than 8 seller documents per AI review.');
    }

    const uniqueSelectedUrls = [...new Set(selectedDocumentUrls)];
    const documentsByUrl = new Map(documents.map((document) => [document.url, document]));
    if (uniqueSelectedUrls.some((url) => !documentsByUrl.has(url))) {
      throw new BadRequestException('One or more selected documents do not belong to this seller.');
    }
    const reviewedDocuments = uniqueSelectedUrls.map((url) => documentsByUrl.get(url)!);

    const missingDocuments = [
      !profile.identityDocument?.fileUrl && 'identity document',
      !profile.businessRegistration?.documentUrl && 'business registration',
      !profile.companyRegistrationCertificateUrl && 'company registration certificate',
    ].filter(Boolean);

    let response: Response;
    try {
      response = await fetch(`${agentUrl.replace(/\/+$/, '')}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${agentToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          seller_name: String(user.fullname ?? '').slice(0, 200),
          shop_name: String(profile.shopName ?? '').slice(0, 200),
          identity_document_type: String(profile.identityDocument?.type ?? ''),
          registration_number: String(profile.businessRegistration?.registrationNumber ?? '').slice(0, 120),
          documents: reviewedDocuments,
          unreviewed_document_count: Math.max(0, documents.length - reviewedDocuments.length),
          missing_documents: missingDocuments,
        }),
      });
    } catch {
      throw new BadGatewayException('Could not reach the seller review agent. Check that the FastAPI service is running.');
    }

    if (response.status === 503) {
      throw new ServiceUnavailableException('The seller review agent is missing its Gemini configuration.');
    }
    if (!response.ok) {
      throw new BadGatewayException('The seller review agent could not analyze these documents.');
    }

    return response.json() as Promise<ReviewResult>;
  }
}
