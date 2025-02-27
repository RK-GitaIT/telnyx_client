import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule], // Required for directives like *ngFor and *ngIf
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.css']
})
export class ContactsComponent {
  
  contacts = [  // Renamed from contactsList to match template
    { name: 'Alice Johnson', company: 'TechCorp', image: 'https://via.placeholder.com/40' },
    { name: 'Bob Smith', company: 'InnoSoft' },
    { name: 'Charlie Davis', company: 'StartupX', image: 'https://via.placeholder.com/40' }
  ];  

  activeTab: string = 'Frequent';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
