import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CallService } from '../call.service';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../websocket/websoket.service';
import { config } from '../../../config';

export interface CallStatus {
  status: string;
  type: 'info' | 'success' | 'error' | '';
}

@Injectable({
  providedIn: 'root'
})
export class TelnyxService {
  private websocketUrl = 'https://gitait.com/telnyx/api/webhook';
  private webws = 'wss://gitait.com/telnyx/ws';
  private backendApi = config.apiUrl;

  // Temporary storage for the TTS message for the current call.
  private currentCallMessage: string = '';

  callStatus$ = new BehaviorSubject<CallStatus>({ status: '', type: '' });

  constructor(
    private callService: CallService,
    private http: HttpClient,
    private websocketService: WebsocketService
  ) {
    this.websocketService.message$.subscribe((res: any) => this.handleWebSocketMessage(res));
  }

  async makeCall(destinationNumber: string, callerNumber: string, connectionId: string, message: string) {
    try {
      console.log(`Calling ${destinationNumber} from ${callerNumber} (Connection ID: ${connectionId})`);

      const profileDetails = await this.callService.getProfilesAssociatedPhonenumbers(connectionId).toPromise();
      if (!profileDetails?.data) throw new Error('Invalid profile details');

      // Ensure the WebSocket is connected.
      if (!this.websocketService.isConnected()) {
        this.websocketService.connect(this.webws);
      }
      // Store the TTS message temporarily.
      this.currentCallMessage = message;

      const payload = {
        to: destinationNumber,
        from: callerNumber,
        from_display_name: "Gita IT",
        connection_id: connectionId,
        webhook_url: this.websocketUrl,
        stream_track: "both_tracks",
        send_silence_when_idle: true,
        sip_auth_username: profileDetails.data.user_name,
        sip_auth_password: profileDetails.data.password
      };

      this.callStatus$.next({ status: 'Call Initiated', type: 'success' });

      const response: any = await this.http.post(`${this.backendApi}/calls`, payload).toPromise();
      if (response?.data?.call_control_id) {
        console.log("Call Control ID:", response.data.call_control_id);
      } else {
        throw new Error("Call control ID missing in response");
      }
    } catch (error: any) {
      this.handleCallError(error);
    }
  }

  private handleWebSocketMessage(res: any) {
    if (res?.data?.payload) {
      const { event_type, payload } = res.data;
      console.log(`WebSocket Event: ${event_type}`);

      if (event_type === 'call.answered') {
        this.callStatus$.next({ status: 'Call Answered', type: 'success' });
        // If there is a stored TTS message, play it.
        if (this.currentCallMessage && this.currentCallMessage.trim() !== '') {
          this.playTTS(payload.call_control_id, this.currentCallMessage);
          this.currentCallMessage = '';
        }
      }

      if (event_type === 'call.speak.ended') {
        this.currentCallMessage = '';
        this.callStatus$.next({ status: 'Call Ended', type: 'error' });
      }
    }
  }

  async playTTS(callControlId: string, message: string) {
    try {
      this.callStatus$.next({ status: 'Playing TTS', type: 'info' });
      await this.http.post(
        `${this.backendApi}/calls/${callControlId}/actions/speak`,
        { payload: message, language: 'en-US', voice: 'female' }
      ).toPromise();
      this.callStatus$.next({ status: 'TTS Playback Started', type: 'success' });
    } catch (error) {
      this.handleCallError(error);
      this.hangUpCall(callControlId);
    }
  }

  async hangUpCall(callControlId: string): Promise<void> {
    try {
      this.callStatus$.next({ status: 'Hanging Up', type: 'info' });
  
      const response: any = await firstValueFrom(
        this.http.post(`${this.backendApi}/calls/${callControlId}/actions/hangup`, {}, { observe: 'response' })
      );
  
      if (response.status === 200) {
        this.callStatus$.next({ status: 'Call Ended', type: 'success' });
        this.endCall();
      } else {
        console.error(`Unexpected response status: ${response.status}`);
        this.handleCallError(new Error(`Failed to hang up call. Status: ${response.status}`));
      }
    } catch (error) {
      console.error('Error hanging up call:', error);
      this.handleCallError(error);
    }
  }

  private handleCallError(error: any) {
    console.error('Call Failed:', error.message || error);
    this.playBeepSound();
    this.callStatus$.next({ status: 'Call Failed', type: 'error' });
    this.websocketService.disconnect();
  }

  private playBeepSound() {
    const beep = new Audio('assets/beep.mp3');
    beep.play().catch(err => console.error('Error playing beep sound:', err));
  }

  endCall() {
    this.callStatus$.next({ status: 'Call Ended', type: 'success' });
    this.websocketService.disconnect();
    console.log("Call has ended.");
  }
}
