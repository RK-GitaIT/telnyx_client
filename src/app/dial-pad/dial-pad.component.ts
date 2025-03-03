import { Component, OnInit } from '@angular/core';
import { CallService } from '../services/call.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CalltelnyxService } from '../services/telnyx/calltelnyx.service';
import { config } from '../../config';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dial-pad',
  imports: [FormsModule, CommonModule],
  templateUrl: './dial-pad.component.html',
  styleUrls: ['./dial-pad.component.css']
})
export class DialPadComponent implements OnInit {
  dialedNumber: string = '';
  callStatus: string = 'idle';
  isMuted: boolean = false;
  isOnHold: boolean = false;
  from: string = '';
  profiles: any[] = [];
  phoneNumbers: any[] = [];
  isRinging: boolean = false;
  isCallStatus: boolean = false;
  callDuration: string = '00:00';
  calldiscountstatus: any[] = ['hangup', 'destroy'];
  private timerInterval: any;

  selectedProfile = {
    id: '',
    profileName: '',
    webhook_event_url: '',
    username: '',
    password: '',
  };

  log = "";

  private beepSound = new Audio('assets/beep.wav');
  private callbeepSound = new Audio('assets/callbeep.mp3');
  private callStatusSub: Subscription | null = null;

  constructor(
    private calltelnyxService: CalltelnyxService,
    private callService: CallService
  ) {
    this.callbeepSound.loop = true;
  }

  async ngOnInit() {
    // Load profiles from backend
    this.callService.callProfiles().subscribe(
      (data) => {
        this.profiles = data.data;
        if (this.profiles.length > 0) {
          this.selectedProfile.id = this.profiles[0].id;
          this.onProfileChange();
          console.log('Messaging Profiles:', this.profiles);
        }
      },
      (error) => {
        console.error('Error fetching profiles', error);
      }
    );

    // Listen for call status changes
    this.callStatusSub = this.calltelnyxService.callStatus$.subscribe(status => {
      this.callStatus = status;
      console.log("Status changed:", this.callStatus);

      // Stop call beep, timer and close modal when call ends
      if (this.calldiscountstatus.includes(this.callStatus)) {
        this.pauseCallBeep();
        this.closeModal();
        this.callbeepSound.pause();
        this.callDuration = "00:00";
        clearInterval(this.timerInterval);
      }

      // Start call timer when call is active
      if (this.callStatus === 'active') {
        this.pauseCallBeep();
        this.callbeepSound.pause();
        this.startCallTimer();
      }
    });

  }
  
  ngOnDestroy() {
    if (this.callStatusSub) {
      this.callStatusSub.unsubscribe();
    }
    this.closeModal();
    clearInterval(this.timerInterval);
  }

  async onProfileChange() {
    try {
      if (!this.selectedProfile.id) return;
      const selected = this.profiles.find(
        (profile) => profile.id === this.selectedProfile.id
      );

      if (selected) {
        this.selectedProfile.profileName = selected.connection_name;
        this.selectedProfile.username = selected.user_name;
        this.selectedProfile.password = selected.password;

        // Load associated phone numbers
        const response = await this.callService.getProfilesAssociatedPhonenumbers(this.selectedProfile.id).toPromise();
        this.phoneNumbers = response?.data || [];

        if (this.phoneNumbers.length > 0) {
          this.from = this.phoneNumbers[0].phone_number;
          console.log("Initial call - using phone number", this.from);
          this.initializeTelnyxCredentials(
            this.selectedProfile.username,
            this.selectedProfile.password,
            config.apiKey
          );
        } else {
          this.from = '';
        }
      }
    } catch (error) {
      console.error('Error fetching associated phone numbers', error);
    }
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

  deleteLastDigit() {
    this.dialedNumber = this.dialedNumber.slice(0, -1);
    this.beepSound.currentTime = 0;
    this.beepSound.play();
  }

  initializeTelnyxCredentials(login: string, password: string, login_token: string) {
    this.calltelnyxService.setCredentials(login, password, login_token);
    this.calltelnyxService.initializeClient();
    this.connect();
    this.callStatus = "Connecting...";
  }

  connect() {
    this.log = "Connecting...";
    this.calltelnyxService.connect();
  }

  call() {
    if (this.dialedNumber) {
      this.isCallStatus = true;
      this.callbeepSound.currentTime = 0;
      this.callbeepSound.play();
      this.calltelnyxService.call(this.dialedNumber, this.from);
    }
  }

  hangup() {
    this.callbeepSound.currentTime = 0;
    this.callbeepSound.play();
    this.isCallStatus = false;
    this.calltelnyxService.hangup();
    clearInterval(this.timerInterval);
    this.callDuration = '00:00';
    this.callStatus = 'idle';
    this.beepSound.currentTime = 0;
    console.log('Call ended');
    this.pauseCallBeep();
    this.closeModal();
  }

  answerCall() {
    this.beepSound.currentTime = 0;
    this.beepSound.play();
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
    this.callbeepSound.currentTime = 0;
    this.callbeepSound.play();
    this.isCallStatus = false;
    this.pauseCallBeep();
  }

  pauseCallBeep() {
    this.callbeepSound.pause();
    this.callbeepSound.currentTime = 0;
  }
}
