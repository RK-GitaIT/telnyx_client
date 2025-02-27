import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmsService } from '../services/sms.service';
import { ProfileService } from '../services/profile.service';
import { CommonModule } from '@angular/common';
import { WebsocketService } from '../services/websocket/websoket.service';

@Component({
  selector: 'app-sendmsg',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './sendmsg.component.html',
  styleUrls: ['./sendmsg.component.css']
})
export class SendmsgComponent implements OnInit {
  private websocketUrl = 'https://gitait.com/telnyx/api/webhook';
  private webws = 'wss://gitait.com/telnyx/ws';
  to: string = '+';
  message: string = '';
  from: string = '';
  profiles: any[] = [];
  phoneNumbers: any[] = [];
  balance: number = 0;
  currency: string = 'USD';

  selectedProfile = {
    profileId: '',
    profileName: '',
    webhook_url: '',
  };

  constructor(private smsService: SmsService, private profileService: ProfileService, private websocketService: WebsocketService) {
    this.websocketService.message$.subscribe((res: any) => this.handleWebSocketMessage(res));
  }

  ngOnInit() {
    this.fetchProfiles();
    this.fetchBalance();
    this.profileService.getProfileBalanceAsync();
  }

  fetchProfiles() {
    this.profileService.getMessagingProfiles().subscribe(
      (data) => {
        this.profiles = data.data;
        if (this.profiles.length > 0) {
          this.selectedProfile.profileId = this.profiles[0].id;
          this.onProfileChange();
        }
      },
      (error) => console.error('Error fetching profiles', error)
    );
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

  onProfileChange() {
    if (!this.selectedProfile.profileId) return;

    const selected = this.profiles.find(profile => profile.id === this.selectedProfile.profileId);
    if (selected) {
      this.selectedProfile.profileName = selected.name;
      this.profileService.setSelectedProfile(selected);

      this.profileService.getProfilesAssociatedPhonenumbers(this.selectedProfile.profileId).subscribe(
        (data) => {
          this.phoneNumbers = data.data || [];
          this.from = this.phoneNumbers.length > 0 ? this.phoneNumbers[0].phone_number : '';
        },
        (error) => console.error('Error fetching phone numbers', error)
      );
    }
  }

  showToast(message: string, type: 'info' | 'success' | 'error') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-3 rounded-lg shadow-lg text-white ${
      type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  }

  validateKey(event: KeyboardEvent) {
    const allowedChars = /^[\d\+]+$/;
    if (!allowedChars.test(event.key)) {
      event.preventDefault();
    }
  }

  async sendMessage() {
    if (!this.from || !this.to || !this.message) {
      alert('Please fill all required fields.');
      return;
    }

    this.websocketService.connect(this.webws);

    this.showToast('Sending message...', 'info');
      this.smsService.sendSms(
        this.to,
        this.from,
        this.selectedProfile.profileId,
        this.websocketUrl,
        this.message
      ).subscribe(
        (response) => {
         // this.showToast('✅ Message sent successfully!', 'success');
          this.fetchBalance(); // Refresh balance after sending
        },
        (error) => {
          console.error('Error sending message', error);
          this.showToast('❌ Failed to send message.', 'error');
        }
      );
  }

  private handleWebSocketMessage(res: any) {
    console.log('WebSocket Message:', res);
    
    if (res?.data && res.data.payload) {
      switch (res.data.event_type) {
        case 'message.send':
          this.showToast("Sending SMS...", "info");
          break;
        case 'message.delivered':
          this.showToast("SMS sent successfully.", "success");
          break;
        case 'message.failed':
          this.showToast("Failed to send SMS.", "error");
          break;
        default:
          break;
      }
    }
  }
  
}
