import { Injectable } from '@angular/core';
import { INotification, ICall, TelnyxRTC } from "@telnyx/webrtc";
import { BehaviorSubject } from 'rxjs';

interface ExtendedCall extends ICall {
  hangup: () => void;
  state: string;
}

@Injectable({
  providedIn: 'root',
})
export class CalltelnyxService {
  private client: TelnyxRTC | null = null;
  private notificationSubject = new BehaviorSubject<INotification | null>(null);
  notification$ = this.notificationSubject.asObservable();
  log = "";

  private callStatusSubject = new BehaviorSubject<string>('');
  callStatus$ = this.callStatusSubject.asObservable();

  private credentials = {
    login: '',
    password: '',
    login_token: ''
  };

  constructor() {}

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

    const response =  this.client.newCall({
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
}
