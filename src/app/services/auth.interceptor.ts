import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { config } from '../../config';

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> => {
  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer KEY019545FFDF282A75C08A9F6CA4E7BFB7_70MN4UvpyiZ9qSoq2buqO2`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });

  return next(clonedReq);
};
