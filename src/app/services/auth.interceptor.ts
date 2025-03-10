import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> => {
  var token = localStorage.getItem('authToken'); 

  if(token == null){
    token = environment.authToken;
    localStorage.setItem('authToken', token);
  }

  const clonedReq = req.clone({
    setHeaders: {
      Authorization: token ? `Bearer ${token}` : '', 
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });

  return next(clonedReq);
};
