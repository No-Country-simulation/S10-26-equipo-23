import { BadRequestException } from '@nestjs/common';

export class ValidacionException extends BadRequestException {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string> | undefined,
  ) {
    super(message, { errorCode: 'VALIDACION' });
  }
}
