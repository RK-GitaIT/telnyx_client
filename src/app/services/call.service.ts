import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { config } from '../../config';


@Injectable({
  providedIn: 'root'
})
export class CallService {
  private apiUrl = config.apiUrl + "/calls";

  constructor(private http: HttpClient) {}

  dialNumber(
    dialedNumber: string,
    from: string,
    connectionId: string,
    webhookUrl: string
  ): Observable<any> {
    // First, get the profile details (which include SIP credentials) for the given connection ID
    return this.getProfileFullDetails(connectionId).pipe(
      switchMap(profileDetails => {
        // Build the minimal payload with required fields and streaming settings
        const payload = {
          // The destination number or SIP URI; Telnyx accepts a string or an array of strings
          to: dialedNumber,
          // Caller ID in +E164 format
          from: from,
          // Optional display name (subject to API length/character restrictions)
          from_display_name: "Gita IT",
          // Valid Call Control App ID
          connection_id: connectionId,
          // The webhook URL where Telnyx will send subsequent call events
          webhook_url: webhookUrl,
          // Audio greeting URL (modern example hosted on a CDN, replace with your actual URL)
          audio_url: "https://github.com/RK-GitaIT/telnyx_dashbord/blob/main/assets/sounds/greeting.mp3",
          // Streaming configuration for real‑time media
          stream_url: "wss://telnyx-dashbord-gitait-dev.vercel.app/websocket",
          stream_track: "both_tracks",  // Options: "inbound_track", "outbound_track", "both_tracks"
          send_silence_when_idle: true,
          // SIP authentication credentials retrieved from the profile details
          sip_auth_username: profileDetails.data.user_name,
          sip_auth_password: profileDetails.data.password
        };
  
        // Return the HTTP POST Observable using the minimal payload
        return this.http.post(this.apiUrl, payload);
      })
    );
  }
  
  // Other call control methods (callProfiles, getProfilesAssociatedPhonenumbers, answerCall, etc.)
  callProfiles(): Observable<any> {
    const url = `${config.apiUrl}/credential_connections`;
    return this.http.get(url);
  }

  call_control_applicationsProfiles(): Observable<any> {
    const url = `${config.apiUrl}/call_control_applications`;
    return this.http.get(url);
  }

  getProfileFullDetails(id: string): Observable<any> {
    const url = `${config.apiUrl}/credential_connections/${id}`;
    return this.http.get(url);
  }

  getProfilesAssociatedPhonenumbers(id: string): Observable<any> {
    const url = `${config.apiUrl}/phone_numbers`;
    return this.http.get(`${url}?filter[connection_id]=${id}`);
  }

  answerCall(callLegId: string): Observable<any> {
    const url = `${this.apiUrl}/${callLegId}/actions/answer`;
    return this.http.post(url, {});
  }

  hangUpCall(callLegId: string): Observable<any> {
    const url = `${this.apiUrl}/${callLegId}/actions/hangup`;
    return this.http.post(url, {});
  }

  muteCall(callLegId: string): Observable<any> {
    const url = `${this.apiUrl}/${callLegId}/actions/mute`;
    return this.http.post(url, {});
  }

  unmuteCall(callLegId: string): Observable<any> {
    const url = `${this.apiUrl}/${callLegId}/actions/unmute`;
    return this.http.post(url, {});
  }

  holdCall(callLegId: string): Observable<any> {
    const url = `${this.apiUrl}/${callLegId}/actions/hold`;
    return this.http.post(url, {});
  }

  resumeCall(callLegId: string): Observable<any> {
    const url = `${this.apiUrl}/${callLegId}/actions/unhold`;
    return this.http.post(url, {});
  }
}
