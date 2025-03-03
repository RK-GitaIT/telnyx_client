import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TelnyxService, CallStatus } from '../services/telnyx/telnyx.service';
import { ProfileService } from '../services/profile.service';
import { CallService } from '../services/call.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ivrcall',
  imports: [FormsModule, CommonModule],
  templateUrl: './ivrcall.component.html',
  styleUrls: ['./ivrcall.component.css']
})
export class IvrcallComponent implements OnInit, OnDestroy {
  to: string = '+';
  message: string = '';
  from: string = '';
  profiles: any[] = [];
  phoneNumbers: any[] = [];
  balance: number = 0;
  currency: string = 'USD';
  isCallStatus: boolean = false;
  callDuration: string = '00:00';
  private timerInterval: any;

  selectedProfile = {
    id: '',
    profileName: '',
    webhook_event_url: '',
    username: '',
    password: '',
  };

  private callbeepSound = new Audio('assets/callbeep.mp3');
  private beepSound = new Audio('assets/beep.wav');
  private callStatusSub: Subscription | null = null;

  constructor(
    private telnyxservice: TelnyxService,
    private profileService: ProfileService,
    private callService: CallService
  ) {}


  async ngOnInit() {
    // Fetch profiles for call control
    this.callService.call_control_applicationsProfiles().subscribe(
      (data: any) => {
        this.profiles = data.data;
        console.log('Call control profiles:', this.profiles);
        if (this.profiles.length > 0) {
          this.selectedProfile.id = this.profiles[0].id;
          this.onProfileChange();
        }
      },
      (error: any) => {
        console.error('Error fetching profiles', error);
      }
    );

    // Subscribe to call status updates from Telnyx service
    this.callStatusSub = this.telnyxservice.callStatus$.subscribe((status: CallStatus) => {
      console.log("Call Status:", status);
      if (status.status === 'Call Answered' && status.type === 'success') {
        this.isCallStatus = true;
        this.startCallTimer();
        this.showToast(status.status, status.type);
      } else if (status.status && ['Hanging Up', 'Call Failed', 'TTS Not Sent', 'Call Ended'].includes(status.status)) {
        this.isCallStatus = false;
        this.hangup();
        this.showToast(status.status, status.type);
      }
    });

    if (this.callStatusSub) {
      this.callStatusSub.unsubscribe();
    }
    this.closeModal();
    clearInterval(this.timerInterval);
  }

  ngOnDestroy() {
    if (this.callStatusSub) {
      this.callStatusSub.unsubscribe();
    }
    this.closeModal();
    clearInterval(this.timerInterval);
  }

  fetchBalance() {
    this.profileService.getProfileBalance().subscribe(
      (data: any) => {
        this.balance = parseFloat(data.data.balance);
        this.currency = data.data.currency;
      },
      (error: any) => console.error('Error fetching balance', error)
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
        const response: any = await this.callService.getProfilesAssociatedPhonenumbers(this.selectedProfile.id).toPromise();
        this.phoneNumbers = response?.data || [];
        this.from = this.phoneNumbers.length > 0 ? this.phoneNumbers[0].phone_number : '';
      }
    } catch (error) {
      console.error('Error fetching associated phone numbers', error);
    }
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

  async sendVoiceMessage() {
    if (!this.from || !this.to || !this.message) {
      alert('Please fill all required fields.');
      return;
    }
    
    try {
      this.isCallStatus = true;
      await this.telnyxservice.makeCall(
        this.to,
        this.from,
        this.selectedProfile.id,
        this.message
      );
      this.fetchBalance();
    } catch (error) {
      this.hangup();
      this.showToast('Error sending voice message', 'error');
      console.error('Error sending voice message:', error);
    }
  }

  validateKey(event: KeyboardEvent) {
    const allowedChars = /^[\d\+]+$/;
    if (!allowedChars.test(event.key)) {
      event.preventDefault();
    }
  }

  closeModal() {
   //this.callbeepSound.play();
    this.isCallStatus = false;
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

  hangup() {
    this.isCallStatus = false;
    clearInterval(this.timerInterval);
    this.callDuration = '00:00';
    this.beepSound.currentTime = 0;
    this.callbeepSound.play();
    console.log('Call ended');
    this.closeModal();
  }
}
