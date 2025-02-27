import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  profileName: string = 'User';
  balance: number = 0;
  currency: string = 'USD';

  constructor(private profileService: ProfileService) {}

  ngOnInit() {
    this.profileService.selectedProfile$.subscribe(profile => {
      if (profile) {
        this.profileName = profile.name;
      }
    });

    this.profileService.balance$.subscribe(balance => {
      this.balance = balance;
    });

    this.profileService.currency$.subscribe(currency => {
      this.currency = currency;
    });

    // Fetch the balance initially
    this.profileService.getProfileBalanceAsync();
  }
}
