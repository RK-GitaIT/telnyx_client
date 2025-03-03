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
  message: string | null  = '';

  callStatus$ = new BehaviorSubject<CallStatus>({ status: '', type: '' });

  constructor(
    private callService: CallService,
    private http: HttpClient,
    private websocketService: WebsocketService
  ) {
    this.websocketService.message$.subscribe((res: any) => this.handleWebSocketMessage(res));
  }

  async makeCall(destinationNumber: string, callerNumber: string, connectionId: string, message: string | null, isIvr: boolean) {
    try {
        console.log(`📞 Calling ${destinationNumber} from ${callerNumber} (Connection ID: ${connectionId})`);

        const profileDetails = await this.callService.getProfilesAssociatedPhonenumbers(connectionId).toPromise();
        if (!profileDetails?.data) throw new Error('❌ Invalid profile details');

        if (!this.websocketService.isConnected()) {
            console.log("🔗 Connecting to WebSocket...");
            this.websocketService.connect(this.webws);
        }

        this.message = message;

        let payload: any = {
            to: destinationNumber,
            from: callerNumber,
            from_display_name: "Gita IT",
            connection_id: connectionId,
            webhook_url: this.websocketUrl,

            // ✅ Enable WebRTC audio streaming
            stream_track: "both_tracks",  // Both inbound and outbound audio
            stream_url: "https://9bccfa7d-d274-4959-a8d9-3f291234fb15-00-2spvmgf4sg5r2.sisko.replit.dev/api/webhook",
            send_silence_when_idle: true, // Avoid call drops when no speech detected

            // ✅ Preferred codecs for WebRTC
            media_type: "audio",
            media_format: "opus",
            transport_protocol: "udp", // Ensure WebRTC RTP over UDP
            encryption: "srtp", // Secure RTP (if required)

            // ✅ SIP Authentication
            sip_auth_username: profileDetails.data.user_name,
            sip_auth_password: profileDetails.data.password,

            // ✅ Call Time Limits
            timeout_secs: 60, // Wait for 60 seconds before timeout
            time_limit_secs: 3600, // Max call duration = 1 hour
        };

        // ✅ Add recording options if it's NOT an IVR call
        if (!isIvr) {
            payload = {
                ...payload,
                record: "record-from-answer",
                record_format: "mp3",
                record_channels: "dual"
            };
        }

        this.callStatus$.next({ status: 'Call Initiated', type: 'success' });

        // ✅ Fix API Call Handling
        const response: any = await this.http.post(`${this.backendApi}/calls`, payload).toPromise();
        console.log("✅ API Response:", response);

        if (response?.data?.call_control_id) {
            console.log("✅ Call Control ID:", response.data.call_control_id);
        } else {
            throw new Error("❌ Call control ID missing in response");
        }
    } catch (error: any) {
        console.error("❌ API Call Failed:", error);
        this.handleCallError(error);
    }
}

  

  private handleWebSocketMessage(res: any) {
    if (res?.data?.payload) {
      const { event_type, payload } = res.data;
      console.log(`WebSocket Event: ${event_type}`);

      if (event_type === 'call.answered') {
        this.callStatus$.next({ status: 'Call Answered', type: 'success' });
        if(this.message != null){
          this.playTTS(payload.call_control_id, this.message);
        }
      }

      if (event_type === 'call.speak.ended') {
        this.callStatus$.next({ status: 'Call Ended', type: 'error' });
      }
      this.callStatus$.next({ status: '', type: '' });
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
