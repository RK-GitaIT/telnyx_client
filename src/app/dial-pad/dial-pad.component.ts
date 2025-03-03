import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TelnyxService } from '../services/telnyx/telnyx.service';
import { ProfileService } from '../services/profile.service';
import { CallService } from '../services/call.service';
import { WebRTCService } from '../services/web-rtc/web-rtc.service';

@Component({
  selector: 'app-dial-pad',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './dial-pad.component.html',
  styleUrls: ['./dial-pad.component.css']
})
export class DialPadComponent implements OnInit {
  dialedNumber: string = '';
  from: string = '';
  profiles: any[] = [];
  phoneNumbers: any[] = [];
  balance: number = 0;
  currency: string = 'USD';
  isCallStatus: boolean = false;
  private timerInterval: any;
  callDuration: string = '00:00';

  selectedProfile = {
    id: '',
    profileName: '',
    webhook_event_url: '',
    username: '',
    password: '',
  };

  @ViewChild('remoteAudio') remoteAudio!: ElementRef<HTMLAudioElement>;

  private callbeepSound = new Audio('assets/callbeep.mp3');
  private beepSound = new Audio('assets/beep.wav');

  constructor(
    private telnyxservice: TelnyxService,
    private profileService: ProfileService,
    private callService: CallService,
    private webRTCService: WebRTCService,
  ) {}

  async ngOnInit() {
    this.callService.call_control_applicationsProfiles().subscribe(
      (data: any) => {
        this.profiles = data.data;
        if (this.profiles.length > 0) {
          this.selectedProfile.id = this.profiles[0].id;
          this.onProfileChange();
        }
      },
      (error: any) => {
        console.error('Error fetching profiles', error);
      }
    );

    this.telnyxservice.callStatus$.subscribe(status => {
      if (status.status === 'Call Answered' && status.type === "success") {
        this.isCallStatus = true;
        this.startCallTimer();
        this.showToast(status.status, status.type);
      }

      if (status.status && ['Hanging Up', 'Call Failed', 'Call Ended'].includes(status.status)) {
        this.isCallStatus = false;
        this.hangup();
        this.showToast(status.status, status.type);
      }
    });

    await this.webRTCService.initializeLocalStream();
    this.webRTCService.setRemoteStreamHandler((stream: MediaStream) => {
      if (this.remoteAudio?.nativeElement) {
        this.remoteAudio.nativeElement.srcObject = stream;
        this.remoteAudio.nativeElement.autoplay = true;
        this.remoteAudio.nativeElement.muted = false;
        this.remoteAudio.nativeElement.play().catch(err => {
          console.error("❌ Playback error:", err);
        });
      } else {
        console.error("❌ remoteAudio element is not defined!");
      }
    });
  }

  async call() {
    if (!this.from || !this.dialedNumber) {
      alert('Please enter a valid number.');
      return;
    }

    try {
      this.isCallStatus = true;
      await this.telnyxservice.makeCall(
        this.dialedNumber,
        this.from,
        this.selectedProfile.id,
        null,
        true
      );

      const offer = await this.webRTCService.createOffer();
      console.log('WebRTC Offer:', offer);

      this.fetchBalance();
    } catch (error) {
      this.hangup();
      this.showToast('Error starting call', 'error');
      console.error('Error:', error);
    }
  }

  fetchBalance() {
    this.profileService.getProfileBalance().subscribe(
      (data) => {
        this.balance = parseFloat(data.data.balance);
        this.currency = data.data.currency;
      },
      (error) => console.error('Error fetching balance', error)
    );
  }

  async onProfileChange() {
    try {
      if (!this.selectedProfile.id) return;
      const selected = this.profiles.find(profile => profile.id === this.selectedProfile.id);
      if (selected) {
        this.selectedProfile.profileName = selected.connection_name;
        this.selectedProfile.username = selected.user_name;
        this.selectedProfile.password = selected.password;
        const response = await this.callService.getProfilesAssociatedPhonenumbers(this.selectedProfile.id).toPromise();
        this.phoneNumbers = response?.data || [];
        this.from = this.phoneNumbers.length > 0 ? this.phoneNumbers[0].phone_number : '';
      }
    } catch (error) {
      console.error('Error fetching associated phone numbers', error);
    }
  }

  hangup() {
    this.isCallStatus = false;
    clearInterval(this.timerInterval);
    this.webRTCService.closeConnection();
    this.callDuration = '00:00';
    this.callbeepSound.play();
  }

  startCallTimer() {
    let seconds = 0;
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      this.callDuration = `${mins}:${secs}`;
    }, 1000);
  }

  closeModal() {
    this.callbeepSound.play();
    this.isCallStatus = false;
  }

  deleteLastDigit() {
    this.dialedNumber = this.dialedNumber.slice(0, -1);
    this.beepSound.currentTime = 0;
    this.beepSound.play();
  }

  appendDigit(digit: string) {
    this.dialedNumber += digit;
    this.beepSound.currentTime = 0;
    this.beepSound.play();
  }

  dialedNumbervalue() {
    this.beepSound.currentTime = 0;
    this.beepSound.play();
  }

  showToast(message: string, type: 'info' | 'success' | 'error' | '') {
    if (type !== '') {
      const toast = document.createElement('div');
      toast.className = `fixed bottom-4 right-4 p-3 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
      }`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    }
  }
}
