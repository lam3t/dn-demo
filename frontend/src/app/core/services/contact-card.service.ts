import { Injectable, signal } from '@angular/core';
import { UserPickerItem } from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class ContactCardService {
  private isOpenSignal = signal(false);
  private currentUserSignal = signal<UserPickerItem | string | null>(null);

  isOpen = this.isOpenSignal.asReadonly();
  currentUser = this.currentUserSignal.asReadonly();

  open(userOrId: UserPickerItem | string) {
    this.currentUserSignal.set(userOrId);
    this.isOpenSignal.set(true);
  }

  close() {
    this.isOpenSignal.set(false);
    this.currentUserSignal.set(null);
  }
}
