import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const chunkFailedMessage = /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|MIME type/gi;
    const errorMessage = error?.message || error?.toString() || '';

    if (chunkFailedMessage.test(errorMessage)) {
      const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_retry', '1');
        console.warn('Phát hiện bản build mới trên Vercel. Đang tự động làm mới trang...');
        window.location.reload();
        return;
      }
    }

    sessionStorage.removeItem('chunk_reload_retry');
    console.error('[GlobalErrorHandler]', error);
  }
}
