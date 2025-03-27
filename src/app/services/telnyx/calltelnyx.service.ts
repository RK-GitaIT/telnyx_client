import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { INotification, ICall, TelnyxRTC } from "@telnyx/webrtc";
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { WebsocketService } from '../websocket/websoket.service';
import { config } from '../../../config';

interface ExtendedCall extends ICall {
  hangup: () => void;
  state: string;
  muteAudio: () => void;
  unmuteAudio: () => void;
  hold: () => void;
  unhold: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class CalltelnyxService {
  private client: TelnyxRTC | null = null;
  private notificationSubject = new BehaviorSubject<INotification | null>(null);
  notification$ = this.notificationSubject.asObservable();
  log = "";
  private backendApi = config.apiUrl;

  private callStatusSubject = new BehaviorSubject<string>('');
  callStatus$ = this.callStatusSubject.asObservable();

  private credentials = {
    login: '',
    password: '',
    login_token: ''
  };

  private websocketUrl = 'https://gitait.com/telnyx/api/webhook';
  private webws = 'wss://gitait.com/telnyx/ws';

  constructor(private http: HttpClient, private websocketService: WebsocketService) {
    this.websocketService.message$.subscribe((res: any) => this.handleWebSocketMessage(res));
  }

  setCredentials(login: string, password: string, login_token: string) {
    this.credentials = { login, password, login_token };
    this.initializeClient();
  }

  initializeClient() {
    if (!this.credentials.login || !this.credentials.password || !this.credentials.login_token) {
      console.error("Telnyx credentials are missing!");
      return;
    }

    this.client = new TelnyxRTC({
      login: this.credentials.login,
      password: this.credentials.password,
      login_token: this.credentials.login_token
    });

    this.client.remoteElement = "audioStream";
    this.client.enableMicrophone();

    this.client.on("telnyx.ready", () => {
      this.log = "registered";
      console.log("registered");
    });

    this.client.on("telnyx.error", (error: any) => {
      console.error(error);
      this.log = "";
      this.client?.disconnect();
    });

    this.client.on("telnyx.socket.close", (close: any) => {
      console.error(close);
      this.log = "";
      this.cleanupListeners();
    });

    this.client.on("telnyx.notification", (notification: INotification) => {
      this.notificationSubject.next(notification);
      this.handleNotification(notification);
    });
  }

  connect() {
    if (!this.client) {
      console.error("Client not initialized. Call initializeClient() first.");
      return;
    }
    this.log = "Connecting...";
    this.client.connect();
  }

  call(destinationNumber: string, callerNumber: string) {
    if (!this.client) return;
    
    // Ensure WebSocket connection is active.
    if (!this.websocketService.isConnected()) {
      this.websocketService.connect(this.webws);
    }

    const response = this.client.newCall({
      destinationNumber,
      callerNumber,
      forceRelayCandidate: false,
      debug: true,
      debugOutput: 'socket',
      localElement: "localVideo",
      remoteElement: "remoteVideo",
    });
    console.log(response, "call response");
  }

  hangup() {
    const notification = this.notificationSubject.value;
    if (notification && notification.call) {
      const call = notification.call as ExtendedCall;
      call.hangup();
    }
  }

  private handleNotification(notification: INotification) {
    console.log(notification);
    if (notification.type === "callUpdate" && notification.call) {
      const call = notification.call as ExtendedCall;
      this.callStatusSubject.next(call.state);
      console.log("Call State: ", call.state);
    } else if (notification.type === "userMediaError") {
      alert(`${notification.error}. \nPlease check your microphone/webcam.`);
    }
  }

  private cleanupListeners() {
    if (!this.client) return;
    this.client.off("telnyx.error");
    this.client.off("telnyx.ready");
    this.client.off("telnyx.notification");
    this.client.off("telnyx.socket.close");
  }

  async startCallRecording(callControlId: string) {
    const requestBody = {
      format: "mp3",
      channels: "dual",
      play_beep: true,
      max_length: 0,
      timeout_secs: 0,
      transcription: true,
      transcription_engine: "B",
      transcription_language: "en-US"
    };

    try {
      // Use firstValueFrom to convert the observable to a promise.
      const response = await firstValueFrom(
        this.http.post(`${this.backendApi}/calls/${callControlId}/actions/record_start`, requestBody)
      );
      console.log("Recording started successfully:", response);
    } catch (error) {
      console.error("Error starting call recording:", error);
      throw error;
    }
  }

  private handleWebSocketMessage(res: any) {
    if (res?.data?.payload) {
      const { event_type, payload } = res.data;
      if (event_type === 'call.answered') {
        this.startCallRecording(payload.call_control_id);
      }
    }
  }

  muteCall(mute: boolean) {
    const notification = this.notificationSubject.value;
    if (notification && notification.call) {
      const call = notification.call as ExtendedCall;
      if (mute) {
        call.muteAudio();
        console.log("Call muted");
      } else {
        call.unmuteAudio();
        console.log("Call unmuted");
      }
    }
  }
  
  holdCall(hold: boolean) {
    const notification = this.notificationSubject.value;
    if (notification && notification.call) {
      const call = notification.call as ExtendedCall;
      if (hold) {
        call.hold();
        console.log("Call on hold");
      } else {
        call.unhold();
        console.log("Call resumed");
      }
    }
  }
}
