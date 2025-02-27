import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { config } from '../../config';

@Injectable({
  providedIn: 'root'
})
export class SmsService {
  private apiUrl = config.apiUrl;

  constructor(private http: HttpClient) {}

  sendSms(to: string, from: string, profileId: string, webhook_url : string, message: string): Observable<any> {
    const payload = {
      from: from,
      messaging_profile_id: profileId, 
      to: to,
      text: message,
      webhook_url:  webhook_url,//'https://mysite.com/7420/updates',
      webhook_failover_url: null, //'https://mysite.com/7420/backup/updates',
      use_profile_webhooks: true,
      type: "SMS",
      subject: "From GitaiT",
      media_urls :[],
    };

    return this.http.post(this.apiUrl + '/messages', payload);
  }
}
