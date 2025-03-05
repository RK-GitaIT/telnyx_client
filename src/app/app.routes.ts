import { Routes } from '@angular/router';
import { SettingsComponent } from './settings/settings.component';
import { SendmsgComponent } from './sendmsg/sendmsg.component';
import { DialPadComponent } from './dial-pad/dial-pad.component';
import { IvrcallComponent } from './ivrcall/ivrcall.component';
import { RecordingsComponent } from './recordings/recordings.component';

export const routes: Routes = [
  { path: 'sendmsg', component: SendmsgComponent },
  { path: 'phone', component: DialPadComponent },
  { path: 'ivr', component: IvrcallComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'recordings', component: RecordingsComponent },
  { path: '', redirectTo: '/sendmsg', pathMatch: 'full' }
];
