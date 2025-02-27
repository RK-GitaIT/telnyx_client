import { Routes } from '@angular/router';
import { ContactsComponent } from './contacts/contacts.component';
import { SettingsComponent } from './settings/settings.component';
import { SendmsgComponent } from './sendmsg/sendmsg.component';
import { DialPadComponent } from './dial-pad/dial-pad.component';
import { IvrcallComponent } from './ivrcall/ivrcall.component';

export const routes: Routes = [
  { path: 'sendmsg', component: SendmsgComponent },
  { path: 'phone', component: DialPadComponent },
  { path: 'ivr', component: IvrcallComponent },
  { path: 'contacts', component: ContactsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '', redirectTo: '/messages', pathMatch: 'full' }
];
